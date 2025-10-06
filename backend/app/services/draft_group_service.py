"""
Draft Group Service
Handles operations related to draft groups, including getting default draft groups
"""

from sqlalchemy.orm import Session
from typing import Optional, List
from app.models import DraftGroup, Week
import logging

logger = logging.getLogger(__name__)

class DraftGroupService:
    """Service for managing draft groups"""
    
    @staticmethod
    def get_default_draft_group(db: Session, week_id: int) -> Optional[DraftGroup]:
        """
        Get the default draft group for a specific week
        
        Args:
            db: Database session
            week_id: Week ID to get default draft group for
            
        Returns:
            DraftGroup object if found, None otherwise
        """
        try:
            default_draft_group = db.query(DraftGroup).filter(
                DraftGroup.week_id == week_id,
                DraftGroup.is_default == True
            ).first()
            
            if default_draft_group:
                logger.debug(f"Found default draft group {default_draft_group.draftGroup} for week {week_id}")
            else:
                logger.warning(f"No default draft group found for week {week_id}")
                
            return default_draft_group
            
        except Exception as e:
            logger.error(f"Error getting default draft group for week {week_id}: {str(e)}")
            return None
    
    @staticmethod
    def get_default_draft_group_id(db: Session, week_id: int) -> Optional[int]:
        """
        Get the default draft group ID for a specific week
        
        Args:
            db: Database session
            week_id: Week ID to get default draft group for
            
        Returns:
            Draft group ID if found, None otherwise
        """
        default_draft_group = DraftGroupService.get_default_draft_group(db, week_id)
        return default_draft_group.draftGroup if default_draft_group else None
    
    @staticmethod
    def get_draft_groups_for_week(db: Session, week_id: int) -> List[DraftGroup]:
        """
        Get all draft groups for a specific week
        
        Args:
            db: Database session
            week_id: Week ID to get draft groups for
            
        Returns:
            List of DraftGroup objects
        """
        try:
            draft_groups = db.query(DraftGroup).filter(
                DraftGroup.week_id == week_id
            ).order_by(DraftGroup.is_default.desc(), DraftGroup.draftGroup_description).all()
            
            logger.debug(f"Found {len(draft_groups)} draft groups for week {week_id}")
            return draft_groups
            
        except Exception as e:
            logger.error(f"Error getting draft groups for week {week_id}: {str(e)}")
            return []
    
    @staticmethod
    def set_default_draft_group(db: Session, week_id: int, draft_group_id: int) -> bool:
        """
        Set a specific draft group as the default for a week
        
        Args:
            db: Database session
            week_id: Week ID
            draft_group_id: Draft group ID to set as default
            
        Returns:
            True if successful, False otherwise
        """
        try:
            # First, unset any existing default for this week
            db.query(DraftGroup).filter(
                DraftGroup.week_id == week_id,
                DraftGroup.is_default == True
            ).update({"is_default": False})
            
            # Set the new default
            updated = db.query(DraftGroup).filter(
                DraftGroup.week_id == week_id,
                DraftGroup.draftGroup == draft_group_id
            ).update({"is_default": True})
            
            if updated > 0:
                db.commit()
                logger.info(f"Set draft group {draft_group_id} as default for week {week_id}")
                return True
            else:
                logger.warning(f"Draft group {draft_group_id} not found for week {week_id}")
                return False
                
        except Exception as e:
            db.rollback()
            logger.error(f"Error setting default draft group for week {week_id}: {str(e)}")
            return False
