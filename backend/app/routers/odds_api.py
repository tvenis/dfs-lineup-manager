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
                        odds_format: str = "decimal", date_format: str = "iso", 
                        bookmakers: str = "draftkings") -> List[Dict[str, Any]]:
        """Fetch events from Odds-API"""
        url = f"{self.base_url}/sports/{sport}/events"
        params = {
            "apiKey": self.api_key,
            "regions": regions,
            "markets": markets,
            "oddsFormat": odds_format,
            "dateFormat": date_format,
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
    odds_format = request.get("odds_format", "decimal")
    date_format = request.get("date_format", "iso")
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
            odds_format=odds_format,
            date_format=date_format,
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
