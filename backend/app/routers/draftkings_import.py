"""
DraftKings Import API Router
Handles API endpoints for importing player pool data from DraftKings
"""

from fastapi import APIRouter, HTTPException, Depends
from app.schemas import DraftKingsImportRequest, DraftKingsImportResponse, RecentActivity
from app.services.draftkings_import import DraftKingsImportService
from app.models import RecentActivity
from app.database import get_db
from sqlalchemy.orm import Session

router = APIRouter(prefix="/api/draftkings", tags=["draftkings-import"])

@router.get("/weeks")
async def get_active_upcoming_weeks(db: Session = Depends(get_db)):
    """Get active and upcoming weeks for the Import Week dropdown"""
    try:
        from app.models import Week
        
        # Get weeks with status 'Active' or 'Upcoming', ordered by year and week_number
        weeks = db.query(Week).filter(
            Week.status.in_(["Active", "Upcoming"])
        ).order_by(Week.year, Week.week_number).all()
        
        # Format weeks for dropdown: "Week X, YYYY"
        formatted_weeks = [
            {
                "id": week.id,
                "label": f"Week {week.week_number}, {week.year}",
                "week_number": week.week_number,
                "year": week.year,
                "status": week.status
            }
            for week in weeks
        ]
        
        return {"weeks": formatted_weeks}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/import")
async def import_player_pool(request: DraftKingsImportRequest, db: Session = Depends(get_db)):
    """Import player pool from DraftKings API"""
    try:
        import logging
        logger = logging.getLogger(__name__)
        logger.info(f"Received import request for week_id={request.week_id}, draft_group={request.draft_group}")
        
        service = DraftKingsImportService(db)
        result = await service.import_player_pool(request.week_id, request.draft_group)
        
        logger.info(f"Import completed successfully: {result.players_added} players added, {result.players_updated} updated")
        return result
        
    except Exception as e:
        import logging
        logger = logging.getLogger(__name__)
        logger.error(f"Import failed: {str(e)}")
        
        # Provide more detailed error information
        error_detail = str(e)
        if "UNIQUE constraint failed" in error_detail:
            error_detail = "Duplicate player detected. This usually means the player already exists in the database. The import should have updated the existing record instead of trying to create a new one."
        elif "IntegrityError" in error_detail:
            error_detail = "Database integrity error occurred. This might be due to duplicate data or constraint violations."
        
        raise HTTPException(
            status_code=500, 
            detail={
                "error": "Import failed",
                "message": error_detail,
                "original_error": str(e)
            }
        )

@router.get("/activity")
async def get_recent_activity(limit: int = 20, db: Session = Depends(get_db)):
    """Get recent import/export activity"""
    try:
        activities = db.query(RecentActivity).order_by(RecentActivity.timestamp.desc()).limit(limit).all()
        return activities
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/activity/{week_id}/{draft_group}")
async def get_activity_by_week_and_group(week_id: int, draft_group: str, db: Session = Depends(get_db)):
    """Get activities for a specific week and draft group"""
    try:
        activities = db.query(RecentActivity).filter(
            RecentActivity.week_id == week_id,
            RecentActivity.draftGroup == draft_group
        ).order_by(RecentActivity.timestamp.desc()).all()
        return activities
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
