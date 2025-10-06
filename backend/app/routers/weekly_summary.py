from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from typing import List, Optional
from app.database import get_db
from app.models import WeeklyPlayerSummary
from app.schemas import WeeklyPlayerSummary as WeeklyPlayerSummarySchema, WeeklyPlayerSummaryUpdate
from app.services.weekly_summary_service import WeeklySummaryService
from sqlalchemy import and_

router = APIRouter(prefix="/api/weekly-summary", tags=["weekly-summary"])

@router.get("/week/{week_id}", response_model=List[WeeklyPlayerSummarySchema])
def get_weekly_summary(
    week_id: int,
    player_id: Optional[int] = Query(None, description="Filter by player ID"),
    db: Session = Depends(get_db)
):
    """Get weekly summary for all players or a specific player"""
    query = db.query(WeeklyPlayerSummary).filter(WeeklyPlayerSummary.week_id == week_id)
    
    if player_id:
        query = query.filter(WeeklyPlayerSummary.playerDkId == player_id)
    
    return query.all()

@router.post("/week/{week_id}/populate")
def populate_weekly_summary(
    week_id: int,
    main_draftgroup: Optional[str] = Query(None, description="Main draft group for baseline salary"),
    db: Session = Depends(get_db)
):
    """Populate weekly summary for a given week"""
    count = WeeklySummaryService.populate_weekly_summary(db, week_id, main_draftgroup)
    return {"message": f"Updated {count} weekly summaries", "count": count}

@router.put("/{summary_id}", response_model=WeeklyPlayerSummarySchema)
def update_weekly_summary(
    summary_id: int,
    summary_update: WeeklyPlayerSummaryUpdate,
    db: Session = Depends(get_db)
):
    """Update a weekly summary"""
    summary = db.query(WeeklyPlayerSummary).filter(WeeklyPlayerSummary.id == summary_id).first()
    
    if not summary:
        raise HTTPException(status_code=404, detail="Weekly summary not found")
    
    for field, value in summary_update.dict(exclude_unset=True).items():
        setattr(summary, field, value)
    
    db.commit()
    db.refresh(summary)
    return summary
