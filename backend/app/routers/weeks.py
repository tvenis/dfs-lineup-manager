from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from typing import List, Optional
from datetime import date, datetime

from app.database import get_db
from app.models import Week
from app.schemas import WeekCreate, WeekUpdate, Week as WeekSchema, WeekListResponse, WeekListSimpleResponse

router = APIRouter()

@router.post("/", response_model=WeekSchema)
def create_week(week: WeekCreate, db: Session = Depends(get_db)):
    """Create a new week"""
    # Check if week already exists for the same year and week number
    existing_week = db.query(Week).filter(
        Week.year == week.year,
        Week.week_number == week.week_number
    ).first()
    
    if existing_week:
        raise HTTPException(
            status_code=400, 
            detail=f"Week {week.week_number} for year {week.year} already exists"
        )
    
    # Validate dates
    if week.start_date >= week.end_date:
        raise HTTPException(
            status_code=400,
            detail="start_date must be before end_date"
        )
    
    db_week = Week(**week.model_dump())
    db.add(db_week)
    db.commit()
    db.refresh(db_week)
    return db_week

@router.get("", response_model=WeekListSimpleResponse)
def get_weeks(
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=1000),
    year: Optional[int] = Query(None, ge=2020, le=2030),
    status: Optional[str] = Query(None, pattern="^(Completed|Active|Upcoming)$"),
    db: Session = Depends(get_db)
):
    """Get all weeks with filtering and pagination"""
    try:
        query = db.query(Week)
        
        if year:
            query = query.filter(Week.year == year)
        
        if status:
            query = query.filter(Week.status == status)
        
        total = query.count()
        weeks = query.order_by(Week.year.desc(), Week.week_number.desc()).offset(skip).limit(limit).all()
        
        # Convert to dict to avoid relationship serialization issues
        week_dicts = []
        for week in weeks:
            week_dict = {
                "id": week.id,
                "week_number": week.week_number,
                "year": week.year,
                "start_date": week.start_date,
                "end_date": week.end_date,
                "game_count": week.game_count,
                "status": week.status,
                "notes": week.notes,
                "imported_at": week.imported_at,
                "created_at": week.created_at,
                "updated_at": week.updated_at
            }
            week_dicts.append(week_dict)
        
        return WeekListSimpleResponse(
            weeks=week_dicts,
            total=total
        )
    except Exception as e:
        print(f"Error in get_weeks: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/seasons", response_model=List[int])
def get_seasons(db: Session = Depends(get_db)):
    """Get distinct seasons (years) from the weeks table, ordered by year descending"""
    try:
        from sqlalchemy import distinct
        seasons = db.query(distinct(Week.year)).order_by(Week.year.desc()).all()
        return [season[0] for season in seasons]
    except Exception as e:
        print(f"Error in get_seasons: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/current", response_model=WeekSchema)
def get_current_week(db: Session = Depends(get_db)):
    """Get the current active week"""
    today = date.today()
    
    # First, try to find the active week
    current_week = db.query(Week).filter(Week.status == "Active").first()
    
    if not current_week:
        # If no active week, find the week that contains today's date
        current_week = db.query(Week).filter(
            Week.start_date <= today,
            Week.end_date >= today
        ).first()
    
    if not current_week:
        # If no current week, find the next upcoming week
        current_week = db.query(Week).filter(
            Week.start_date > today,
            Week.status == "Upcoming"
        ).order_by(Week.start_date.asc()).first()
    
    if not current_week:
        raise HTTPException(status_code=404, detail="No current or upcoming week found")
    
    return current_week

@router.get("/years")
async def get_available_years(db: Session = Depends(get_db)):
    """Get available years for game log dropdown"""
    years = db.query(Week.year).distinct().order_by(Week.year.desc()).all()
    return {"years": [year[0] for year in years]}

@router.get("/{week_id}", response_model=WeekSchema)
def get_week(week_id: int, db: Session = Depends(get_db)):
    """Get a specific week by ID"""
    week = db.query(Week).filter(Week.id == week_id).first()
    if not week:
        raise HTTPException(status_code=404, detail="Week not found")
    return week

@router.put("/{week_id}", response_model=WeekSchema)
def update_week(week_id: int, week_update: WeekUpdate, db: Session = Depends(get_db)):
    """Update a week"""
    db_week = db.query(Week).filter(Week.id == week_id).first()
    if not db_week:
        raise HTTPException(status_code=404, detail="Week not found")
    
    # Check for conflicts if updating year or week_number
    if week_update.year or week_update.week_number:
        new_year = week_update.year or db_week.year
        new_week_number = week_update.week_number or db_week.week_number
        
        existing_week = db.query(Week).filter(
            Week.year == new_year,
            Week.week_number == new_week_number,
            Week.id != week_id
        ).first()
        
        if existing_week:
            raise HTTPException(
                status_code=400,
                detail=f"Week {new_week_number} for year {new_year} already exists"
            )
    
    # Validate dates if updating
    if week_update.start_date and week_update.end_date:
        if week_update.start_date >= week_update.end_date:
            raise HTTPException(
                status_code=400,
                detail="start_date must be before end_date"
            )
    
    for field, value in week_update.model_dump(exclude_unset=True).items():
        setattr(db_week, field, value)
    
    db.commit()
    db.refresh(db_week)
    return db_week

@router.delete("/{week_id}")
def delete_week(week_id: int, db: Session = Depends(get_db)):
    """Delete a week"""
    db_week = db.query(Week).filter(Week.id == week_id).first()
    if not db_week:
        raise HTTPException(status_code=404, detail="Week not found")
    
    # Check if week has any associated data
    if db_week.player_pool or db_week.lineups:
        raise HTTPException(
            status_code=400,
            detail="Cannot delete week with associated player pool entries or lineups"
        )
    
    db.delete(db_week)
    db.commit()
    return {"message": "Week deleted successfully"}

@router.post("/bulk", response_model=List[WeekSchema])
def create_bulk_weeks(weeks: List[WeekCreate], db: Session = Depends(get_db)):
    """Create multiple weeks at once (useful for setting up a season)"""
    created_weeks = []
    
    for week_data in weeks:
        # Check for conflicts
        existing_week = db.query(Week).filter(
            Week.year == week_data.year,
            Week.week_number == week_data.week_number
        ).first()
        
        if existing_week:
            continue  # Skip if week already exists
        
        # Validate dates
        if week_data.start_date >= week_data.end_date:
            continue  # Skip invalid dates
        
        db_week = Week(**week_data.model_dump())
        db.add(db_week)
        created_weeks.append(db_week)
    
    if created_weeks:
        db.commit()
        for week in created_weeks:
            db.refresh(week)
    
    return created_weeks

@router.put("/{week_id}/status", response_model=WeekSchema)
def update_week_status(week_id: int, status: str, db: Session = Depends(get_db)):
    """Update just the status of a week"""
    if status not in ["Completed", "Active", "Upcoming"]:
        raise HTTPException(
            status_code=400,
            detail="Status must be one of: Completed, Active, Upcoming"
        )
    
    db_week = db.query(Week).filter(Week.id == week_id).first()
    if not db_week:
        raise HTTPException(status_code=404, detail="Week not found")
    
    db_week.status = status
    db.commit()
    db.refresh(db_week)
    return db_week
