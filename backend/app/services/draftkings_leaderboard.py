"""
DraftKings Leaderboard Service
Handles fetching leaderboard data from DraftKings API for H2H contests
"""

import asyncio
import logging
from typing import Dict, List, Optional, Any
import httpx
from datetime import datetime
import time

logger = logging.getLogger(__name__)

class DraftKingsLeaderboardService:
    """Service for fetching leaderboard data from DraftKings API"""
    
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
        
    async def get_leaderboard(self, contest_id: str) -> Dict[str, Any]:
        """
        Fetch leaderboard data for a specific contest
        
        Args:
            contest_id: DraftKings contest ID
            
        Returns:
            Dict containing leaderboard data and opponent information
            
        Raises:
            httpx.HTTPError: If API request fails
            ValueError: If contest data is invalid or no opponent found
        """
        try:
            await self._rate_limit()
            
            url = f"{self.base_url}/scores/v1/leaderboards/{contest_id}"
            params = {
                'format': 'json'
            }
            
            logger.info(f"Fetching leaderboard for contest_id: {contest_id}")
            
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
                    raise ValueError(f"Authentication required: {error_msg}. This contest may be private or require login.")
                else:
                    raise ValueError(f"DraftKings API error {error_code}: {error_msg}")
            
            # If no error in JSON but HTTP status is not 200, raise HTTP error
            if response.status_code != 200:
                response.raise_for_status()
            
            # Validate response structure
            if not isinstance(data, dict):
                raise ValueError(f"Invalid response format: expected dict, got {type(data)}")
                
            # Extract contest information
            contest_key = data.get('contestKey')
            draft_group_id = data.get('leader', {}).get('draftGroupId')
            
            if not contest_key:
                raise ValueError("Missing contestKey in response")
                
            if not draft_group_id:
                raise ValueError("Missing draftGroupId in response")
            
            # Find opponent entry (username != 'tvenis')
            opponent_entry = self._find_opponent_entry(data)
            
            if not opponent_entry:
                raise ValueError("No opponent found in leaderboard (no entry with username != 'tvenis')")
            
            # Extract opponent information
            opponent_info = {
                'entry_key': opponent_entry.get('entryKey'),
                'username': opponent_entry.get('userName'),
                'user_key': opponent_entry.get('userKey'),
                'fantasy_points': opponent_entry.get('fantasyPoints'),
                'rank': opponent_entry.get('rank'),
                'draft_group_id': draft_group_id,
                'contest_id': contest_key,
                'lineup_id': opponent_entry.get('lineupId')
            }
            
            # Validate opponent data
            if not opponent_info['entry_key']:
                raise ValueError("Missing entryKey for opponent")
                
            if not opponent_info['username']:
                raise ValueError("Missing username for opponent")
            
            logger.info(f"Found opponent: {opponent_info['username']} (entry_key: {opponent_info['entry_key']})")
            
            return {
                'contest_id': contest_key,
                'draft_group_id': draft_group_id,
                'opponent': opponent_info,
                'full_leaderboard': data,
                'fetched_at': datetime.utcnow().isoformat()
            }
            
        except httpx.HTTPError as e:
            logger.error(f"HTTP error fetching leaderboard for contest {contest_id}: {e}")
            raise
        except Exception as e:
            logger.error(f"Error fetching leaderboard for contest {contest_id}: {e}")
            raise
            
    def _find_opponent_entry(self, leaderboard_data: Dict[str, Any]) -> Optional[Dict[str, Any]]:
        """
        Find the opponent entry in the leaderboard data
        
        Args:
            leaderboard_data: Full leaderboard response from DraftKings API
            
        Returns:
            Dict containing opponent entry data, or None if not found
        """
        try:
            # Check leaderBoard array first
            leaderboard = leaderboard_data.get('leaderBoard', [])
            
            for entry in leaderboard:
                username = entry.get('userName', '').lower()
                if username and username != 'tvenis':
                    logger.debug(f"Found opponent in leaderBoard: {entry.get('userName')}")
                    return entry
            
            # Check leader object if it's not the user
            leader = leaderboard_data.get('leader', {})
            if leader:
                username = leader.get('userName', '').lower()
                if username and username != 'tvenis':
                    logger.debug(f"Found opponent in leader: {leader.get('userName')}")
                    return leader
            
            # Check lastWinningEntry if it's not the user
            last_winning = leaderboard_data.get('lastWinningEntry', {})
            if last_winning:
                username = last_winning.get('userName', '').lower()
                if username and username != 'tvenis':
                    logger.debug(f"Found opponent in lastWinningEntry: {last_winning.get('userName')}")
                    return last_winning
            
            logger.warning("No opponent found in leaderboard data")
            return None
            
        except Exception as e:
            logger.error(f"Error finding opponent entry: {e}")
            return None
            
    async def get_h2h_contests(self, week_id: int) -> List[Dict[str, Any]]:
        """
        Get all H2H contests for a specific week
        This is a placeholder method - in a real implementation, you would need
        to fetch this data from your database or another API endpoint
        
        Args:
            week_id: Week ID to get contests for
            
        Returns:
            List of contest dictionaries with contest_id and other metadata
        """
        # This would typically query your database for H2H contests
        # For now, returning empty list - this should be implemented based on
        # how you store contest data in your system
        logger.info(f"Getting H2H contests for week_id: {week_id}")
        
        # TODO: Implement database query to get H2H contests
        # This might look something like:
        # contests = db.query(Contest).filter(
        #     Contest.week_id == week_id,
        #     Contest.contest_type == 'H2H'
        # ).all()
        
        return []
        
    async def batch_get_leaderboards(self, contest_ids: List[str]) -> Dict[str, Any]:
        """
        Fetch leaderboard data for multiple contests with rate limiting
        
        Args:
            contest_ids: List of contest IDs to fetch
            
        Returns:
            Dict mapping contest_id to leaderboard data or error
        """
        results = {}
        
        for contest_id in contest_ids:
            try:
                result = await self.get_leaderboard(contest_id)
                results[contest_id] = {
                    'success': True,
                    'data': result
                }
            except Exception as e:
                logger.error(f"Failed to fetch leaderboard for contest {contest_id}: {e}")
                results[contest_id] = {
                    'success': False,
                    'error': str(e)
                }
        
        return results


# Example usage and testing function
async def test_leaderboard_service():
    """Test function to verify the leaderboard service works"""
    try:
        # Test without authentication (will show auth requirement)
        print("Testing leaderboard service without authentication...")
        async with DraftKingsLeaderboardService() as service:
            contest_id = "182400523"
            
            print(f"Testing leaderboard service with contest_id: {contest_id}")
            
            result = await service.get_leaderboard(contest_id)
            
            print("✅ Successfully fetched leaderboard data:")
            print(f"  Contest ID: {result['contest_id']}")
            print(f"  Draft Group ID: {result['draft_group_id']}")
            print(f"  Opponent: {result['opponent']['username']}")
            print(f"  Opponent Entry Key: {result['opponent']['entry_key']}")
            print(f"  Opponent Fantasy Points: {result['opponent']['fantasy_points']}")
            print(f"  Opponent Rank: {result['opponent']['rank']}")
            
            return result
            
    except ValueError as e:
        if "Authentication required" in str(e):
            print(f"⚠️  Expected authentication error: {e}")
            print("\n📝 Note: The DraftKings API requires authentication for contest data.")
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
    mock_leaderboard_data = {
        "contestKey": "182400523",
        "leader": {
            "draftGroupId": 133903,
            "contestKey": "182400523",
            "entryKey": "4864049590",
            "lineupId": 5266764690,
            "userName": "tdavis24",
            "userKey": "73360",
            "fantasyPoints": 176.68,
            "rank": 1
        },
        "leaderBoard": [
            {
                "draftGroupId": 133903,
                "contestKey": "182400523",
                "entryKey": "4864049590",
                "lineupId": 5266764690,
                "userName": "tdavis24",
                "userKey": "73360",
                "fantasyPoints": 176.68,
                "rank": 1
            },
            {
                "draftGroupId": 133903,
                "contestKey": "182400523",
                "entryKey": "4865560190",
                "lineupId": 5267076074,
                "userName": "Tvenis",
                "userKey": "47859",
                "fantasyPoints": 128.68,
                "rank": 2
            }
        ]
    }
    
    service = DraftKingsLeaderboardService()
    opponent = service._find_opponent_entry(mock_leaderboard_data)
    
    if opponent:
        print("✅ Successfully found opponent in mock data:")
        print(f"  Username: {opponent.get('userName')}")
        print(f"  Entry Key: {opponent.get('entryKey')}")
        print(f"  Fantasy Points: {opponent.get('fantasyPoints')}")
        print(f"  Rank: {opponent.get('rank')}")
    else:
        print("❌ Failed to find opponent in mock data")
    
    return opponent


if __name__ == "__main__":
    # Run tests if script is executed directly
    async def run_all_tests():
        await test_leaderboard_service()
        await test_with_mock_data()
    
    asyncio.run(run_all_tests())
