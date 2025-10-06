from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from sqlalchemy import and_

from app.database import get_db
from app.models import Player, Week, PlayerPropBet, Game

router = APIRouter()

@router.get("/player-props")
def get_player_props_for_leaderboard(
    week: str = Query("active", description="Week ID number, 'active', or 'all'"),
    bookmaker: str = Query("all", description="Bookmaker name or 'all'"),
    market: str = Query("player_tds_over", description="Market type"),
    db: Session = Depends(get_db)
):
    """
    Get player props data for the leaderboard table with player names and results.
    """
    try:
        # Build the base query with joins (matching the working player props endpoint pattern)
        query = (
            db.query(PlayerPropBet, Game, Week, Player)
            .join(Game, PlayerPropBet.game_id == Game.id)
            .join(Week, PlayerPropBet.week_id == Week.id)
            .join(Player, PlayerPropBet.playerDkId == Player.playerDkId)
        )
        
        # Apply filters
        if week == "active":
            # Get the active week
            active_week = db.query(Week).filter(Week.status == "Active").first()
            if active_week:
                query = query.filter(PlayerPropBet.week_id == active_week.id)
            else:
                # Fallback to latest week if no active week is set
                latest_week = db.query(Week).order_by(Week.week_number.desc()).first()
                if latest_week:
                    query = query.filter(PlayerPropBet.week_id == latest_week.id)
        elif week != "all":
            try:
                week_id = int(week)
                query = query.filter(PlayerPropBet.week_id == week_id)
            except ValueError:
                raise HTTPException(status_code=400, detail="Invalid week ID parameter")
        
        if bookmaker != "all":
            query = query.filter(PlayerPropBet.bookmaker == bookmaker)
        
        if market:
            query = query.filter(PlayerPropBet.market == market)
        
        # Order by week (desc), then by player name
        query = query.order_by(Week.week_number.desc(), Player.displayName)
        
        # Execute query
        results = query.all()
        
        # Convert to list of dictionaries (matching the working endpoint pattern)
        props_data = []
        for prop_row, game_row, week_row, player_row in results:
            # Get opponent abbreviation from game data
            opponent_abbr = None
            try:
                if getattr(game_row, 'opponent_team', None):
                    opponent_abbr = game_row.opponent_team.abbreviation
            except Exception:
                opponent_abbr = None
            
            props_data.append({
                "week_number": week_row.week_number,
                "player_id": player_row.playerDkId,
                "player_name": player_row.displayName,
                "opponent": opponent_abbr,
                "homeoraway": game_row.homeoraway if game_row else None,
                "bookmaker": prop_row.bookmaker,
                "market": prop_row.market,
                "outcome_name": prop_row.outcome_name,
                "outcome_price": prop_row.outcome_price,
                "outcome_point": prop_row.outcome_point,
                "probability": prop_row.outcome_likelihood,
                "actual_value": prop_row.actual_value,
                "result_status": prop_row.result_status
            })
        
        return props_data
        
    except Exception as e:
        print(f"Error in player props leaderboard: {e}")
        # Return empty array instead of failing
        return []
