"""
Admin endpoints for DFS App

Provides administrative functionality including:
- Manual prop scoring triggers
- Data management operations
- System health checks
"""

from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks
from sqlalchemy.orm import Session
from typing import Dict, Any, Optional

from ..database import get_db
from ..services.player_props_scoring_service import PlayerPropsScoringService
from ..services.activity_logging import ActivityLoggingService

router = APIRouter(prefix="/admin", tags=["admin"])


@router.post("/score-props/{week_id}")
async def score_week_props(
    week_id: int,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db)
) -> Dict[str, Any]:
    """
    Manually trigger prop scoring for a specific week.
    
    This endpoint allows administrators to manually score props for a week,
    which is useful for:
    - Re-scoring after data corrections
    - Scoring historical weeks
    - Testing the scoring system
    """
    try:
        # Run scoring in background to avoid timeout
        background_tasks.add_task(score_week_props_background, week_id, db)
        
        return {
            "success": True,
            "message": f"Started scoring props for week {week_id}",
            "week_id": week_id
        }
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to start scoring: {str(e)}")


@router.post("/score-player-props/{player_id}/{week_id}")
async def score_player_props(
    player_id: int,
    week_id: int,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db)
) -> Dict[str, Any]:
    """
    Manually trigger prop scoring for a specific player in a specific week.
    
    Useful for debugging or re-scoring individual players.
    """
    try:
        # Run scoring in background
        background_tasks.add_task(score_player_props_background, player_id, week_id, db)
        
        return {
            "success": True,
            "message": f"Started scoring props for player {player_id} in week {week_id}",
            "player_id": player_id,
            "week_id": week_id
        }
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to start scoring: {str(e)}")


@router.get("/player-props-summary/{player_id}")
async def get_player_props_summary(
    player_id: int,
    db: Session = Depends(get_db)
) -> Dict[str, Any]:
    """
    Get a summary of props and scoring statistics for a specific player.
    
    Returns hit percentage, total props, and breakdown of results.
    """
    try:
        scoring_service = PlayerPropsScoringService(db)
        summary = scoring_service.get_player_props_summary(player_id)
        
        return {
            "success": True,
            "player_id": player_id,
            "summary": summary
        }
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get summary: {str(e)}")


@router.get("/hit-percentage/{player_id}")
async def get_player_hit_percentage(
    player_id: int,
    weeks_back: Optional[int] = None,
    db: Session = Depends(get_db)
) -> Dict[str, Any]:
    """
    Get hit percentage for a specific player.
    
    Args:
        player_id: DraftKings player ID
        weeks_back: Optional limit on how many weeks back to consider
    """
    try:
        scoring_service = PlayerPropsScoringService(db)
        hit_percentage = scoring_service.calculate_hit_percentage(player_id, weeks_back)
        
        return {
            "success": True,
            "player_id": player_id,
            "hit_percentage": hit_percentage,
            "weeks_back": weeks_back
        }
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to calculate hit percentage: {str(e)}")


# Background task functions
async def score_week_props_background(week_id: int, db: Session):
    """
    Background task to score all props for a week.
    """
    try:
        scoring_service = PlayerPropsScoringService(db)
        activity_service = ActivityLoggingService(db)
        
        # Score the props
        stats = scoring_service.score_week_props(week_id)
        
        # Log the activity
        activity_service.log_activity(
            action="props-scoring",
            file_type="API",
            week_id=week_id,
            records_updated=stats['scored_props'],
            operation_status="completed",
            details={
                "total_props": stats['total_props'],
                "hits": stats['hits'],
                "misses": stats['misses'],
                "pushes": stats['pushes'],
                "players_with_actuals": stats['players_with_actuals'],
                "players_missing_actuals": stats['players_missing_actuals']
            }
        )
        
        print(f"✅ Background scoring completed for week {week_id}: {stats}")
        
    except Exception as e:
        print(f"❌ Background scoring failed for week {week_id}: {e}")
        
        # Log the error
        try:
            activity_service = ActivityLoggingService(db)
            activity_service.log_activity(
                action="props-scoring",
                file_type="API",
                week_id=week_id,
                records_failed=1,
                operation_status="failed",
                errors={"error": str(e)}
            )
        except:
            pass  # Don't fail on logging errors


async def score_player_props_background(player_id: int, week_id: int, db: Session):
    """
    Background task to score props for a specific player.
    """
    try:
        scoring_service = PlayerPropsScoringService(db)
        activity_service = ActivityLoggingService(db)
        
        # Score the props
        results = scoring_service.score_player_props(player_id, week_id)
        
        # Log the activity
        activity_service.log_activity(
            action="player-props-scoring",
            file_type="API",
            week_id=week_id,
            records_updated=len(results),
            operation_status="completed",
            details={
                "player_id": player_id,
                "props_scored": len(results),
                "results": results
            }
        )
        
        print(f"✅ Background scoring completed for player {player_id} in week {week_id}: {len(results)} props scored")
        
    except Exception as e:
        print(f"❌ Background scoring failed for player {player_id} in week {week_id}: {e}")
        
        # Log the error
        try:
            activity_service = ActivityLoggingService(db)
            activity_service.log_activity(
                action="player-props-scoring",
                file_type="API",
                week_id=week_id,
                records_failed=1,
                operation_status="failed",
                errors={"error": str(e)}
            )
        except:
            pass  # Don't fail on logging errors
