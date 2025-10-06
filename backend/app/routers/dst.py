"""
DST (Defense/Special Teams) Router

Handles DST-specific endpoints for lineup analysis and performance tracking.
"""

from fastapi import APIRouter, HTTPException, Depends
from sqlalchemy.orm import Session
from typing import List, Dict, Any, Optional
from app.database import get_db
from app.models import Lineup, Player, PlayerPoolEntry, TeamStats, Team, Week
from app.schemas import Lineup as LineupSchema
from app.services.dk_defense_scoring_service import DKDefenseScoringService
from sqlalchemy import and_, or_

router = APIRouter(prefix="/api/dst", tags=["dst"])


class DSTActuals:
    """Data class for DST actuals response"""
    def __init__(
        self,
        player_id: int,
        player_name: str,
        team_abbreviation: str,
        team_full_name: str,
        dk_defense_score: float,
        points_allowed: int,
        individual_stats: Dict[str, Any],
        lineup_id: Optional[int] = None,
        lineup_name: Optional[str] = None
    ):
        self.player_id = player_id
        self.player_name = player_name
        self.team_abbreviation = team_abbreviation
        self.team_full_name = team_full_name
        self.dk_defense_score = dk_defense_score
        self.points_allowed = points_allowed
        self.individual_stats = individual_stats
        self.lineup_id = lineup_id
        self.lineup_name = lineup_name


@router.get("/lineup/{lineup_id}/actuals", response_model=List[Dict[str, Any]])
async def get_dst_actuals_for_lineup(
    lineup_id: int,
    db: Session = Depends(get_db)
):
    """
    Get DST actuals for a specific lineup.
    
    Returns DST players in the lineup with their actual performance data,
    including individual defensive stats and calculated DK scores.
    """
    try:
        # Get the lineup
        lineup = db.query(Lineup).filter(Lineup.id == lineup_id).first()
        if not lineup:
            raise HTTPException(status_code=404, detail="Lineup not found")
        
        # Get DST players from the lineup
        dst_players = []
        
        # Check slots for DST players
        if lineup.slots and 'DST' in lineup.slots:
            dst_player_id = lineup.slots['DST']
            if dst_player_id:
                # Get player details
                player = db.query(Player).filter(Player.playerDkId == dst_player_id).first()
                if player and player.position == 'DST':
                    dst_actuals = await get_dst_actuals_for_player(
                        dst_player_id, lineup.week_id, db
                    )
                    if dst_actuals:
                        dst_players.append({
                            "lineup_id": lineup_id,
                            "lineup_name": lineup.name,
                            "player_id": dst_actuals['player_id'],
                            "player_name": dst_actuals['player_name'],
                            "team_abbreviation": dst_actuals['team_abbreviation'],
                            "team_full_name": dst_actuals['team_full_name'],
                            "dk_defense_score": dst_actuals['dk_defense_score'],
                            "points_allowed": dst_actuals['points_allowed'],
                            "individual_stats": dst_actuals['individual_stats']
                        })
        
        return dst_players
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error fetching DST actuals: {str(e)}")


@router.get("/player/{player_id}/week/{week_id}/actuals", response_model=Dict[str, Any])
async def get_dst_actuals_for_player(
    player_id: int,
    week_id: int,
    db: Session = Depends(get_db)
):
    """
    Get DST actuals for a specific player in a specific week.
    
    Returns comprehensive DST performance data including individual stats
    and calculated DK defense score.
    """
    try:
        # Get player details
        player = db.query(Player).filter(Player.playerDkId == player_id).first()
        if not player:
            raise HTTPException(status_code=404, detail="Player not found")
        
        if player.position != 'DST':
            raise HTTPException(status_code=400, detail="Player is not a DST player")
        
        # Get team details first
        team = db.query(Team).filter(Team.abbreviation == player.team).first()
        if not team:
            raise HTTPException(status_code=404, detail="Team not found")
        
        # Get team stats for the player's team and week
        team_stats = db.query(TeamStats).filter(
            and_(
                TeamStats.week_id == week_id,
                TeamStats.team_id == team.id
            )
        ).first()
        
        # Get points allowed from games table
        from app.services.nflverse_service import NFLVerseService
        points_allowed = NFLVerseService.get_points_allowed_for_team(
            db, team.id, week_id
        )
        
        if team_stats:
            # Calculate DK defense score
            stats_dict = {
                'def_sacks': float(team_stats.def_sacks or 0),
                'def_interceptions': float(team_stats.def_interceptions or 0),
                'fumble_recovery_opp': float(team_stats.fumble_recovery_opp or 0),
                'def_tds': float(team_stats.def_tds or 0),
                'special_teams_tds': float(team_stats.special_teams_tds or 0),
                'def_safeties': float(team_stats.def_safeties or 0),
                'blocked_kicks': float(getattr(team_stats, 'blocked_kicks', 0) or 0)
            }
            
            dk_defense_score = DKDefenseScoringService.calculate_defense_score_from_dict(
                stats_dict, points_allowed
            )
            
            individual_stats = {
                'sacks': team_stats.def_sacks or 0,
                'interceptions': team_stats.def_interceptions or 0,
                'fumble_recoveries': team_stats.fumble_recovery_opp or 0,
                'defensive_tds': team_stats.def_tds or 0,
                'special_teams_tds': team_stats.special_teams_tds or 0,
                'safeties': team_stats.def_safeties or 0,
                'blocked_kicks': getattr(team_stats, 'blocked_kicks', 0) or 0
            }
        else:
            # No team stats available - return zeros
            dk_defense_score = 0.0
            individual_stats = {
                'sacks': 0,
                'interceptions': 0,
                'fumble_recoveries': 0,
                'defensive_tds': 0,
                'special_teams_tds': 0,
                'safeties': 0,
                'blocked_kicks': 0
            }
        
        return {
            "player_id": player_id,
            "player_name": player.displayName,
            "team_abbreviation": team.abbreviation,
            "team_full_name": team.full_name,
            "week_id": week_id,
            "dk_defense_score": dk_defense_score,
            "points_allowed": points_allowed,
            "individual_stats": individual_stats,
            "data_available": team_stats is not None
        }
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error fetching DST actuals: {str(e)}")


@router.get("/week/{week_id}/actuals", response_model=List[Dict[str, Any]])
async def get_all_dst_actuals_for_week(
    week_id: int,
    db: Session = Depends(get_db)
):
    """
    Get DST actuals for all DST players in a specific week.
    
    Useful for analyzing DST performance across all teams in a week.
    """
    try:
        # Get all DST players
        dst_players = db.query(Player).filter(Player.position == 'DST').all()
        
        dst_actuals = []
        for player in dst_players:
            actuals = await get_dst_actuals_for_player(player.playerDkId, week_id, db)
            if actuals:
                dst_actuals.append(actuals)
        
        return dst_actuals
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error fetching DST actuals: {str(e)}")


@router.get("/lineups/week/{week_id}/dst-performance", response_model=List[Dict[str, Any]])
async def get_lineup_dst_performance_for_week(
    week_id: int,
    db: Session = Depends(get_db)
):
    """
    Get DST performance analysis for all lineups in a specific week.
    
    Returns a summary of DST performance across all lineups, useful for
    understanding DST selection patterns and their impact.
    """
    try:
        # Get all lineups for the week
        lineups = db.query(Lineup).filter(Lineup.week_id == week_id).all()
        
        lineup_dst_performance = []
        
        for lineup in lineups:
            # Get DST actuals for this lineup
            dst_actuals = await get_dst_actuals_for_lineup(lineup.id, db)
            
            if dst_actuals:
                total_dst_score = sum(dst['dk_defense_score'] for dst in dst_actuals)
                lineup_dst_performance.append({
                    "lineup_id": lineup.id,
                    "lineup_name": lineup.name,
                    "dst_count": len(dst_actuals),
                    "total_dst_score": total_dst_score,
                    "dst_players": dst_actuals
                })
        
        return lineup_dst_performance
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error fetching lineup DST performance: {str(e)}")


@router.get("/player/{player_id}/performance-history", response_model=List[Dict[str, Any]])
async def get_dst_player_performance_history(
    player_id: int,
    db: Session = Depends(get_db)
):
    """
    Get performance history for a specific DST player across multiple weeks.
    
    Useful for analyzing DST player consistency and trends.
    """
    try:
        # Verify player is DST
        player = db.query(Player).filter(Player.playerDkId == player_id).first()
        if not player or player.position != 'DST':
            raise HTTPException(status_code=400, detail="Player is not a DST player")
        
        # Get team details
        team = db.query(Team).filter(Team.abbreviation == player.team).first()
        if not team:
            raise HTTPException(status_code=404, detail="Team not found")
        
        # Get all weeks with team stats for this player's team
        team_stats_weeks = db.query(TeamStats.week_id).filter(
            TeamStats.team_id == team.id
        ).distinct().all()
        
        performance_history = []
        
        for (week_id,) in team_stats_weeks:
            actuals = await get_dst_actuals_for_player(player_id, week_id, db)
            if actuals:
                # Get week details
                week = db.query(Week).filter(Week.id == week_id).first()
                performance_history.append({
                    "week_id": week_id,
                    "week_number": week.week_number if week else None,
                    "year": week.year if week else None,
                    "dk_defense_score": actuals['dk_defense_score'],
                    "points_allowed": actuals['points_allowed'],
                    "individual_stats": actuals['individual_stats'],
                    "data_available": actuals['data_available']
                })
        
        # Sort by week
        performance_history.sort(key=lambda x: (x.get('year', 0), x.get('week_number', 0)))
        
        return performance_history
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error fetching DST performance history: {str(e)}")
