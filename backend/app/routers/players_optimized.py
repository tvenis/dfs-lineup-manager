from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session, joinedload
from sqlalchemy import func, and_, text
from typing import List, Optional
import uuid

from app.database import get_db
from app.models import Player, Team, PlayerPoolEntry, Week, Game, PlayerPropBet, PlayerActuals, WeeklyPlayerSummary
from app.schemas import (
    PlayerCreate, PlayerUpdate, Player as PlayerSchema,
    PlayerPoolEntryCreate, PlayerPoolEntryUpdate, PlayerPoolEntry as PlayerPoolEntrySchema,
    PlayerListResponse, PlayerListWithPoolDataResponse, PlayerPoolResponse, PlayerPoolAnalysisResponse, PlayerPoolEntryWithAnalysis, WeekAnalysisData,
    PlayerPropsResponse, PlayerPropBetWithMeta
)
from typing import Dict, Any

router = APIRouter()

@router.get("/profiles-with-pool-data-optimized", response_model=PlayerListWithPoolDataResponse)
def get_player_profiles_with_pool_data_optimized(
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=1000),
    position: Optional[str] = Query(None),
    team_id: Optional[str] = Query(None),
    search: Optional[str] = Query(None),
    show_hidden: bool = Query(False, description="Whether to include hidden players"),
    db: Session = Depends(get_db)
):
    """Optimized version that calculates consistency in a single query"""
    # First get the current active week
    from app.routers.weeks import get_current_week
    try:
        current_week = get_current_week(db)
        week_id = current_week.id
    except Exception:
        return PlayerListWithPoolDataResponse(players=[], total=0, page=1, size=limit)
    
    # Build the main query with consistency calculation in a single SQL query
    # This uses a subquery to calculate YTD totals for each player
    consistency_subquery = db.query(
        PlayerPoolEntry.playerDkId,
        func.sum(PlayerActuals.dk_actuals).label('ytd_actuals'),
        func.sum(PlayerPoolEntry.projectedPoints).label('ytd_projected')
    ).join(
        PlayerActuals, 
        and_(
            PlayerActuals.playerDkId == PlayerPoolEntry.playerDkId,
            PlayerActuals.week_id == PlayerPoolEntry.week_id,
            PlayerActuals.week_id <= week_id
        )
    ).filter(
        PlayerPoolEntry.week_id <= week_id,
        PlayerPoolEntry.projectedPoints.isnot(None)
    ).group_by(PlayerPoolEntry.playerDkId).subquery()
    
    # Main query with left join to pool data, weekly summary, and consistency data
    query = (
        db.query(
            Player,
            PlayerPoolEntry,
            WeeklyPlayerSummary,
            consistency_subquery.c.ytd_actuals,
            consistency_subquery.c.ytd_projected
        )
        .outerjoin(PlayerPoolEntry, 
              and_(PlayerPoolEntry.playerDkId == Player.playerDkId,
                   PlayerPoolEntry.week_id == week_id))
        .outerjoin(WeeklyPlayerSummary,
              and_(WeeklyPlayerSummary.playerDkId == Player.playerDkId,
                   WeeklyPlayerSummary.week_id == week_id))
        .outerjoin(consistency_subquery, 
                  consistency_subquery.c.playerDkId == Player.playerDkId)
    )
    
    # Apply filters
    if position and position != "All":
        query = query.filter(func.upper(Player.position) == position.upper())
    
    if team_id and team_id != "All":
        query = query.filter(func.upper(Player.team) == team_id.upper())
    
    if search:
        query = query.filter(Player.displayName.ilike(f"%{search}%"))
    
    if not show_hidden:
        query = query.filter(Player.hidden == False)
    
    total = query.count()
    results = query.offset(skip).limit(limit).all()
    
    # Process results (no additional queries needed)
    players_with_pool_data = []
    for player, pool_entry, weekly_summary, ytd_actuals, ytd_projected in results:
        # Calculate consistency from pre-computed values
        consistency = None
        if ytd_projected and ytd_projected > 0:
            consistency = round((ytd_actuals or 0) / ytd_projected * 100, 1)
        
        enhanced_player = {
            'playerDkId': player.playerDkId,
            'firstName': player.firstName,
            'lastName': player.lastName,
            'suffix': player.suffix,
            'displayName': player.displayName,
            'shortName': player.shortName,
            'position': player.position,
            'team': player.team,
            'team_id': player.team_id,
            'playerImage50': player.playerImage50,
            'playerImage160': player.playerImage160,
            'hidden': player.hidden,
            'created_at': player.created_at,
            'updated_at': player.updated_at,
            'currentWeekProj': weekly_summary.consensus_projection if weekly_summary else None,
            'currentWeekSalary': weekly_summary.baseline_salary if weekly_summary else None,
            'consistency': consistency,
            'ownership': weekly_summary.consensus_ownership if weekly_summary else None,
            'status': pool_entry.status,
            'poolEntryId': pool_entry.id
        }
        players_with_pool_data.append(enhanced_player)
    
    return PlayerListWithPoolDataResponse(
        players=players_with_pool_data,
        total=total,
        page=skip // limit + 1,
        size=limit
    )
