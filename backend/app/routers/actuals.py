from fastapi import APIRouter, HTTPException, Depends, Request
from sqlalchemy.orm import Session
from typing import List, Dict, Any
from app.database import get_db
from app.models import PlayerActuals, Player, Week, PlayerPoolEntry
from app.schemas import (
    PlayerActualsImportRequest, 
    PlayerActualsImportResponse,
    PlayerActualsListResponse,
    PlayerActuals as PlayerActualsSchema
)
from app.services.nflverse_service import NFLVerseService
from app.services.activity_logging import ActivityLoggingService
from sqlalchemy import and_
import time

router = APIRouter(prefix="/api/actuals", tags=["actuals"])

@router.get("/weeks", response_model=List[Dict[str, Any]])
async def get_weeks_for_actuals(db: Session = Depends(get_db)):
    """Get all weeks available for actuals import"""
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

@router.post("/import-matched", response_model=PlayerActualsImportResponse)
async def import_matched_actuals(
    request_data: Dict[str, Any],
    request: Request,
    db: Session = Depends(get_db)
):
    """Import player actuals data with matched players"""
    
    start_time = time.time()
    
    # Extract client IP and User-Agent
    client_ip = request.client.host if request.client else None
    user_agent = request.headers.get("user-agent")
    
    # Extract data from request
    week_id = request_data.get('week_id')
    matched_players = request_data.get('matched_players', [])
    
    if not week_id:
        raise HTTPException(status_code=400, detail="week_id is required")
    
    # Verify week exists
    week = db.query(Week).filter(Week.id == week_id).first()
    if not week:
        raise HTTPException(status_code=404, detail="Week not found")
    
    total_processed = 0
    successful_matches = 0
    failed_matches = 0
    actuals_created = 0
    actuals_updated = 0
    errors = []
    unmatched_players = []
    
    for player_data in matched_players:
        total_processed += 1
        
        try:
            # Check if playerDkId is provided (already matched)
            player_dk_id = player_data.get('playerDkId')
            if not player_dk_id:
                failed_matches += 1
                unmatched_players.append({
                    "name": player_data.get('name', 'Unknown'),
                    "team": player_data.get('team', 'Unknown'),
                    "position": player_data.get('position', 'Unknown')
                })
                continue
            
            # Verify player exists
            player = db.query(Player).filter(Player.playerDkId == player_dk_id).first()
            if not player:
                failed_matches += 1
                unmatched_players.append({
                    "name": player_data.get('name', 'Unknown'),
                    "team": player_data.get('team', 'Unknown'),
                    "position": player_data.get('position', 'Unknown')
                })
                continue
            
            successful_matches += 1
            
            # Check if actuals already exist for this player and week
            existing_actuals = db.query(PlayerActuals).filter(
                and_(
                    PlayerActuals.week_id == week_id,
                    PlayerActuals.playerDkId == player.playerDkId
                )
            ).first()
            
            # Prepare actuals data - all numeric fields default to 0 for consistent sorting
            actuals_data = {
                "week_id": week_id,
                "playerDkId": player.playerDkId,
                "team": player_data.get('team', ''),
                "position": player_data.get('position', ''),
                "completions": float(player_data.get('completions', 0)) if player_data.get('completions') is not None else 0,
                "attempts": float(player_data.get('attempts', 0)) if player_data.get('attempts') is not None else 0,
                "pass_yds": float(player_data.get('pass_yds', 0)) if player_data.get('pass_yds') is not None else 0,
                "pass_tds": float(player_data.get('pass_tds', 0)) if player_data.get('pass_tds') is not None else 0,
                "interceptions": float(player_data.get('interceptions', 0)) if player_data.get('interceptions') is not None else 0,
                "rush_att": float(player_data.get('rush_att', 0)) if player_data.get('rush_att') is not None else 0,
                "rush_yds": float(player_data.get('rush_yds', 0)) if player_data.get('rush_yds') is not None else 0,
                "rush_tds": float(player_data.get('rush_tds', 0)) if player_data.get('rush_tds') is not None else 0,
                "rec_tgt": float(player_data.get('rec_tgt', 0)) if player_data.get('rec_tgt') is not None else 0,
                "receptions": float(player_data.get('receptions', 0)) if player_data.get('receptions') is not None else 0,
                "rec_yds": float(player_data.get('rec_yds', 0)) if player_data.get('rec_yds') is not None else 0,
                "rec_tds": float(player_data.get('rec_tds', 0)) if player_data.get('rec_tds') is not None else 0,
                "fumbles": float(player_data.get('fumbles', 0)) if player_data.get('fumbles') is not None else 0,
                "fumbles_lost": float(player_data.get('fumbles_lost', 0)) if player_data.get('fumbles_lost') is not None else 0,
                "total_tds": float(player_data.get('total_tds', 0)) if player_data.get('total_tds') is not None else 0,
                "two_pt_md": float(player_data.get('two_pt_md', 0)) if player_data.get('two_pt_md') is not None else 0,
                "two_pt_pass": float(player_data.get('two_pt_pass', 0)) if player_data.get('two_pt_pass') is not None else 0,
                "dk_actuals": float(player_data.get('dk_actuals', 0)) if player_data.get('dk_actuals') is not None else 0,
                "vbd": float(player_data.get('vbd', 0)) if player_data.get('vbd') is not None else 0,
                "pos_rank": int(player_data.get('pos_rank', 0)) if player_data.get('pos_rank') is not None else 0,
                "ov_rank": int(player_data.get('ov_rank', 0)) if player_data.get('ov_rank') is not None else 0
            }
            # Advanced fields default to 0
            advanced_fields = [
                'sacks_suffered','sack_yards_lost','sack_fumbles_lost','passing_air_yards',
                'passing_yards_after_catch','passing_first_downs','passing_epa','passing_cpoe',
                'pacr','rushing_first_downs','rushing_epa','receiving_air_yards',
                'receiving_yards_after_catch','receiving_first_downs','receiving_epa','racr',
                'target_share','air_yards_share','wopr'
            ]
            for f in advanced_fields:
                actuals_data[f] = float(player_data.get(f, 0)) if player_data.get(f) is not None else 0.0
            
            if existing_actuals:
                # Update existing actuals
                for key, value in actuals_data.items():
                    if key not in ['week_id', 'playerDkId']:  # Don't update these fields
                        setattr(existing_actuals, key, value)
                actuals_updated += 1
            else:
                # Create new actuals
                new_actuals = PlayerActuals(**actuals_data)
                db.add(new_actuals)
                actuals_created += 1
            
            # Update player_pool_entries.actuals if player exists in pool for this week
            pool_entries = db.query(PlayerPoolEntry).filter(
                and_(
                    PlayerPoolEntry.week_id == week_id,
                    PlayerPoolEntry.playerDkId == player.playerDkId
                )
            ).all()
            
            for pool_entry in pool_entries:
                pool_entry.actuals = actuals_data.get('dk_actuals', 0)
                
        except Exception as e:
            failed_matches += 1
            errors.append(f"Error processing {player_data.get('name', 'Unknown')}: {str(e)}")
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
                import_type="player-actuals",
                file_type="API",
                week_id=week_id,
                records_added=actuals_created,
                records_updated=actuals_updated,
                records_skipped=failed_matches,
                records_failed=len(errors),
                file_name="NFLVerse Import",
                import_source="nflverse",
                draft_group=None,
                operation_status=operation_status,
                duration_ms=duration_ms,
                errors=errors if errors else None,
                details={
                    "successful_matches": successful_matches,
                    "total_processed": total_processed,
                    "unmatched_players_count": len(unmatched_players),
                    "unmatched_players": [
                        {
                            "name": p.get("name"),
                            "team": p.get("team"),
                            "position": p.get("position")
                        }
                        for p in unmatched_players[:20]  # Limit to first 20 to avoid huge JSON
                    ] if unmatched_players else []
                },
                ip_address=client_ip,
                user_agent=user_agent
            )
            print(f"✅ Successfully logged player-actuals-import activity in {duration_ms}ms")
        except Exception as log_error:
            print(f"⚠️ Failed to log import activity: {str(log_error)}")
            # Don't raise - logging failure shouldn't break the import
        
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Database error: {str(e)}")
    
    return PlayerActualsImportResponse(
        total_processed=total_processed,
        successful_matches=successful_matches,
        failed_matches=failed_matches,
        actuals_created=actuals_created,
        actuals_updated=actuals_updated,
        errors=errors,
        unmatched_players=unmatched_players
    )

@router.get("/week/{week_id}", response_model=PlayerActualsListResponse)
async def get_actuals_for_week(week_id: int, db: Session = Depends(get_db)):
    """Get all player actuals for a specific week"""
    
    # Verify week exists
    week = db.query(Week).filter(Week.id == week_id).first()
    if not week:
        raise HTTPException(status_code=404, detail="Week not found")
    
    actuals = db.query(PlayerActuals).filter(PlayerActuals.week_id == week_id).all()
    
    return PlayerActualsListResponse(
        actuals=actuals,
        total=len(actuals),
        week_id=week_id
    )

@router.get("/player/{player_dk_id}/week/{week_id}", response_model=PlayerActualsSchema)
async def get_player_actuals(player_dk_id: int, week_id: int, db: Session = Depends(get_db)):
    """Get actuals for a specific player in a specific week"""
    
    actuals = db.query(PlayerActuals).filter(
        and_(
            PlayerActuals.playerDkId == player_dk_id,
            PlayerActuals.week_id == week_id
        )
    ).first()
    
    if not actuals:
        raise HTTPException(status_code=404, detail="Player actuals not found for this week")
    
    return actuals

@router.post("/import-nflverse")
async def import_from_nflverse(
    request_data: Dict[str, Any],
    request: Request,
    db: Session = Depends(get_db)
):
    """
    Import player actuals from NFLVerse API
    
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
        result = NFLVerseService.process_week_stats(
            db=db,
            week_id=week_id,
            season=season,
            week_number=week_number,
            season_type=season_type
        )
        
        # If auto_import is enabled, import exact matches
        if auto_import:
            # Filter to exact and high confidence matches only
            auto_import_players = [
                p for p in result['matched_players']
                if p.get('match_confidence') in ['exact', 'high']
            ]
            
            # Import using the existing import-matched endpoint logic
            import_result = await import_matched_actuals(
                request_data={'week_id': week_id, 'matched_players': auto_import_players},
                request=request,
                db=db
            )
            
            return {
                "status": "success",
                "nflverse_stats": result['match_stats'],
                "total_nflverse_players": result['total_players'],
                "auto_imported": {
                    "total_processed": import_result.total_processed,
                    "successful_matches": import_result.successful_matches,
                    "actuals_created": import_result.actuals_created,
                    "actuals_updated": import_result.actuals_updated,
                },
                "matched_players": result['matched_players'],
                "unmatched_players": result['unmatched_players']
            }
        else:
            # Just return the matched data for review
            return {
                "status": "success",
                "nflverse_stats": result['match_stats'],
                "total_nflverse_players": result['total_players'],
                "matched_players": result['matched_players'],
                "unmatched_players": result['unmatched_players'],
                "message": "Data fetched successfully. Review and confirm import."
            }
    
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error importing from NFLVerse: {str(e)}")
