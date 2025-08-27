from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List

from app.database import get_db
from app.models import Team
from app.schemas import TeamCreate, TeamUpdate, Team as TeamSchema

router = APIRouter()

@router.post("/", response_model=TeamSchema)
def create_team(team: TeamCreate, db: Session = Depends(get_db)):
    """Create a new team"""
    # Check if team already exists
    existing_team = db.query(Team).filter(Team.id == team.id).first()
    if existing_team:
        raise HTTPException(status_code=400, detail="Team with this ID already exists")
    
    db_team = Team(**team.dict())
    db.add(db_team)
    db.commit()
    db.refresh(db_team)
    return db_team

@router.get("/", response_model=List[TeamSchema])
def get_teams(db: Session = Depends(get_db)):
    """Get all teams"""
    teams = db.query(Team).all()
    return teams

@router.get("/{team_id}", response_model=TeamSchema)
def get_team(team_id: str, db: Session = Depends(get_db)):
    """Get a specific team by ID"""
    team = db.query(Team).filter(Team.id == team_id).first()
    if not team:
        raise HTTPException(status_code=404, detail="Team not found")
    return team

@router.put("/{team_id}", response_model=TeamSchema)
def update_team(team_id: str, team_update: TeamUpdate, db: Session = Depends(get_db)):
    """Update a team"""
    db_team = db.query(Team).filter(Team.id == team_id).first()
    if not db_team:
        raise HTTPException(status_code=404, detail="Team not found")
    
    for field, value in team_update.dict(exclude_unset=True).items():
        setattr(db_team, field, value)
    
    db.commit()
    db.refresh(db_team)
    return db_team

@router.delete("/{team_id}")
def delete_team(team_id: str, db: Session = Depends(get_db)):
    """Delete a team"""
    db_team = db.query(Team).filter(Team.id == team_id).first()
    if not db_team:
        raise HTTPException(status_code=404, detail="Team not found")
    
    db.delete(db_team)
    db.commit()
    return {"message": "Team deleted successfully"}
