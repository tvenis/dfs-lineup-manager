from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from typing import List, Dict, Any
from app.database import get_db
from app.models import PlayerPropBet
from sqlalchemy import and_

router = APIRouter(prefix="/api/players", tags=["players-batch"])

@router.get("/props/batch")
def get_player_props_batch(
    week_id: int = Query(..., description="Week ID"),
    player_ids: str = Query(..., description="Comma-separated player IDs"),
    markets: str = Query(..., description="Comma-separated markets"),
    bookmakers: str = Query(..., description="Comma-separated bookmakers"),
    db: Session = Depends(get_db)
):
    """
    Fetch player props for multiple players in a single request.
    This replaces hundreds of individual API calls with one batch call.
    """
    try:
        # Parse comma-separated parameters
        player_id_list = [int(pid.strip()) for pid in player_ids.split(',') if pid.strip()]
        market_list = [m.strip() for m in markets.split(',') if m.strip()]
        bookmaker_list = [b.strip() for b in bookmakers.split(',') if b.strip()]
        
        if not player_id_list:
            return {}
        
        # Query all props for the given players, week, markets, and bookmakers
        props = db.query(PlayerPropBet).filter(
            and_(
                PlayerPropBet.week_id == week_id,
                PlayerPropBet.playerDkId.in_(player_id_list),
                PlayerPropBet.market.in_(market_list),
                PlayerPropBet.bookmaker.in_(bookmaker_list)
            )
        ).all()
        
        # Group props by player ID and market
        result: Dict[int, Dict[str, Any]] = {}
        
        for prop in props:
            player_id = prop.playerDkId
            market = prop.market
            
            if player_id not in result:
                result[player_id] = {}
            
            if market not in result[player_id]:
                result[player_id][market] = []
            
            result[player_id][market].append({
                'outcome_name': prop.outcome_name,
                'outcome_point': prop.outcome_point,
                'outcome_price': prop.outcome_price,
                'bookmaker': prop.bookmaker,
                'market': prop.market
            })
        
        # Process each player's props to find the best match
        processed_result: Dict[int, Dict[str, Any]] = {}
        
        for player_id, market_data in result.items():
            processed_result[player_id] = {}
            
            for market, props_list in market_data.items():
                # Find the best prop based on bookmaker preference and outcome
                best_prop = None
                
                # Prefer betonlineag Over 0.5, then betonlineag Over any, then DK Over 0.5, then DK Over any
                for prop in props_list:
                    if (prop['bookmaker'] == 'betonlineag' and 
                        prop['outcome_name'] == 'Over' and 
                        prop['outcome_point'] == 0.5):
                        best_prop = prop
                        break
                
                if not best_prop:
                    for prop in props_list:
                        if (prop['bookmaker'] == 'betonlineag' and 
                            prop['outcome_name'] == 'Over'):
                            best_prop = prop
                            break
                
                if not best_prop:
                    for prop in props_list:
                        if (prop['bookmaker'] == 'draftkings' and 
                            prop['outcome_name'] == 'Over' and 
                            prop['outcome_point'] == 0.5):
                            best_prop = prop
                            break
                
                if not best_prop:
                    for prop in props_list:
                        if (prop['bookmaker'] == 'draftkings' and 
                            prop['outcome_name'] == 'Over'):
                            best_prop = prop
                            break
                
                if not best_prop and props_list:
                    best_prop = props_list[0]  # Fallback to first available
                
                if best_prop:
                    processed_result[player_id][market] = {
                        'point': best_prop['outcome_point'],
                        'price': best_prop['outcome_price'],
                        'bookmaker': best_prop['bookmaker']
                    }
        
        return processed_result
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error fetching batch props: {str(e)}")
