"""
DraftKings Scores Service
Handles fetching roster data from DraftKings API for specific contest entries
"""

import asyncio
import logging
from typing import Dict, List, Optional, Any
import httpx
from datetime import datetime
import time

logger = logging.getLogger(__name__)

class DraftKingsScoresService:
    """Service for fetching roster data from DraftKings Scores API"""
    
    def __init__(self):
        self.base_url = "https://api.draftkings.com"
        self.session = None
        # Rate limiting: max 10 requests per second
        self._last_request_time = 0
        self._min_request_interval = 0.1  # 100ms between requests
        
    async def __aenter__(self):
        """Async context manager entry"""
        self.session = httpx.AsyncClient(
            timeout=30.0,
            headers={
                'User-Agent': 'DFS-App/1.0',
                'Accept': 'application/json',
                'Accept-Encoding': 'gzip, deflate'
            }
        )
        return self
        
    async def __aexit__(self, exc_type, exc_val, exc_tb):
        """Async context manager exit"""
        if self.session:
            await self.session.aclose()
            
    async def _rate_limit(self):
        """Implement rate limiting between requests"""
        current_time = time.time()
        time_since_last_request = current_time - self._last_request_time
        
        if time_since_last_request < self._min_request_interval:
            sleep_time = self._min_request_interval - time_since_last_request
            await asyncio.sleep(sleep_time)
            
        self._last_request_time = time.time()
        
    async def get_roster(self, draft_group_id: str, entry_key: str) -> Dict[str, Any]:
        """
        Fetch roster data for a specific contest entry
        
        Args:
            draft_group_id: DraftKings draft group ID
            entry_key: Entry key from leaderboard data
            
        Returns:
            Dict containing roster data and player information
            
        Raises:
            httpx.HTTPError: If API request fails
            ValueError: If roster data is invalid or cannot be parsed
        """
        try:
            await self._rate_limit()
            
            url = f"{self.base_url}/scores/v2/entries/{draft_group_id}/{entry_key}"
            params = {
                'format': 'json',
                'embed': 'roster'
            }
            
            logger.info(f"Fetching roster for draft_group_id: {draft_group_id}, entry_key: {entry_key}")
            
            if not self.session:
                raise RuntimeError("Service not initialized. Use async context manager.")
                
            response = await self.session.get(url, params=params)
            
            # Try to parse response even if status is not 200
            try:
                data = response.json()
            except:
                # If JSON parsing fails, raise the HTTP error
                response.raise_for_status()
            
            # Check for API errors in response
            if 'errorStatus' in data:
                error_code = data['errorStatus'].get('code', 'UNKNOWN')
                error_msg = data['errorStatus'].get('developerMessage', 'Unknown error')
                
                if error_code == 'SCO101':
                    raise ValueError(f"Authentication required: {error_msg}. This entry may be private or require login.")
                else:
                    raise ValueError(f"DraftKings API error {error_code}: {error_msg}")
            
            # If no error in JSON but HTTP status is not 200, raise HTTP error
            if response.status_code != 200:
                response.raise_for_status()
            
            # Validate response structure
            if not isinstance(data, dict):
                raise ValueError(f"Invalid response format: expected dict, got {type(data)}")
            
            # Extract entries array
            entries = data.get('entries', [])
            if not entries:
                raise ValueError("No entries found in response")
            
            # Get the first entry (should be the one we requested)
            entry_data = entries[0]
            
            # Extract roster information
            roster_data = entry_data.get('roster', {})
            if not roster_data:
                raise ValueError("No roster data found in entry")
            
            # Parse roster and map to our table structure
            parsed_roster = self._parse_roster_data(roster_data, entry_data)
            
            logger.info(f"Successfully parsed roster for entry {entry_key}: {len(parsed_roster.get('players', []))} players")
            
            return {
                'draft_group_id': draft_group_id,
                'entry_key': entry_key,
                'roster_data': parsed_roster,
                'full_response': data,
                'fetched_at': datetime.utcnow().isoformat()
            }
            
        except httpx.HTTPError as e:
            logger.error(f"HTTP error fetching roster for entry {entry_key}: {e}")
            raise
        except Exception as e:
            logger.error(f"Error fetching roster for entry {entry_key}: {e}")
            raise
            
    def _parse_roster_data(self, roster_data: Dict[str, Any], entry_data: Dict[str, Any]) -> Dict[str, Any]:
        """
        Parse roster data and map to contest_roster_details table columns
        
        Args:
            roster_data: Raw roster data from DraftKings API
            entry_data: Full entry data containing user information
            
        Returns:
            Dict containing parsed roster information mapped to table columns
        """
        try:
            scorecards = roster_data.get('scorecards', [])
            
            # Initialize roster mapping
            roster_mapping = {
                'fantasy_points': entry_data.get('fantasyPoints', 0.0),
                'username': entry_data.get('userName', ''),
                'qb_name': None,
                'qb_score': None,
                'rb1_name': None,
                'rb1_score': None,
                'rb2_name': None,
                'rb2_score': None,
                'wr1_name': None,
                'wr1_score': None,
                'wr2_name': None,
                'wr2_score': None,
                'wr3_name': None,
                'wr3_score': None,
                'te_name': None,
                'te_score': None,
                'flex_name': None,
                'flex_score': None,
                'dst_name': None,
                'dst_score': None,
                'players': []
            }
            
            # Track RB and WR positions for proper mapping
            rb_count = 0
            wr_count = 0
            
            for scorecard in scorecards:
                player_data = self._extract_player_data(scorecard)
                roster_mapping['players'].append(player_data)
                
                position = player_data.get('position', '').upper()
                player_name = player_data.get('name', '')
                player_score = player_data.get('score', 0.0)
                
                # Map players to specific position columns
                if position == 'QB':
                    roster_mapping['qb_name'] = player_name
                    roster_mapping['qb_score'] = player_score
                elif position == 'RB':
                    rb_count += 1
                    if rb_count == 1:
                        roster_mapping['rb1_name'] = player_name
                        roster_mapping['rb1_score'] = player_score
                    elif rb_count == 2:
                        roster_mapping['rb2_name'] = player_name
                        roster_mapping['rb2_score'] = player_score
                    else:
                        # Handle case where there are more than 2 RBs (shouldn't happen in standard lineup)
                        logger.warning(f"Unexpected RB count: {rb_count} for player {player_name}")
                elif position == 'WR':
                    wr_count += 1
                    if wr_count == 1:
                        roster_mapping['wr1_name'] = player_name
                        roster_mapping['wr1_score'] = player_score
                    elif wr_count == 2:
                        roster_mapping['wr2_name'] = player_name
                        roster_mapping['wr2_score'] = player_score
                    elif wr_count == 3:
                        roster_mapping['wr3_name'] = player_name
                        roster_mapping['wr3_score'] = player_score
                    else:
                        # Handle case where there are more than 3 WRs (shouldn't happen in standard lineup)
                        logger.warning(f"Unexpected WR count: {wr_count} for player {player_name}")
                elif position == 'TE':
                    roster_mapping['te_name'] = player_name
                    roster_mapping['te_score'] = player_score
                elif position == 'FLEX':
                    roster_mapping['flex_name'] = player_name
                    roster_mapping['flex_score'] = player_score
                elif position == 'DST':
                    roster_mapping['dst_name'] = player_name
                    roster_mapping['dst_score'] = player_score
                else:
                    logger.warning(f"Unknown position: {position} for player {player_name}")
            
            # Store full roster data as JSON for flexibility
            roster_mapping['contest_json'] = {
                'raw_roster': roster_data,
                'entry_data': entry_data,
                'player_count': len(scorecards),
                'positions': [p.get('position') for p in roster_mapping['players']],
                'total_fantasy_points': roster_mapping['fantasy_points']
            }
            
            return roster_mapping
            
        except Exception as e:
            logger.error(f"Error parsing roster data: {e}")
            raise
            
    def _extract_player_data(self, scorecard: Dict[str, Any]) -> Dict[str, Any]:
        """
        Extract player information from a scorecard
        
        Args:
            scorecard: Individual player scorecard from roster data
            
        Returns:
            Dict containing player information
        """
        try:
            # Extract basic player information
            player_data = {
                'name': scorecard.get('displayName', ''),
                'first_name': scorecard.get('firstName', ''),
                'last_name': scorecard.get('lastName', ''),
                'short_name': scorecard.get('shortName', ''),
                'position': scorecard.get('rosterPosition', ''),
                'score': scorecard.get('score', 0.0),
                'draftable_id': scorecard.get('draftableId'),
                'lineup_id': scorecard.get('lineupId'),
                'competition': scorecard.get('competition', {}),
                'stats': scorecard.get('stats', []),
                'stats_description': scorecard.get('statsDescription', ''),
                'percent_drafted': scorecard.get('percentDrafted', 0.0)
            }
            
            # Extract competition information
            competition = scorecard.get('competition', {})
            if competition:
                player_data['competition_name'] = competition.get('name', '')
                player_data['competition_status'] = competition.get('competitionStatus', '')
                player_data['time_status'] = competition.get('timeStatus', '')
                player_data['start_time'] = competition.get('startTime', '')
            
            # Extract stats summary
            stats = scorecard.get('stats', [])
            contributing_stats = [stat for stat in stats if stat.get('contributesToScoring', False)]
            player_data['contributing_stats'] = contributing_stats
            player_data['stat_count'] = len(contributing_stats)
            
            return player_data
            
        except Exception as e:
            logger.error(f"Error extracting player data from scorecard: {e}")
            return {
                'name': 'Unknown Player',
                'position': 'UNKNOWN',
                'score': 0.0,
                'error': str(e)
            }
            
    async def batch_get_rosters(self, roster_requests: List[Dict[str, str]]) -> Dict[str, Any]:
        """
        Fetch roster data for multiple entries with rate limiting
        
        Args:
            roster_requests: List of dicts with 'draft_group_id' and 'entry_key'
            
        Returns:
            Dict mapping entry_key to roster data or error
        """
        results = {}
        
        for request in roster_requests:
            draft_group_id = request.get('draft_group_id')
            entry_key = request.get('entry_key')
            
            if not draft_group_id or not entry_key:
                results[f"{draft_group_id}_{entry_key}"] = {
                    'success': False,
                    'error': 'Missing draft_group_id or entry_key'
                }
                continue
                
            try:
                result = await self.get_roster(draft_group_id, entry_key)
                results[f"{draft_group_id}_{entry_key}"] = {
                    'success': True,
                    'data': result
                }
            except Exception as e:
                logger.error(f"Failed to fetch roster for {draft_group_id}/{entry_key}: {e}")
                results[f"{draft_group_id}_{entry_key}"] = {
                    'success': False,
                    'error': str(e)
                }
        
        return results


# Example usage and testing function
async def test_scores_service():
    """Test function to verify the scores service works"""
    try:
        # Test without authentication (will show auth requirement)
        print("Testing scores service without authentication...")
        async with DraftKingsScoresService() as service:
            draft_group_id = "133903"
            entry_key = "4864049590"
            
            print(f"Testing scores service with draft_group_id: {draft_group_id}, entry_key: {entry_key}")
            
            result = await service.get_roster(draft_group_id, entry_key)
            
            print("✅ Successfully fetched roster data:")
            print(f"  Draft Group ID: {result['draft_group_id']}")
            print(f"  Entry Key: {result['entry_key']}")
            print(f"  Username: {result['roster_data']['username']}")
            print(f"  Fantasy Points: {result['roster_data']['fantasy_points']}")
            print(f"  QB: {result['roster_data']['qb_name']} ({result['roster_data']['qb_score']} pts)")
            print(f"  RB1: {result['roster_data']['rb1_name']} ({result['roster_data']['rb1_score']} pts)")
            print(f"  RB2: {result['roster_data']['rb2_name']} ({result['roster_data']['rb2_score']} pts)")
            print(f"  WR1: {result['roster_data']['wr1_name']} ({result['roster_data']['wr1_score']} pts)")
            print(f"  WR2: {result['roster_data']['wr2_name']} ({result['roster_data']['wr2_score']} pts)")
            print(f"  WR3: {result['roster_data']['wr3_name']} ({result['roster_data']['wr3_score']} pts)")
            print(f"  TE: {result['roster_data']['te_name']} ({result['roster_data']['te_score']} pts)")
            print(f"  DST: {result['roster_data']['dst_name']} ({result['roster_data']['dst_score']} pts)")
            print(f"  Total Players: {len(result['roster_data']['players'])}")
            
            return result
            
    except ValueError as e:
        if "Authentication required" in str(e):
            print(f"⚠️  Expected authentication error: {e}")
            print("\n📝 Note: The DraftKings API requires authentication for roster data.")
            print("This is expected behavior for private contest information.")
            return None
        else:
            print(f"❌ Unexpected API Error: {e}")
            raise
    except Exception as e:
        print(f"❌ Test failed: {e}")
        raise


async def test_with_mock_data():
    """Test function with mock data to verify parsing logic"""
    print("\n🧪 Testing parsing logic with mock data...")
    
    # Mock data based on the provided JSON structure
    mock_roster_data = {
        "scorecards": [
            {
                "firstName": "Marcus",
                "lastName": "Mariota",
                "displayName": "Marcus Mariota",
                "rosterPosition": "QB",
                "score": 21.28,
                "draftableId": 40058211,
                "stats": [
                    {"statId": 36, "name": "Passing Touchdowns", "fantasyPoints": 4, "statValue": 1},
                    {"statId": 38, "name": "Rushing Touchdowns", "fantasyPoints": 6, "statValue": 1}
                ],
                "competition": {
                    "name": "LV 24 @ WAS 41",
                    "competitionStatus": "ScoresOfficial",
                    "timeStatus": "Final"
                }
            },
            {
                "firstName": "Kenneth",
                "lastName": "Walker III",
                "displayName": "Kenneth Walker III",
                "rosterPosition": "RB",
                "score": 18.0,
                "draftableId": 40058274,
                "stats": [
                    {"statId": 38, "name": "Rushing Touchdowns", "fantasyPoints": 12, "statValue": 2},
                    {"statId": 41, "name": "Rushing Yards", "fantasyPoints": 3.8, "statValue": 38}
                ],
                "competition": {
                    "name": "NO 13 @ SEA 44",
                    "competitionStatus": "ScoresOfficial",
                    "timeStatus": "Final"
                }
            },
            {
                "firstName": "Jordan",
                "lastName": "Mason",
                "displayName": "Jordan Mason",
                "rosterPosition": "RB",
                "score": 26.6,
                "draftableId": 40058288,
                "stats": [
                    {"statId": 38, "name": "Rushing Touchdowns", "fantasyPoints": 12, "statValue": 2},
                    {"statId": 41, "name": "Rushing Yards", "fantasyPoints": 11.6, "statValue": 116}
                ],
                "competition": {
                    "name": "CIN 10 @ MIN 48",
                    "competitionStatus": "ScoresOfficial",
                    "timeStatus": "Final"
                }
            },
            {
                "firstName": "Rome",
                "lastName": "Odunze",
                "displayName": "Rome Odunze",
                "rosterPosition": "WR",
                "score": 15.2,
                "draftableId": 40058588,
                "stats": [
                    {"statId": 37, "name": "Receiving Touchdowns", "fantasyPoints": 6, "statValue": 1},
                    {"statId": 40, "name": "Receiving Yards", "fantasyPoints": 6.2, "statValue": 62}
                ],
                "competition": {
                    "name": "DAL 14 @ CHI 31",
                    "competitionStatus": "ScoresOfficial",
                    "timeStatus": "Final"
                }
            },
            {
                "firstName": "Keenan",
                "lastName": "Allen",
                "displayName": "Keenan Allen",
                "rosterPosition": "WR",
                "score": 19.5,
                "draftableId": 40058612,
                "stats": [
                    {"statId": 37, "name": "Receiving Touchdowns", "fantasyPoints": 6, "statValue": 1},
                    {"statId": 40, "name": "Receiving Yards", "fantasyPoints": 6.5, "statValue": 65}
                ],
                "competition": {
                    "name": "DEN 20 @ LAC 23",
                    "competitionStatus": "ScoresOfficial",
                    "timeStatus": "Final"
                }
            },
            {
                "firstName": "Puka",
                "lastName": "Nacua",
                "displayName": "Puka Nacua",
                "rosterPosition": "WR",
                "score": 25.8,
                "draftableId": 40058538,
                "stats": [
                    {"statId": 40, "name": "Receiving Yards", "fantasyPoints": 11.2, "statValue": 112},
                    {"statId": 44, "name": "Receptions", "fantasyPoints": 11, "statValue": 11}
                ],
                "competition": {
                    "name": "LAR 26 @ PHI 33",
                    "competitionStatus": "ScoresOfficial",
                    "timeStatus": "Final"
                }
            },
            {
                "firstName": "Trey",
                "lastName": "McBride",
                "displayName": "Trey McBride",
                "rosterPosition": "TE",
                "score": 15.3,
                "draftableId": 40059022,
                "stats": [
                    {"statId": 37, "name": "Receiving Touchdowns", "fantasyPoints": 6, "statValue": 1},
                    {"statId": 40, "name": "Receiving Yards", "fantasyPoints": 4.3, "statValue": 43}
                ],
                "competition": {
                    "name": "ARI 15 @ SF 16",
                    "competitionStatus": "ScoresOfficial",
                    "timeStatus": "Final"
                }
            },
            {
                "firstName": "Commanders",
                "lastName": "",
                "displayName": "Commanders ",
                "rosterPosition": "DST",
                "score": 11.0,
                "draftableId": 40059314,
                "stats": [
                    {"statId": 52, "name": "Sacks", "fantasyPoints": 5, "statValue": 5},
                    {"statId": 55, "name": "Defensive Touchdowns", "fantasyPoints": 6, "statValue": 1}
                ],
                "competition": {
                    "name": "LV 24 @ WAS 41",
                    "competitionStatus": "ScoresOfficial",
                    "timeStatus": "Final"
                }
            }
        ]
    }
    
    mock_entry_data = {
        "userName": "tdavis24",
        "fantasyPoints": 176.68,
        "entryKey": "4864049590"
    }
    
    service = DraftKingsScoresService()
    parsed_roster = service._parse_roster_data(mock_roster_data, mock_entry_data)
    
    print("✅ Successfully parsed mock roster data:")
    print(f"  Username: {parsed_roster['username']}")
    print(f"  Fantasy Points: {parsed_roster['fantasy_points']}")
    print(f"  QB: {parsed_roster['qb_name']} ({parsed_roster['qb_score']} pts)")
    print(f"  RB1: {parsed_roster['rb1_name']} ({parsed_roster['rb1_score']} pts)")
    print(f"  RB2: {parsed_roster['rb2_name']} ({parsed_roster['rb2_score']} pts)")
    print(f"  WR1: {parsed_roster['wr1_name']} ({parsed_roster['wr1_score']} pts)")
    print(f"  WR2: {parsed_roster['wr2_name']} ({parsed_roster['wr2_score']} pts)")
    print(f"  WR3: {parsed_roster['wr3_name']} ({parsed_roster['wr3_score']} pts)")
    print(f"  TE: {parsed_roster['te_name']} ({parsed_roster['te_score']} pts)")
    print(f"  DST: {parsed_roster['dst_name']} ({parsed_roster['dst_score']} pts)")
    print(f"  Total Players: {len(parsed_roster['players'])}")
    print(f"  Contest JSON keys: {list(parsed_roster['contest_json'].keys())}")
    
    return parsed_roster


if __name__ == "__main__":
    # Run tests if script is executed directly
    async def run_all_tests():
        await test_scores_service()
        await test_with_mock_data()
    
    asyncio.run(run_all_tests())
