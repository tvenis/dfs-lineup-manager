from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from sqlalchemy import and_

from app.database import get_db
from app.models import Player, Week, PlayerPropBet

router = APIRouter()

@router.get("/player-props")
def get_player_props_for_leaderboard(
    week: str = Query("active", description="Week number, 'active', or 'all'"),
    bookmaker: str = Query("all", description="Bookmaker name or 'all'"),
    market: str = Query("player_tds_over", description="Market type"),
    db: Session = Depends(get_db)
):
    """
    Get player props data for the leaderboard table with player names and results.
    """
    try:
        # Build the base query with joins
        query = db.query(
            PlayerPropBet.week_id,
            Week.week_number,
            Player.playerDkId.label("player_id"),
            Player.displayName.label("player_name"),
            PlayerPropBet.opponent,
            PlayerPropBet.homeoraway,
            PlayerPropBet.bookmaker,
            PlayerPropBet.market,
            PlayerPropBet.outcome_name,
            PlayerPropBet.outcome_price,
            PlayerPropBet.outcome_point,
            PlayerPropBet.outcome_likelihood.label("probability"),
            PlayerPropBet.actual_value,
            PlayerPropBet.result_status
        ).join(
            Player, PlayerPropBet.playerDkId == Player.playerDkId
        ).join(
            Week, PlayerPropBet.week_id == Week.id
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
                week_num = int(week)
                query = query.filter(Week.week_number == week_num)
            except ValueError:
                raise HTTPException(status_code=400, detail="Invalid week parameter")
        
        if bookmaker != "all":
            query = query.filter(PlayerPropBet.bookmaker == bookmaker)
        
        if market:
            query = query.filter(PlayerPropBet.market == market)
        
        # Order by week (desc), then by player name
        query = query.order_by(Week.week_number.desc(), Player.displayName)
        
        # Execute query
        results = query.all()
        
        # Convert to list of dictionaries
        props_data = []
        for result in results:
            props_data.append({
                "week_number": result.week_number,
                "player_id": result.player_id,
                "player_name": result.player_name,
                "opponent": result.opponent,
                "homeoraway": result.homeoraway,
                "bookmaker": result.bookmaker,
                "market": result.market,
                "outcome_name": result.outcome_name,
                "outcome_price": result.outcome_price,
                "outcome_point": result.outcome_point,
                "probability": result.probability,
                "actual_value": result.actual_value,
                "result_status": result.result_status
            })
        
        return props_data
        
    except Exception as e:
        print(f"Error in player props leaderboard: {e}")
        # Return empty array instead of failing
        return []
