"""
Projection Import API Router
Handles API endpoints for importing player projections from CSV files
"""

from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form
from sqlalchemy.orm import Session
from sqlalchemy import and_, func
from typing import List, Dict, Any
import csv
import io
import json
from datetime import datetime

from app.database import get_db
from app.models import Player, Team, PlayerPoolEntry, Week, Projection, RecentActivity
from app.schemas import ProjectionImportRequest, ProjectionImportResponse, ProjectionCreate

router = APIRouter(prefix="/api/projections", tags=["projections"])

@router.get("/weeks")
async def get_active_upcoming_weeks(db: Session = Depends(get_db)):
    """Get active and upcoming weeks for the Import Week dropdown"""
    try:
        # Get weeks with status 'Active' or 'Upcoming', ordered by year and week_number
        weeks = db.query(Week).filter(
            Week.status.in_(["Active", "Upcoming"])
        ).order_by(Week.year, Week.week_number).all()
        
        # Format weeks for dropdown: "Week X, YYYY"
        formatted_weeks = [
            {
                "id": week.id,
                "label": f"Week {week.week_number}, {week.year}",
                "week_number": week.week_number,
                "year": week.year,
                "status": week.status
            }
            for week in weeks
        ]
        
        return {"weeks": formatted_weeks}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/import", response_model=ProjectionImportResponse)
async def import_projections(
    file: UploadFile = File(...),
    week_id: int = Form(...),
    projection_source: str = Form(...),
    db: Session = Depends(get_db)
):
    """Import player projections from CSV file with automatic player matching"""
    
    print(f"DEBUG: Import request received - File: {file.filename}, Week: {week_id}, Source: {projection_source}")
    
    # Validate file type
    if not file.filename.endswith('.csv'):
        raise HTTPException(status_code=400, detail="File must be a CSV")
    
    # Check if week exists
    week = db.query(Week).filter(Week.id == week_id).first()
    if not week:
        raise HTTPException(status_code=404, detail=f"Week {week_id} not found")
    
    # Read CSV content
    try:
        content = await file.read()
        csv_text = content.decode('utf-8')
        print(f"DEBUG: CSV file read successfully, size: {len(csv_text)} characters")
        print(f"DEBUG: First 200 characters: {csv_text[:200]}")
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Error reading file: {str(e)}")
    
    # Parse CSV
    try:
        csv_data = parse_csv_data(csv_text, projection_source)
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Error parsing CSV: {str(e)}")
    
    # Process projections
    try:
        result = process_projections(db, week_id, projection_source, csv_data)
        
        # Log activity
        log_import_activity(db, week_id, file.filename, result)
        
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error processing projections: {str(e)}")

def parse_csv_data(csv_text: str, projection_source: str) -> List[Dict[str, Any]]:
    """Parse CSV data and extract player information"""
    lines = csv_text.split('\n')
    if len(lines) < 2:
        raise ValueError("CSV file must have at least a header row and one data row")
    
    # Parse headers
    headers = [h.strip().lower() for h in lines[0].split(',')]
    
    # Debug logging
    print(f"DEBUG: CSV Headers found: {headers}")
    print(f"DEBUG: First few lines: {lines[:3]}")
    
    # Find column indices
    player_index = find_column_index(headers, ['player', 'name'])
    position_index = find_column_index(headers, ['position', 'pos'])
    team_index = find_column_index(headers, ['team'])
    
    print(f"DEBUG: Column indices - Player: {player_index}, Position: {position_index}, Team: {team_index}")
    
    if player_index == -1 or position_index == -1:
        raise ValueError("CSV must contain 'Player' and 'Position' columns")
    
    # Find projection columns
    proj_stats_index = find_column_index(headers, ['proj stats', 'proj rank', 'rank'])
    actual_stats_index = find_column_index(headers, ['actual stats'])
    date_index = find_column_index(headers, ['date'])
    ppr_index = find_column_index(headers, ['ppr projections', 'ppr'])
    hppr_index = find_column_index(headers, ['hppr projections', 'hppr'])
    std_index = find_column_index(headers, ['std projections', 'std'])
    actuals_index = find_column_index(headers, ['actuals'])
    
    # Legacy column support
    dkm_index = find_column_index(headers, ['dkm'])
    dfs_index = find_column_index(headers, ['dfs projections', 'dfs'])
    hfrc_index = find_column_index(headers, ['hfrc projections', 'hfrc'])
    sld_index = find_column_index(headers, ['sld projections', 'sld'])
    
    players = []
    
    print(f"DEBUG: Processing {len(lines)-1} data lines")
    
    for i, line in enumerate(lines[1:], 1):
        if not line.strip():
            continue
            
        values = [v.strip() for v in line.split(',')]
        if len(values) < max(player_index, position_index) + 1:
            if i <= 3:  # Debug first 3 lines
                print(f"DEBUG: Line {i} skipped - not enough values: {len(values)} < {max(player_index, position_index) + 1}")
            continue
        
        player_name = values[player_index]
        position = values[position_index].upper()
        
        if i <= 3:  # Debug first 3 lines
            print(f"DEBUG: Line {i}: player='{player_name}', position='{position}', values={values}")
        
        # Extract team from player name if it includes team (e.g., "Josh Allen BUF")
        name_parts = player_name.split(' ')
        possible_team = name_parts[-1] if name_parts else ''
        is_team_code = len(possible_team) in [2, 3] and possible_team.isupper()
        
        if is_team_code:
            name = ' '.join(name_parts[:-1])
            team = possible_team
        else:
            name = player_name
            team = values[team_index] if team_index != -1 and len(values) > team_index else ''
        
        if i <= 3:  # Debug first 3 lines
            print(f"DEBUG: Line {i}: final name='{name}', team='{team}', is_team_code={is_team_code}")
        
        # Parse projection values
        proj_stats = parse_float_value(values, proj_stats_index)
        ppr_proj = parse_float_value(values, ppr_index)
        hppr_proj = parse_float_value(values, hppr_index)
        std_proj = parse_float_value(values, std_index)
        
        # Legacy projection support
        dkm_proj = parse_float_value(values, dkm_index)
        dfs_proj = parse_float_value(values, dfs_index)
        hfrc_proj = parse_float_value(values, hfrc_index)
        sld_proj = parse_float_value(values, sld_index)
        
        # Determine which projection to use based on source name
        selected_projection = determine_projection_new(projection_source, proj_stats, ppr_proj, hppr_proj, std_proj, dkm_proj, dfs_proj, hfrc_proj, sld_proj)
        
        if i <= 3:  # Debug first 3 lines
            print(f"DEBUG: Line {i}: selected_projection={selected_projection}, proj_stats={proj_stats}, ppr_proj={ppr_proj}, std_proj={std_proj}")
        
        if selected_projection <= 0:
            if i <= 3:  # Debug first 3 lines
                print(f"DEBUG: Line {i}: SKIPPED - selected_projection <= 0")
            continue  # Skip players with no valid projection
        
        player_data = {
            'name': name.strip(),
            'team': team.upper().strip(),
            'position': position,
            'proj_stats': proj_stats,
            'actual_stats': parse_float_value(values, actual_stats_index),
            'date': values[date_index] if date_index != -1 and len(values) > date_index else '',
            'ppr_projection': ppr_proj,
            'hppr_projection': hppr_proj,
            'std_projection': std_proj,
            'actuals': parse_float_value(values, actuals_index),
            'selected_projection': selected_projection,
            'projection_source': projection_source,
            # Legacy fields
            'dkm_projection': dkm_proj,
            'dfs_projection': dfs_proj,
            'hfrc_projection': hfrc_proj,
            'sld_projection': sld_proj
        }
        
        players.append(player_data)
    
    print(f"DEBUG: Successfully parsed {len(players)} players from CSV")
    if len(players) > 0:
        print(f"DEBUG: First player example: {players[0]}")
    
    return players

def find_column_index(headers: List[str], possible_names: List[str]) -> int:
    """Find the index of a column by checking multiple possible names"""
    for name in possible_names:
        try:
            return headers.index(name)
        except ValueError:
            continue
    return -1

def parse_float_value(values: List[str], index: int) -> float:
    """Parse a float value from CSV values"""
    if index == -1 or index >= len(values):
        return 0.0
    try:
        return float(values[index]) if values[index] else 0.0
    except (ValueError, TypeError):
        return 0.0

def parse_int_value(values: List[str], index: int) -> int:
    """Parse an integer value from CSV values"""
    if index == -1 or index >= len(values):
        return 0
    try:
        return int(float(values[index])) if values[index] else 0
    except (ValueError, TypeError):
        return 0

def determine_projection_new(source: str, proj_stats: float, ppr: float, hppr: float, std: float, dkm: float, dfs: float, hfrc: float, sld: float) -> float:
    """Determine which projection to use based on source name"""
    source_lower = source.lower()
    
    # Check new format first
    if 'ppr' in source_lower and ppr > 0:
        return ppr
    elif 'hppr' in source_lower and hppr > 0:
        return hppr
    elif 'std' in source_lower and std > 0:
        return std
    elif 'proj' in source_lower and proj_stats > 0:
        return proj_stats
    
    # Check legacy format
    elif 'dkm' in source_lower and dkm > 0:
        return dkm
    elif 'dfs' in source_lower and dfs > 0:
        return dfs
    elif 'hfrc' in source_lower and hfrc > 0:
        return hfrc
    elif 'sld' in source_lower and sld > 0:
        return sld
    else:
        # Use the first available projection (prioritize new format)
        for proj in [ppr, hppr, std, proj_stats, dfs, dkm, hfrc, sld]:
            if proj > 0:
                return proj
        return 0.0

def determine_projection(source: str, dkm: float, dfs: float, hfrc: float, sld: float) -> float:
    """Legacy function for backward compatibility"""
    return determine_projection_new(source, 0, 0, 0, 0, dkm, dfs, hfrc, sld)

def find_player_match(db: Session, name: str, team: str, position: str) -> tuple[Player | None, str]:
    """Find matching player in database"""
    # Try exact match first (case insensitive)
    exact_match = db.query(Player).filter(
        and_(
            func.lower(Player.displayName) == name.lower(),
            Player.position == position.upper(),
            Player.team == team.upper()
        )
    ).first()
    
    if exact_match:
        return exact_match, 'exact'
    
    # Try partial match with name and position (using ILIKE for partial matching)
    partial_match = db.query(Player).filter(
        and_(
            Player.displayName.ilike(f"%{name}%"),
            Player.position == position.upper()
        )
    ).first()
    
    if partial_match:
        return partial_match, 'partial'
    
    # Try name only match
    name_match = db.query(Player).filter(
        Player.displayName.ilike(f"%{name}%")
    ).first()
    
    if name_match:
        return name_match, 'name_only'
    
    return None, 'none'

def process_matched_players(db: Session, week_id: int, projection_source: str, matched_players: List[Dict[str, Any]]) -> ProjectionImportResponse:
    """Process pre-matched players directly"""
    total_processed = len(matched_players)
    successful_matches = total_processed  # All players are already matched
    failed_matches = 0
    projections_created = 0
    projections_updated = 0
    player_pool_updated = 0
    errors = []
    unmatched_players = []
    
    print(f"DEBUG: Processing {total_processed} pre-matched players for week {week_id}")
    
    # Check for duplicate players
    player_ids = [p['playerDkId'] for p in matched_players]
    unique_ids = set(player_ids)
    if len(player_ids) != len(unique_ids):
        print(f"DEBUG: WARNING - Found {len(player_ids) - len(unique_ids)} duplicate players!")
        duplicates = [pid for pid in player_ids if player_ids.count(pid) > 1]
        print(f"DEBUG: Duplicate player IDs: {set(duplicates)}")
    
    processed_players = set()  # Track processed players to avoid duplicates
    
    for i, player_data in enumerate(matched_players):
        try:
            playerDkId = player_data['playerDkId']
            selected_projection = float(player_data['selectedProjection'])
            
            # Get the actual projection values from the CSV
            # CSV structure: name, position, proj stats, date, PPR Projections, HPPR Projections, STD Projections, Actuals
            # But the actual field names from the CSV parsing are different
            ppr_projection = float(player_data.get('pprProjection', 0))
            actuals = float(player_data.get('actuals', 0))
            
            if i < 3:  # Debug first 3 players
                print(f"DEBUG: Player {i+1}: Available fields: {list(player_data.keys())}")
                print(f"DEBUG: Player {i+1}: pprProjection = {ppr_projection}, actuals = {actuals}")
            
            # Skip if we've already processed this player
            if playerDkId in processed_players:
                print(f"DEBUG: Skipping duplicate player {player_data['name']} (ID: {playerDkId})")
                continue
            
            processed_players.add(playerDkId)
            
            if i < 3:  # Debug first 3 players
                print(f"DEBUG: Player {i+1}: {player_data['name']} (ID: {playerDkId}) -> {selected_projection} pts")
            
            # Create or update projection using upsert
            existing_projection = db.query(Projection).filter(
                and_(
                    Projection.week_id == week_id,
                    Projection.playerDkId == playerDkId,
                    Projection.source == projection_source
                )
            ).first()
            
            if i < 3:  # Debug first 3 players
                print(f"DEBUG: Player {i+1}: existing_projection = {existing_projection is not None}")
            
            if existing_projection:
                # Update existing projection
                existing_projection.position = player_data['position']
                existing_projection.projStats = None  # JSON field, ignore for now
                existing_projection.actualStats = None  # JSON field
                existing_projection.pprProjection = ppr_projection  # Use PPR Projections from CSV
                existing_projection.actuals = actuals  # Use Actuals from CSV
                projections_updated += 1
                if i < 3:
                    print(f"DEBUG: Player {i+1}: UPDATED existing projection (PPR: {ppr_projection}, Actuals: {actuals})")
            else:
                # Create new projection
                new_projection = Projection(
                    week_id=week_id,
                    playerDkId=playerDkId,
                    position=player_data['position'],
                    projStats=None,  # JSON field, ignore for now
                    actualStats=None,  # JSON field
                    pprProjection=ppr_projection,  # Use PPR Projections from CSV
                    actuals=actuals,  # Use Actuals from CSV
                    source=projection_source
                )
                db.add(new_projection)
                projections_created += 1
                if i < 3:
                    print(f"DEBUG: Player {i+1}: CREATED new projection (PPR: {ppr_projection}, Actuals: {actuals})")
            
            # Update player pool entry if it exists
            pool_entry = db.query(PlayerPoolEntry).filter(
                and_(
                    PlayerPoolEntry.week_id == week_id,
                    PlayerPoolEntry.playerDkId == playerDkId
                )
            ).first()
            
            if pool_entry:
                pool_entry.projectedPoints = selected_projection
                player_pool_updated += 1
            
        except Exception as e:
            error_msg = f"Error processing player {player_data.get('name', 'Unknown')}: {str(e)}"
            errors.append(error_msg)
            print(f"DEBUG: {error_msg}")
    
    # Commit all changes
    db.commit()
    
    print(f"DEBUG: Import complete - Created: {projections_created}, Updated: {projections_updated}, Pool updated: {player_pool_updated}")
    
    return ProjectionImportResponse(
        total_processed=total_processed,
        successful_matches=successful_matches,
        failed_matches=failed_matches,
        projections_created=projections_created,
        projections_updated=projections_updated,
        player_pool_updated=player_pool_updated,
        errors=errors,
        unmatched_players=unmatched_players
    )

def process_projections(db: Session, week_id: int, projection_source: str, csv_data: List[Dict[str, Any]]) -> ProjectionImportResponse:
    """Process projections and update database"""
    total_processed = len(csv_data)
    successful_matches = 0
    failed_matches = 0
    projections_created = 0
    projections_updated = 0
    player_pool_updated = 0
    errors = []
    unmatched_players = []
    
    print(f"DEBUG: Processing {total_processed} players for week {week_id}")
    
    for i, player_data in enumerate(csv_data):
        try:
            # Find matching player
            matched_player, match_confidence = find_player_match(
                db, 
                player_data['name'], 
                player_data['team'], 
                player_data['position']
            )
            
            if i < 3:  # Debug first 3 players
                print(f"DEBUG: Player {i+1}: {player_data['name']} ({player_data['team']}, {player_data['position']}) -> {match_confidence}")
                if matched_player:
                    print(f"DEBUG: Matched to: {matched_player.displayName} ({matched_player.team}, {matched_player.position})")
                else:
                    print(f"DEBUG: No match found")
            
            if not matched_player:
                failed_matches += 1
                unmatched_players.append({
                    'csv_data': player_data,
                    'match_confidence': match_confidence,
                    'possible_matches': []
                })
                continue
            
            successful_matches += 1
            
            # Create or update projection
            existing_projection = db.query(Projection).filter(
                and_(
                    Projection.week_id == week_id,
                    Projection.playerDkId == matched_player.playerDkId,
                    Projection.source == projection_source
                )
            ).first()
            
            projection_data = {
                'week_id': week_id,
                'playerDkId': matched_player.playerDkId,
                'position': player_data['position'],
                'projStats': player_data['proj_stats'],
                'actualStats': player_data['actual_stats'],
                'date': player_data['date'],
                'pprProjection': player_data['ppr_projection'],
                'hpprProjection': player_data['hppr_projection'],  # Ignored as requested
                'stdProjection': player_data['std_projection'],
                'actuals': player_data['actuals'],
                'source': projection_source
            }
            
            if existing_projection:
                # Update existing projection
                for key, value in projection_data.items():
                    if key not in ['week_id', 'playerDkId', 'source']:
                        setattr(existing_projection, key, value)
                projections_updated += 1
            else:
                # Create new projection
                new_projection = Projection(**projection_data)
                db.add(new_projection)
                projections_created += 1
            
            # Update player pool entry if it exists
            pool_entry = db.query(PlayerPoolEntry).filter(
                and_(
                    PlayerPoolEntry.week_id == week_id,
                    PlayerPoolEntry.playerDkId == matched_player.playerDkId
                )
            ).first()
            
            if pool_entry:
                pool_entry.projectedPoints = player_data['selected_projection']
                player_pool_updated += 1
            
        except Exception as e:
            errors.append(f"Error processing {player_data['name']}: {str(e)}")
            failed_matches += 1
    
    # Commit all changes
    try:
        db.commit()
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Database error: {str(e)}")
    
    return ProjectionImportResponse(
        total_processed=total_processed,
        successful_matches=successful_matches,
        failed_matches=failed_matches,
        projections_created=projections_created,
        projections_updated=projections_updated,
        player_pool_updated=player_pool_updated,
        errors=errors,
        unmatched_players=unmatched_players
    )

def log_import_activity(db: Session, week_id: int, filename: str, result: ProjectionImportResponse):
    """Log import activity to recent_activity table"""
    activity = RecentActivity(
        timestamp=datetime.now(),
        action='import',
        fileType='CSV',
        fileName=filename,
        week_id=week_id,
        draftGroup='PROJECTION_IMPORT',  # Special identifier for projection imports
        recordsAdded=result.projections_created,
        recordsUpdated=result.projections_updated + result.player_pool_updated,
        recordsSkipped=result.failed_matches,
        errors=result.errors,
        user=None,
        details={
            'projection_source': 'Custom Projections',
            'successful_matches': result.successful_matches,
            'failed_matches': result.failed_matches,
            'total_processed': result.total_processed
        }
    )
    
    db.add(activity)
    db.commit()

@router.post("/import-matched", response_model=ProjectionImportResponse)
async def import_matched_projections(
    request: dict,
    db: Session = Depends(get_db)
):
    """Import projections for pre-matched players"""
    try:
        week_id = request['week_id']
        projection_source = request['projection_source']
        matched_players = request['matched_players']
        
        print(f"DEBUG: Import matched request - Week: {week_id}, Source: {projection_source}, Players: {len(matched_players)}")
        
        # Check if week exists
        week = db.query(Week).filter(Week.id == week_id).first()
        if not week:
            raise HTTPException(status_code=404, detail=f"Week {week_id} not found")
        
        # Process the matched players directly
        result = process_matched_players(db, week_id, projection_source, matched_players)
        
        # Log activity
        log_import_activity(db, week_id, f"matched_players_{len(matched_players)}", result)
        
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error processing matched projections: {str(e)}")

@router.get("/activity")
async def get_recent_activity(limit: int = 20, db: Session = Depends(get_db)):
    """Get recent projection import activity"""
    try:
        activities = db.query(RecentActivity).filter(
            RecentActivity.draftGroup == 'PROJECTION_IMPORT'
        ).order_by(RecentActivity.timestamp.desc()).limit(limit).all()
        
        return activities
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
