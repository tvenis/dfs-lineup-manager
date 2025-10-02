from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session, joinedload
from sqlalchemy import func, and_
from typing import List, Optional
import uuid

from app.database import get_db
from app.models import Player, Team, PlayerPoolEntry, Week, Game, PlayerPropBet, PlayerActuals
from app.schemas import (
    PlayerCreate, PlayerUpdate, Player as PlayerSchema,
    PlayerPoolEntryCreate, PlayerPoolEntryUpdate, PlayerPoolEntry as PlayerPoolEntrySchema,
    PlayerListResponse, PlayerListWithPoolDataResponse, PlayerPoolResponse, PlayerPoolAnalysisResponse, PlayerPoolEntryWithAnalysis, WeekAnalysisData,
    PlayerPropsResponse, PlayerPropBetWithMeta
)
from typing import Dict, Any

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
        query = query.filter(func.upper(Player.position) == position.upper())
    
    if team_id:
        query = query.filter(func.upper(Player.team) == team_id.upper())
    
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
        query = query.filter(func.upper(Player.position) == position.upper())
    
    if team_id and team_id != "All":
        query = query.filter(func.upper(Player.team) == team_id.upper())
    
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

@router.get("/profiles-with-pool-data", response_model=PlayerListWithPoolDataResponse)
def get_player_profiles_with_pool_data(
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=1000),
    position: Optional[str] = Query(None),
    team_id: Optional[str] = Query(None),
    search: Optional[str] = Query(None),
    show_hidden: bool = Query(False, description="Whether to include hidden players"),
    db: Session = Depends(get_db)
):
    """Get players for profile view with current week pool data including consistency calculation"""
    # First get the current active week
    from app.routers.weeks import get_current_week
    try:
        current_week = get_current_week(db)
        week_id = current_week.id
    except Exception:
        # If no current week, return empty result
        return PlayerListResponse(players=[], total=0, page=1, size=limit)
    
    # Build query with joins to get player pool data for current week
    query = (
        db.query(Player, PlayerPoolEntry)
        .join(PlayerPoolEntry, 
              and_(PlayerPoolEntry.playerDkId == Player.playerDkId,
                   PlayerPoolEntry.week_id == week_id))
    )
    
    if position and position != "All":
        query = query.filter(func.upper(Player.position) == position.upper())
    
    if team_id and team_id != "All":
        query = query.filter(func.upper(Player.team) == team_id.upper())
    
    if search:
        query = query.filter(Player.displayName.ilike(f"%{search}%"))
    
    # Filter out hidden players unless show_hidden is True
    if not show_hidden:
        query = query.filter(Player.hidden == False)
    
    total = query.count()
    results = query.offset(skip).limit(limit).all()
    
    # Process results to include consistency calculation
    players_with_pool_data = []
    for player, pool_entry in results:
        # Calculate YTD consistency (Actual Points / Projected Points)
        consistency = None
        if pool_entry.projectedPoints and pool_entry.projectedPoints > 0:
            # Get YTD actual points for this player
            ytd_actuals = db.query(func.sum(PlayerActuals.dk_actuals)).filter(
                PlayerActuals.playerDkId == player.playerDkId,
                PlayerActuals.week_id <= week_id
            ).scalar() or 0
            
            # Get YTD projected points for this player
            ytd_projected = db.query(func.sum(PlayerPoolEntry.projectedPoints)).filter(
                PlayerPoolEntry.playerDkId == player.playerDkId,
                PlayerPoolEntry.week_id <= week_id,
                PlayerPoolEntry.projectedPoints.isnot(None)
            ).scalar() or 0
            
            if ytd_projected > 0:
                consistency = round((ytd_actuals / ytd_projected) * 100, 1)
        
        # Create enhanced player object with pool data
        enhanced_player = {
            'playerDkId': player.playerDkId,
            'firstName': player.firstName,
            'lastName': player.lastName,
            'suffix': player.suffix,
            'displayName': player.displayName,
            'shortName': player.shortName,
            'position': player.position,
            'team': player.team,
            'team_id': player.team_id,
            'playerImage50': player.playerImage50,
            'playerImage160': player.playerImage160,
            'hidden': player.hidden,
            'created_at': player.created_at,
            'updated_at': player.updated_at,
            'currentWeekProj': pool_entry.projectedPoints,
            'currentWeekSalary': pool_entry.salary,
            'consistency': consistency,
            'ownership': pool_entry.ownership,
            'status': pool_entry.status,
            'poolEntryId': pool_entry.id
        }
        players_with_pool_data.append(enhanced_player)
    
    return PlayerListWithPoolDataResponse(
        players=players_with_pool_data,
        total=total,
        page=skip // limit + 1,
        size=limit
    )

@router.get("/profiles-with-pool-data-optimized", response_model=PlayerListWithPoolDataResponse)
def get_player_profiles_with_pool_data_optimized(
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=1000),
    position: Optional[str] = Query(None),
    team_id: Optional[str] = Query(None),
    search: Optional[str] = Query(None),
    show_hidden: bool = Query(False, description="Whether to include hidden players"),
    db: Session = Depends(get_db)
):
    """Optimized version that calculates consistency in a single query"""
    # First get the current active week
    from app.routers.weeks import get_current_week
    try:
        current_week = get_current_week(db)
        week_id = current_week.id
    except Exception:
        return PlayerListWithPoolDataResponse(players=[], total=0, page=1, size=limit)
    
    # Build the main query with consistency calculation in a single SQL query
    # This uses a subquery to calculate YTD totals for each player
    consistency_subquery = db.query(
        PlayerPoolEntry.playerDkId,
        func.sum(PlayerActuals.dk_actuals).label('ytd_actuals'),
        func.sum(PlayerPoolEntry.projectedPoints).label('ytd_projected')
    ).join(
        PlayerActuals, 
        and_(
            PlayerActuals.playerDkId == PlayerPoolEntry.playerDkId,
            PlayerActuals.week_id == PlayerPoolEntry.week_id,
            PlayerActuals.week_id <= week_id
        )
    ).filter(
        PlayerPoolEntry.week_id <= week_id,
        PlayerPoolEntry.projectedPoints.isnot(None)
    ).group_by(PlayerPoolEntry.playerDkId).subquery()
    
    # Main query with left join to consistency data
    query = (
        db.query(
            Player,
            PlayerPoolEntry,
            consistency_subquery.c.ytd_actuals,
            consistency_subquery.c.ytd_projected
        )
        .join(PlayerPoolEntry, 
              and_(PlayerPoolEntry.playerDkId == Player.playerDkId,
                   PlayerPoolEntry.week_id == week_id))
        .outerjoin(consistency_subquery, 
                  consistency_subquery.c.playerDkId == Player.playerDkId)
    )
    
    # Apply filters
    if position and position != "All":
        query = query.filter(func.upper(Player.position) == position.upper())
    
    if team_id and team_id != "All":
        query = query.filter(func.upper(Player.team) == team_id.upper())
    
    if search:
        query = query.filter(Player.displayName.ilike(f"%{search}%"))
    
    if not show_hidden:
        query = query.filter(Player.hidden == False)
    
    total = query.count()
    results = query.offset(skip).limit(limit).all()
    
    # Process results (no additional queries needed)
    players_with_pool_data = []
    for player, pool_entry, ytd_actuals, ytd_projected in results:
        # Calculate consistency from pre-computed values
        consistency = None
        if ytd_projected and ytd_projected > 0:
            consistency = round((ytd_actuals or 0) / ytd_projected * 100, 1)
        
        enhanced_player = {
            'playerDkId': player.playerDkId,
            'firstName': player.firstName,
            'lastName': player.lastName,
            'suffix': player.suffix,
            'displayName': player.displayName,
            'shortName': player.shortName,
            'position': player.position,
            'team': player.team,
            'team_id': player.team_id,
            'playerImage50': player.playerImage50,
            'playerImage160': player.playerImage160,
            'hidden': player.hidden,
            'created_at': player.created_at,
            'updated_at': player.updated_at,
            'currentWeekProj': pool_entry.projectedPoints,
            'currentWeekSalary': pool_entry.salary,
            'consistency': consistency,
            'ownership': pool_entry.ownership,
            'status': pool_entry.status,
            'poolEntryId': pool_entry.id
        }
        players_with_pool_data.append(enhanced_player)
    
    return PlayerListWithPoolDataResponse(
        players=players_with_pool_data,
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
        query = query.filter(func.upper(Player.position) == position.upper())
    
    if team_id:
        query = query.filter(func.upper(Player.team) == team_id.upper())  # Changed from team_id to team
    
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

@router.get("/pool/{week_id}/complete")
def get_player_pool_complete(
    week_id: int,
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=1000),
    position: Optional[str] = Query(None),
    team_id: Optional[str] = Query(None),
    excluded: Optional[bool] = Query(None),
    search: Optional[str] = Query(None),
    include_props: bool = Query(True, description="Include player props data"),
    db: Session = Depends(get_db)
):
    """
    Optimized endpoint that returns player pool + analysis + props in a single query.
    This replaces 3 separate API calls with 1 optimized call for maximum performance.
    
    Returns:
    - Player pool entries with player and week data
    - Game analysis data (opponent, spread, totals)
    - Player props data (if include_props=True)
    - Games map for team matchups
    """
    # Verify week exists
    week = db.query(Week).filter(Week.id == week_id).first()
    if not week:
        raise HTTPException(status_code=404, detail="Week not found")
    
    # Build optimized query with all necessary joins
    query = (
        db.query(PlayerPoolEntry, Player, Game)
        .join(Player, PlayerPoolEntry.playerDkId == Player.playerDkId)
        .outerjoin(
            Game,
            (Game.week_id == PlayerPoolEntry.week_id) & (Game.team_id == Player.team_id)
        )
        .filter(PlayerPoolEntry.week_id == week_id)
    )
    
    # Apply filters
    if position:
        query = query.filter(func.upper(Player.position) == position.upper())
    
    if team_id:
        query = query.filter(func.upper(Player.team) == team_id.upper())
    
    if excluded is not None:
        query = query.filter(PlayerPoolEntry.excluded == excluded)
    
    if search:
        query = query.filter(Player.displayName.ilike(f"%{search}%"))
    
    # Get total count for pagination
    total = query.count()
    
    # Apply pagination and get results
    rows = query.offset(skip).limit(limit).all()
    
    # Process results
    entries = []
    games_map = {}
    player_ids = []
    
    for row in rows:
        entry, player, game = row
        
        # Attach player to entry
        entry.player = player
        
        # Build analysis data
        analysis = WeekAnalysisData(
            opponent_abbr=(game.opponent_team.abbreviation if getattr(game, 'opponent_team', None) else None) if game else None,
            homeoraway=game.homeoraway if game else None,
            proj_spread=game.proj_spread if game else None,
            proj_total=game.proj_total if game else None,
            implied_team_total=game.implied_team_total if game else None,
        )
        
        # Create entry with analysis
        entry_with_analysis = PlayerPoolEntryWithAnalysis(entry=entry, analysis=analysis)
        entries.append(entry_with_analysis)
        
        # Build games map for team matchups
        if game and player.team:
            games_map[player.team] = {
                "opponentAbbr": analysis.opponent_abbr,
                "homeOrAway": analysis.homeoraway,
                "proj_spread": analysis.proj_spread,
                "proj_total": analysis.proj_total,
                "implied_team_total": analysis.implied_team_total
            }
        
        # Collect player IDs for props query
        if include_props:
            player_ids.append(player.playerDkId)
    
    # Fetch props data in batch if requested
    props_data = {}
    if include_props and player_ids:
        # Get all props for the players in this week
        props_query = db.query(PlayerPropBet).filter(
            PlayerPropBet.week_id == week_id,
            PlayerPropBet.playerDkId.in_(player_ids)
        ).all()
        
        # Group props by player ID and market
        for prop in props_query:
            player_id = prop.playerDkId
            if player_id not in props_data:
                props_data[player_id] = {}
            
            market = prop.market
            if market not in props_data[player_id]:
                props_data[player_id][market] = []
            
            props_data[player_id][market].append({
                'outcome_name': prop.outcome_name,
                'outcome_point': prop.outcome_point,
                'outcome_price': prop.outcome_price,
                'bookmaker': prop.bookmaker,
                'outcome_likelihood': prop.outcome_likelihood
            })
        
        # Process props to return all bookmakers, let frontend handle filtering
        processed_props = {}
        for player_id, market_data in props_data.items():
            processed_props[player_id] = {}
            
            for market, props_list in market_data.items():
                # Group props by bookmaker for this market
                bookmaker_props = {}
                for prop in props_list:
                    bookmaker = prop['bookmaker']
                    if bookmaker not in bookmaker_props:
                        bookmaker_props[bookmaker] = []
                    bookmaker_props[bookmaker].append(prop)
                
                # For each bookmaker, find the best Over prop (prefer 0.5, then any Over)
                for bookmaker, bookmaker_props_list in bookmaker_props.items():
                    best_prop = None
                    
                    # Prefer Over 0.5, then any Over
                    for prop in bookmaker_props_list:
                        if (prop['outcome_name'] == 'Over' and 
                            prop['outcome_point'] == 0.5):
                            best_prop = prop
                            break
                    
                    if not best_prop:
                        for prop in bookmaker_props_list:
                            if prop['outcome_name'] == 'Over':
                                best_prop = prop
                                break
                    
                    if best_prop:
                        # Create a unique key for this bookmaker's prop
                        market_key = f"{market}_{bookmaker}"
                        processed_props[player_id][market_key] = {
                            'point': best_prop['outcome_point'],
                            'price': best_prop['outcome_price'],
                            'bookmaker': best_prop['bookmaker'],
                            'likelihood': best_prop['outcome_likelihood'],
                            'market': market  # Include original market name
                        }
        
        props_data = processed_props
    
    # Return comprehensive response
    return {
        "entries": entries,
        "total": total,
        "week_id": week_id,
        "games_map": games_map,
        "props_data": props_data,
        "meta": {
            "skip": skip,
            "limit": limit,
            "has_more": (skip + limit) < total,
            "include_props": include_props
        }
    }

@router.put("/pool/{entry_id}", response_model=PlayerPoolEntrySchema)
def update_player_pool_entry(
    entry_id: int,
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
def delete_player_pool_entry(entry_id: int, db: Session = Depends(get_db)):
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

# Player Props endpoints
@router.get("/{player_id}/props", response_model=PlayerPropsResponse)
def get_player_props(
    player_id: int,
    week_id: Optional[int] = Query(None, description="Filter by week id"),
    bookmaker: Optional[str] = Query(None, description="Filter by bookmaker key"),
    market: Optional[str] = Query(None, description="Filter by market key"),
    db: Session = Depends(get_db)
):
    """Return player prop bets for a given player with optional filters and opponent/week metadata."""
    # Ensure player exists
    player = db.query(Player).filter(Player.playerDkId == player_id).first()
    if not player:
        raise HTTPException(status_code=404, detail="Player not found")

    # Base query joining to Game and Week for metadata
    query = (
        db.query(PlayerPropBet, Game, Week)
        .join(Game, PlayerPropBet.game_id == Game.id)
        .join(Week, PlayerPropBet.week_id == Week.id)
        .filter(PlayerPropBet.playerDkId == player_id)
    )

    if week_id:
        query = query.filter(PlayerPropBet.week_id == week_id)
    if bookmaker:
        query = query.filter(PlayerPropBet.bookmaker == bookmaker)
    if market:
        query = query.filter(PlayerPropBet.market == market)

    rows = query.order_by(PlayerPropBet.last_prop_update.desc().nullslast()).all()

    props: list[PlayerPropBetWithMeta] = []
    for prop_row, game_row, week_row in rows:
        opponent_abbr = None
        try:
            if getattr(game_row, 'opponent_team', None):
                opponent_abbr = game_row.opponent_team.abbreviation
        except Exception:
            opponent_abbr = None

        props.append(
            PlayerPropBetWithMeta(
                week_number=week_row.week_number,
                opponent=opponent_abbr,
                homeoraway=game_row.homeoraway if game_row else None,
                bookmaker=prop_row.bookmaker,
                market=prop_row.market,
                outcome_name=prop_row.outcome_name,
                outcome_price=prop_row.outcome_price,
                outcome_point=prop_row.outcome_point,
                probability=prop_row.outcome_likelihood,
                updated=prop_row.last_prop_update,
            )
        )

    return PlayerPropsResponse(props=props, total=len(props))
