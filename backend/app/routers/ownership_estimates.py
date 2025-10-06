from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from typing import List, Optional
from app.database import get_db
from app.models import OwnershipEstimate
from app.schemas import OwnershipEstimate as OwnershipEstimateSchema, OwnershipEstimateCreate, OwnershipEstimateUpdate
from sqlalchemy import and_

router = APIRouter(prefix="/api/ownership-estimates", tags=["ownership-estimates"])

@router.get("/", response_model=List[OwnershipEstimateSchema])
def get_ownership_estimates(
    week_id: Optional[int] = Query(None, description="Filter by week ID"),
    player_id: Optional[int] = Query(None, description="Filter by player ID"),
    source: Optional[str] = Query(None, description="Filter by source"),
    draft_group: Optional[str] = Query(None, description="Filter by draft group"),
    db: Session = Depends(get_db)
):
    """Get ownership estimates with optional filters"""
    query = db.query(OwnershipEstimate)
    
    if week_id:
        query = query.filter(OwnershipEstimate.week_id == week_id)
    if player_id:
        query = query.filter(OwnershipEstimate.playerDkId == player_id)
    if source:
        query = query.filter(OwnershipEstimate.source == source)
    if draft_group:
        query = query.filter(OwnershipEstimate.draftGroup == draft_group)
    
    return query.all()

@router.post("/", response_model=OwnershipEstimateSchema)
def create_ownership_estimate(
    estimate: OwnershipEstimateCreate,
    db: Session = Depends(get_db)
):
    """Create a new ownership estimate"""
    # Check for existing estimate
    existing = db.query(OwnershipEstimate).filter(
        and_(
            OwnershipEstimate.week_id == estimate.week_id,
            OwnershipEstimate.playerDkId == estimate.playerDkId,
            OwnershipEstimate.source == estimate.source,
            OwnershipEstimate.draftGroup == estimate.draftGroup
        )
    ).first()
    
    if existing:
        raise HTTPException(
            status_code=400,
            detail="Ownership estimate already exists for this player, week, source, and draft group"
        )
    
    db_estimate = OwnershipEstimate(**estimate.dict())
    db.add(db_estimate)
    db.commit()
    db.refresh(db_estimate)
    return db_estimate

@router.put("/{estimate_id}", response_model=OwnershipEstimateSchema)
def update_ownership_estimate(
    estimate_id: int,
    estimate_update: OwnershipEstimateUpdate,
    db: Session = Depends(get_db)
):
    """Update an ownership estimate"""
    estimate = db.query(OwnershipEstimate).filter(OwnershipEstimate.id == estimate_id).first()
    
    if not estimate:
        raise HTTPException(status_code=404, detail="Ownership estimate not found")
    
    for field, value in estimate_update.dict(exclude_unset=True).items():
        setattr(estimate, field, value)
    
    db.commit()
    db.refresh(estimate)
    return estimate

@router.delete("/{estimate_id}")
def delete_ownership_estimate(
    estimate_id: int,
    db: Session = Depends(get_db)
):
    """Delete an ownership estimate"""
    estimate = db.query(OwnershipEstimate).filter(OwnershipEstimate.id == estimate_id).first()
    
    if not estimate:
        raise HTTPException(status_code=404, detail="Ownership estimate not found")
    
    db.delete(estimate)
    db.commit()
    return {"message": "Ownership estimate deleted successfully"}

@router.get("/week/{week_id}/player/{player_id}", response_model=List[OwnershipEstimateSchema])
def get_player_ownership_estimates(
    week_id: int,
    player_id: int,
    db: Session = Depends(get_db)
):
    """Get all ownership estimates for a specific player in a specific week"""
    estimates = db.query(OwnershipEstimate).filter(
        and_(
            OwnershipEstimate.week_id == week_id,
            OwnershipEstimate.playerDkId == player_id
        )
    ).all()
    
    return estimates

@router.get("/week/{week_id}/consensus", response_model=List[dict])
def get_consensus_ownership(
    week_id: int,
    db: Session = Depends(get_db)
):
    """Get consensus ownership for all players in a week (averaged across sources)"""
    from sqlalchemy import func
    
    # Get average ownership by player
    consensus_data = db.query(
        OwnershipEstimate.playerDkId,
        func.avg(OwnershipEstimate.ownership).label('consensus_ownership'),
        func.count(OwnershipEstimate.id).label('source_count')
    ).filter(
        OwnershipEstimate.week_id == week_id
    ).group_by(
        OwnershipEstimate.playerDkId
    ).all()
    
    return [
        {
            "playerDkId": row.playerDkId,
            "consensus_ownership": round(float(row.consensus_ownership), 2),
            "source_count": row.source_count
        }
        for row in consensus_data
    ]
