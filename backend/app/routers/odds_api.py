from fastapi import APIRouter, HTTPException, Depends
from sqlalchemy.orm import Session
from typing import List, Dict, Any
import httpx
import os
from app.database import get_db
from app.models import Team, Game, Player, PlayerPropBet, RecentActivity
from app.schemas import TeamCreate, TeamUpdate
from datetime import datetime
from urllib.parse import urlencode
from sqlalchemy import and_, or_, func

router = APIRouter(prefix="/api/odds-api", tags=["odds-api"])

# Odds-API base URL
ODDS_API_BASE_URL = "https://api.the-odds-api.com/v4"

class OddsApiService:
    def __init__(self):
        self.api_key = os.getenv("ODDS_API_KEY")
        if not self.api_key:
            raise ValueError("ODDS_API_KEY environment variable is required")
        self.base_url = ODDS_API_BASE_URL
    
    def american_to_decimal(self, american_odds: float) -> float:
        """Convert American odds to decimal odds"""
        if american_odds > 0:
            # Positive American odds: decimal = (american / 100) + 1
            return (american_odds / 100) + 1
        else:
            # Negative American odds: decimal = (100 / abs(american)) + 1
            return (100 / abs(american_odds)) + 1
    
    def calculate_outcome_likelihood(self, american_odds: float) -> float:
        """Calculate outcome likelihood (probability) from American odds"""
        if american_odds is None:
            return None
        
        decimal_odds = self.american_to_decimal(american_odds)
        # Convert decimal odds to probability: probability = 1 / decimal_odds
        probability = 1 / decimal_odds
        # Convert to percentage (e.g., 0.625 -> 62.5)
        return probability * 100
    
    async def get_participants(self, sport: str) -> List[Dict[str, Any]]:
        """Fetch participants from Odds-API"""
        url = f"{self.base_url}/sports/{sport}/participants"
        params = {
            "apiKey": self.api_key
        }
        
        async with httpx.AsyncClient() as client:
            try:
                response = await client.get(url, params=params)
                response.raise_for_status()
                return response.json()
            except httpx.HTTPStatusError as e:
                raise HTTPException(
                    status_code=e.response.status_code,
                    detail=f"Odds-API request failed: {e.response.text}"
                )
            except Exception as e:
                raise HTTPException(
                    status_code=500,
                    detail=f"Failed to fetch participants: {str(e)}"
                )
    
    async def get_events(self, sport: str, commence_time_from: str = None, commence_time_to: str = None, 
                        regions: str = "us", markets: str = "h2h,spreads,totals", 
                        bookmakers: str = "draftkings") -> List[Dict[str, Any]]:
        """Fetch events from Odds-API"""
        url = f"{self.base_url}/sports/{sport}/events"
        params = {
            "apiKey": self.api_key,
            "regions": regions,
            "markets": markets,
            "bookmakers": bookmakers
        }
        
        # Add optional time parameters - format for Odds-API (YYYY-MM-DDTHH:MM:SSZ)
        if commence_time_from:
            # Convert to Odds-API format (remove milliseconds if present)
            if '.' in commence_time_from:
                commence_time_from = commence_time_from.split('.')[0] + 'Z'
            elif not commence_time_from.endswith('Z'):
                commence_time_from = commence_time_from + 'Z'
            params["commenceTimeFrom"] = commence_time_from
            
        if commence_time_to:
            # Convert to Odds-API format (remove milliseconds if present)
            if '.' in commence_time_to:
                commence_time_to = commence_time_to.split('.')[0] + 'Z'
            elif not commence_time_to.endswith('Z'):
                commence_time_to = commence_time_to + 'Z'
            params["commenceTimeTo"] = commence_time_to
        
        async with httpx.AsyncClient() as client:
            try:
                response = await client.get(url, params=params)
                response.raise_for_status()
                return response.json()
            except httpx.HTTPStatusError as e:
                raise HTTPException(
                    status_code=e.response.status_code,
                    detail=f"Odds-API request failed: {e.response.text}"
                )
            except Exception as e:
                raise HTTPException(
                    status_code=500,
                    detail=f"Failed to fetch events: {str(e)}"
                )
    
    async def get_odds(self, sport: str, commence_time_from: str = None, commence_time_to: str = None, 
                      regions: str = "us", markets: str = "h2h,spreads,totals", 
                      bookmakers: str = "draftkings") -> List[Dict[str, Any]]:
        """Fetch odds from Odds-API"""
        url = f"{self.base_url}/sports/{sport}/odds"
        params = {
            "apiKey": self.api_key,
            "regions": regions,
            "markets": markets,
            "oddsFormat": "american",
            "dateFormat": "iso",
            "bookmakers": bookmakers
        }
        
        # Add optional time parameters - format for Odds-API (YYYY-MM-DDTHH:MM:SSZ)
        if commence_time_from:
            # Convert to Odds-API format (remove milliseconds if present)
            if '.' in commence_time_from:
                commence_time_from = commence_time_from.split('.')[0] + 'Z'
            elif not commence_time_from.endswith('Z'):
                commence_time_from = commence_time_from + 'Z'
            params["commenceTimeFrom"] = commence_time_from
            
        if commence_time_to:
            # Convert to Odds-API format (remove milliseconds if present)
            if '.' in commence_time_to:
                commence_time_to = commence_time_to.split('.')[0] + 'Z'
            elif not commence_time_to.endswith('Z'):
                commence_time_to = commence_time_to + 'Z'
            params["commenceTimeTo"] = commence_time_to
        
        async with httpx.AsyncClient() as client:
            try:
                response = await client.get(url, params=params)
                response.raise_for_status()
                return response.json()
            except httpx.HTTPStatusError as e:
                raise HTTPException(
                    status_code=e.response.status_code,
                    detail=f"Odds-API request failed: {e.response.text}"
                )
            except Exception as e:
                raise HTTPException(
                    status_code=500,
                    detail=f"Failed to fetch odds: {str(e)}"
                )

    async def get_event_odds(self, sport: str, event_id: str, markets: str, regions: str = "us") -> Dict[str, Any]:
        """Fetch odds for a specific event (game) and markets from Odds-API"""
        url = f"{self.base_url}/sports/{sport}/events/{event_id}/odds"
        params = {
            "apiKey": self.api_key,
            "regions": regions,
            "markets": markets,
            "oddsFormat": "american",
            "dateFormat": "iso",
        }
        async with httpx.AsyncClient() as client:
            try:
                response = await client.get(url, params=params)
                response.raise_for_status()
                return response.json()
            except httpx.HTTPStatusError as e:
                raise HTTPException(
                    status_code=e.response.status_code,
                    detail=f"Odds-API request failed: {e.response.text}"
                )
            except Exception as e:
                raise HTTPException(
                    status_code=500,
                    detail=f"Failed to fetch event odds: {str(e)}"
                )

@router.post("/participants/{sport}")
async def import_participants(
    sport: str,
    request: dict,
    db: Session = Depends(get_db)
):
    """
    Import participants from Odds-API and store in Teams table
    
    Args:
        sport: Sport identifier (e.g., 'americanfootball_nfl')
        db: Database session
    
    Returns:
        Import results with counts and details
    
    Note:
        Requires ODDS_API_KEY environment variable to be set
    """
    try:
        # Initialize Odds-API service
        odds_service = OddsApiService()
        
        # Fetch participants from Odds-API
        participants = await odds_service.get_participants(sport)
        
        if not participants:
            return {
                "success": True,
                "message": "No participants found",
                "teams_created": 0,
                "teams_updated": 0,
                "total_processed": 0
            }
        
        # Process participants and update Teams table
        teams_created = 0
        teams_updated = 0
        errors = []
        
        for participant in participants:
            try:
                # Check if team already exists by odds_api_id
                existing_team = db.query(Team).filter(
                    Team.odds_api_id == participant["id"]
                ).first()
                
                if existing_team:
                    # Update existing team
                    existing_team.full_name = participant["full_name"]
                    existing_team.updated_at = datetime.utcnow()
                    teams_updated += 1
                else:
                    # Create new team
                    new_team = Team(
                        full_name=participant["full_name"],
                        abbreviation=None,  # Will be set manually later
                        mascot=None,  # Will be set manually later
                        logo=None,  # Will be set manually later
                        division=None,  # Will be set manually later
                        conference=None,  # Will be set manually later
                        odds_api_id=participant["id"],
                        created_at=datetime.utcnow(),
                        updated_at=datetime.utcnow()
                    )
                    db.add(new_team)
                    teams_created += 1
                    
            except Exception as e:
                errors.append(f"Failed to process {participant.get('full_name', 'Unknown')}: {str(e)}")
        
        # Commit all changes
        db.commit()
        
        # Log activity (participants don't have week_id, so we'll use a default or skip)
        # Note: Participants endpoint doesn't require week_id, so we'll log to a default week or skip
        # For now, we'll skip logging for participants since it doesn't fit the week-based model
        
        return {
            "success": True,
            "message": f"Successfully imported {len(participants)} participants",
            "teams_created": teams_created,
            "teams_updated": teams_updated,
            "total_processed": len(participants),
            "errors": errors
        }
        
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=500,
            detail=f"Failed to import participants: {str(e)}"
        )

@router.post("/events/{sport}")
async def import_events(
    sport: str,
    request: dict,
    db: Session = Depends(get_db)
):
    """
    Import events from Odds-API and store in Games table
    
    Args:
        sport: Sport identifier (e.g., 'americanfootball_nfl')
        request: Request body containing API key, week_id, and optional parameters
        db: Database session
    
    Returns:
        Import results with counts and details
    """
    week_id = request.get("week_id")
    
    if not week_id:
        raise HTTPException(status_code=400, detail="week_id is required")
    
    # Optional parameters with defaults
    commence_time_from = request.get("commence_time_from")
    commence_time_to = request.get("commence_time_to")
    regions = request.get("regions", "us")
    markets = request.get("markets", "h2h,spreads,totals")
    # Events endpoint does not use odds/date format
    bookmakers = request.get("bookmakers", "draftkings")
    
    try:
        # Initialize Odds-API service
        odds_service = OddsApiService()
        
        # Fetch events from Odds-API
        events = await odds_service.get_events(
            sport=sport,
            commence_time_from=commence_time_from,
            commence_time_to=commence_time_to,
            regions=regions,
            markets=markets,
            bookmakers=bookmakers
        )
        
        if not events:
            return {
                "success": True,
                "message": "No events found",
                "games_created": 0,
                "games_updated": 0,
                "total_processed": 0
            }
        
        # Process events and create Game records
        games_created = 0
        games_updated = 0
        errors = []
        
        for event in events:
            try:
                # Parse the commence_time
                commence_time = datetime.fromisoformat(event["commence_time"].replace('Z', '+00:00'))
                
                # Find home team
                home_team = db.query(Team).filter(
                    Team.full_name == event["home_team"]
                ).first()
                
                # Find away team
                away_team = db.query(Team).filter(
                    Team.full_name == event["away_team"]
                ).first()
                
                if not home_team:
                    errors.append(f"Home team '{event['home_team']}' not found in teams table")
                    continue
                    
                if not away_team:
                    errors.append(f"Away team '{event['away_team']}' not found in teams table")
                    continue
                
                # Create/update home team game record
                home_game = db.query(Game).filter(
                    Game.week_id == week_id,
                    Game.team_id == home_team.id
                ).first()
                
                if home_game:
                    # Update existing home game
                    home_game.opponent_team_id = away_team.id
                    home_game.homeoraway = "H"
                    home_game.start_time = commence_time
                    home_game.odds_api_gameid = event["id"]
                    home_game.updated_at = datetime.utcnow()
                    games_updated += 1
                else:
                    # Create new home game
                    new_home_game = Game(
                        week_id=week_id,
                        team_id=home_team.id,
                        opponent_team_id=away_team.id,
                        homeoraway="H",
                        start_time=commence_time,
                        odds_api_gameid=event["id"],
                        created_at=datetime.utcnow(),
                        updated_at=datetime.utcnow()
                    )
                    db.add(new_home_game)
                    games_created += 1
                
                # Create/update away team game record
                away_game = db.query(Game).filter(
                    Game.week_id == week_id,
                    Game.team_id == away_team.id
                ).first()
                
                if away_game:
                    # Update existing away game
                    away_game.opponent_team_id = home_team.id
                    away_game.homeoraway = "A"
                    away_game.start_time = commence_time
                    away_game.odds_api_gameid = event["id"]
                    away_game.updated_at = datetime.utcnow()
                    games_updated += 1
                else:
                    # Create new away game
                    new_away_game = Game(
                        week_id=week_id,
                        team_id=away_team.id,
                        opponent_team_id=home_team.id,
                        homeoraway="A",
                        start_time=commence_time,
                        odds_api_gameid=event["id"],
                        created_at=datetime.utcnow(),
                        updated_at=datetime.utcnow()
                    )
                    db.add(new_away_game)
                    games_created += 1
                    
            except Exception as e:
                errors.append(f"Failed to process event {event.get('id', 'Unknown')}: {str(e)}")
        
        # Commit all changes
        db.commit()
        
        # Log activity
        try:
            activity = RecentActivity(
                action="odds-api-import",
                category="data-import",
                file_type="API",
                file_name=f"events:{sport}",
                week_id=week_id,
                draft_group=None,
                import_source="odds-api",
                records_added=games_created,
                records_updated=games_updated,
                records_skipped=0,
                records_failed=len(errors),
                operation_status="completed" if len(errors) == 0 else "partial",
                errors=errors if errors else None,
                error_count=len(errors),
                user_name="system",
                details={
                    "total_events": len(events),
                    "regions": regions,
                    "markets": markets,
                    "bookmakers": bookmakers
                }
            )
            db.add(activity)
            db.commit()
            print(f"✅ Successfully logged odds-api events import activity")
        except Exception as e:
            print(f"❌ Failed to log import activity: {str(e)}")
            db.rollback()
        
        return {
            "success": True,
            "message": f"Successfully imported {len(events)} events",
            "games_created": games_created,
            "games_updated": games_updated,
            "total_processed": len(events),
            "errors": errors
        }
        
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=500,
            detail=f"Failed to import events: {str(e)}"
        )

@router.post("/odds/{sport}")
async def import_odds(
    sport: str,
    request: dict,
    db: Session = Depends(get_db)
):
    """
    Import odds from Odds-API and update Game records
    
    Args:
        sport: Sport identifier (e.g., 'americanfootball_nfl')
        request: Request body containing API key, week_id, and optional parameters
        db: Database session
    
    Returns:
        Import results with counts and details
    """
    week_id = request.get("week_id")
    
    if not week_id:
        raise HTTPException(status_code=400, detail="week_id is required")
    
    # Optional parameters with defaults
    commence_time_from = request.get("commence_time_from")
    commence_time_to = request.get("commence_time_to")
    regions = request.get("regions", "us")
    markets = request.get("markets", "h2h,spreads,totals")
    # Odds endpoint: force odds/date format
    odds_format = "american"
    bookmakers = request.get("bookmakers", "draftkings")
    
    try:
        # Initialize Odds-API service
        odds_service = OddsApiService()
        
        print(f"DEBUG: Using odds format (forced): {odds_format}")
        
        # Fetch odds from Odds-API
        odds_data = await odds_service.get_odds(
            sport=sport,
            commence_time_from=commence_time_from,
            commence_time_to=commence_time_to,
            regions=regions,
            markets=markets,
            # Force formats for odds endpoint
            bookmakers=bookmakers
        )
        
        if not odds_data:
            return {
                "success": True,
                "message": "No odds data found",
                "games_updated": 0,
                "total_processed": 0
            }
        
        # Process odds data and update Game records
        games_updated = 0
        errors = []
        
        for event in odds_data:
            try:
                event_id = event["id"]
                
                # Find games with this odds_api_gameid
                games = db.query(Game).filter(
                    Game.odds_api_gameid == event_id,
                    Game.week_id == week_id
                ).all()
                
                print(f"DEBUG: Found {len(games)} games for event ID {event_id}")
                
                if not games:
                    errors.append(f"No games found for event ID {event_id}")
                    continue
                
                # Extract odds data from the first bookmaker (DraftKings)
                bookmaker_data = None
                if event.get("bookmakers"):
                    for bookmaker in event["bookmakers"]:
                        if bookmaker.get("key") == "draftkings":
                            bookmaker_data = bookmaker
                            break
                
                if not bookmaker_data or not bookmaker_data.get("markets"):
                    errors.append(f"No DraftKings odds data found for event ID {event_id}")
                    continue
                
                # Extract market data
                h2h_data = None
                spreads_data = None
                totals_data = None
                
                for market in bookmaker_data["markets"]:
                    if market["key"] == "h2h":
                        h2h_data = market
                    elif market["key"] == "spreads":
                        spreads_data = market
                    elif market["key"] == "totals":
                        totals_data = market
                
                # Process each game record
                for game in games:
                    try:
                        # Update money line from h2h data
                        if h2h_data and h2h_data.get("outcomes"):
                            for outcome in h2h_data["outcomes"]:
                                # Find the team name that matches this game's team
                                team = db.query(Team).filter(Team.id == game.team_id).first()
                                if team and team.full_name == outcome["name"]:
                                    price = outcome["price"]
                                    # Convert American odds to decimal if needed
                                    if odds_format == "american":
                                        converted_price = odds_service.american_to_decimal(price)
                                        game.money_line = converted_price
                                        print(f"DEBUG: Updated {team.full_name} money line: {price} (American) -> {converted_price} (Decimal)")
                                    else:
                                        game.money_line = price
                                        print(f"DEBUG: Updated {team.full_name} money line: {price} (Decimal)")
                                    break
                        
                        # Update spread from spreads data
                        if spreads_data and spreads_data.get("outcomes"):
                            for outcome in spreads_data["outcomes"]:
                                # Find the team name that matches this game's team
                                team = db.query(Team).filter(Team.id == game.team_id).first()
                                if team and team.full_name == outcome["name"]:
                                    # Handle negative spreads properly
                                    spread_value = outcome.get("point")
                                    if spread_value is not None:
                                        game.proj_spread = spread_value
                                    break
                        
                        # Update total from totals data (same for both teams)
                        if totals_data and totals_data.get("outcomes"):
                            for outcome in totals_data["outcomes"]:
                                if outcome["name"] == "Over":
                                    total_value = outcome.get("point")
                                    if total_value is not None:
                                        game.proj_total = total_value
                                    break
                        
                        # Calculate implied team total: (proj_total / 2) - (proj_spread / 2)
                        if game.proj_total is not None and game.proj_spread is not None:
                            game.implied_team_total = (game.proj_total / 2) - (game.proj_spread / 2)
                        
                        game.updated_at = datetime.utcnow()
                        games_updated += 1
                        
                    except Exception as e:
                        errors.append(f"Failed to update game {game.id}: {str(e)}")
                        
            except Exception as e:
                errors.append(f"Failed to process event {event.get('id', 'Unknown')}: {str(e)}")
        
        # Commit all changes
        db.commit()
        
        # Log activity
        try:
            activity = RecentActivity(
                action="odds-api-import",
                category="data-import",
                file_type="API",
                file_name=f"odds:{sport}",
                week_id=week_id,
                draft_group=markets,
                import_source="odds-api",
                records_added=0,
                records_updated=games_updated,
                records_skipped=0,
                records_failed=len(errors),
                operation_status="completed" if len(errors) == 0 else "partial",
                errors=errors if errors else None,
                error_count=len(errors),
                user_name="system",
                details={
                    "total_events": len(odds_data),
                    "regions": regions,
                    "markets": markets,
                    "bookmakers": bookmakers
                }
            )
            db.add(activity)
            db.commit()
            print(f"✅ Successfully logged odds-api odds import activity")
        except Exception as e:
            print(f"❌ Failed to log import activity: {str(e)}")
            db.rollback()
        
        return {
            "success": True,
            "message": f"Successfully processed odds for {len(odds_data)} events",
            "games_updated": games_updated,
            "total_processed": len(odds_data),
            "errors": errors
        }
        
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=500,
            detail=f"Failed to import odds: {str(e)}"
        )

@router.get("/sports")
async def get_available_sports():
    """
    Get list of available sports from Odds-API
    This is a static list since we're focusing on NFL for now
    """
    return {
        "sports": [
            {
                "key": "americanfootball_nfl",
                "title": "NFL",
                "description": "National Football League"
            }
        ]
    }

@router.post("/player-props/{sport}")
async def import_player_props(
    sport: str,
    request: dict,
    db: Session = Depends(get_db)
):
    """
    Import player prop bets from Odds-API for a given market (starting with player_pass_tds).
    - Supports a specific game by odds_api_gameid, or All games for a week.
    - If bookmakers is 'all', fetch from all bookmakers (omit param).
    - Only imports Over bets; Under bets are automatically filtered out.
    """
    week_id = request.get("week_id")
    # Accept single or multiple markets
    markets = request.get("markets")
    if isinstance(markets, list):
        market_list = [m for m in markets if isinstance(m, str) and m]
    elif isinstance(markets, str) and markets:
        market_list = [markets]
    else:
        market_list = ["player_pass_tds"]
    regions = request.get("regions", "us")
    event_id = request.get("event_id")  # odds_api_gameid, optional when 'All'
    bookmakers = request.get("bookmakers", "all")  # 'all' or specific key like 'fanduel'

    if not week_id:
        raise HTTPException(status_code=400, detail="week_id is required")

    try:
        odds_service = OddsApiService()

        # Resolve list of event IDs
        event_ids: List[str] = []
        if event_id and event_id != "All":
            event_ids = [event_id]
        else:
            # Lookup all FUTURE games for the given week with odds_api_gameid
            now = datetime.utcnow()
            games = db.query(Game).filter(
                and_(
                    Game.week_id == week_id,
                    Game.odds_api_gameid != None,
                    or_(Game.start_time == None, Game.start_time >= now)
                )
            ).all()
            # Deduplicate event_ids (one per event)
            seen = set()
            for g in games:
                if g.odds_api_gameid and g.odds_api_gameid not in seen:
                    seen.add(g.odds_api_gameid)
                    event_ids.append(g.odds_api_gameid)

        if not event_ids:
            return {"success": True, "message": "No events found for week", "created": 0, "total_processed": 0, "errors": []}

        total_created = 0
        total_updated = 0
        errors: List[str] = []
        unmatched_players: List[str] = []
        api_requests: List[Dict[str, Any]] = []

        # Helper to normalize and resolve Player by full name (robust)
        def normalize_token(token: str) -> str:
            return token.replace("'", "").replace("-", " ").strip()

        def strip_suffixes(name: str) -> str:
            suffixes = {"jr", "sr", "ii", "iii", "iv", "v"}
            parts = [p for p in name.split() if p.lower().strip('.').strip(',') not in suffixes]
            return " ".join(parts)

        def parse_first_last(name: str) -> tuple[str, str]:
            cleaned = strip_suffixes(normalize_token(name))
            tokens = [t for t in cleaned.split() if t]
            if len(tokens) == 0:
                return "", ""
            if len(tokens) == 1:
                return tokens[0], ""
            return tokens[0], " ".join(tokens[1:])

        def find_player_by_name(name: str) -> Player | None:
            if not name:
                return None
            # Try exact displayName (case-insensitive)
            player = db.query(Player).filter(func.lower(Player.displayName) == func.lower(func.trim(name))).first()
            if player:
                return player

            first, last = parse_first_last(name)
            if first and last:
                # Try exact first/last (case-insensitive)
                player = db.query(Player).filter(
                    and_(func.lower(Player.firstName) == first.lower(), func.lower(Player.lastName) == last.lower())
                ).first()
                if player:
                    return player

            # Try relaxed matching by last name contains and first name initial
            if last:
                first_initial = first[:1].lower() if first else None
                query = db.query(Player).filter(func.lower(Player.lastName).like(f"%{last.lower()}%"))
                if first_initial:
                    query = query.filter(func.lower(Player.firstName).like(f"{first_initial}%"))
                player = query.first()
                if player:
                    return player

            # Try shortName match if available
            player = db.query(Player).filter(Player.shortName.ilike(f"%{name}%")).first()
            if player:
                return player

            # Final fallback: contains on displayName
            player = db.query(Player).filter(Player.displayName.ilike(f"%{name}%")).first()
            return player

        # Iterate over each event and request all selected markets in one API call (comma-delimited)
        for eid in event_ids:
            try:
                markets_param = ",".join(market_list)
                market_set = set(market_list)
                # Record the exact request for observability
                req_url = f"{odds_service.base_url}/sports/{sport}/events/{eid}/odds"
                req_params = {
                    "apiKey": odds_service.api_key,
                    "regions": regions,
                    "markets": markets_param,
                    "oddsFormat": "american",
                    "dateFormat": "iso",
                }
                api_requests.append({
                    "event_id": eid,
                    "url": req_url,
                    "params": req_params,
                    "full_url": f"{req_url}?{urlencode(req_params)}"
                })

                event_odds = await odds_service.get_event_odds(sport=sport, event_id=eid, markets=markets_param, regions=regions)

                # Basic validation
                if not event_odds or not event_odds.get("bookmakers"):
                    continue

                for bookmaker in event_odds["bookmakers"]:
                    # Respect bookmakers filter: if specific bookmaker chosen
                    if bookmakers != "all" and bookmaker.get("key") != bookmakers:
                        continue

                    for mk in bookmaker.get("markets", []):
                        mk_key = mk.get("key")
                        if mk_key not in market_set:
                            continue
                        last_update_iso = mk.get("last_update")
                        last_update_dt = None
                        if last_update_iso:
                            try:
                                last_update_dt = datetime.fromisoformat(last_update_iso.replace('Z', '+00:00'))
                            except Exception:
                                last_update_dt = None

                        for outcome in mk.get("outcomes", []):
                            try:
                                outcome_name = outcome.get("name")
                                outcome_description = outcome.get("description")  # player name
                                outcome_price = outcome.get("price")
                                outcome_point = outcome.get("point")

                                # Skip Under bets - only import Over bets
                                if outcome_name and outcome_name.lower() == "under":
                                    continue

                                player_obj = find_player_by_name(outcome_description) if outcome_description else None

                                if not player_obj:
                                    unmatched_players.append(outcome_description or "<unknown>")
                                    continue

                                # Map event id back to the corresponding Game row for this week
                                game_row = db.query(Game).filter(
                                    Game.week_id == week_id,
                                    Game.odds_api_gameid == eid
                                ).first()
                                if not game_row:
                                    errors.append(f"No game row found for event {eid} (player {outcome_description})")
                                    continue

                                # Upsert: unique on (week_id, game_id, bookmaker, market, outcome_name, playerDkId, outcome_point)
                                existing = db.query(PlayerPropBet).filter(
                                    and_(
                                        PlayerPropBet.week_id == week_id,
                                        PlayerPropBet.game_id == game_row.id,
                                        PlayerPropBet.bookmaker == bookmaker.get("key"),
                                        PlayerPropBet.market == mk_key,
                                        PlayerPropBet.outcome_name == outcome_name,
                                        PlayerPropBet.playerDkId == player_obj.playerDkId,
                                        PlayerPropBet.outcome_point == outcome_point,
                                    )
                                ).first()

                                if existing:
                                    existing.outcome_description = outcome_description
                                    existing.outcome_price = outcome_price
                                    existing.outcome_point = outcome_point
                                    existing.outcome_likelihood = odds_service.calculate_outcome_likelihood(outcome_price)
                                    existing.last_prop_update = last_update_dt
                                    existing.updated_by = "API"
                                    existing.updated_at = datetime.utcnow()
                                    total_updated += 1
                                else:
                                    prop = PlayerPropBet(
                                        week_id=week_id,
                                        game_id=game_row.id,
                                        bookmaker=bookmaker.get("key"),
                                        market=mk_key,
                                        outcome_name=outcome_name,
                                        outcome_description=outcome_description,
                                        playerDkId=player_obj.playerDkId,
                                        outcome_price=outcome_price,
                                        outcome_point=outcome_point,
                                        outcome_likelihood=odds_service.calculate_outcome_likelihood(outcome_price),
                                        updated_by="API",
                                        last_prop_update=last_update_dt,
                                    )
                                    db.add(prop)
                                    total_created += 1
                            except Exception as e:
                                errors.append(f"Failed to process outcome for event {eid}: {str(e)}")
            except HTTPException:
                raise
            except Exception as e:
                errors.append(f"Failed to process event {eid}: {str(e)}")

        # Commit all changes
        db.commit()

        # Log activity with new schema
        markets_param = ",".join(market_list)
        try:
            activity = RecentActivity(
                action="odds-api-import",
                category="data-import",
                file_type="API",
                file_name=f"player-props:{markets_param}",
                week_id=week_id,
                draft_group=markets_param,
                import_source="odds-api",
                records_added=total_created,
                records_updated=total_updated,
                records_skipped=len(unmatched_players),
                records_failed=0,
                operation_status="completed",
                errors=errors if errors else None,
                error_count=len(errors) if errors else 0,
                user_name="system",
                details={
                    "unmatched_players": unmatched_players,
                    "api_requests": api_requests,
                    "bookmaker": bookmakers,
                    "regions": regions,
                    "markets": market_list,
                }
            )
            db.add(activity)
            db.commit()
            print(f"✅ Successfully logged odds-api player-props import activity")
        except Exception as e:
            print(f"❌ Failed to log import activity: {str(e)}")
            db.rollback()

        return {
            "success": True,
            "message": f"Imported player props for {len(event_ids)} event(s)",
            "created": total_created,
            "events_processed": len(event_ids),
            "unmatched_players": len(unmatched_players),
            "updated": total_updated,
            "errors": errors,
        }

    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Failed to import player props: {str(e)}")

@router.get("/activity")
async def get_recent_activity(limit: int = 20, db: Session = Depends(get_db)):
    """Get recent Odds-API import activity"""
    try:
        activities = db.query(RecentActivity).filter(
            RecentActivity.fileName.like('odds-api:%')
        ).order_by(RecentActivity.timestamp.desc()).limit(limit).all()
        
        return activities
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/teams")
async def get_teams_with_odds_ids(db: Session = Depends(get_db)):
    """
    Get all teams with their Odds-API IDs
    """
    teams = db.query(Team).all()
    return {
        "teams": [
            {
                "id": team.id,
                "full_name": team.full_name,
                "abbreviation": team.abbreviation,
                "mascot": team.mascot,
                "logo": team.logo,
                "division": team.division,
                "conference": team.conference,
                "odds_api_id": team.odds_api_id,
                "created_at": team.created_at,
                "updated_at": team.updated_at
            }
            for team in teams
        ],
        "total": len(teams)
    }
