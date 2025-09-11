from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from typing import List, Optional
from app.database import get_db
from app.models import DraftGroup
from app.schemas import DraftGroup as DraftGroupSchema, DraftGroupCreate, DraftGroupUpdate, Week
from sqlalchemy import and_

router = APIRouter(prefix="/api/draftgroups", tags=["draftgroups"])

@router.get("/", response_model=List[DraftGroupSchema])
def get_draftgroups(
    week_id: Optional[int] = Query(None, description="Filter by week ID"),
    draft_group: Optional[int] = Query(None, description="Filter by draft group ID"),
    db: Session = Depends(get_db)
):
    """Get all draft groups, optionally filtered by week_id or draft_group"""
    query = db.query(DraftGroup)
    
    if week_id is not None:
        query = query.filter(DraftGroup.week_id == week_id)
    
    if draft_group is not None:
        query = query.filter(DraftGroup.draftGroup == draft_group)
    
    return query.all()

@router.get("/{draftgroup_id}", response_model=DraftGroupSchema)
def get_draftgroup(draftgroup_id: int, db: Session = Depends(get_db)):
    """Get a specific draft group by ID"""
    draftgroup = db.query(DraftGroup).filter(DraftGroup.id == draftgroup_id).first()
    if not draftgroup:
        raise HTTPException(status_code=404, detail="Draft group not found")
    return draftgroup

@router.post("/", response_model=DraftGroupSchema)
def create_draftgroup(draftgroup: DraftGroupCreate, db: Session = Depends(get_db)):
    """Create a new draft group"""
    # Check if draft group already exists for this week
    existing = db.query(DraftGroup).filter(
        and_(
            DraftGroup.draftGroup == draftgroup.draftGroup,
            DraftGroup.week_id == draftgroup.week_id
        )
    ).first()
    
    if existing:
        raise HTTPException(
            status_code=400, 
            detail=f"Draft group {draftgroup.draftGroup} already exists for week {draftgroup.week_id}"
        )
    
    db_draftgroup = DraftGroup(**draftgroup.dict())
    db.add(db_draftgroup)
    db.commit()
    db.refresh(db_draftgroup)
    return db_draftgroup

@router.put("/{draftgroup_id}", response_model=DraftGroupSchema)
def update_draftgroup(
    draftgroup_id: int, 
    draftgroup: DraftGroupUpdate, 
    db: Session = Depends(get_db)
):
    """Update a draft group"""
    db_draftgroup = db.query(DraftGroup).filter(DraftGroup.id == draftgroup_id).first()
    if not db_draftgroup:
        raise HTTPException(status_code=404, detail="Draft group not found")
    
    # Check for unique constraint if updating draftGroup or week_id
    if draftgroup.draftGroup is not None or draftgroup.week_id is not None:
        new_draft_group = draftgroup.draftGroup if draftgroup.draftGroup is not None else db_draftgroup.draftGroup
        new_week_id = draftgroup.week_id if draftgroup.week_id is not None else db_draftgroup.week_id
        
        existing = db.query(DraftGroup).filter(
            and_(
                DraftGroup.draftGroup == new_draft_group,
                DraftGroup.week_id == new_week_id,
                DraftGroup.id != draftgroup_id
            )
        ).first()
        
        if existing:
            raise HTTPException(
                status_code=400,
                detail=f"Draft group {new_draft_group} already exists for week {new_week_id}"
            )
    
    # Update fields
    for field, value in draftgroup.dict(exclude_unset=True).items():
        setattr(db_draftgroup, field, value)
    
    db.commit()
    db.refresh(db_draftgroup)
    return db_draftgroup

@router.delete("/{draftgroup_id}")
def delete_draftgroup(draftgroup_id: int, db: Session = Depends(get_db)):
    """Delete a draft group"""
    db_draftgroup = db.query(DraftGroup).filter(DraftGroup.id == draftgroup_id).first()
    if not db_draftgroup:
        raise HTTPException(status_code=404, detail="Draft group not found")
    
    db.delete(db_draftgroup)
    db.commit()
    return {"message": "Draft group deleted successfully"}

@router.get("/week/{week_id}", response_model=List[DraftGroupSchema])
def get_draftgroups_by_week(week_id: int, db: Session = Depends(get_db)):
    """Get all draft groups for a specific week"""
    draftgroups = db.query(DraftGroup).filter(DraftGroup.week_id == week_id).all()
    return draftgroups
