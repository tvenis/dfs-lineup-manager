from fastapi import APIRouter, HTTPException, Depends
from sqlalchemy.orm import Session
from typing import List, Dict, Any
from app.database import get_db
from app.models import PlayerActuals, Player, Week
from app.schemas import (
    PlayerActualsImportRequest, 
    PlayerActualsImportResponse,
    PlayerActualsListResponse,
    PlayerActuals as PlayerActualsSchema
)
from sqlalchemy import and_

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
    request: Dict[str, Any],
    db: Session = Depends(get_db)
):
    """Import player actuals data with matched players"""
    
    # Extract data from request
    week_id = request.get('week_id')
    matched_players = request.get('matched_players', [])
    
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
            
            # Prepare actuals data
            actuals_data = {
                "week_id": week_id,
                "playerDkId": player.playerDkId,
                "team": player_data.get('team', ''),
                "position": player_data.get('position', ''),
                "completions": float(player_data.get('completions', 0)) if player_data.get('completions') else None,
                "attempts": float(player_data.get('attempts', 0)) if player_data.get('attempts') else None,
                "pass_yds": float(player_data.get('pass_yds', 0)) if player_data.get('pass_yds') else None,
                "pass_tds": float(player_data.get('pass_tds', 0)) if player_data.get('pass_tds') else None,
                "interceptions": float(player_data.get('interceptions', 0)) if player_data.get('interceptions') else None,
                "rush_att": float(player_data.get('rush_att', 0)) if player_data.get('rush_att') else None,
                "rush_yds": float(player_data.get('rush_yds', 0)) if player_data.get('rush_yds') else None,
                "rush_tds": float(player_data.get('rush_tds', 0)) if player_data.get('rush_tds') else None,
                "rec_tgt": float(player_data.get('rec_tgt', 0)) if player_data.get('rec_tgt') else None,
                "receptions": float(player_data.get('receptions', 0)) if player_data.get('receptions') else None,
                "rec_yds": float(player_data.get('rec_yds', 0)) if player_data.get('rec_yds') else None,
                "rec_tds": float(player_data.get('rec_tds', 0)) if player_data.get('rec_tds') else None,
                "fumbles": float(player_data.get('fumbles', 0)) if player_data.get('fumbles') else None,
                "fumbles_lost": float(player_data.get('fumbles_lost', 0)) if player_data.get('fumbles_lost') else None,
                "total_tds": float(player_data.get('total_tds', 0)) if player_data.get('total_tds') else None,
                "two_pt_md": float(player_data.get('two_pt_md', 0)) if player_data.get('two_pt_md') else None,
                "two_pt_pass": float(player_data.get('two_pt_pass', 0)) if player_data.get('two_pt_pass') else None,
                "dk_actuals": float(player_data.get('dk_actuals', 0)) if player_data.get('dk_actuals') else None,
                "vbd": float(player_data.get('vbd', 0)) if player_data.get('vbd') else None,
                "pos_rank": int(player_data.get('pos_rank', 0)) if player_data.get('pos_rank') else None,
                "ov_rank": int(player_data.get('ov_rank', 0)) if player_data.get('ov_rank') else None
            }
            
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
                
        except Exception as e:
            failed_matches += 1
            errors.append(f"Error processing {player_data.get('name', 'Unknown')}: {str(e)}")
            continue
    
    try:
        db.commit()
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
