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
                        
                        # Try to get real roster data from DraftKings API
                        logger.info(f"Fetching roster data for contest {contest['contest_id']}, opponent {contest['opponent_username']}")
                        
                        try:
                            # Get detailed roster data from DraftKings Scores API
                            roster_data = await scores_service.get_roster(contest['draft_group_id'], contest['opponent_entry_key'])
                            
                            if roster_data.get('success'):
                                # Format data according to ContestDetailsService expectations
                                contest_data = {
                                    'contest_id': contest['contest_id'],
                                    'draft_group_id': contest['draft_group_id'],
                                    'opponent': {
                                        'entry_key': contest['opponent_entry_key'],
                                        'username': contest['opponent_username'],
                                        'fantasy_points': contest['opponent_fantasy_points'],
                                        'rank': contest['opponent_rank']
                                    }
                                }
                                
                                # Use real roster data from API
                                roster_data = {
                                    'roster_data': roster_data.get('roster_data', {}),
                                    'contest_data': contest_data
                                }
                            else:
                                # API call failed, create minimal data from contest info
                                logger.warning(f"Failed to get roster data for contest {contest['contest_id']}: {roster_data.get('error', 'Unknown error')}")
                                
                                contest_data = {
                                    'contest_id': contest['contest_id'],
                                    'draft_group_id': contest['draft_group_id'],
                                    'opponent': {
                                        'entry_key': contest['opponent_entry_key'],
                                        'username': contest['opponent_username'],
                                        'fantasy_points': contest['opponent_fantasy_points'],
                                        'rank': contest['opponent_rank']
                                    }
                                }
                                
                                # Create minimal roster data
                                roster_data = {
                                    'roster_data': {
                                        'username': contest['opponent_username'],
                                        'fantasy_points': contest['opponent_fantasy_points'],
                                        'contest_id': contest['contest_id'],
                                        'draft_group_id': contest['draft_group_id'],
                                        'entry_key': contest['opponent_entry_key'],
                                        'rank': contest['opponent_rank'],
                                        'description': contest['contest_description'],
                                        'date_utc': contest['contest_date_utc'],
                                        'players': [],  # Empty since we don't have detailed roster data
                                        'note': 'Limited data (API requires authentication)'
                                    },
                                    'contest_data': contest_data
                                }
                                
                        except Exception as e:
                            logger.error(f"Error fetching roster data for contest {contest['contest_id']}: {e}")
                            
                            # Create minimal data from contest info
                            contest_data = {
                                'contest_id': contest['contest_id'],
                                'draft_group_id': contest['draft_group_id'],
                                'opponent': {
                                    'entry_key': contest['opponent_entry_key'],
                                    'username': contest['opponent_username'],
                                    'fantasy_points': contest['opponent_fantasy_points'],
                                    'rank': contest['opponent_rank']
                                }
                            }
                            
                            # Create minimal roster data
                            roster_data = {
                                'roster_data': {
                                    'username': contest['opponent_username'],
                                    'fantasy_points': contest['opponent_fantasy_points'],
                                    'contest_id': contest['contest_id'],
                                    'draft_group_id': contest['draft_group_id'],
                                    'entry_key': contest['opponent_entry_key'],
                                    'rank': contest['opponent_rank'],
                                    'description': contest['contest_description'],
                                    'date_utc': contest['contest_date_utc'],
                                    'players': [],  # Empty since we don't have detailed roster data
                                    'note': 'Limited data (API requires authentication)'
                                },
                                'contest_data': contest_data
                            }
                        
                        # Save opponent roster
                        save_result = await contest_service.save_opponent_roster(contest_data, roster_data)
                        
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
        # Extract week number from week_id (e.g., "week3" -> 3)
        week_number = int(week_id.replace('week', ''))
        
        # Query database for H2H contests for the given week
        from app.database import get_db
        from sqlalchemy import text
        
        db = next(get_db())
        
        query = text('''
            SELECT contest_id, contest_description, contest_opponent, contest_date_utc, 
                   contest_place, contest_points, contest_entries, entry_fee_usd, 
                   prize_pool_usd, week_id, sport_id, game_type_id, entry_key
            FROM contest 
            WHERE contest_opponent IS NOT NULL 
            AND contest_opponent != ''
            AND week_id = :week_number
            ORDER BY contest_date_utc DESC
        ''')
        
        result = db.execute(query, {'week_number': week_number})
        contests = result.fetchall()
        
        h2h_contests = []
        
        for contest in contests:
            contest_id_str = str(contest.contest_id)
            
            # Try to get real leaderboard data from DraftKings API first
            try:
                leaderboard_data = await leaderboard_service.get_leaderboard(contest_id_str)
                
                if leaderboard_data.get('success'):
                    opponent = leaderboard_data.get('opponent', {})
                    h2h_contests.append({
                        'contest_id': contest_id_str,
                        'draft_group_id': contest.entry_key,
                        'opponent_username': opponent.get('username', contest.contest_opponent),
                        'opponent_entry_key': str(opponent.get('entry_key', contest.entry_key)),
                        'opponent_fantasy_points': opponent.get('fantasy_points', 0),
                        'opponent_rank': opponent.get('rank', 1),
                        'contest_description': contest.contest_description,
                        'contest_date_utc': contest.contest_date_utc.isoformat() if contest.contest_date_utc else None,
                        'note': 'Real API data'
                    })
                else:
                    # API call failed, use database data as fallback
                    logger.warning(f"API call failed for contest {contest_id_str}: {leaderboard_data.get('error', 'Unknown error')}")
                    h2h_contests.append({
                        'contest_id': contest_id_str,
                        'draft_group_id': contest.entry_key,
                        'opponent_username': contest.contest_opponent,
                        'opponent_entry_key': str(contest.entry_key),
                        'opponent_fantasy_points': 0,  # We don't have opponent points in database
                        'opponent_rank': 1,
                        'contest_description': contest.contest_description,
                        'contest_date_utc': contest.contest_date_utc.isoformat() if contest.contest_date_utc else None,
                        'note': 'Database data (API requires authentication)'
                    })
                    
            except Exception as e:
                logger.error(f"Error fetching leaderboard for contest {contest_id_str}: {e}")
                # Use database data as fallback
                h2h_contests.append({
                    'contest_id': contest_id_str,
                    'draft_group_id': contest.entry_key,
                    'opponent_username': contest.contest_opponent,
                    'opponent_entry_key': str(contest.entry_key),
                    'opponent_fantasy_points': 0,  # We don't have opponent points in database
                    'opponent_rank': 1,
                    'contest_description': contest.contest_description,
                    'contest_date_utc': contest.contest_date_utc.isoformat() if contest.contest_date_utc else None,
                    'note': 'Database data (API requires authentication)'
                })
        
        logger.info(f"Found {len(h2h_contests)} H2H contests for week {week_id}")
        return h2h_contests
        
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
