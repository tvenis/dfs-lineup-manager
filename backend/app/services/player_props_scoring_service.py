"""
Player Props Scoring Service

This service compares player prop bets against actual player statistics
to determine if props were hit, missed, or pushed (tied).

Features:
- Scores individual props based on actual vs expected values
- Calculates hit percentages for players
- Handles various prop types (Over/Under, totals, etc.)
- Provides batch scoring for entire weeks
"""

import logging
from typing import Dict, List, Optional, Tuple
from sqlalchemy.orm import Session
from sqlalchemy import and_, func, text

from ..models import PlayerPropBet, PlayerActuals, Player

logger = logging.getLogger(__name__)


class PlayerPropsScoringService:
    """
    Service to score player prop bets against actual player statistics.
    """
    
    # Mapping from prop market names to actuals column names
    PROP_MAPPINGS = {
        'player_pass_yds': 'pass_yds',
        'player_pass_tds': 'pass_tds', 
        'player_pass_attempts': 'attempts',
        'player_pass_comp': 'completions',
        'player_pass_completions': 'completions',  # Alternative naming
        'player_rush_yds': 'rush_yds',
        'player_rush_tds': 'rush_tds',
        'player_rec_yds': 'rec_yds',
        'player_reception_yds': 'rec_yds',  # Alternative naming
        'player_rec_tds': 'rec_tds',
        'player_receptions': 'receptions',
        'player_rush_attempts': 'rush_att',
        'player_tds_over': 'total_tds'
    }
    
    def __init__(self, db_session: Session):
        """
        Initialize the scoring service.
        
        Args:
            db_session: Database session for operations
        """
        self.db = db_session
    
    def score_week_props(self, week_id: int) -> Dict[str, int]:
        """
        Score all props for a given week.
        
        Args:
            week_id: Week ID to score props for
            
        Returns:
            Dictionary with scoring statistics:
            {
                'total_props': int,
                'scored_props': int,
                'hits': int,
                'misses': int,
                'pushes': int,
                'players_with_actuals': int,
                'players_missing_actuals': int
            }
        """
        logger.info(f"Starting prop scoring for week {week_id}")
        
        # Get all props for the week
        props = self.db.query(PlayerPropBet).filter(
            PlayerPropBet.week_id == week_id
        ).all()
        
        if not props:
            logger.warning(f"No props found for week {week_id}")
            return {
                'total_props': 0,
                'scored_props': 0,
                'hits': 0,
                'misses': 0,
                'pushes': 0,
                'players_with_actuals': 0,
                'players_missing_actuals': 0
            }
        
        stats = {
            'total_props': len(props),
            'scored_props': 0,
            'hits': 0,
            'misses': 0,
            'pushes': 0,
            'players_with_actuals': 0,
            'players_missing_actuals': 0
        }
        
        # Group props by player for efficient actuals lookup
        player_props = {}
        for prop in props:
            player_id = prop.playerDkId
            if player_id not in player_props:
                player_props[player_id] = []
            player_props[player_id].append(prop)
        
        # Get actuals for all players in this week
        actuals_query = self.db.query(PlayerActuals).filter(
            PlayerActuals.week_id == week_id,
            PlayerActuals.playerDkId.in_(list(player_props.keys()))
        )
        actuals_map = {a.playerDkId: a for a in actuals_query.all()}
        
        # Score props for each player
        for player_id, player_prop_list in player_props.items():
            actuals = actuals_map.get(player_id)
            
            if not actuals:
                logger.warning(f"No actuals found for player {player_id} in week {week_id}")
                stats['players_missing_actuals'] += len(player_prop_list)
                continue
            
            stats['players_with_actuals'] += 1
            
            for prop in player_prop_list:
                result = self._score_single_prop(prop, actuals)
                if result:
                    stats['scored_props'] += 1
                    if result['result_status'] == 'HIT':
                        stats['hits'] += 1
                    elif result['result_status'] == 'MISS':
                        stats['misses'] += 1
                    elif result['result_status'] == 'PUSH':
                        stats['pushes'] += 1
                    
                    # Update the prop in database
                    prop.result_status = result['result_status']
                    prop.actual_value = result['actual_value']
                else:
                    stats['players_missing_actuals'] += 1
        
        try:
            self.db.commit()
            logger.info(f"Scoring completed for week {week_id}: {stats}")
        except Exception as e:
            self.db.rollback()
            logger.error(f"Failed to commit scoring results for week {week_id}: {e}")
            raise
        
        return stats
    
    def score_player_props(self, player_id: int, week_id: int) -> List[Dict]:
        """
        Score props for a specific player in a specific week.
        
        Args:
            player_id: DraftKings player ID
            week_id: Week ID
            
        Returns:
            List of dictionaries with scoring results for each prop
        """
        logger.info(f"Scoring props for player {player_id} in week {week_id}")
        
        # Get player's props for the week
        props = self.db.query(PlayerPropBet).filter(
            and_(
                PlayerPropBet.playerDkId == player_id,
                PlayerPropBet.week_id == week_id
            )
        ).all()
        
        if not props:
            logger.warning(f"No props found for player {player_id} in week {week_id}")
            return []
        
        # Get player's actuals for the week
        actuals = self.db.query(PlayerActuals).filter(
            and_(
                PlayerActuals.playerDkId == player_id,
                PlayerActuals.week_id == week_id
            )
        ).first()
        
        if not actuals:
            logger.warning(f"No actuals found for player {player_id} in week {week_id}")
            return []
        
        results = []
        for prop in props:
            result = self._score_single_prop(prop, actuals)
            if result:
                # Update the prop in database
                prop.result_status = result['result_status']
                prop.actual_value = result['actual_value']
                
                results.append({
                    'prop_id': prop.id,
                    'market': prop.market,
                    'outcome_name': prop.outcome_name,
                    'outcome_point': prop.outcome_point,
                    'actual_value': result['actual_value'],
                    'result_status': result['result_status']
                })
        
        try:
            self.db.commit()
            logger.info(f"Scored {len(results)} props for player {player_id}")
        except Exception as e:
            self.db.rollback()
            logger.error(f"Failed to commit scoring results for player {player_id}: {e}")
            raise
        
        return results
    
    def calculate_hit_percentage(self, player_id: int, weeks_back: Optional[int] = None) -> float:
        """
        Calculate overall hit percentage for a player.
        
        Args:
            player_id: DraftKings player ID
            weeks_back: Optional limit on how many weeks back to consider
            
        Returns:
            Hit percentage as a float (0.0 to 1.0), or 0.0 if no scored props
        """
        logger.info(f"Calculating hit percentage for player {player_id}")
        
        # Build query for scored props
        query = self.db.query(PlayerPropBet).filter(
            and_(
                PlayerPropBet.playerDkId == player_id,
                PlayerPropBet.result_status.isnot(None)
            )
        )
        
        if weeks_back:
            # Get the most recent week and calculate cutoff
            latest_week = self.db.query(func.max(PlayerPropBet.week_id)).scalar()
            if latest_week:
                cutoff_week = latest_week - weeks_back + 1
                query = query.filter(PlayerPropBet.week_id >= cutoff_week)
        
        scored_props = query.all()
        
        if not scored_props:
            logger.info(f"No scored props found for player {player_id}")
            return 0.0
        
        hits = sum(1 for prop in scored_props if prop.result_status == 'HIT')
        pushes = sum(1 for prop in scored_props if prop.result_status == 'PUSH')
        
        # Calculate hit percentage (counting pushes as wins)
        hit_percentage = (hits + pushes) / len(scored_props)
        
        logger.info(f"Player {player_id} hit percentage: {hit_percentage:.3f} ({hits + pushes}/{len(scored_props)})")
        return hit_percentage
    
    def _score_single_prop(self, prop: PlayerPropBet, actuals: PlayerActuals) -> Optional[Dict]:
        """
        Score a single prop against actuals.
        
        Args:
            prop: PlayerPropBet object to score
            actuals: PlayerActuals object with actual statistics
            
        Returns:
            Dictionary with scoring result or None if unable to score
        """
        if not prop.market or not prop.outcome_name or prop.outcome_point is None:
            logger.warning(f"Cannot score prop {prop.id}: missing market, outcome_name, or outcome_point")
            return None
        
        # Get the actual value for this prop type
        actuals_field = self.PROP_MAPPINGS.get(prop.market)
        if not actuals_field:
            logger.warning(f"No mapping found for market '{prop.market}'")
            return None
        
        actual_value = getattr(actuals, actuals_field, None)
        if actual_value is None:
            logger.warning(f"No actual value found for field '{actuals_field}' in actuals")
            return None
        
        # Determine result based on outcome name and comparison
        result_status = self._determine_result_status(
            prop.outcome_name, 
            prop.outcome_point, 
            actual_value
        )
        
        return {
            'result_status': result_status,
            'actual_value': actual_value
        }
    
    def _determine_result_status(self, outcome_name: str, outcome_point: float, actual_value: float) -> str:
        """
        Determine if a prop hit, missed, or pushed.
        
        Args:
            outcome_name: The outcome name (e.g., 'Over', 'Under')
            outcome_point: The line/point value
            actual_value: The actual statistic value
            
        Returns:
            'HIT', 'MISS', or 'PUSH'
        """
        outcome_name_lower = outcome_name.lower()
        
        if outcome_name_lower == 'over':
            if actual_value > outcome_point:
                return 'HIT'
            elif actual_value < outcome_point:
                return 'MISS'
            else:
                return 'PUSH'  # Exact tie
                
        elif outcome_name_lower == 'under':
            if actual_value < outcome_point:
                return 'HIT'
            elif actual_value > outcome_point:
                return 'MISS'
            else:
                return 'PUSH'  # Exact tie
                
        else:
            # For other outcome types, we might need more complex logic
            # For now, default to treating as over
            logger.warning(f"Unknown outcome name '{outcome_name}', treating as 'Over'")
            if actual_value > outcome_point:
                return 'HIT'
            elif actual_value < outcome_point:
                return 'MISS'
            else:
                return 'PUSH'
    
    def get_player_props_summary(self, player_id: int) -> Dict:
        """
        Get a summary of all props for a player with scoring statistics.
        
        Args:
            player_id: DraftKings player ID
            
        Returns:
            Dictionary with summary statistics
        """
        logger.info(f"Getting props summary for player {player_id}")
        
        # Get all props for this player
        all_props = self.db.query(PlayerPropBet).filter(
            PlayerPropBet.playerDkId == player_id
        ).all()
        
        if not all_props:
            return {
                'total_props': 0,
                'scored_props': 0,
                'unscored_props': 0,
                'hits': 0,
                'misses': 0,
                'pushes': 0,
                'hit_percentage': 0.0,
                'weeks_with_props': 0
            }
        
        scored_props = [p for p in all_props if p.result_status is not None]
        unscored_props = len(all_props) - len(scored_props)
        
        hits = sum(1 for p in scored_props if p.result_status == 'HIT')
        misses = sum(1 for p in scored_props if p.result_status == 'MISS')
        pushes = sum(1 for p in scored_props if p.result_status == 'PUSH')
        
        hit_percentage = (hits + pushes) / len(scored_props) if scored_props else 0.0
        
        weeks_with_props = len(set(p.week_id for p in all_props))
        
        return {
            'total_props': len(all_props),
            'scored_props': len(scored_props),
            'unscored_props': unscored_props,
            'hits': hits,
            'misses': misses,
            'pushes': pushes,
            'hit_percentage': hit_percentage,
            'weeks_with_props': weeks_with_props
        }
