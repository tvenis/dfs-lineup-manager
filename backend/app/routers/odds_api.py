from fastapi import APIRouter, HTTPException, Depends
from sqlalchemy.orm import Session
from typing import List, Dict, Any
import httpx
import os
from app.database import get_db
from app.models import Team, Game
from app.schemas import TeamCreate, TeamUpdate
from datetime import datetime

router = APIRouter(prefix="/api/odds-api", tags=["odds-api"])

# Odds-API base URL
ODDS_API_BASE_URL = "https://api.the-odds-api.com/v4"

class OddsApiService:
    def __init__(self, api_key: str):
        self.api_key = api_key
        self.base_url = ODDS_API_BASE_URL
    
    def american_to_decimal(self, american_odds: float) -> float:
        """Convert American odds to decimal odds"""
        if american_odds > 0:
            # Positive American odds: decimal = (american / 100) + 1
            return (american_odds / 100) + 1
        else:
            # Negative American odds: decimal = (100 / abs(american)) + 1
            return (100 / abs(american_odds)) + 1
    
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
        api_key: Odds-API key
        db: Database session
    
    Returns:
        Import results with counts and details
    """
    api_key = request.get("api_key")
    if not api_key or not api_key.strip():
        raise HTTPException(status_code=400, detail="API key is required")
    
    try:
        # Initialize Odds-API service
        odds_service = OddsApiService(api_key)
        
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
    api_key = request.get("api_key")
    week_id = request.get("week_id")
    
    if not api_key or not api_key.strip():
        raise HTTPException(status_code=400, detail="API key is required")
    
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
        odds_service = OddsApiService(api_key)
        
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
    api_key = request.get("api_key")
    week_id = request.get("week_id")
    
    if not api_key or not api_key.strip():
        raise HTTPException(status_code=400, detail="API key is required")
    
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
        odds_service = OddsApiService(api_key)
        
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
