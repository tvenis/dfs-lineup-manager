"""
Recent Activity Router

Provides endpoints for fetching recent import/export activities.
"""

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from typing import List, Optional
from ..database import get_db
from ..models import RecentActivity
from ..schemas import RecentActivityLegacy

router = APIRouter(prefix="/api", tags=["recent-activity"])

@router.get("/recent-activity")
async def get_recent_activity(
    import_type: Optional[str] = Query(None, description="Filter by import type"),
    limit: int = Query(10, description="Number of records to return"),
    week_id: Optional[int] = Query(None, description="Filter by week ID"),
    db: Session = Depends(get_db)
):
    """
    Get recent activity records with optional filtering.
    """
    try:
        query = db.query(RecentActivity)
        
        # Filter by import type if specified
        if import_type:
            if import_type == "player-pool":
                query = query.filter(RecentActivity.action.like("%player-pool%"))
            elif import_type == "projections":
                query = query.filter(RecentActivity.action.like("%projections%"))
            elif import_type == "ownership":
                query = query.filter(RecentActivity.action.like("%ownership%"))
            elif import_type == "odds-api":
                query = query.filter(RecentActivity.action.like("%odds-api%"))
            elif import_type == "contests":
                query = query.filter(RecentActivity.action.like("%contests%"))
            elif import_type == "actuals":
                query = query.filter(RecentActivity.action.like("%actuals%"))
        
        # Filter by week_id if specified
        if week_id:
            query = query.filter(RecentActivity.week_id == week_id)
        
        # Order by timestamp descending and limit results
        activities = query.order_by(RecentActivity.timestamp.desc()).limit(limit).all()
        
        # Convert to legacy format for frontend compatibility
        legacy_activities = []
        for activity in activities:
            legacy_activities.append({
                "id": activity.id,
                "timestamp": activity.timestamp.isoformat() if activity.timestamp else None,
                "action": activity.action,
                "fileType": activity.file_type,
                "fileName": activity.file_name,
                "week_id": activity.week_id,
                "draftGroup": activity.draft_group,
                "recordsAdded": activity.records_added,
                "recordsUpdated": activity.records_updated,
                "recordsSkipped": activity.records_skipped,
                "errors": activity.errors or [],
                "user_name": activity.user_name,
                "details": activity.details,
                "importType": activity._get_import_type() if hasattr(activity, '_get_import_type') else None
            })
        
        return legacy_activities
        
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
