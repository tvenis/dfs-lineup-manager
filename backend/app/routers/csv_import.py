from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form
from sqlalchemy.orm import Session
from typing import List
import csv
import io
import uuid
from datetime import datetime

from app.database import get_db
from app.models import Player, Team, PlayerPoolEntry, Week
from app.schemas import CSVRow, CSVImportResponse

router = APIRouter()

@router.post("/upload", response_model=CSVImportResponse)
async def upload_csv(
    file: UploadFile = File(...),
    week_id: str = Form(...),
    db: Session = Depends(get_db)
):
    """Upload and process a CSV file with player data"""
    
    # Validate file type
    if not file.filename.endswith('.csv'):
        raise HTTPException(status_code=400, detail="File must be a CSV")
    
    # Check if week exists, create if it doesn't
    week = db.query(Week).filter(Week.id == week_id).first()
    if not week:
        week = Week(id=week_id, notes=f"Imported from {file.filename}")
        db.add(week)
        db.commit()
        db.refresh(week)
    
    # Read CSV content
    try:
        content = await file.read()
        csv_text = content.decode('utf-8')
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Error reading file: {str(e)}")
    
    # Parse CSV
    rows_processed = 0
    rows_successful = 0
    rows_failed = 0
    errors = []
    
    try:
        csv_reader = csv.DictReader(io.StringIO(csv_text))
        
        for row_num, row in enumerate(csv_reader, start=2):  # Start at 2 because row 1 is header
            rows_processed += 1
            
            try:
                # Parse CSV row
                csv_row = parse_csv_row(row, row_num)
                
                # Process the row
                result = process_player_row(csv_row, week_id, db)
                
                if result["success"]:
                    rows_successful += 1
                else:
                    rows_failed += 1
                    errors.append(f"Row {row_num}: {result['error']}")
                    
            except Exception as e:
                rows_failed += 1
                errors.append(f"Row {row_num}: Unexpected error - {str(e)}")
    
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Error parsing CSV: {str(e)}")
    
    return CSVImportResponse(
        success=rows_failed == 0,
        message=f"Processed {rows_processed} rows. {rows_successful} successful, {rows_failed} failed.",
        week_id=week_id,
        rows_processed=rows_processed,
        rows_successful=rows_successful,
        rows_failed=rows_failed,
        errors=errors
    )

def parse_csv_row(row: dict, row_num: int) -> CSVRow:
    """Parse a CSV row into a CSVRow object"""
    try:
        # Extract required fields
        player_id = row.get('player_id', '').strip()
        name = row.get('name', '').strip()
        position = row.get('position', '').strip()
        team = row.get('team', '').strip()
        salary_str = row.get('salary', '').strip()
        
        # Validate required fields
        if not player_id:
            raise ValueError("Missing player_id")
        if not name:
            raise ValueError("Missing name")
        if not position:
            raise ValueError("Missing position")
        if not team:
            raise ValueError("Missing team")
        if not salary_str:
            raise ValueError("Missing salary")
        
        # Parse salary
        try:
            salary = int(salary_str.replace('$', '').replace(',', ''))
        except ValueError:
            raise ValueError(f"Invalid salary format: {salary_str}")
        
        # Parse optional fields
        avg_points = None
        avg_points_str = row.get('avg_points', '').strip()
        if avg_points_str:
            try:
                avg_points = float(avg_points_str)
            except ValueError:
                pass  # Ignore invalid avg_points
        
        game_info = row.get('game_info', '').strip() or None
        roster_position = row.get('roster_position', '').strip() or None
        
        return CSVRow(
            player_id=player_id,
            name=name,
            position=position,
            team=team,
            salary=salary,
            avg_points=avg_points,
            game_info=game_info,
            roster_position=roster_position
        )
        
    except Exception as e:
        raise ValueError(f"Row parsing error: {str(e)}")

def process_player_row(csv_row: CSVRow, week_id: str, db: Session) -> dict:
    """Process a single player row from CSV"""
    try:
        # Find or create team
        team = db.query(Team).filter(Team.id == csv_row.team).first()
        if not team:
            team = Team(
                id=csv_row.team,
                name=csv_row.team,  # Use abbreviation as name for now
                abbreviation=csv_row.team
            )
            db.add(team)
            db.commit()
            db.refresh(team)
        
        # Find or create player
        player = db.query(Player).filter(Player.id == csv_row.player_id).first()
        if not player:
            player = Player(
                id=csv_row.player_id,
                name=csv_row.name,
                position=csv_row.position,
                team_id=csv_row.team
            )
            db.add(player)
            db.commit()
            db.refresh(player)
        
        # Create or update player pool entry
        pool_entry = db.query(PlayerPoolEntry).filter(
            PlayerPoolEntry.week_id == week_id,
            PlayerPoolEntry.player_id == csv_row.player_id
        ).first()
        
        if pool_entry:
            # Update existing entry
            pool_entry.salary = csv_row.salary
            pool_entry.avg_points = csv_row.avg_points
            pool_entry.game_info = csv_row.game_info
            pool_entry.roster_position = csv_row.roster_position
        else:
            # Create new entry
            pool_entry = PlayerPoolEntry(
                id=f"{week_id}_{csv_row.player_id}",
                week_id=week_id,
                player_id=csv_row.player_id,
                salary=csv_row.salary,
                avg_points=csv_row.avg_points,
                game_info=csv_row.game_info,
                roster_position=csv_row.roster_position
            )
            db.add(pool_entry)
        
        db.commit()
        
        return {"success": True}
        
    except Exception as e:
        db.rollback()
        return {"success": False, "error": str(e)}

@router.get("/template")
def get_csv_template():
    """Get a CSV template for importing player data"""
    template = """player_id,name,position,team,salary,avg_points,game_info,roster_position
12345,Josh Allen,QB,BUF,8200,24.5,BUF @ MIA 1:00PM ET,QB
12346,Christian McCaffrey,RB,SF,9500,28.2,SF vs LAR 4:25PM ET,RB
12347,Tyreek Hill,WR,MIA,9000,25.2,MIA vs BUF 1:00PM ET,WR
12348,Travis Kelce,TE,KC,7000,18.5,KC @ LAC 8:20PM ET,TE
12349,Baltimore Ravens,DST,BAL,3200,8.5,BAL vs CIN 1:00PM ET,DST"""
    
    return {
        "template": template,
        "description": "CSV template for importing player data. Required columns: player_id, name, position, team, salary. Optional columns: avg_points, game_info, roster_position."
    }

@router.get("/weeks")
def get_available_weeks(db: Session = Depends(get_db)):
    """Get list of available weeks for CSV import"""
    weeks = db.query(Week).order_by(Week.id).all()
    return {
        "weeks": [{"id": week.id, "imported_at": week.imported_at} for week in weeks],
        "suggested_week_id": f"2024-WK{len(weeks) + 1:02d}" if weeks else "2024-WK01"
    }

@router.post("/week")
def create_week(week_id: str = Form(...), notes: str = Form(None), db: Session = Depends(get_db)):
    """Create a new week for CSV import"""
    # Check if week already exists
    existing_week = db.query(Week).filter(Week.id == week_id).first()
    if existing_week:
        raise HTTPException(status_code=400, detail=f"Week {week_id} already exists")
    
    week = Week(id=week_id, notes=notes)
    db.add(week)
    db.commit()
    db.refresh(week)
    
    return {
        "message": f"Week {week_id} created successfully",
        "week": {
            "id": week.id,
            "notes": week.notes,
            "imported_at": week.imported_at
        }
    }
