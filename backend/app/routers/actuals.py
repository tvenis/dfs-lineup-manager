from fastapi import APIRouter, HTTPException, Depends, Request, BackgroundTasks, Query
from sqlalchemy.orm import Session
from sqlalchemy import func
from typing import List, Dict, Any, Optional
from app.database import get_db
from app.models import PlayerActuals, Player, Week, PlayerPoolEntry, WeeklyPlayerSummary, Game, Team
from app.schemas import (
    PlayerActualsImportRequest, 
    PlayerActualsImportResponse,
    PlayerActualsListResponse,
    PlayerActuals as PlayerActualsSchema
)
from app.services.nflverse_service import NFLVerseService
from app.services.activity_logging import ActivityLoggingService
from sqlalchemy import and_, or_
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
    background_tasks: BackgroundTasks,
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
        
        # Trigger props scoring in background if actuals were imported successfully
        if actuals_created > 0 or actuals_updated > 0:
            background_tasks.add_task(
                score_props_after_actuals_import_background, 
                week_id, 
                actuals_created + actuals_updated
            )
            print(f"🚀 Started background props scoring for week {week_id} ({actuals_created + actuals_updated} actuals imported)")
        
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

@router.get("/all", response_model=List[Dict[str, Any]])
async def get_all_player_actuals(
    position: Optional[str] = Query(None, description="Filter by player position"),
    week: Optional[int] = Query(None, description="Filter by week number"),
    season: Optional[int] = Query(None, description="Filter by season year"),
    search: Optional[str] = Query(None, description="Search by player name or team"),
    tier: Optional[int] = Query(None, description="Filter by tier (1-4)"),
    limit: int = Query(50, ge=1, le=1000, description="Maximum number of records to return"),
    offset: int = Query(0, ge=0, description="Number of records to skip"),
    sort_by: str = Query("dk_points", description="Sort field"),
    sort_direction: str = Query("desc", description="Sort direction (asc/desc)"),
    db: Session = Depends(get_db)
):
    """Get all player actuals with weekly summary data, filtering, and pagination"""
    
    try:
        # Build base query with joins to get all required data
        query = db.query(
            PlayerActuals,
            Player.displayName.label('player_name'),
            Player.position,
            Player.team,
            Week.week_number.label('week'),
            Week.year.label('season'),
            WeeklyPlayerSummary.consensus_projection,
            WeeklyPlayerSummary.consensus_ownership,
            WeeklyPlayerSummary.baseline_salary,
            PlayerPoolEntry.tier,
            PlayerPoolEntry.draftStatAttributes,
            Team.abbreviation.label('opponent'),
            Game.homeoraway
        ).join(
            Player, PlayerActuals.playerDkId == Player.playerDkId
        ).join(
            Week, PlayerActuals.week_id == Week.id
        ).outerjoin(
            WeeklyPlayerSummary, 
            and_(
                WeeklyPlayerSummary.week_id == PlayerActuals.week_id,
                WeeklyPlayerSummary.playerDkId == PlayerActuals.playerDkId
            )
        ).outerjoin(
            PlayerPoolEntry,
            and_(
                PlayerPoolEntry.week_id == PlayerActuals.week_id,
                PlayerPoolEntry.playerDkId == PlayerActuals.playerDkId
            )
        ).outerjoin(
            Game,
            and_(
                Game.week_id == PlayerActuals.week_id,
                Game.team_id == Player.team_id
            )
        ).outerjoin(
            Team,
            Team.id == Game.opponent_team_id
        )
        
        # Apply filters
        if position:
            query = query.filter(Player.position == position)
        
        if week:
            query = query.filter(Week.week_number == week)
            
        if season:
            query = query.filter(Week.year == season)
            
        if search:
            search_term = f"%{search}%"
            query = query.filter(
                or_(
                    Player.displayName.ilike(search_term),
                    Player.team.ilike(search_term)
                )
            )
            
        if tier:
            query = query.filter(PlayerPoolEntry.tier == tier)
        
        # Apply sorting
        if sort_by == "dk_points":
            if sort_direction == "desc":
                query = query.order_by(PlayerActuals.dk_actuals.desc().nullslast())
            else:
                query = query.order_by(PlayerActuals.dk_actuals.asc().nullslast())
        elif sort_by == "proj_consistency":
            # Calculate Proj Consistency: (dk_points / projection) * 100
            if sort_direction == "desc":
                query = query.order_by(
                    (PlayerActuals.dk_actuals / WeeklyPlayerSummary.consensus_projection * 100).desc().nullslast()
                )
            else:
                query = query.order_by(
                    (PlayerActuals.dk_actuals / WeeklyPlayerSummary.consensus_projection * 100).asc().nullslast()
                )
        elif sort_by == "player_name":
            if sort_direction == "desc":
                query = query.order_by(Player.displayName.desc())
            else:
                query = query.order_by(Player.displayName.asc())
        elif sort_by == "salary":
            if sort_direction == "desc":
                query = query.order_by(WeeklyPlayerSummary.baseline_salary.desc().nullslast())
            else:
                query = query.order_by(WeeklyPlayerSummary.baseline_salary.asc().nullslast())
        elif sort_by == "projection":
            if sort_direction == "desc":
                query = query.order_by(WeeklyPlayerSummary.consensus_projection.desc().nullslast())
            else:
                query = query.order_by(WeeklyPlayerSummary.consensus_projection.asc().nullslast())
        elif sort_by == "act_value":
            # Calculate Act Value: dk_points / (salary / 1000)
            if sort_direction == "desc":
                query = query.order_by(
                    (PlayerActuals.dk_actuals / (WeeklyPlayerSummary.baseline_salary / 1000.0)).desc().nullslast()
                )
            else:
                query = query.order_by(
                    (PlayerActuals.dk_actuals / (WeeklyPlayerSummary.baseline_salary / 1000.0)).asc().nullslast()
                )
        elif sort_by == "ownership":
            if sort_direction == "desc":
                query = query.order_by(WeeklyPlayerSummary.consensus_ownership.desc().nullslast())
            else:
                query = query.order_by(WeeklyPlayerSummary.consensus_ownership.asc().nullslast())
        
        # Apply pagination
        query = query.offset(offset).limit(limit)
        
        # Execute query
        results = query.all()
        
        # Format response
        formatted_results = []
        for result in results:
            actuals, player_name, position, team, week_num, season_year, projection, ownership, salary, tier_val, draft_stats, opponent, homeoraway = result
            
            # Extract OPKR data from draftStatAttributes
            oprk_value = None
            oprk_quality = None
            if draft_stats and isinstance(draft_stats, list):
                oprk_attr = next((attr for attr in draft_stats if attr.get('id') == -2), None)
                if oprk_attr:
                    oprk_value = oprk_attr.get('value')
                    oprk_quality = oprk_attr.get('quality')
            
            formatted_results.append({
                "player_id": actuals.playerDkId,
                "player_name": player_name,
                "position": position,
                "team": team,
                "week": week_num,
                "season": season_year,
                "projection": projection,
                "ownership": float(ownership) if ownership else None,
                "salary": salary,
                "tier": tier_val,
                "oprk_value": oprk_value,
                "oprk_quality": oprk_quality,
                "opponent": opponent,
                "homeoraway": homeoraway,
                "dk_points": actuals.dk_actuals,
                "passing_yards": actuals.pass_yds,
                "passing_tds": actuals.pass_tds,
                "interceptions": actuals.interceptions,
                "rushing_yards": actuals.rush_yds,
                "rushing_tds": actuals.rush_tds,
                "receiving_yards": actuals.rec_yds,
                "receiving_tds": actuals.rec_tds,
                "receptions": actuals.receptions,
                "fumbles": actuals.fumbles,
                "created_at": actuals.created_at.isoformat() if actuals.created_at else None,
                "updated_at": actuals.updated_at.isoformat() if actuals.updated_at else None
            })
        
        return formatted_results
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error fetching player actuals: {str(e)}")

@router.get("/top25")
def get_top25_players_by_position(
    position: str = Query(..., description="Position to filter by"),
    limit: int = Query(25, ge=1, le=100, description="Maximum number of players to return"),
    season: int = Query(2024, description="Season year"),
    sort_by: str = Query("total_dk_points", description="Sort field"),
    sort_direction: str = Query("desc", description="Sort direction (asc/desc)"),
    db: Session = Depends(get_db)
):
    """Get top 25 players by position with YTD summed stats"""
    try:
        # Query to get YTD summed stats by player
        query = db.query(
            PlayerActuals.playerDkId,
            Player.displayName.label('player_name'),
            Player.position,
            func.sum(PlayerActuals.dk_actuals).label('total_dk_points'),
            func.sum(WeeklyPlayerSummary.consensus_projection).label('total_projection'),
            func.count(PlayerActuals.id).label('games_played'),
            func.avg(PlayerActuals.dk_actuals).label('avg_dk_points'),
            func.avg(WeeklyPlayerSummary.consensus_projection).label('avg_projection')
        ).join(
            Player, PlayerActuals.playerDkId == Player.playerDkId
        ).join(
            WeeklyPlayerSummary, 
            and_(
                WeeklyPlayerSummary.playerDkId == PlayerActuals.playerDkId,
                WeeklyPlayerSummary.week_id == PlayerActuals.week_id
            )
        ).filter(
            Player.position == position
        ).group_by(
            PlayerActuals.playerDkId,
            Player.displayName,
            Player.position
        )
        
        # Apply sorting
        if sort_by == "total_dk_points":
            if sort_direction == "desc":
                query = query.order_by(func.sum(PlayerActuals.dk_actuals).desc())
            else:
                query = query.order_by(func.sum(PlayerActuals.dk_actuals).asc())
        elif sort_by == "total_projection":
            if sort_direction == "desc":
                query = query.order_by(func.sum(WeeklyPlayerSummary.consensus_projection).desc())
            else:
                query = query.order_by(func.sum(WeeklyPlayerSummary.consensus_projection).asc())
        
        query = query.limit(limit)

        results = query.all()
        
        players = []
        for result in results:
            players.append({
                "player_id": result.playerDkId,
                "player_name": result.player_name,
                "position": result.position,
                "total_projection": float(result.total_projection or 0),
                "total_dk_points": float(result.total_dk_points or 0),
                "games_played": result.games_played,
                "avg_projection": float(result.avg_projection or 0),
                "avg_dk_points": float(result.avg_dk_points or 0)
            })

        return {
            "players": players,
            "position": position,
            "total_count": len(players)
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error fetching top 25 players: {str(e)}")

@router.get("/summary", response_model=Dict[str, Any])
async def get_player_actuals_summary(
    position: Optional[str] = Query(None, description="Filter by player position"),
    week: Optional[int] = Query(None, description="Filter by week number"),
    season: Optional[int] = Query(None, description="Filter by season year"),
    tier: Optional[int] = Query(None, description="Filter by tier (1-4)"),
    db: Session = Depends(get_db)
):
    """Get summary statistics for player actuals"""
    
    try:
        # Build base query with joins
        query = db.query(
            PlayerActuals.dk_actuals,
            Player.position,
            PlayerPoolEntry.tier
        ).join(
            Player, PlayerActuals.playerDkId == Player.playerDkId
        ).join(
            Week, PlayerActuals.week_id == Week.id
        ).outerjoin(
            PlayerPoolEntry,
            and_(
                PlayerPoolEntry.week_id == PlayerActuals.week_id,
                PlayerPoolEntry.playerDkId == PlayerActuals.playerDkId
            )
        )
        
        # Apply filters
        if position:
            query = query.filter(Player.position == position)
        
        if week:
            query = query.filter(Week.week_number == week)
            
        if season:
            query = query.filter(Week.year == season)
            
        if tier:
            query = query.filter(PlayerPoolEntry.tier == tier)
        
        # Execute query
        results = query.all()
        
        if not results:
            return {
                "total_players": 0,
                "average_dk_score": 0,
                "top_performers": 0,
                "low_performers": 0,
                "position_breakdown": {}
            }
        
        # Calculate statistics
        dk_points_list = [r[0] for r in results if r[0] is not None]
        positions = [r[1] for r in results]
        tiers = [r[2] for r in results if r[2] is not None]
        
        total_players = len(dk_points_list)
        average_dk_score = sum(dk_points_list) / len(dk_points_list) if dk_points_list else 0
        top_performers = len([p for p in dk_points_list if p >= 20])
        low_performers = len([p for p in dk_points_list if p < 5])
        
        # Position breakdown
        position_counts = {}
        for pos in positions:
            position_counts[pos] = position_counts.get(pos, 0) + 1
        
        return {
            "total_players": total_players,
            "average_dk_score": round(average_dk_score, 2),
            "top_performers": top_performers,
            "low_performers": low_performers,
            "position_breakdown": position_counts
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error fetching player actuals summary: {str(e)}")

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


# Background task function for scoring props after actuals import
async def score_props_after_actuals_import_background(week_id: int, actuals_count: int):
    """
    Background task to score props after actuals import completes.
    
    This function runs asynchronously after the actuals import is complete,
    automatically scoring all props for the week that now have actuals data.
    
    Args:
        week_id: Week ID that was imported
        actuals_count: Number of actuals records imported
    """
    from app.database import SessionLocal
    from app.services.player_props_scoring_service import PlayerPropsScoringService
    from app.services.activity_logging import ActivityLoggingService
    
    print(f"🎯 Starting background props scoring for week {week_id} ({actuals_count} actuals imported)")
    
    # Create a new database session for the background task
    db = SessionLocal()
    
    try:
        # Initialize services
        scoring_service = PlayerPropsScoringService(db)
        activity_service = ActivityLoggingService(db)
        
        # Score all props for the week
        stats = scoring_service.score_week_props(week_id)
        
        # Log the scoring activity
        activity_service.log_activity(
            action="props-scoring-auto",
            file_type="API",
            week_id=week_id,
            records_updated=stats['scored_props'],
            records_failed=stats['players_missing_actuals'],
            operation_status="completed",
            details={
                "total_props": stats['total_props'],
                "scored_props": stats['scored_props'],
                "hits": stats['hits'],
                "misses": stats['misses'],
                "pushes": stats['pushes'],
                "players_with_actuals": stats['players_with_actuals'],
                "players_missing_actuals": stats['players_missing_actuals'],
                "triggered_by": "actuals-import",
                "actuals_imported": actuals_count
            }
        )
        
        print(f"✅ Background props scoring completed for week {week_id}: {stats}")
        
    except Exception as e:
        print(f"❌ Background props scoring failed for week {week_id}: {e}")
        
        # Log the error
        try:
            activity_service = ActivityLoggingService(db)
            activity_service.log_activity(
                action="props-scoring-auto",
                file_type="API",
                week_id=week_id,
                records_failed=1,
                operation_status="failed",
                errors={"error": str(e)},
                details={
                    "triggered_by": "actuals-import",
                    "actuals_imported": actuals_count
                }
            )
        except:
            pass  # Don't fail on logging errors
            
    finally:
        db.close()
