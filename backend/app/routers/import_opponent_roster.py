"""
Import Opponent Roster Router
API endpoints for importing opponent rosters from DraftKings H2H contests
"""

import logging
import asyncio
from typing import Dict, List, Optional, Any
from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks, status
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session
from datetime import datetime, timezone
import uuid

from app.database import get_db
from app.services.draftkings_leaderboard import DraftKingsLeaderboardService
from app.services.draftkings_scores import DraftKingsScoresService
from app.services.contest_details import ContestDetailsService

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/import-opponent-roster", tags=["import-opponent-roster"])

# Response schemas
class ImportStatusResponse(BaseModel):
    """Response schema for import status"""
    import_id: str
    status: str  # pending, in_progress, completed, failed
    message: str
    progress: Optional[Dict[str, int]] = None  # {"total": 10, "processed": 5, "successful": 4, "failed": 1}
    results: Optional[List[Dict[str, Any]]] = None
    created_at: datetime
    updated_at: datetime

class ContestInfo(BaseModel):
    """Schema for contest information"""
    contest_id: str
    draft_group_id: int
    opponent_username: str
    opponent_entry_key: str
    opponent_fantasy_points: float
    opponent_rank: int

class H2HContestsResponse(BaseModel):
    """Response schema for H2H contests"""
    week_id: str
    contests: List[ContestInfo]
    total_count: int
    message: str

class ImportRequest(BaseModel):
    """Request schema for importing opponent rosters"""
    week_id: str = Field(..., description="Week ID to import contests for")
    max_contests: Optional[int] = Field(50, description="Maximum number of contests to process")
    force_refresh: Optional[bool] = Field(False, description="Force refresh even if data exists")

class ImportResponse(BaseModel):
    """Response schema for import request"""
    import_id: str
    message: str
    status: str
    estimated_contests: int

class OpponentRosterResult(BaseModel):
    """Schema for individual opponent roster result"""
    contest_id: str
    opponent_username: str
    success: bool
    message: str
    fantasy_points: Optional[float] = None
    roster_data: Optional[Dict[str, Any]] = None

# In-memory storage for import status (in production, use Redis or database)
import_status_storage: Dict[str, ImportStatusResponse] = {}

async def process_opponent_roster_import(
    import_id: str,
    week_id: str,
    max_contests: int,
    force_refresh: bool
):
    """
    Background task to process opponent roster import
    
    Args:
        import_id: Unique identifier for this import operation
        week_id: Week ID to import contests for
        max_contests: Maximum number of contests to process
        force_refresh: Whether to force refresh existing data
    """
    try:
        logger.info(f"Starting opponent roster import {import_id} for week {week_id}")
        
        # Update status to in_progress
        if import_id in import_status_storage:
            import_status_storage[import_id].status = "in_progress"
            import_status_storage[import_id].updated_at = datetime.now(timezone.utc)
        
        # Get database session
        db = next(get_db())
        contest_service = ContestDetailsService(db)
        
        # Initialize services
        async with DraftKingsLeaderboardService() as leaderboard_service:
            async with DraftKingsScoresService() as scores_service:
                
                # Step 1: Get H2H contests for the week
                logger.info(f"Fetching H2H contests for week {week_id}")
                contests = await get_h2h_contests_for_week(week_id, leaderboard_service)
                
                if not contests:
                    raise Exception(f"No H2H contests found for week {week_id}")
                
                # Limit contests if specified
                if max_contests and len(contests) > max_contests:
                    contests = contests[:max_contests]
                
                total_contests = len(contests)
                processed = 0
                successful = 0
                failed = 0
                results = []
                
                logger.info(f"Processing {total_contests} H2H contests")
                
                # Step 2: Process each contest
                for contest in contests:
                    try:
                        processed += 1
                        
                        # Check if we already have this opponent's roster (unless force_refresh)
                        if not force_refresh:
                            existing = await contest_service.get_opponent_roster(
                                contest['contest_id'], 
                                contest['opponent_entry_key']
                            )
                            if existing:
                                logger.info(f"Skipping existing roster for contest {contest['contest_id']}")
                                results.append({
                                    'contest_id': contest['contest_id'],
                                    'opponent_username': contest['opponent_username'],
                                    'success': True,
                                    'message': 'Roster already exists (skipped)',
                                    'fantasy_points': existing['fantasy_points'],
                                    'roster_data': existing
                                })
                                successful += 1
                                continue
                        
                        # Get opponent roster data
                        logger.info(f"Fetching roster for contest {contest['contest_id']}, opponent {contest['opponent_username']}")
                        
                        roster_data = await scores_service.get_roster(
                            contest['draft_group_id'],
                            contest['opponent_entry_key']
                        )
                        
                        if not roster_data:
                            raise Exception("Failed to fetch roster data")
                        
                        # Save opponent roster
                        save_result = await contest_service.save_opponent_roster(contest, roster_data)
                        
                        if save_result['success']:
                            successful += 1
                            results.append({
                                'contest_id': contest['contest_id'],
                                'opponent_username': contest['opponent_username'],
                                'success': True,
                                'message': save_result['message'],
                                'fantasy_points': save_result['fantasy_points'],
                                'roster_data': save_result
                            })
                            logger.info(f"Successfully saved roster for contest {contest['contest_id']}")
                        else:
                            failed += 1
                            results.append({
                                'contest_id': contest['contest_id'],
                                'opponent_username': contest['opponent_username'],
                                'success': False,
                                'message': save_result.get('error', 'Unknown error'),
                                'fantasy_points': None,
                                'roster_data': None
                            })
                            logger.error(f"Failed to save roster for contest {contest['contest_id']}: {save_result.get('error')}")
                        
                        # Update progress
                        if import_id in import_status_storage:
                            import_status_storage[import_id].progress = {
                                'total': total_contests,
                                'processed': processed,
                                'successful': successful,
                                'failed': failed
                            }
                            import_status_storage[import_id].updated_at = datetime.now(timezone.utc)
                        
                        # Small delay to avoid overwhelming the API
                        await asyncio.sleep(0.5)
                        
                    except Exception as e:
                        processed += 1
                        failed += 1
                        error_msg = str(e)
                        logger.error(f"Error processing contest {contest['contest_id']}: {error_msg}")
                        
                        results.append({
                            'contest_id': contest['contest_id'],
                            'opponent_username': contest.get('opponent_username', 'unknown'),
                            'success': False,
                            'message': error_msg,
                            'fantasy_points': None,
                            'roster_data': None
                        })
                        
                        # Update progress
                        if import_id in import_status_storage:
                            import_status_storage[import_id].progress = {
                                'total': total_contests,
                                'processed': processed,
                                'successful': successful,
                                'failed': failed
                            }
                            import_status_storage[import_id].updated_at = datetime.now(timezone.utc)
                
                # Update final status
                if import_id in import_status_storage:
                    import_status_storage[import_id].status = "completed"
                    import_status_storage[import_id].message = f"Import completed: {successful} successful, {failed} failed"
                    import_status_storage[import_id].results = results
                    import_status_storage[import_id].updated_at = datetime.now(timezone.utc)
                
                logger.info(f"Import {import_id} completed: {successful} successful, {failed} failed")
                
    except Exception as e:
        error_msg = f"Import failed: {str(e)}"
        logger.error(f"Import {import_id} failed: {error_msg}")
        
        if import_id in import_status_storage:
            import_status_storage[import_id].status = "failed"
            import_status_storage[import_id].message = error_msg
            import_status_storage[import_id].updated_at = datetime.now(timezone.utc)

async def get_h2h_contests_for_week(week_id: str, leaderboard_service: DraftKingsLeaderboardService) -> List[Dict[str, Any]]:
    """
    Get H2H contests for a specific week
    
    Args:
        week_id: Week ID to fetch contests for
        leaderboard_service: DraftKings leaderboard service
        
    Returns:
        List of contest information dictionaries
    """
    try:
        # This is a placeholder implementation
        # In a real implementation, you would:
        # 1. Query your database for H2H contests for the given week
        # 2. For each contest, call the leaderboard API to get opponent info
        # 3. Filter for contests where opponent username != 'tvenis'
        
        # For now, return mock data for testing
        mock_contests = [
            {
                'contest_id': '182400523',
                'draft_group_id': 133903,
                'opponent_username': 'tdavis24',
                'opponent_entry_key': '4864049590',
                'opponent_fantasy_points': 176.68,
                'opponent_rank': 1
            },
            {
                'contest_id': '182400524',
                'draft_group_id': 133903,
                'opponent_username': 'test_opponent2',
                'opponent_entry_key': '4864049592',
                'opponent_fantasy_points': 165.5,
                'opponent_rank': 2
            }
        ]
        
        logger.info(f"Found {len(mock_contests)} H2H contests for week {week_id}")
        return mock_contests
        
    except Exception as e:
        logger.error(f"Error fetching H2H contests for week {week_id}: {e}")
        return []

@router.post("/", response_model=ImportResponse, status_code=status.HTTP_202_ACCEPTED)
async def import_opponent_rosters(
    request: ImportRequest,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db)
):
    """
    Import opponent rosters from H2H contests for a specific week
    
    This endpoint starts a background task to:
    1. Fetch H2H contests for the specified week
    2. Get opponent information from DraftKings leaderboard API
    3. Fetch opponent roster data from DraftKings scores API
    4. Save opponent roster data to the database
    
    Args:
        request: Import request with week_id and options
        background_tasks: FastAPI background tasks
        db: Database session
        
    Returns:
        ImportResponse with import_id and status
    """
    try:
        # Generate unique import ID
        import_id = str(uuid.uuid4())
        
        # Initialize status tracking
        import_status_storage[import_id] = ImportStatusResponse(
            import_id=import_id,
            status="pending",
            message="Import request received, starting background processing...",
            progress=None,
            results=None,
            created_at=datetime.now(timezone.utc),
            updated_at=datetime.now(timezone.utc)
        )
        
        # Start background task
        background_tasks.add_task(
            process_opponent_roster_import,
            import_id,
            request.week_id,
            request.max_contests,
            request.force_refresh
        )
        
        logger.info(f"Started opponent roster import {import_id} for week {request.week_id}")
        
        return ImportResponse(
            import_id=import_id,
            message=f"Import started for week {request.week_id}. Use the import_id to check status.",
            status="pending",
            estimated_contests=request.max_contests or 50
        )
        
    except Exception as e:
        logger.error(f"Error starting opponent roster import: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to start import: {str(e)}"
        )

@router.get("/contests/{week_id}", response_model=H2HContestsResponse)
async def get_h2h_contests(
    week_id: str,
    db: Session = Depends(get_db)
):
    """
    Get H2H contests for a specific week
    
    Args:
        week_id: Week ID to fetch contests for
        db: Database session
        
    Returns:
        H2HContestsResponse with list of contests
    """
    try:
        async with DraftKingsLeaderboardService() as leaderboard_service:
            contests = await get_h2h_contests_for_week(week_id, leaderboard_service)
            
            contest_infos = []
            for contest in contests:
                contest_infos.append(ContestInfo(
                    contest_id=contest['contest_id'],
                    draft_group_id=contest['draft_group_id'],
                    opponent_username=contest['opponent_username'],
                    opponent_entry_key=contest['opponent_entry_key'],
                    opponent_fantasy_points=contest['opponent_fantasy_points'],
                    opponent_rank=contest['opponent_rank']
                ))
            
            return H2HContestsResponse(
                week_id=week_id,
                contests=contest_infos,
                total_count=len(contest_infos),
                message=f"Found {len(contest_infos)} H2H contests for week {week_id}"
            )
            
    except Exception as e:
        logger.error(f"Error fetching H2H contests for week {week_id}: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to fetch contests: {str(e)}"
        )

@router.get("/status/{import_id}", response_model=ImportStatusResponse)
async def get_import_status(import_id: str):
    """
    Get the status of an opponent roster import operation
    
    Args:
        import_id: Unique identifier for the import operation
        
    Returns:
        ImportStatusResponse with current status and progress
    """
    try:
        if import_id not in import_status_storage:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Import {import_id} not found"
            )
        
        return import_status_storage[import_id]
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error fetching import status for {import_id}: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to fetch import status: {str(e)}"
        )

@router.get("/rosters/{contest_id}", response_model=List[Dict[str, Any]])
async def get_contest_rosters(
    contest_id: str,
    db: Session = Depends(get_db)
):
    """
    Get all opponent rosters for a specific contest
    
    Args:
        contest_id: Contest ID to fetch rosters for
        db: Database session
        
    Returns:
        List of opponent roster data
    """
    try:
        contest_service = ContestDetailsService(db)
        rosters = await contest_service.get_contest_rosters(contest_id)
        
        return rosters
        
    except Exception as e:
        logger.error(f"Error fetching rosters for contest {contest_id}: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to fetch rosters: {str(e)}"
        )

@router.delete("/rosters/{contest_id}/{entry_key}", status_code=status.HTTP_200_OK)
async def delete_opponent_roster(
    contest_id: str,
    entry_key: str,
    db: Session = Depends(get_db)
):
    """
    Delete a specific opponent roster
    
    Args:
        contest_id: Contest ID
        entry_key: Entry key of the opponent
        db: Database session
        
    Returns:
        Success message
    """
    try:
        contest_service = ContestDetailsService(db)
        result = await contest_service.delete_opponent_roster(contest_id, entry_key)
        
        if result['success']:
            return {"message": result['message']}
        else:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=result['message']
            )
            
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error deleting roster for contest {contest_id}, entry {entry_key}: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to delete roster: {str(e)}"
        )

# Test endpoint for development
@router.get("/test", status_code=status.HTTP_200_OK)
async def test_import_router():
    """
    Test endpoint to verify the router is working
    """
    return {
        "message": "Import Opponent Roster Router is working",
        "endpoints": [
            "POST /api/import-opponent-roster/ - Start import",
            "GET /api/import-opponent-roster/contests/{week_id} - Get H2H contests",
            "GET /api/import-opponent-roster/status/{import_id} - Check import status",
            "GET /api/import-opponent-roster/rosters/{contest_id} - Get contest rosters",
            "DELETE /api/import-opponent-roster/rosters/{contest_id}/{entry_key} - Delete roster"
        ],
        "timestamp": datetime.now(timezone.utc).isoformat()
    }
