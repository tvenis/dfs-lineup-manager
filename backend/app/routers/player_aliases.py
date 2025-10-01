from fastapi import APIRouter, HTTPException, Depends, Query
from sqlalchemy.orm import Session
from typing import List, Optional
from app.database import get_db
from app.models import PlayerNameAlias, Player
from app.schemas import PlayerNameAlias as PlayerNameAliasSchema, PlayerNameAliasCreate, PlayerNameAliasUpdate

router = APIRouter(prefix="/api/player-aliases", tags=["player-aliases"])

@router.get("/", response_model=List[PlayerNameAliasSchema])
def get_player_aliases(
    playerDkId: Optional[int] = Query(None, description="Filter by playerDkId"),
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=1000),
    db: Session = Depends(get_db)
):
    """Get all player aliases, optionally filtered by playerDkId"""
    query = db.query(PlayerNameAlias)
    
    if playerDkId is not None:
        query = query.filter(PlayerNameAlias.playerDkId == playerDkId)
    
    aliases = query.offset(skip).limit(limit).all()
    return aliases

@router.get("/{alias_id}", response_model=PlayerNameAliasSchema)
def get_player_alias(alias_id: int, db: Session = Depends(get_db)):
    """Get a specific player alias by ID"""
    alias = db.query(PlayerNameAlias).filter(PlayerNameAlias.id == alias_id).first()
    if not alias:
        raise HTTPException(status_code=404, detail="Player alias not found")
    return alias

@router.post("/", response_model=PlayerNameAliasSchema)
def create_player_alias(alias: PlayerNameAliasCreate, db: Session = Depends(get_db)):
    """Create a new player alias"""
    # Verify the player exists
    player = db.query(Player).filter(Player.playerDkId == alias.playerDkId).first()
    if not player:
        raise HTTPException(status_code=404, detail="Player not found")
    
    # Check if alias already exists for this player
    existing_alias = db.query(PlayerNameAlias).filter(
        PlayerNameAlias.playerDkId == alias.playerDkId,
        PlayerNameAlias.alias_name == alias.alias_name
    ).first()
    if existing_alias:
        raise HTTPException(status_code=400, detail="Alias already exists for this player")
    
    # Create the alias
    db_alias = PlayerNameAlias(**alias.dict())
    db.add(db_alias)
    db.commit()
    db.refresh(db_alias)
    return db_alias

@router.put("/{alias_id}", response_model=PlayerNameAliasSchema)
def update_player_alias(alias_id: int, alias_update: PlayerNameAliasUpdate, db: Session = Depends(get_db)):
    """Update a player alias"""
    db_alias = db.query(PlayerNameAlias).filter(PlayerNameAlias.id == alias_id).first()
    if not db_alias:
        raise HTTPException(status_code=404, detail="Player alias not found")
    
    # Check if new alias name already exists for this player (if being updated)
    if alias_update.alias_name and alias_update.alias_name != db_alias.alias_name:
        existing_alias = db.query(PlayerNameAlias).filter(
            PlayerNameAlias.playerDkId == db_alias.playerDkId,
            PlayerNameAlias.alias_name == alias_update.alias_name,
            PlayerNameAlias.id != alias_id
        ).first()
        if existing_alias:
            raise HTTPException(status_code=400, detail="Alias already exists for this player")
    
    # Update the alias
    update_data = alias_update.dict(exclude_unset=True)
    for field, value in update_data.items():
        setattr(db_alias, field, value)
    
    db.commit()
    db.refresh(db_alias)
    return db_alias

@router.delete("/{alias_id}")
def delete_player_alias(alias_id: int, db: Session = Depends(get_db)):
    """Delete a player alias"""
    db_alias = db.query(PlayerNameAlias).filter(PlayerNameAlias.id == alias_id).first()
    if not db_alias:
        raise HTTPException(status_code=404, detail="Player alias not found")
    
    db.delete(db_alias)
    db.commit()
    return {"message": "Player alias deleted successfully"}

@router.get("/player/{playerDkId}", response_model=List[PlayerNameAliasSchema])
def get_player_aliases_by_player(playerDkId: int, db: Session = Depends(get_db)):
    """Get all aliases for a specific player"""
    # Verify the player exists
    player = db.query(Player).filter(Player.playerDkId == playerDkId).first()
    if not player:
        raise HTTPException(status_code=404, detail="Player not found")
    
    aliases = db.query(PlayerNameAlias).filter(PlayerNameAlias.playerDkId == playerDkId).all()
    return aliases
