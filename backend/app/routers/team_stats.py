from fastapi import APIRouter, HTTPException, Depends, Request
from sqlalchemy.orm import Session
from typing import List, Dict, Any
from app.database import get_db
from app.models import TeamStats, Team, Week
from app.schemas import (
    TeamStatsImportRequest, 
    TeamStatsImportResponse,
    TeamStatsListResponse,
    TeamStats as TeamStatsSchema
)
from app.services.nflverse_service import NFLVerseService
from app.services.activity_logging import ActivityLoggingService
from sqlalchemy import and_
import time

router = APIRouter(prefix="/api/team-stats", tags=["team-stats"])

@router.get("/weeks", response_model=List[Dict[str, Any]])
async def get_weeks_for_team_stats(db: Session = Depends(get_db)):
    """Get all weeks available for team stats import"""
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

@router.post("/import-matched", response_model=TeamStatsImportResponse)
async def import_matched_team_stats(
    request_data: Dict[str, Any],
    request: Request,
    db: Session = Depends(get_db)
):
    """Import team stats data with matched teams"""
    
    start_time = time.time()
    
    # Extract client IP and User-Agent
    client_ip = request.client.host if request.client else None
    user_agent = request.headers.get("user-agent")
    
    # Extract data from request
    week_id = request_data.get('week_id')
    matched_teams = request_data.get('matched_teams', [])
    
    if not week_id:
        raise HTTPException(status_code=400, detail="week_id is required")
    
    # Verify week exists
    week = db.query(Week).filter(Week.id == week_id).first()
    if not week:
        raise HTTPException(status_code=404, detail="Week not found")
    
    total_processed = 0
    successful_matches = 0
    failed_matches = 0
    stats_created = 0
    stats_updated = 0
    errors = []
    unmatched_teams = []
    
    for team_data in matched_teams:
        total_processed += 1
        
        try:
            # Check if team_id is provided (already matched)
            team_id = team_data.get('team_id')
            if not team_id:
                failed_matches += 1
                unmatched_teams.append({
                    "team": team_data.get('team_name', 'Unknown'),
                    "opponent": team_data.get('opponent_name', 'Unknown')
                })
                continue
            
            # Verify team exists
            team = db.query(Team).filter(Team.id == team_id).first()
            if not team:
                failed_matches += 1
                unmatched_teams.append({
                    "team": team_data.get('team_name', 'Unknown'),
                    "opponent": team_data.get('opponent_name', 'Unknown')
                })
                continue
            
            successful_matches += 1
            
            # Check if team stats stats already exist for this team and week
            existing_stats = db.query(TeamStats).filter(
                and_(
                    TeamStats.week_id == week_id,
                    TeamStats.team_id == team_id
                )
            ).first()
            
            # Prepare defense stats data - all numeric fields default to 0
            defense_data = {
                "week_id": week_id,
                "team_id": team_id,
                "opponent_team_id": team_data.get('opponent_team_id'),
                
                # Offensive stats allowed
                "completions": float(team_data.get('completions', 0)) if team_data.get('completions') is not None else 0,
                "attempts": float(team_data.get('attempts', 0)) if team_data.get('attempts') is not None else 0,
                "passing_yards": float(team_data.get('passing_yards', 0)) if team_data.get('passing_yards') is not None else 0,
                "passing_tds": float(team_data.get('passing_tds', 0)) if team_data.get('passing_tds') is not None else 0,
                "passing_interceptions": float(team_data.get('passing_interceptions', 0)) if team_data.get('passing_interceptions') is not None else 0,
                "sacks_suffered": float(team_data.get('sacks_suffered', 0)) if team_data.get('sacks_suffered') is not None else 0,
                "sack_yards_lost": float(team_data.get('sack_yards_lost', 0)) if team_data.get('sack_yards_lost') is not None else 0,
                "sack_fumbles": float(team_data.get('sack_fumbles', 0)) if team_data.get('sack_fumbles') is not None else 0,
                "sack_fumbles_lost": float(team_data.get('sack_fumbles_lost', 0)) if team_data.get('sack_fumbles_lost') is not None else 0,
                "passing_air_yards": float(team_data.get('passing_air_yards', 0)) if team_data.get('passing_air_yards') is not None else 0,
                "passing_yards_after_catch": float(team_data.get('passing_yards_after_catch', 0)) if team_data.get('passing_yards_after_catch') is not None else 0,
                "passing_first_downs": float(team_data.get('passing_first_downs', 0)) if team_data.get('passing_first_downs') is not None else 0,
                "passing_epa": float(team_data.get('passing_epa', 0)) if team_data.get('passing_epa') is not None else 0,
                "passing_cpoe": float(team_data.get('passing_cpoe', 0)) if team_data.get('passing_cpoe') is not None else 0,
                "passing_2pt_conversions": float(team_data.get('passing_2pt_conversions', 0)) if team_data.get('passing_2pt_conversions') is not None else 0,
                "carries": float(team_data.get('carries', 0)) if team_data.get('carries') is not None else 0,
                "rushing_yards": float(team_data.get('rushing_yards', 0)) if team_data.get('rushing_yards') is not None else 0,
                "rushing_tds": float(team_data.get('rushing_tds', 0)) if team_data.get('rushing_tds') is not None else 0,
                "rushing_fumbles": float(team_data.get('rushing_fumbles', 0)) if team_data.get('rushing_fumbles') is not None else 0,
                "rushing_fumbles_lost": float(team_data.get('rushing_fumbles_lost', 0)) if team_data.get('rushing_fumbles_lost') is not None else 0,
                "rushing_first_downs": float(team_data.get('rushing_first_downs', 0)) if team_data.get('rushing_first_downs') is not None else 0,
                "rushing_epa": float(team_data.get('rushing_epa', 0)) if team_data.get('rushing_epa') is not None else 0,
                "rushing_2pt_conversions": float(team_data.get('rushing_2pt_conversions', 0)) if team_data.get('rushing_2pt_conversions') is not None else 0,
                "receptions": float(team_data.get('receptions', 0)) if team_data.get('receptions') is not None else 0,
                "targets": float(team_data.get('targets', 0)) if team_data.get('targets') is not None else 0,
                "receiving_yards": float(team_data.get('receiving_yards', 0)) if team_data.get('receiving_yards') is not None else 0,
                "receiving_tds": float(team_data.get('receiving_tds', 0)) if team_data.get('receiving_tds') is not None else 0,
                "receiving_fumbles": float(team_data.get('receiving_fumbles', 0)) if team_data.get('receiving_fumbles') is not None else 0,
                "receiving_fumbles_lost": float(team_data.get('receiving_fumbles_lost', 0)) if team_data.get('receiving_fumbles_lost') is not None else 0,
                "receiving_air_yards": float(team_data.get('receiving_air_yards', 0)) if team_data.get('receiving_air_yards') is not None else 0,
                "receiving_yards_after_catch": float(team_data.get('receiving_yards_after_catch', 0)) if team_data.get('receiving_yards_after_catch') is not None else 0,
                "receiving_first_downs": float(team_data.get('receiving_first_downs', 0)) if team_data.get('receiving_first_downs') is not None else 0,
                "receiving_epa": float(team_data.get('receiving_epa', 0)) if team_data.get('receiving_epa') is not None else 0,
                "receiving_2pt_conversions": float(team_data.get('receiving_2pt_conversions', 0)) if team_data.get('receiving_2pt_conversions') is not None else 0,
                "special_teams_tds": float(team_data.get('special_teams_tds', 0)) if team_data.get('special_teams_tds') is not None else 0,
                
                # Defensive stats
                "def_tackles_solo": float(team_data.get('def_tackles_solo', 0)) if team_data.get('def_tackles_solo') is not None else 0,
                "def_tackles_with_assist": float(team_data.get('def_tackles_with_assist', 0)) if team_data.get('def_tackles_with_assist') is not None else 0,
                "def_tackle_assists": float(team_data.get('def_tackle_assists', 0)) if team_data.get('def_tackle_assists') is not None else 0,
                "def_tackles_for_loss": float(team_data.get('def_tackles_for_loss', 0)) if team_data.get('def_tackles_for_loss') is not None else 0,
                "def_tackles_for_loss_yards": float(team_data.get('def_tackles_for_loss_yards', 0)) if team_data.get('def_tackles_for_loss_yards') is not None else 0,
                "def_fumbles_forced": float(team_data.get('def_fumbles_forced', 0)) if team_data.get('def_fumbles_forced') is not None else 0,
                "def_sacks": float(team_data.get('def_sacks', 0)) if team_data.get('def_sacks') is not None else 0,
                "def_sack_yards": float(team_data.get('def_sack_yards', 0)) if team_data.get('def_sack_yards') is not None else 0,
                "def_qb_hits": float(team_data.get('def_qb_hits', 0)) if team_data.get('def_qb_hits') is not None else 0,
                "def_interceptions": float(team_data.get('def_interceptions', 0)) if team_data.get('def_interceptions') is not None else 0,
                "def_interception_yards": float(team_data.get('def_interception_yards', 0)) if team_data.get('def_interception_yards') is not None else 0,
                "def_pass_defended": float(team_data.get('def_pass_defended', 0)) if team_data.get('def_pass_defended') is not None else 0,
                "def_tds": float(team_data.get('def_tds', 0)) if team_data.get('def_tds') is not None else 0,
                "def_fumbles": float(team_data.get('def_fumbles', 0)) if team_data.get('def_fumbles') is not None else 0,
                "def_safeties": float(team_data.get('def_safeties', 0)) if team_data.get('def_safeties') is not None else 0,
                "misc_yards": float(team_data.get('misc_yards', 0)) if team_data.get('misc_yards') is not None else 0,
                "fumble_recovery_own": float(team_data.get('fumble_recovery_own', 0)) if team_data.get('fumble_recovery_own') is not None else 0,
                "fumble_recovery_yards_own": float(team_data.get('fumble_recovery_yards_own', 0)) if team_data.get('fumble_recovery_yards_own') is not None else 0,
                "fumble_recovery_opp": float(team_data.get('fumble_recovery_opp', 0)) if team_data.get('fumble_recovery_opp') is not None else 0,
                "fumble_recovery_yards_opp": float(team_data.get('fumble_recovery_yards_opp', 0)) if team_data.get('fumble_recovery_yards_opp') is not None else 0,
                "fumble_recovery_tds": float(team_data.get('fumble_recovery_tds', 0)) if team_data.get('fumble_recovery_tds') is not None else 0,
                "penalties": float(team_data.get('penalties', 0)) if team_data.get('penalties') is not None else 0,
                "penalty_yards": float(team_data.get('penalty_yards', 0)) if team_data.get('penalty_yards') is not None else 0,
                
                # Calculated fields
                "dk_defense_score": float(team_data.get('dk_defense_score', 0)) if team_data.get('dk_defense_score') is not None else 0,
            }
            
            if existing_stats:
                # Update existing stats
                for key, value in defense_data.items():
                    if key not in ['week_id', 'team_id']:  # Don't update these fields
                        setattr(existing_stats, key, value)
                stats_updated += 1
            else:
                # Create new stats
                new_stats = TeamStats(**defense_data)
                db.add(new_stats)
                stats_created += 1
                
        except Exception as e:
            failed_matches += 1
            errors.append(f"Error processing {team_data.get('team_name', 'Unknown')}: {str(e)}")
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
                import_type="team-stats",
                file_type="API",
                week_id=week_id,
                records_added=stats_created,
                records_updated=stats_updated,
                records_skipped=failed_matches,
                records_failed=len(errors),
                file_name="NFLVerse Team Defense Import",
                import_source="nflverse",
                draft_group=None,
                operation_status=operation_status,
                duration_ms=duration_ms,
                errors=errors if errors else None,
                details={
                    "successful_matches": successful_matches,
                    "total_processed": total_processed,
                    "unmatched_teams_count": len(unmatched_teams),
                    "unmatched_teams": [
                        {
                            "team": t.get("team"),
                            "opponent": t.get("opponent")
                        }
                        for t in unmatched_teams[:20]  # Limit to first 20 to avoid huge JSON
                    ] if unmatched_teams else []
                },
                ip_address=client_ip,
                user_agent=user_agent
            )
            print(f"✅ Successfully logged team-stats-import activity in {duration_ms}ms")
        except Exception as log_error:
            print(f"⚠️ Failed to log import activity: {str(log_error)}")
            # Don't raise - logging failure shouldn't break the import
        
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Database error: {str(e)}")
    
    return TeamStatsImportResponse(
        total_processed=total_processed,
        successful_matches=successful_matches,
        failed_matches=failed_matches,
        stats_created=stats_created,
        stats_updated=stats_updated,
        errors=errors,
        unmatched_teams=unmatched_teams
    )

@router.get("/week/{week_id}", response_model=TeamStatsListResponse)
async def get_team_stats_for_week(week_id: int, db: Session = Depends(get_db)):
    """Get all team stats stats for a specific week"""
    
    # Verify week exists
    week = db.query(Week).filter(Week.id == week_id).first()
    if not week:
        raise HTTPException(status_code=404, detail="Week not found")
    
    stats = db.query(TeamStats).filter(TeamStats.week_id == week_id).all()
    
    return TeamStatsListResponse(
        stats=stats,
        total=len(stats),
        week_id=week_id
    )

@router.get("/team/{team_id}/week/{week_id}", response_model=TeamStatsSchema)
async def get_team_stats_for_team_and_week(team_id: int, week_id: int, db: Session = Depends(get_db)):
    """Get defense stats for a specific team in a specific week"""
    
    stats = db.query(TeamStats).filter(
        and_(
            TeamStats.team_id == team_id,
            TeamStats.week_id == week_id
        )
    ).first()
    
    if not stats:
        raise HTTPException(status_code=404, detail="Team defense stats not found for this week")
    
    return stats

@router.post("/import-nflverse")
async def import_team_stats_from_nflverse(
    request_data: Dict[str, Any],
    request: Request,
    db: Session = Depends(get_db)
):
    """
    Import team stats stats from NFLVerse API
    
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
        result = NFLVerseService.process_team_stats(
            db=db,
            week_id=week_id,
            season=season,
            week_number=week_number,
            season_type=season_type
        )
        
        # If auto_import is enabled, import exact matches
        if auto_import:
            # Filter to exact matches only
            auto_import_teams = [
                t for t in result['matched_teams']
                if t.get('match_confidence') == 'exact'
            ]
            
            # Import using the existing import-matched endpoint logic
            import_result = await import_matched_team_stats(
                request_data={'week_id': week_id, 'matched_teams': auto_import_teams},
                request=request,
                db=db
            )
            
            return {
                "status": "success",
                "nflverse_stats": result['match_stats'],
                "total_nflverse_teams": result['total_teams'],
                "auto_imported": {
                    "total_processed": import_result.total_processed,
                    "successful_matches": import_result.successful_matches,
                    "stats_created": import_result.stats_created,
                    "stats_updated": import_result.stats_updated,
                },
                "matched_teams": result['matched_teams'],
                "unmatched_teams": result['unmatched_teams']
            }
        else:
            # Just return the matched data for review
            return {
                "status": "success",
                "nflverse_stats": result['match_stats'],
                "total_nflverse_teams": result['total_teams'],
                "matched_teams": result['matched_teams'],
                "unmatched_teams": result['unmatched_teams'],
                "message": "Data fetched successfully. Review and confirm import."
            }
    
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error importing from NFLVerse: {str(e)}")
