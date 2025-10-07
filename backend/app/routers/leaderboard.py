from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from sqlalchemy import and_

from app.database import get_db
from app.models import Player, Week, PlayerPropBet, Game, PlayerPoolEntry

router = APIRouter()

@router.get("/player-props")
def get_player_props_for_leaderboard(
    week: str = Query("active", description="Week ID number, 'active', or 'all'"),
    bookmaker: str = Query("all", description="Bookmaker name or 'all'"),
    market: str = Query("anytime_td", description="Market type"),
    player_name: str = Query("all", description="Player name or 'all'"),
    tier: str = Query("all", description="Player tier (1-4) or 'all'"),
    result_status: str = Query("all", description="Result status: 'HIT', 'MISS', 'PUSH', 'NULL', or 'all'"),
    db: Session = Depends(get_db)
):
    """
    Get player props data for the leaderboard table with player names and results.
    """
    try:
        # Build the base query with joins (matching the working player props endpoint pattern)
        query = (
            db.query(PlayerPropBet, Game, Week, Player, PlayerPoolEntry)
            .join(Game, PlayerPropBet.game_id == Game.id)
            .join(Week, PlayerPropBet.week_id == Week.id)
            .join(Player, PlayerPropBet.playerDkId == Player.playerDkId)
            .join(PlayerPoolEntry, and_(
                PlayerPropBet.playerDkId == PlayerPoolEntry.playerDkId,
                PlayerPropBet.week_id == PlayerPoolEntry.week_id
            ))
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
        
        if market and market != "all":
            if market == "anytime_td":
                # Special case: anytime_td filter should show player_tds_over with 0.5 points
                query = query.filter(
                    and_(
                        PlayerPropBet.market == "player_tds_over",
                        PlayerPropBet.outcome_point == 0.5
                    )
                )
            elif market == "player_tds_1_5":
                # Special case: player_tds_1_5 filter should show player_tds_over with 1.5 points
                query = query.filter(
                    and_(
                        PlayerPropBet.market == "player_tds_over",
                        PlayerPropBet.outcome_point == 1.5
                    )
                )
            else:
                query = query.filter(PlayerPropBet.market == market)
        
        if player_name != "all":
            query = query.filter(Player.displayName.ilike(f"%{player_name}%"))
        
        if tier != "all":
            query = query.filter(PlayerPoolEntry.tier == int(tier))
        
        if result_status != "all":
            if result_status == "NULL":
                query = query.filter(PlayerPropBet.result_status.is_(None))
            else:
                query = query.filter(PlayerPropBet.result_status == result_status)
        
        # Order by week (desc), then by player name
        query = query.order_by(Week.week_number.desc(), Player.displayName)
        
        # Execute query
        results = query.all()
        
        # Convert to list of dictionaries (matching the working endpoint pattern)
        props_data = []
        for prop_row, game_row, week_row, player_row, pool_entry_row in results:
            # Get opponent abbreviation from game data
            opponent_abbr = None
            try:
                if getattr(game_row, 'opponent_team', None):
                    opponent_abbr = game_row.opponent_team.abbreviation
            except Exception:
                opponent_abbr = None
            
            # Extract OPRK data from draftStatAttributes
            oprk_value = None
            oprk_quality = None
            try:
                if pool_entry_row and pool_entry_row.draftStatAttributes:
                    import json
                    if isinstance(pool_entry_row.draftStatAttributes, str):
                        attrs = json.loads(pool_entry_row.draftStatAttributes)
                    else:
                        attrs = pool_entry_row.draftStatAttributes
                    
                    # Find OPRK attribute (id === -2)
                    oprk_attr = next((attr for attr in attrs if attr.get('id') == -2), None)
                    if oprk_attr:
                        oprk_value = oprk_attr.get('value')
                        oprk_quality = oprk_attr.get('quality')
            except Exception:
                oprk_value = None
                oprk_quality = None
            
            props_data.append({
                "week_number": week_row.week_number,
                "player_id": player_row.playerDkId,
                "player_name": player_row.displayName,
                "opponent": opponent_abbr,
                "homeoraway": game_row.homeoraway if game_row else None,
                "oprk_value": oprk_value,
                "oprk_quality": oprk_quality,
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
