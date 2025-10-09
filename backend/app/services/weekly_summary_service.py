from sqlalchemy.orm import Session
from sqlalchemy import func, and_
from typing import List, Optional, Tuple
from app.models import WeeklyPlayerSummary, PlayerPoolEntry, Projection, OwnershipEstimate
import logging

logger = logging.getLogger(__name__)

class WeeklySummaryService:
    """Service to populate and manage weekly player summaries"""
    
    @staticmethod
    def populate_weekly_summary(db: Session, week_id: int, main_draftgroup: str = None) -> int:
        """
        Populate weekly summary for a given week
        Returns number of records created/updated
        """
        # Get all players with pool entries for this week
        players_with_entries = db.query(PlayerPoolEntry.playerDkId).filter(
            PlayerPoolEntry.week_id == week_id
        ).distinct().all()
        
        updated_count = 0
        
        for (playerDkId,) in players_with_entries:
            # Get baseline salary (main slate first, then min across all slates)
            baseline_salary = WeeklySummaryService._get_baseline_salary(
                db, week_id, playerDkId, main_draftgroup
            )
            
            # Get consensus projection from Projection table
            consensus_projection = WeeklySummaryService._get_consensus_projection(
                db, week_id, playerDkId
            )
            
            # Get consensus ownership from OwnershipEstimate table
            consensus_ownership = WeeklySummaryService._get_consensus_ownership(
                db, week_id, playerDkId
            )
            
            # Get OPRK data from player pool entry
            oprk_value, oprk_quality = WeeklySummaryService._get_oprk_data(
                db, week_id, playerDkId, main_draftgroup
            )
            
            # Upsert weekly summary
            existing = db.query(WeeklyPlayerSummary).filter(
                and_(
                    WeeklyPlayerSummary.week_id == week_id,
                    WeeklyPlayerSummary.playerDkId == playerDkId
                )
            ).first()
            
            if existing:
                existing.baseline_salary = baseline_salary
                existing.consensus_projection = consensus_projection
                existing.consensus_ownership = consensus_ownership
                existing.baseline_source = main_draftgroup or "multi_slate"
                existing.oprk_value = oprk_value
                existing.oprk_quality = oprk_quality
            else:
                new_summary = WeeklyPlayerSummary(
                    week_id=week_id,
                    playerDkId=playerDkId,
                    baseline_salary=baseline_salary,
                    consensus_projection=consensus_projection,
                    consensus_ownership=consensus_ownership,
                    baseline_source=main_draftgroup or "multi_slate",
                    oprk_value=oprk_value,
                    oprk_quality=oprk_quality
                )
                db.add(new_summary)
            
            updated_count += 1
        
        db.commit()
        return updated_count
    
    @staticmethod
    def _get_baseline_salary(db: Session, week_id: int, playerDkId: int, main_draftgroup: str = None) -> Optional[int]:
        """Get baseline salary - main slate first, then min across all slates"""
        if main_draftgroup:
            # Try main slate first
            main_entry = db.query(PlayerPoolEntry).filter(
                and_(
                    PlayerPoolEntry.week_id == week_id,
                    PlayerPoolEntry.playerDkId == playerDkId,
                    PlayerPoolEntry.draftGroup == main_draftgroup
                )
            ).first()
            
            if main_entry:
                return main_entry.salary
        
        # Fallback to min salary across all slates
        min_salary = db.query(func.min(PlayerPoolEntry.salary)).filter(
            and_(
                PlayerPoolEntry.week_id == week_id,
                PlayerPoolEntry.playerDkId == playerDkId
            )
        ).scalar()
        
        return min_salary
    
    @staticmethod
    def _get_consensus_projection(db: Session, week_id: int, playerDkId: int) -> Optional[float]:
        """Get consensus projection from Projection table"""
        # Get average of all projections for this player/week
        avg_projection = db.query(func.avg(Projection.pprProjections)).filter(
            and_(
                Projection.week_id == week_id,
                Projection.playerDkId == playerDkId,
                Projection.pprProjections.isnot(None)
            )
        ).scalar()
        
        return round(avg_projection, 2) if avg_projection else None
    
    @staticmethod
    def _get_consensus_ownership(db: Session, week_id: int, playerDkId: int) -> Optional[float]:
        """Get consensus ownership from OwnershipEstimate table"""
        # Get average of all ownership estimates for this player/week
        avg_ownership = db.query(func.avg(OwnershipEstimate.ownership)).filter(
            and_(
                OwnershipEstimate.week_id == week_id,
                OwnershipEstimate.playerDkId == playerDkId
            )
        ).scalar()
        
        return round(avg_ownership, 2) if avg_ownership else None
    
    @staticmethod
    def _get_oprk_data(db: Session, week_id: int, playerDkId: int, main_draftgroup: str = None) -> Tuple[Optional[int], Optional[str]]:
        """
        Get OPRK (Opponent Rank) data from player pool entry's draftStatAttributes
        Returns: (oprk_value, oprk_quality)
        
        OPRK is stored in draftStatAttributes as an object with id == -2
        """
        # Try main draft group first if provided
        pool_entry = None
        
        if main_draftgroup:
            pool_entry = db.query(PlayerPoolEntry).filter(
                and_(
                    PlayerPoolEntry.week_id == week_id,
                    PlayerPoolEntry.playerDkId == playerDkId,
                    PlayerPoolEntry.draftGroup == main_draftgroup
                )
            ).first()
        
        # Fallback to any pool entry for this player/week
        if not pool_entry:
            pool_entry = db.query(PlayerPoolEntry).filter(
                and_(
                    PlayerPoolEntry.week_id == week_id,
                    PlayerPoolEntry.playerDkId == playerDkId
                )
            ).first()
        
        if not pool_entry or not pool_entry.draftStatAttributes:
            return None, None
        
        # Extract OPRK from draftStatAttributes
        try:
            draft_stats = pool_entry.draftStatAttributes
            
            # Handle if it's stored as a string (shouldn't be, but just in case)
            if isinstance(draft_stats, str):
                import json
                draft_stats = json.loads(draft_stats)
            
            # draftStatAttributes is a list of attribute objects
            if isinstance(draft_stats, list):
                # Find the OPRK attribute (id == -2)
                oprk_attr = next((attr for attr in draft_stats if isinstance(attr, dict) and attr.get('id') == -2), None)
                
                if oprk_attr:
                    oprk_value_raw = oprk_attr.get('value')
                    oprk_quality = oprk_attr.get('quality')
                    
                    # Parse OPRK value - DraftKings returns ordinal strings like "1st", "13th", etc.
                    # We need to extract just the integer part
                    oprk_value = None
                    if oprk_value_raw is not None:
                        if isinstance(oprk_value_raw, int):
                            oprk_value = oprk_value_raw
                        elif isinstance(oprk_value_raw, str):
                            # Remove ordinal suffixes (st, nd, rd, th) and parse as int
                            import re
                            match = re.match(r'^(\d+)', oprk_value_raw)
                            if match:
                                try:
                                    oprk_value = int(match.group(1))
                                except ValueError:
                                    logger.warning(f"Failed to parse OPRK value '{oprk_value_raw}' for player {playerDkId}")
                                    oprk_value = None
                    
                    logger.debug(f"Extracted OPRK for player {playerDkId}: raw='{oprk_value_raw}' parsed={oprk_value}, quality={oprk_quality}")
                    return oprk_value, oprk_quality
            
            return None, None
            
        except Exception as e:
            logger.warning(f"Failed to extract OPRK for player {playerDkId}: {str(e)}")
            return None, None
