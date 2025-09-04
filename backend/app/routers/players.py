from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session, joinedload
from typing import List, Optional
import uuid

from app.database import get_db
from app.models import Player, Team, PlayerPoolEntry, Week, Game
from app.schemas import (
    PlayerCreate, PlayerUpdate, Player as PlayerSchema,
    PlayerPoolEntryCreate, PlayerPoolEntryUpdate, PlayerPoolEntry as PlayerPoolEntrySchema,
    PlayerListResponse, PlayerPoolResponse, PlayerPoolAnalysisResponse, PlayerPoolEntryWithAnalysis, WeekAnalysisData
)

router = APIRouter()

# Player CRUD operations
@router.post("/", response_model=PlayerSchema)
def create_player(player: PlayerCreate, db: Session = Depends(get_db)):
    """Create a new player"""
    # Check if team exists
    team = db.query(Team).filter(Team.id == player.team).first()
    if not team:
        raise HTTPException(status_code=404, detail="Team not found")
    
    # Check if player already exists
    existing_player = db.query(Player).filter(Player.playerDkId == player.playerDkId).first()
    if existing_player:
        raise HTTPException(status_code=400, detail="Player with this ID already exists")
    
    db_player = Player(**player.model_dump())
    db.add(db_player)
    db.commit()
    db.refresh(db_player)
    return db_player

@router.get("/", response_model=PlayerListResponse)
def get_players(
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=1000),
    position: Optional[str] = Query(None),
    team_id: Optional[str] = Query(None),
    search: Optional[str] = Query(None),
    db: Session = Depends(get_db)
):
    """Get players with filtering and pagination"""
    query = db.query(Player)
    
    if position:
        query = query.filter(Player.position == position)
    
    if team_id:
        query = query.filter(Player.team == team_id)
    
    if search:
        query = query.filter(Player.displayName.ilike(f"%{search}%"))
    
    total = query.count()
    players = query.offset(skip).limit(limit).all()
    
    return PlayerListResponse(
        players=players,
        total=total,
        page=skip // limit + 1,
        size=limit
    )

@router.get("/profiles", response_model=PlayerListResponse)
def get_player_profiles(
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=1000),
    position: Optional[str] = Query(None),
    team_id: Optional[str] = Query(None),
    search: Optional[str] = Query(None),
    show_hidden: bool = Query(False, description="Whether to include hidden players"),
    db: Session = Depends(get_db)
):
    """Get players for profile view with filtering and pagination"""
    query = db.query(Player)
    
    if position and position != "All":
        query = query.filter(Player.position == position)
    
    if team_id and team_id != "All":
        query = query.filter(Player.team == team_id)
    
    if search:
        query = query.filter(Player.displayName.ilike(f"%{search}%"))
    
    # Filter out hidden players unless show_hidden is True
    if not show_hidden:
        query = query.filter(Player.hidden == False)
    
    total = query.count()
    players = query.offset(skip).limit(limit).all()
    
    return PlayerListResponse(
        players=players,
        total=total,
        page=skip // limit + 1,
        size=limit
    )

@router.get("/{player_id}", response_model=PlayerSchema)
def get_player(player_id: int, db: Session = Depends(get_db)):
    """Get a specific player by DraftKings ID"""
    player = db.query(Player).filter(Player.playerDkId == player_id).first()
    if not player:
        raise HTTPException(status_code=404, detail="Player not found")
    return player

@router.put("/{player_id}", response_model=PlayerSchema)
def update_player(player_id: int, player_update: PlayerUpdate, db: Session = Depends(get_db)):
    """Update a player"""
    db_player = db.query(Player).filter(Player.playerDkId == player_id).first()
    if not db_player:
        raise HTTPException(status_code=404, detail="Player not found")
    
    # Check if team exists if team is being updated
    if player_update.team and player_update.team != db_player.team:
        team = db.query(Team).filter(Team.id == player_update.team).first()
        if not team:
            raise HTTPException(status_code=404, detail="Team not found")
    
    for field, value in player_update.model_dump(exclude_unset=True).items():
        setattr(db_player, field, value)
    
    db.commit()
    db.refresh(db_player)
    return db_player

@router.delete("/{player_id}")
def delete_player(player_id: int, db: Session = Depends(get_db)):
    """Delete a player"""
    db_player = db.query(Player).filter(Player.playerDkId == player_id).first()
    if not db_player:
        raise HTTPException(status_code=404, detail="Player not found")
    
    db.delete(db_player)
    db.commit()
    return {"message": "Player deleted successfully"}

# Player Pool Entry operations
@router.post("/pool", response_model=PlayerPoolEntrySchema)
def create_player_pool_entry(entry: PlayerPoolEntryCreate, db: Session = Depends(get_db)):
    """Create a new player pool entry for a specific week"""
    # Check if week exists
    week = db.query(Week).filter(Week.id == entry.week_id).first()
    if not week:
        raise HTTPException(status_code=404, detail="Week not found")
    
    # Check if player exists
    player = db.query(Player).filter(Player.id == entry.player_id).first()
    if not player:
        raise HTTPException(status_code=404, detail="Player not found")
    
    # Check if entry already exists
    existing_entry = db.query(PlayerPoolEntry).filter(
        PlayerPoolEntry.week_id == entry.week_id,
        PlayerPoolEntry.player_id == entry.player_id
    ).first()
    
    if existing_entry:
        raise HTTPException(status_code=400, detail="Player pool entry already exists for this week")
    
    db_entry = PlayerPoolEntry(**entry.model_dump())
    db.add(db_entry)
    db.commit()
    db.refresh(db_entry)
    return db_entry

@router.get("/pool/{week_id}", response_model=PlayerPoolResponse)
def get_player_pool(
    week_id: int,
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=1000),
    position: Optional[str] = Query(None),
    team_id: Optional[str] = Query(None),
    excluded: Optional[bool] = Query(None),
    search: Optional[str] = Query(None),
    db: Session = Depends(get_db)
):
    """Get player pool for a specific week with filtering and pagination"""
    # Check if week exists
    week = db.query(Week).filter(Week.id == week_id).first()
    if not week:
        raise HTTPException(status_code=404, detail="Week not found")
    
    # Start with base query and always join Player to ensure relationships are loaded
    query = db.query(PlayerPoolEntry).join(Player).filter(PlayerPoolEntry.week_id == week_id)
    
    if position:
        query = query.filter(Player.position == position)
    
    if team_id:
        query = query.filter(Player.team == team_id)  # Changed from team_id to team
    
    if excluded is not None:
        query = query.filter(PlayerPoolEntry.excluded == excluded)
    
    if search:
        query = query.filter(Player.displayName.ilike(f"%{search}%"))  # Changed from name to displayName
    
    total = query.count()
    
    # Load all relationships and apply pagination
    entries = query.options(
        joinedload(PlayerPoolEntry.player),
        joinedload(PlayerPoolEntry.week)
    ).offset(skip).limit(limit).all()
    
    return PlayerPoolResponse(
        entries=entries,
        total=total,
        week_id=week_id
    )

@router.get("/pool/{week_id}/analysis", response_model=PlayerPoolAnalysisResponse)
def get_player_pool_with_analysis(
    week_id: int,
    db: Session = Depends(get_db)
):
    """Return player pool entries joined with Players and Games for the Active (or specified) week.

    Mapping rules:
    - Join `player_pool_entries.week_id == week_id`
    - Join to `players` via `player_pool_entries.playerDkId`
    - Use `players.team` or newly-added `players.team_id` to find the team row
    - Join to `games` using `games.week_id == week_id` and matching `games.team_id == players.team_id`
    """
    # Verify week exists
    week = db.query(Week).filter(Week.id == week_id).first()
    if not week:
        raise HTTPException(status_code=404, detail="Week not found")

    # Build query with joins
    # Note: support both team_id on Player (preferred) and fallback by Team abbreviation if needed.
    query = (
        db.query(PlayerPoolEntry, Player, Game)
        .join(Player, PlayerPoolEntry.playerDkId == Player.playerDkId)
        .outerjoin(
            Game,
            (Game.week_id == PlayerPoolEntry.week_id) & (Game.team_id == Player.team_id)
        )
        .filter(PlayerPoolEntry.week_id == week_id)
    )

    rows = query.all()

    entries: list[PlayerPoolEntryWithAnalysis] = []
    for row in rows:
        entry, player, game = row
        analysis = WeekAnalysisData(
            opponent_abbr=(game.opponent_team.abbreviation if getattr(game, 'opponent_team', None) else None) if game else None,
            homeoraway=game.homeoraway if game else None,
            proj_spread=game.proj_spread if game else None,
            proj_total=game.proj_total if game else None,
            implied_team_total=game.implied_team_total if game else None,
        )
        # Reattach ORM objects: FastAPI will transform via Pydantic models
        entry.player = player
        entries.append(PlayerPoolEntryWithAnalysis(entry=entry, analysis=analysis))

    return PlayerPoolAnalysisResponse(entries=entries, total=len(entries), week_id=week_id)

@router.put("/pool/{entry_id}", response_model=PlayerPoolEntrySchema)
def update_player_pool_entry(
    entry_id: str,
    entry_update: PlayerPoolEntryUpdate,
    db: Session = Depends(get_db)
):
    """Update a player pool entry"""
    db_entry = db.query(PlayerPoolEntry).filter(PlayerPoolEntry.id == entry_id).first()
    if not db_entry:
        raise HTTPException(status_code=404, detail="Player pool entry not found")
    
    for field, value in entry_update.model_dump(exclude_unset=True).items():
        setattr(db_entry, field, value)
    
    db.commit()
    db.refresh(db_entry)
    return db_entry

@router.delete("/pool/{entry_id}")
def delete_player_pool_entry(entry_id: str, db: Session = Depends(get_db)):
    """Delete a player pool entry"""
    db_entry = db.query(PlayerPoolEntry).filter(PlayerPoolEntry.id == entry_id).first()
    if not db_entry:
        raise HTTPException(status_code=404, detail="Player pool entry not found")
    
    db.delete(db_entry)
    db.commit()
    return {"message": "Player pool entry deleted successfully"}

# Bulk operations
@router.post("/pool/bulk", response_model=List[PlayerPoolEntrySchema])
def create_bulk_player_pool_entries(
    entries: List[PlayerPoolEntryCreate],
    db: Session = Depends(get_db)
):
    """Create multiple player pool entries at once"""
    created_entries = []
    
    for entry in entries:
        # Check if week exists
        week = db.query(Week).filter(Week.id == entry.week_id).first()
        if not week:
            raise HTTPException(status_code=404, detail=f"Week {entry.week_id} not found")
        
        # Check if player exists
        player = db.query(Player).filter(Player.playerDkId == entry.playerDkId).first()
        if not player:
            raise HTTPException(status_code=404, detail=f"Player {entry.playerDkId} not found")
        
        # Check if entry already exists
        existing_entry = db.query(PlayerPoolEntry).filter(
            PlayerPoolEntry.week_id == entry.week_id,
            PlayerPoolEntry.playerDkId == entry.playerDkId
        ).first()
        
        if existing_entry:
            # Update existing entry instead of creating duplicate
            for field, value in entry.model_dump().items():
                setattr(existing_entry, field, value)
            created_entries.append(existing_entry)
        else:
            # Create new entry
            db_entry = PlayerPoolEntry(**entry.model_dump())
            db.add(db_entry)
            created_entries.append(db_entry)
    
    db.commit()
    
    # Refresh all entries to get updated data
    for entry in created_entries:
        db.refresh(entry)
    
    return created_entries

@router.put("/pool/bulk-update", response_model=List[PlayerPoolEntrySchema])
def bulk_update_player_pool_entries(
    updates: List[dict],
    db: Session = Depends(get_db)
):
    """Update multiple player pool entries at once"""
    updated_entries = []
    
    for update_data in updates:
        entry_id = update_data.get('entry_id')
        if not entry_id:
            continue
            
        db_entry = db.query(PlayerPoolEntry).filter(PlayerPoolEntry.id == entry_id).first()
        if not db_entry:
            continue
        
        # Update fields
        if 'excluded' in update_data:
            db_entry.excluded = update_data['excluded']
        if 'status' in update_data:
            db_entry.status = update_data['status']
        if 'isDisabled' in update_data:
            db_entry.isDisabled = update_data['isDisabled']
        if 'tier' in update_data:
            db_entry.tier = update_data['tier']
        
        updated_entries.append(db_entry)
    
    db.commit()
    
    # Refresh all entries to get updated data
    for entry in updated_entries:
        db.refresh(entry)
    
    return updated_entries
