from fastapi import APIRouter, HTTPException, Depends, Request
from sqlalchemy.orm import Session
from typing import List, Dict, Any
from app.database import get_db
from app.models import Game, Week, Team
from app.schemas import (
    GameResultsImportRequest, 
    GameResultsImportResponse,
    GameResultsMatchedImportRequest,
    GameListResponse,
    GameSimple
)
from app.services.nflverse_service import NFLVerseService
from app.services.activity_logging import ActivityLoggingService
from sqlalchemy import and_
import time

router = APIRouter(prefix="/api/game-results", tags=["game-results"])

@router.get("/weeks", response_model=List[Dict[str, Any]])
async def get_weeks_for_game_results(db: Session = Depends(get_db)):
    """Get all weeks available for game results import"""
    weeks = db.query(Week).order_by(Week.year.desc(), Week.week_number.desc()).all()
    return [
        {
            "id": week.id,
            "label": f"Week {week.week_number} ({week.year}) - {week.status}",
            "week_number": week.week_number,
            "year": week.year,
            "status": week.status
        }
        for week in weeks
    ]

@router.post("/import-matched", response_model=GameResultsImportResponse)
async def import_matched_game_results(
    request_data: Dict[str, Any],
    request: Request,
    db: Session = Depends(get_db)
):
    """Import game results data with matched teams"""
    
    start_time = time.time()
    
    # Extract client IP and User-Agent
    client_ip = request.client.host if request.client else None
    user_agent = request.headers.get("user-agent")
    
    # Extract data from request
    week_id = request_data.get('week_id')
    matched_games = request_data.get('matched_games', [])
    
    if not week_id:
        raise HTTPException(status_code=400, detail="week_id is required")
    
    # Verify week exists
    week = db.query(Week).filter(Week.id == week_id).first()
    if not week:
        raise HTTPException(status_code=404, detail="Week not found")
    
    total_processed = 0
    successful_matches = 0
    failed_matches = 0
    games_created = 0
    games_updated = 0
    errors = []
    unmatched_games = []
    
    for game_data in matched_games:
        total_processed += 1
        
        try:
            # Check if team_id is provided (already matched)
            team_id = game_data.get('team_id')
            opponent_team_id = game_data.get('opponent_team_id')
            
            if not team_id or not opponent_team_id:
                failed_matches += 1
                unmatched_games.append({
                    "team": game_data.get('team_name', 'Unknown'),
                    "opponent": game_data.get('opponent_name', 'Unknown'),
                    "homeoraway": game_data.get('homeoraway', 'Unknown')
                })
                continue
            
            # Verify teams exist
            team = db.query(Team).filter(Team.id == team_id).first()
            opponent_team = db.query(Team).filter(Team.id == opponent_team_id).first()
            
            if not team or not opponent_team:
                failed_matches += 1
                unmatched_games.append({
                    "team": game_data.get('team_name', 'Unknown'),
                    "opponent": game_data.get('opponent_name', 'Unknown'),
                    "homeoraway": game_data.get('homeoraway', 'Unknown')
                })
                continue
            
            successful_matches += 1
            
            # Check if game already exists for this team and week
            existing_game = db.query(Game).filter(
                and_(
                    Game.week_id == week_id,
                    Game.team_id == team_id
                )
            ).first()
            
            # Prepare game data - handle None values appropriately
            game_record_data = {
                "week_id": week_id,
                "team_id": team_id,
                "opponent_team_id": opponent_team_id,
                "homeoraway": game_data.get('homeoraway', ''),
                "nflverse_game_id": game_data.get('nflverse_game_id'),
                "away_score": game_data.get('away_score'),
                "home_score": game_data.get('home_score'),
                "result": game_data.get('result'),
                "total": game_data.get('total'),
                "overtime": game_data.get('overtime'),
                "weekday": game_data.get('weekday'),
                "gsis": game_data.get('gsis'),
                "pfr": game_data.get('pfr'),
                "pff": game_data.get('pff'),
                "espn": game_data.get('espn'),
                "away_rest": game_data.get('away_rest'),
                "home_rest": game_data.get('home_rest'),
                "div_game": game_data.get('div_game'),
                "roof": game_data.get('roof'),
                "surface": game_data.get('surface'),
                "temp": game_data.get('temp'),
                "wind": game_data.get('wind'),
                "stadium_id": game_data.get('stadium_id'),
                "stadium": game_data.get('stadium')
            }
            
            if existing_game:
                # Update existing game
                for key, value in game_record_data.items():
                    if key not in ['week_id', 'team_id']:  # Don't update these fields
                        setattr(existing_game, key, value)
                games_updated += 1
            else:
                # Create new game
                new_game = Game(**game_record_data)
                db.add(new_game)
                games_created += 1
                
        except Exception as e:
            failed_matches += 1
            errors.append(f"Error processing {game_data.get('team_name', 'Unknown')} vs {game_data.get('opponent_name', 'Unknown')}: {str(e)}")
            continue
    
    try:
        db.commit()
        
        # Calculate duration
        duration_ms = int((time.time() - start_time) * 1000)
        
        # Log activity using ActivityLoggingService
        try:
            activity_service = ActivityLoggingService(db)
            operation_status = "completed" if not errors else "partial"
            
            activity_service.log_import_activity(
                import_type="game-results",
                file_type="API",
                week_id=week_id,
                records_added=games_created,
                records_updated=games_updated,
                records_skipped=failed_matches,
                records_failed=len(errors),
                file_name="NFLVerse Game Results Import",
                import_source="nflverse",
                draft_group=None,
                operation_status=operation_status,
                duration_ms=duration_ms,
                errors=errors if errors else None,
                details={
                    "successful_matches": successful_matches,
                    "total_processed": total_processed,
                    "unmatched_games_count": len(unmatched_games),
                    "unmatched_games": [
                        {
                            "team": g.get("team"),
                            "opponent": g.get("opponent"),
                            "homeoraway": g.get("homeoraway")
                        }
                        for g in unmatched_games[:20]  # Limit to first 20 to avoid huge JSON
                    ] if unmatched_games else []
                },
                ip_address=client_ip,
                user_agent=user_agent
            )
            print(f"✅ Successfully logged game-results-import activity in {duration_ms}ms")
        except Exception as log_error:
            print(f"⚠️ Failed to log import activity: {str(log_error)}")
            # Don't raise - logging failure shouldn't break the import
        
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Database error: {str(e)}")
    
    return GameResultsImportResponse(
        total_processed=total_processed,
        successful_matches=successful_matches,
        failed_matches=failed_matches,
        games_created=games_created,
        games_updated=games_updated,
        errors=errors,
        unmatched_games=unmatched_games,
        match_stats={"exact": successful_matches, "none": failed_matches}
    )

@router.get("/week/{week_id}", response_model=GameListResponse)
async def get_game_results_for_week(week_id: int, db: Session = Depends(get_db)):
    """Get all game results for a specific week"""
    
    # Verify week exists
    week = db.query(Week).filter(Week.id == week_id).first()
    if not week:
        raise HTTPException(status_code=404, detail="Week not found")
    
    games = db.query(Game).filter(Game.week_id == week_id).all()
    
    return GameListResponse(
        games=games,
        total=len(games),
        week_id=week_id
    )

@router.post("/import-nflverse")
async def import_from_nflverse(
    request_data: Dict[str, Any],
    request: Request,
    db: Session = Depends(get_db)
):
    """
    Import game results from NFLVerse API
    
    Request body:
    {
        "week_id": 3,           # Database week ID
        "season": 2025,         # NFL season year
        "week_number": 3,       # Week number (1-18)
        "season_type": "REG",   # "REG", "POST", or "PRE"
        "auto_import": false    # If true, auto-import exact matches
    }
    """
    week_id = request_data.get('week_id')
    season = request_data.get('season')
    week_number = request_data.get('week_number')
    season_type = request_data.get('season_type', 'REG')
    auto_import = request_data.get('auto_import', False)
    
    if not week_id:
        raise HTTPException(status_code=400, detail="week_id is required")
    if not season:
        raise HTTPException(status_code=400, detail="season is required")
    if not week_number:
        raise HTTPException(status_code=400, detail="week_number is required")
    
    try:
        # Fetch and match NFLVerse data
        result = NFLVerseService.process_game_results(
            db=db,
            week_id=week_id,
            season=season,
            week_number=week_number,
            season_type=season_type
        )
        
        # If auto_import is enabled, import exact matches
        if auto_import:
            # Filter to exact matches only
            auto_import_games = [
                g for g in result['matched_games']
                if g.get('match_confidence') == 'exact'
            ]
            
            # Import using the existing import-matched endpoint logic
            import_result = await import_matched_game_results(
                request_data={'week_id': week_id, 'matched_games': auto_import_games},
                request=request,
                db=db
            )
            
            return {
                "status": "success",
                "nflverse_stats": result['match_stats'],
                "total_nflverse_games": result['total_games'],
                "auto_imported": {
                    "total_processed": import_result.total_processed,
                    "successful_matches": import_result.successful_matches,
                    "games_created": import_result.games_created,
                    "games_updated": import_result.games_updated,
                },
                "matched_games": result['matched_games'],
                "unmatched_games": result['unmatched_games']
            }
        else:
            # Just return the matched data for review
            return {
                "status": "success",
                "nflverse_stats": result['match_stats'],
                "total_nflverse_games": result['total_games'],
                "matched_games": result['matched_games'],
                "unmatched_games": result['unmatched_games'],
                "message": "Data fetched successfully. Review and confirm import."
            }
    
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error importing from NFLVerse: {str(e)}")
