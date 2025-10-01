"""
DraftKings Import API Router
Handles API endpoints for importing player pool data from DraftKings
"""

from fastapi import APIRouter, HTTPException, Depends, Request
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
async def import_player_pool(request: DraftKingsImportRequest, http_request: Request, db: Session = Depends(get_db)):
    """Import player pool from DraftKings API"""
    import time
    start_time = time.perf_counter()
    
    # Extract client IP and User-Agent
    client_ip = http_request.client.host if http_request.client else None
    user_agent = http_request.headers.get("user-agent")
    
    try:
        import logging
        logger = logging.getLogger(__name__)
        logger.info(f"Received import request for week_id={request.week_id}, draft_group={request.draft_group}")
        
        service = DraftKingsImportService(db)
        
        result = await service.import_player_pool(request.week_id, request.draft_group)
        
        # Calculate duration for logging
        end_time = time.perf_counter()
        duration_ms = int((end_time - start_time) * 1000)
        
        # Log activity with duration
        from app.services.activity_logging import ActivityLoggingService
        try:
            service_logger = ActivityLoggingService(db)
            operation_status = "failed" if result.errors else "completed"
            service_logger.log_import_activity(
                import_type="player-pool",
                file_type="API",
                week_id=request.week_id,
                records_added=result.players_added + result.entries_added,
                records_updated=result.players_updated + result.entries_updated,
                records_skipped=result.entries_skipped,
                records_failed=0,
                file_name=None,
                import_source="draftkings",
                draft_group=request.draft_group,
                operation_status=operation_status,
                duration_ms=duration_ms,
                errors=result.errors,
                details={
                    "players_added": result.players_added,
                    "players_updated": result.players_updated,
                    "entries_added": result.entries_added,
                    "entries_updated": result.entries_updated,
                    "total_processed": result.total_processed
                },
                ip_address=client_ip,
                user_agent=user_agent
            )
            logger.info(f"✅ Import completed successfully in {duration_ms}ms: {result.players_added} players added, {result.players_updated} updated")
        except Exception as log_error:
            logger.error(f"Failed to log activity: {log_error}")
        
        return result
        
    except Exception as e:
        import logging
        logger = logging.getLogger(__name__)
        logger.error(f"Import failed: {str(e)}")
        
        # Calculate duration even for failed imports
        end_time = time.perf_counter()
        duration_ms = int((end_time - start_time) * 1000)
        
        # Log failed import
        from app.services.activity_logging import ActivityLoggingService
        try:
            service_logger = ActivityLoggingService(db)
            service_logger.log_import_activity(
                import_type="player-pool",
                file_type="API",
                week_id=request.week_id,
                records_added=0,
                records_updated=0,
                records_skipped=0,
                records_failed=0,
                file_name=None,
                import_source="draftkings",
                draft_group=request.draft_group,
                operation_status="failed",
                duration_ms=duration_ms,
                errors=[str(e)],
                details={"error_type": type(e).__name__, "stage": "api_fetch"},
                ip_address=client_ip,
                user_agent=user_agent
            )
            logger.info(f"❌ Import failed after {duration_ms}ms")
        except Exception as log_error:
            logger.error(f"Failed to log error activity: {log_error}")
        
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
                "original_error": str(e),
                "duration_ms": duration_ms
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
