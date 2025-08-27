from fastapi import APIRouter, Depends, HTTPException, Query
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session
from typing import List, Optional
import uuid
import csv
import io
import json

from app.database import get_db
from app.models import Lineup, Week, PlayerPoolEntry, Player
from app.schemas import (
    LineupCreate, LineupUpdate, Lineup as LineupSchema,
    LineupListResponse, LineupValidationRequest, LineupValidationResponse
)

router = APIRouter()

# Lineup CRUD operations
@router.post("/", response_model=LineupSchema)
def create_lineup(lineup: LineupCreate, db: Session = Depends(get_db)):
    """Create a new lineup"""
    # Check if week exists
    week = db.query(Week).filter(Week.id == lineup.week_id).first()
    if not week:
        raise HTTPException(status_code=404, detail="Week not found")
    
    # Generate unique lineup ID
    lineup_id = str(uuid.uuid4())
    
    # Validate lineup slots
    validation_result = validate_lineup_slots(lineup.week_id, lineup.slots, db)
    if not validation_result["valid"]:
        raise HTTPException(status_code=400, detail=f"Invalid lineup: {', '.join(validation_result['errors'])}")
    
    # Calculate salary used
    salary_used = calculate_lineup_salary(lineup.slots, lineup.week_id, db)
    
    db_lineup = Lineup(
        id=lineup_id,
        **lineup.model_dump(),
        salary_used=salary_used
    )
    db.add(db_lineup)
    db.commit()
    db.refresh(db_lineup)
    return db_lineup

@router.get("/", response_model=LineupListResponse)
def get_lineups(
    week_id: Optional[int] = Query(None),
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=1000),
    game_style: Optional[str] = Query(None),
    search: Optional[str] = Query(None),
    db: Session = Depends(get_db)
):
    """Get lineups with filtering and pagination"""
    query = db.query(Lineup)
    
    if week_id:
        query = query.filter(Lineup.week_id == week_id)
    
    if game_style:
        query = query.filter(Lineup.game_style == game_style)
    
    if search:
        query = query.filter(Lineup.name.ilike(f"%{search}%"))
    
    total = query.count()
    lineups = query.offset(skip).limit(limit).all()
    
    return LineupListResponse(
        lineups=lineups,
        total=total,
        page=skip // limit + 1,
        size=limit
    )

@router.get("/{lineup_id}", response_model=LineupSchema)
def get_lineup(lineup_id: str, db: Session = Depends(get_db)):
    """Get a specific lineup by ID"""
    lineup = db.query(Lineup).filter(Lineup.id == lineup_id).first()
    if not lineup:
        raise HTTPException(status_code=404, detail="Lineup not found")
    return lineup

@router.put("/{lineup_id}", response_model=LineupSchema)
def update_lineup(lineup_id: str, lineup_update: LineupUpdate, db: Session = Depends(get_db)):
    """Update a lineup"""
    db_lineup = db.query(Lineup).filter(Lineup.id == lineup_id).first()
    if not db_lineup:
        raise HTTPException(status_code=404, detail="Lineup not found")
    
    # Validate lineup slots if they're being updated
    if lineup_update.slots:
        validation_result = validate_lineup_slots(db_lineup.week_id, lineup_update.slots, db)
        if not validation_result["valid"]:
            raise HTTPException(status_code=400, detail=f"Invalid lineup: {', '.join(validation_result['errors'])}")
        
        # Recalculate salary used
        salary_used = calculate_lineup_salary(lineup_update.slots, db_lineup.week_id, db)
        lineup_update.salary_used = salary_used
    
    for field, value in lineup_update.dict(exclude_unset=True).items():
        setattr(db_lineup, field, value)
    
    db.commit()
    db.refresh(db_lineup)
    return db_lineup

@router.delete("/{lineup_id}")
def delete_lineup(lineup_id: str, db: Session = Depends(get_db)):
    """Delete a specific lineup by ID"""
    db_lineup = db.query(Lineup).filter(Lineup.id == lineup_id).first()
    if not db_lineup:
        raise HTTPException(status_code=404, detail="Lineup not found")
    
    db.delete(db_lineup)
    db.commit()
    return {"message": "Lineup deleted successfully"}

@router.get("/{lineup_id}/export/csv")
def export_lineup_csv(lineup_id: str, db: Session = Depends(get_db)):
    """Export a lineup to CSV format with DraftKings contest entry format including draftableId"""
    try:
        # Use raw SQL to avoid SQLAlchemy JSON parsing issues
        from sqlalchemy import text
        
        # Get the lineup using raw SQL
        result = db.execute(text("SELECT id, name, week_id, slots FROM lineups WHERE id = :lineup_id"), 
                           {"lineup_id": lineup_id})
        lineup_row = result.fetchone()
        
        if not lineup_row:
            raise HTTPException(status_code=404, detail="Lineup not found")
        
        lineup_id, name, week_id, slots_json = lineup_row
        
        # Parse the slots JSON string
        try:
            import json
            slots = json.loads(slots_json)
        except json.JSONDecodeError as e:
            raise HTTPException(status_code=400, detail=f"Invalid lineup slots format: {str(e)}")
        
        # Get the week using raw SQL
        week_result = db.execute(text("SELECT week_number, year FROM weeks WHERE id = :week_id"), 
                                {"week_id": week_id})
        week_row = week_result.fetchone()
        
        if not week_row:
            raise HTTPException(status_code=404, detail="Week not found")
        
        week_number, year = week_row
        
        # Get player pool entries for this week to access draftableId
        pool_result = db.execute(text("SELECT playerDkId, draftableId FROM player_pool_entries WHERE week_id = :week_id"), 
                                {"week_id": week_id})
        pool_entries = pool_result.fetchall()
        
        # Create a mapping of playerDkId to draftableId
        player_to_draftable = {entry.playerDkId: entry.draftableId for entry in pool_entries}
        
        # Create CSV content
        output = io.StringIO()
        writer = csv.writer(output)
        
        # Create header row with only the slots that have players
        header = []
        data_row = []
        
        # Direct mapping from database slot names to DraftKings format
        # The database has: QB, RB1, RB2, WR1, WR2, WR3, TE, FLEX, DST
        # DraftKings expects: QB, RB, RB, WR, WR, WR, TE, FLEX, DST
        
        # Process each database slot and map to DraftKings format
        for db_slot_name, player_dk_id in slots.items():
            if player_dk_id:  # Only process slots that have players
                # Map database slot names to DraftKings format
                if db_slot_name == 'RB1':
                    dk_slot_name = 'RB'
                elif db_slot_name == 'RB2':
                    dk_slot_name = 'RB'
                elif db_slot_name == 'WR1':
                    dk_slot_name = 'WR'
                elif db_slot_name == 'WR2':
                    dk_slot_name = 'WR'
                elif db_slot_name == 'WR3':
                    dk_slot_name = 'WR'
                elif db_slot_name in ['QB', 'TE', 'FLEX', 'DST']:
                    dk_slot_name = db_slot_name
                else:
                    continue  # Skip unknown slots
                
                header.append(dk_slot_name)
                # Use draftableId if available, otherwise use playerDkId as fallback
                draftable_id = player_to_draftable.get(player_dk_id)
                if draftable_id is None or draftable_id == '':
                    draftable_id = str(player_dk_id)  # Fallback to playerDkId
                data_row.append(draftable_id)
        
        # Write the CSV content
        writer.writerow(header)
        writer.writerow(data_row)
        
        # Debug: print what we're writing
        print(f"Debug - Header: {header}")
        print(f"Debug - Data row: {data_row}")
        print(f"Debug - Slots: {slots}")
        print(f"Debug - Player mapping: {player_to_draftable}")
        
        # Prepare response
        output.seek(0)
        csv_content = output.getvalue()
        
        # Create filename
        filename = f"lineup_{name.replace(' ', '_')}_week{week_number}_{year}.csv"
        
        return StreamingResponse(
            io.BytesIO(csv_content.encode('utf-8')),
            media_type="text/csv",
            headers={"Content-Disposition": f"attachment; filename={filename}"}
        )
        
    except Exception as e:
        import logging
        logger = logging.getLogger(__name__)
        logger.error(f"Error exporting lineup {lineup_id}: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Export failed: {str(e)}")

@router.get("/export-all/csv")
def export_all_lineups_csv(
    week_id: Optional[int] = Query(None),
    db: Session = Depends(get_db)
):
    """Export all lineups for a week to CSV format with DraftKings contest entry format"""
    try:
        from sqlalchemy import text
        
        # Build query to get lineups
        if week_id:
            result = db.execute(text("SELECT id, name, week_id, slots FROM lineups WHERE week_id = :week_id"), 
                               {"week_id": week_id})
        else:
            result = db.execute(text("SELECT id, name, week_id, slots FROM lineups"))
        
        lineups = result.fetchall()
        
        if not lineups:
            raise HTTPException(status_code=404, detail="No lineups found")
        
        # Get week info for filename
        week_info = ""
        if week_id:
            week_result = db.execute(text("SELECT week_number, year FROM weeks WHERE id = :week_id"), 
                                    {"week_id": week_id})
            week_row = week_result.fetchone()
            if week_row:
                week_number, year = week_row
                week_info = f"_week{week_number}_{year}"
        
        # Get player pool entries for all weeks to access draftableId
        pool_result = db.execute(text("SELECT week_id, playerDkId, draftableId FROM player_pool_entries"))
        pool_entries = pool_result.fetchall()
        
        # Create a mapping of (week_id, playerDkId) to draftableId
        player_to_draftable = {}
        for entry in pool_entries:
            key = (entry.week_id, entry.playerDkId)
            player_to_draftable[key] = entry.draftableId
        
        # Create CSV content
        output = io.StringIO()
        writer = csv.writer(output)
        
        # Create header row
        header = ['QB', 'RB', 'RB', 'WR', 'WR', 'WR', 'TE', 'FLEX', 'DST']
        writer.writerow(header)
        
        # Process each lineup
        for lineup_id, name, week_id, slots_json in lineups:
            try:
                # Parse the slots JSON string
                slots = json.loads(slots_json)
                
                # Create data row for this lineup
                data_row = []
                
                # Process each database slot and map to DraftKings format
                for db_slot_name, player_dk_id in slots.items():
                    if player_dk_id:  # Only process slots that have players
                        # Map database slot names to DraftKings format
                        if db_slot_name == 'RB1':
                            dk_slot_name = 'RB'
                        elif db_slot_name == 'RB2':
                            dk_slot_name = 'RB'
                        elif db_slot_name == 'WR1':
                            dk_slot_name = 'WR'
                        elif db_slot_name == 'WR2':
                            dk_slot_name = 'WR'
                        elif db_slot_name == 'WR3':
                            dk_slot_name = 'WR'
                        elif db_slot_name in ['QB', 'TE', 'FLEX', 'DST']:
                            dk_slot_name = db_slot_name
                        else:
                            continue  # Skip unknown slots
                        
                        # Use draftableId if available, otherwise use playerDkId as fallback
                        draftable_id = player_to_draftable.get((week_id, player_dk_id))
                        if draftable_id is None or draftable_id == '':
                            draftable_id = str(player_dk_id)  # Fallback to playerDkId
                        
                        # Add to the appropriate position in the row
                        if dk_slot_name == 'QB':
                            data_row.insert(0, draftable_id)  # QB is first
                        elif dk_slot_name == 'RB':
                            if 'RB' not in [slot for slot in data_row if slot.startswith('RB')]:
                                data_row.append(draftable_id)  # First RB
                            else:
                                data_row.append(draftable_id)  # Second RB
                        elif dk_slot_name == 'WR':
                            if 'WR' not in [slot for slot in data_row if slot.startswith('WR')]:
                                data_row.append(draftable_id)  # First WR
                            elif len([slot for slot in data_row if slot.startswith('WR')]) == 1:
                                data_row.append(draftable_id)  # Second WR
                            else:
                                data_row.append(draftable_id)  # Third WR
                        elif dk_slot_name == 'TE':
                            data_row.append(draftable_id)
                        elif dk_slot_name == 'FLEX':
                            data_row.append(draftable_id)
                        elif dk_slot_name == 'DST':
                            data_row.append(draftable_id)
                
                # Ensure we have exactly 9 positions filled
                while len(data_row) < 9:
                    data_row.append('')  # Fill empty slots
                
                # Write the row
                writer.writerow(data_row)
                
            except json.JSONDecodeError as e:
                print(f"Error parsing slots for lineup {lineup_id}: {str(e)}")
                # Write empty row for this lineup
                writer.writerow([''] * 9)
                continue
        
        # Prepare response
        output.seek(0)
        csv_content = output.getvalue()
        
        # Create filename
        filename = f"all_lineups{week_info}.csv"
        
        return StreamingResponse(
            io.BytesIO(csv_content.encode('utf-8')),
            media_type="text/csv",
            headers={"Content-Disposition": f"attachment; filename={filename}"}
        )
        
    except Exception as e:
        import logging
        logger = logging.getLogger(__name__)
        logger.error(f"Error exporting all lineups: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Export failed: {str(e)}")

# Lineup validation
@router.post("/validate", response_model=LineupValidationResponse)
def validate_lineup(lineup_request: LineupValidationRequest, db: Session = Depends(get_db)):
    """Validate a lineup configuration"""
    validation_result = validate_lineup_slots(lineup_request.week_id, lineup_request.slots, db)
    
    if validation_result["valid"]:
        salary_used = calculate_lineup_salary(lineup_request.slots, lineup_request.week_id, db)
        salary_remaining = 50000 - salary_used
        
        return LineupValidationResponse(
            valid=True,
            errors=[],
            salary_used=salary_used,
            salary_remaining=salary_remaining,
            projected_points=validation_result.get("projected_points")
        )
    else:
        return LineupValidationResponse(
            valid=False,
            errors=validation_result["errors"],
            salary_used=0,
            salary_remaining=50000
        )

# Helper functions
def validate_lineup_slots(week_id: int, slots: dict, db: Session) -> dict:
    """Validate lineup slots and return validation result"""
    errors = []
    required_positions = ["QB", "RB1", "RB2", "WR1", "WR2", "WR3", "TE", "FLEX", "DST"]
    
    # Check if all required positions are present
    for position in required_positions:
        if position not in slots:
            errors.append(f"Missing required position: {position}")
    
    if errors:
        return {"valid": False, "errors": errors}
    
    # Check if all slots have players assigned
    empty_slots = [pos for pos, player_id in slots.items() if not player_id]
    if empty_slots:
        errors.append(f"Empty slots: {', '.join(empty_slots)}")
    
    if errors:
        return {"valid": False, "errors": errors}
    
    # Validate each player
    used_players = set()
    total_salary = 0
    projected_points = 0
    
    for position, player_id in slots.items():
        if not player_id:
            continue
        
        # Check if player is already used
        if player_id in used_players:
            errors.append(f"Player {player_id} used multiple times")
            continue
        
        used_players.add(player_id)
        
        # Check if player exists in the player pool for this week
        pool_entry = db.query(PlayerPoolEntry).filter(
            PlayerPoolEntry.week_id == week_id,
            PlayerPoolEntry.playerDkId == player_id
        ).first()
        
        if not pool_entry:
            errors.append(f"Player {player_id} not found in week {week_id} player pool")
            continue
        
        # Check if player is excluded
        if pool_entry.excluded:
            errors.append(f"Player {player_id} is excluded from this week")
            continue
        
        # Check position eligibility
        if not is_player_eligible_for_position(pool_entry, position):
            errors.append(f"Player {player_id} is not eligible for position {position}")
            continue
        
        # Add salary and projected points
        total_salary += pool_entry.salary
        if pool_entry.draftStatAttributes and 'projectedPoints' in pool_entry.draftStatAttributes:
            projected_points += float(pool_entry.draftStatAttributes['projectedPoints'])
    
    # Check salary cap
    if total_salary > 50000:
        errors.append(f"Salary cap exceeded: ${total_salary:,} > $50,000")
    
    return {
        "valid": len(errors) == 0,
        "errors": errors,
        "projected_points": projected_points if projected_points > 0 else None
    }

def is_player_eligible_for_position(pool_entry: PlayerPoolEntry, position: str) -> bool:
    """Check if a player is eligible for a specific position"""
    player_position = pool_entry.player.position
    
    # Position-specific eligibility rules
    if position == "QB" and player_position == "QB":
        return True
    elif position.startswith("RB") and player_position == "RB":
        return True
    elif position.startswith("WR") and player_position == "WR":
        return True
    elif position == "TE" and player_position == "TE":
        return True
    elif position == "FLEX" and player_position in ["RB", "WR", "TE"]:
        return True
    elif position == "DST" and player_position == "DST":
        return True
    
    return False

def calculate_lineup_salary(slots: dict, week_id: int, db: Session) -> int:
    """Calculate total salary used by a lineup"""
    total_salary = 0
    
    for player_id in slots.values():
        if not player_id:
            continue
        
        pool_entry = db.query(PlayerPoolEntry).filter(
            PlayerPoolEntry.week_id == week_id,
            PlayerPoolEntry.playerDkId == player_id
        ).first()
        
        if pool_entry:
            total_salary += pool_entry.salary
    
    return total_salary

# Lineup analysis and statistics
@router.get("/{lineup_id}/analysis")
def analyze_lineup(lineup_id: str, db: Session = Depends(get_db)):
    """Get detailed analysis of a lineup"""
    lineup = db.query(Lineup).filter(Lineup.id == lineup_id).first()
    if not lineup:
        raise HTTPException(status_code=404, detail="Lineup not found")
    
    # Get player details for each slot
    slot_analysis = {}
    total_salary = 0
    total_projected_points = 0
    
    for position, player_id in lineup.slots.items():
        if not player_id:
            slot_analysis[position] = None
            continue
        
        pool_entry = db.query(PlayerPoolEntry).filter(
            PlayerPoolEntry.week_id == lineup.week_id,
            PlayerPoolEntry.playerDkId == player_id
        ).first()
        
        if pool_entry:
            slot_analysis[position] = {
                "player_id": player_id,
                "name": pool_entry.player.displayName,
                "team": pool_entry.player.team,
                "position": pool_entry.player.position,
                "salary": pool_entry.salary,
                "projected_points": pool_entry.draftStatAttributes.get('projectedPoints', 0) if pool_entry.draftStatAttributes else 0,
                "game_info": pool_entry.playerGameHash
            }
            
            total_salary += pool_entry.salary
            projected_points = pool_entry.draftStatAttributes.get('projectedPoints', 0) if pool_entry.draftStatAttributes else 0
            total_projected_points += projected_points
        else:
            slot_analysis[position] = None
    
    return {
        "lineup_id": lineup_id,
        "name": lineup.name,
        "week_id": lineup.week_id,
        "game_style": lineup.game_style,
        "tags": lineup.tags,
        "slots": slot_analysis,
        "total_salary": total_salary,
        "salary_remaining": 50000 - total_salary,
        "total_projected_points": total_projected_points,
        "created_at": lineup.created_at,
        "updated_at": lineup.updated_at
    }
