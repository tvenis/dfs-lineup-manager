"""
Recent Activity Router

Provides endpoints for fetching recent import/export activities.
"""

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session, joinedload
from typing import List, Optional, Dict, Any
from ..database import get_db
from ..models import RecentActivity
from ..schemas import RecentActivity as RecentActivitySchema

router = APIRouter(prefix="/api", tags=["recent-activity"])

# Import type to action mapping
IMPORT_TYPE_MAP = {
    "player-pool": "player-pool-import",
    "projections": "projections-import",
    "ownership": "ownership-import",
    "odds-api": "odds-api-import",
    "contests": "contests-import",
    "actuals": "actuals-import"
}

@router.get("/recent-activity", response_model=List[RecentActivitySchema])
async def get_recent_activity(
    import_type: Optional[str] = Query(None, description="Filter by import type"),
    limit: int = Query(10, description="Number of records to return"),
    week_id: Optional[int] = Query(None, description="Filter by week ID"),
    db: Session = Depends(get_db)
):
    """
    Get recent activity records with optional filtering.
    Returns modern format with all fields.
    """
    try:
        # Use joinedload to avoid N+1 query problem
        query = db.query(RecentActivity).options(joinedload(RecentActivity.week))
        
        # Filter by import type using exact match (faster than LIKE)
        if import_type:
            action = IMPORT_TYPE_MAP.get(import_type)
            if action:
                query = query.filter(RecentActivity.action == action)
        
        # Filter by week_id if specified
        if week_id:
            query = query.filter(RecentActivity.week_id == week_id)
        
        # Order by timestamp descending and limit results
        activities = query.order_by(RecentActivity.timestamp.desc()).limit(limit).all()
        
        return activities
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error fetching recent activity: {str(e)}")

@router.get("/recent-activity/stats")
async def get_activity_stats(
    db: Session = Depends(get_db)
):
    """
    Get activity statistics.
    """
    try:
        # Return empty stats for now
        return {
            "total_activities": 0,
            "recent_imports": 0,
            "recent_exports": 0,
            "error_rate": 0.0
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error fetching activity stats: {str(e)}")
