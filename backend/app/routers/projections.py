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
import time
from datetime import datetime
import logging
from pathlib import Path

from app.database import get_db
from app.models import Player, Team, PlayerPoolEntry, Week, Projection
from app.schemas import ProjectionImportRequest, ProjectionImportResponse, ProjectionCreate
from app.services.activity_logging import ActivityLoggingService

router = APIRouter(prefix="/api/projections", tags=["projections"])

# File logger for import debug
_log_file = Path(__file__).resolve().parents[2] / "server.log"
_logger = logging.getLogger("projection_import_debug")
if not any(isinstance(h, logging.FileHandler) and getattr(h, 'baseFilename', None) == str(_log_file) for h in _logger.handlers):
    _logger.setLevel(logging.DEBUG)
    _fh = logging.FileHandler(_log_file, mode='a', encoding='utf-8')
    _fh.setFormatter(logging.Formatter('%(asctime)s - %(message)s'))
    _logger.addHandler(_fh)
    _logger.propagate = False

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
    
    # Start timing
    start_time = time.perf_counter()
    
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
        
        # Calculate duration in milliseconds
        end_time = time.perf_counter()
        duration_ms = int((end_time - start_time) * 1000)
        print(f"✅ Import completed in {duration_ms}ms")
        
        # Log activity with duration
        log_import_activity(db, week_id, file.filename, result, projection_source, duration_ms=duration_ms)
        
        return result
    except Exception as e:
        # Calculate duration even for failed imports
        end_time = time.perf_counter()
        duration_ms = int((end_time - start_time) * 1000)
        
        # Log failed import attempt
        try:
            service = ActivityLoggingService(db)
            service.log_import_activity(
                import_type="projections",
                file_type="CSV",
                week_id=week_id,
                records_added=0,
                records_updated=0,
                records_skipped=0,
                records_failed=0,
                file_name=file.filename,
                import_source=projection_source,
                draft_group=None,
                operation_status="failed",
                duration_ms=duration_ms,
                errors=[str(e)],
                details={"error_type": type(e).__name__, "stage": "processing"}
            )
            print(f"❌ Import failed after {duration_ms}ms: {str(e)}")
        except Exception as log_error:
            print(f"⚠️ Failed to log error activity: {log_error}")
        
        raise HTTPException(status_code=500, detail=f"Error processing projections: {str(e)}")

@router.post("/import-ownership", response_model=ProjectionImportResponse)
async def import_ownership_projections(
    file: UploadFile = File(...),
    week_id: int = Form(...),
    projection_source: str = Form(...),
    db: Session = Depends(get_db)
):
    """Import ownership projections from CSV file with automatic player matching"""
    
    # Start timing
    start_time = time.perf_counter()
    
    print(f"DEBUG: Ownership import request received - File: {file.filename}, Week: {week_id}, Source: {projection_source}")
    
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
        csv_text = content.decode('utf-8-sig')  # Handle BOM
        print(f"DEBUG: CSV file read successfully, size: {len(csv_text)} characters")
        print(f"DEBUG: First 200 characters: {csv_text[:200]}")
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Error reading file: {str(e)}")
    
    # Parse CSV
    try:
        csv_data = parse_ownership_csv_data(csv_text, projection_source)
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Error parsing CSV: {str(e)}")
    
    # Process ownership projections
    try:
        result = process_ownership_projections(db, week_id, projection_source, csv_data)
        
        # Calculate duration in milliseconds
        end_time = time.perf_counter()
        duration_ms = int((end_time - start_time) * 1000)
        print(f"✅ Ownership import completed in {duration_ms}ms")
        
        # Log activity with duration
        log_import_activity(db, week_id, file.filename, result, projection_source, is_ownership=True, duration_ms=duration_ms)
        
        return result
    except Exception as e:
        # Calculate duration even for failed imports
        end_time = time.perf_counter()
        duration_ms = int((end_time - start_time) * 1000)
        
        # Log failed import attempt
        try:
            service = ActivityLoggingService(db)
            service.log_import_activity(
                import_type="ownership",
                file_type="CSV",
                week_id=week_id,
                records_added=0,
                records_updated=0,
                records_skipped=0,
                records_failed=0,
                file_name=file.filename,
                import_source=projection_source,
                draft_group=None,
                operation_status="failed",
                duration_ms=duration_ms,
                errors=[str(e)],
                details={"error_type": type(e).__name__, "stage": "processing"}
            )
            print(f"❌ Ownership import failed after {duration_ms}ms: {str(e)}")
        except Exception as log_error:
            print(f"⚠️ Failed to log error activity: {log_error}")
        
        raise HTTPException(status_code=500, detail=f"Error processing ownership projections: {str(e)}")

def parse_csv_data(csv_text: str, projection_source: str) -> List[Dict[str, Any]]:
    """Parse CSV using DictReader and map only the required columns robustly."""
    reader = csv.DictReader(io.StringIO(csv_text))
    if not reader.fieldnames:
        raise ValueError("CSV has no header row")

    header_map = { (h or '').strip().lower(): h for h in reader.fieldnames }
    print(f"DEBUG: CSV Headers found: {reader.fieldnames}")
    _logger.debug(f"CSV Headers found: {reader.fieldnames}")

    def get_val(row: dict, key_variants: list[str]) -> str:
        for k in key_variants:
            real = header_map.get(k)
            if real is not None:
                return (row.get(real) or '').strip()
        return ''

    players: List[Dict[str, Any]] = []
    for i, row in enumerate(reader, start=1):
        name = get_val(row, ['player'])
        position = get_val(row, ['pos', 'position']).upper()
        # Strictly read PPR from 'Projections' header to avoid rank mix-ups
        ppr_raw = get_val(row, ['projections'])
        actuals_raw = get_val(row, ['actuals'])
        rank_raw = get_val(row, ['rank'])
        attemps_raw = get_val(row, ['attempts'])
        comps_raw = get_val(row, ['comps', 'completions'])
        pass_yards_raw = get_val(row, ['pass yards', 'passyards'])
        pass_tds_raw = get_val(row, ['pass tds', 'passtds'])
        ints_raw = get_val(row, ['ints', 'interceptions'])
        receptions_raw = get_val(row, ['receptions'])
        rec_yards_raw = get_val(row, ['rec yards', 'recyards'])
        rec_tds_raw = get_val(row, ['rec tds', 'rectds'])
        rush_yards_raw = get_val(row, ['rush yards', 'rushyards'])
        rush_tds_raw = get_val(row, ['rush tds', 'rushtds'])
        fumbles_raw = get_val(row, ['fumbles'])

        if not name or not position:
            continue

        ppr = float(ppr_raw) if ppr_raw not in ('', None) else 0.0
        actuals = float(actuals_raw) if actuals_raw not in ('', None) else 0.0
        player = {
            'name': name,
            'team': '',
            'position': position,
            'attemps': float(attemps_raw) if attemps_raw else 0.0,
            'comps': float(comps_raw) if comps_raw else 0.0,
            'passYards': float(pass_yards_raw) if pass_yards_raw else 0.0,
            'passTDs': float(pass_tds_raw) if pass_tds_raw else 0.0,
            'ints': float(ints_raw) if ints_raw else 0.0,
            'receptions': float(receptions_raw) if receptions_raw else 0.0,
            'recYards': float(rec_yards_raw) if rec_yards_raw else 0.0,
            'recTDs': float(rec_tds_raw) if rec_tds_raw else 0.0,
            'rushYards': float(rush_yards_raw) if rush_yards_raw else 0.0,
            'rushTDs': float(rush_tds_raw) if rush_tds_raw else 0.0,
            'fumbles': float(fumbles_raw) if fumbles_raw else 0.0,
            'rank': int(float(rank_raw)) if rank_raw else 0,
            'pprProjections': ppr,
            'actuals': actuals,
            'selected_projection': ppr,
            'selectedProjection': ppr,
            'projection_source': projection_source,
        }

        if i <= 3:
            msg = f"Row {i} name={name} pos={position} raw_ppr='{ppr_raw}' parsed_ppr={ppr}"
            print(f"DEBUG: {msg}")
            _logger.debug(msg)

        players.append(player)

    print(f"DEBUG: Successfully parsed {len(players)} players from CSV (DictReader)")
    _logger.debug(f"Successfully parsed {len(players)} players from CSV (DictReader)")
    if len(players) > 0:
        print(f"DEBUG: First player example: {players[0]}")
        _logger.debug(f"First player example: {players[0]}")
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

def _safe_float(value: Any) -> float | None:
    try:
        if value is None or value == "":
            return None
        return float(value)
    except Exception:
        return None

def _safe_int(value: Any) -> int | None:
    try:
        if value is None or value == "":
            return None
        return int(float(value))
    except Exception:
        return None

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

def find_player_match(db: Session, name: str, team: str, position: str) -> tuple[Player | None, str, list[dict]]:
    """Find matching player in database. If multiple candidates are found, return ambiguous with candidates list."""
    position_upper = position.upper()
    team_upper = (team or '').upper()

    if team_upper:
        # Exact match with team (case-insensitive for PostgreSQL compatibility)
        exact_with_team_list = db.query(Player).filter(
            and_(
                func.lower(Player.displayName) == name.lower(),
                func.upper(Player.position) == position_upper,
                func.upper(Player.team) == team_upper,
            )
        ).all()
        if len(exact_with_team_list) == 1:
            return exact_with_team_list[0], 'exact', []
        if len(exact_with_team_list) > 1:
            return None, 'ambiguous_exact_with_team', [
                {
                    'playerDkId': p.playerDkId,
                    'name': p.displayName,
                    'position': p.position,
                    'team': p.team,
                }
                for p in exact_with_team_list
            ]

    # Exact match without team (name + position)
    exact_no_team_list = db.query(Player).filter(
        and_(
            func.lower(Player.displayName) == name.lower(),
            func.upper(Player.position) == position_upper,
        )
    ).all()
    if len(exact_no_team_list) == 1:
        return exact_no_team_list[0], 'exact_no_team', []
    if len(exact_no_team_list) > 1:
        return None, 'ambiguous_exact_no_team', [
            {
                'playerDkId': p.playerDkId,
                'name': p.displayName,
                'position': p.position,
                'team': p.team,
            }
            for p in exact_no_team_list
        ]

    # Partial match with name and position
    partial_list = db.query(Player).filter(
        and_(
            Player.displayName.ilike(f"%{name}%"),
            func.upper(Player.position) == position_upper,
        )
    ).all()
    if len(partial_list) == 1:
        return partial_list[0], 'partial', []
    if len(partial_list) > 1:
        return None, 'ambiguous_partial', [
            {
                'playerDkId': p.playerDkId,
                'name': p.displayName,
                'position': p.position,
                'team': p.team,
            }
            for p in partial_list
        ]

    # Name only match
    name_only_list = db.query(Player).filter(
        Player.displayName.ilike(f"%{name}%")
    ).all()
    if len(name_only_list) == 1:
        return name_only_list[0], 'name_only', []
    if len(name_only_list) > 1:
        return None, 'ambiguous_name_only', [
            {
                'playerDkId': p.playerDkId,
                'name': p.displayName,
                'position': p.position,
                'team': p.team,
            }
            for p in name_only_list
        ]

    return None, 'none', []

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
            selected_projection = float(
                player_data.get('selectedProjection')
                or player_data.get('selected_projection')
                or player_data.get('pprProjections')
                or player_data.get('pprProjection')
                or 0
            )
            
            # New-format fields
            ppr_projection = float(
                player_data.get('pprProjections')
                or player_data.get('pprProjection')
                or player_data.get('ppr_projection')
                or 0
            )
            actuals = float(player_data.get('actuals') or 0)
            
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
                existing_projection.attemps = _safe_float(player_data.get('attemps'))
                existing_projection.comps = _safe_float(player_data.get('comps'))
                existing_projection.passYards = _safe_float(player_data.get('passYards'))
                existing_projection.passTDs = _safe_float(player_data.get('passTDs'))
                existing_projection.ints = _safe_float(player_data.get('ints'))
                existing_projection.receptions = _safe_float(player_data.get('receptions'))
                existing_projection.recYards = _safe_float(player_data.get('recYards'))
                existing_projection.recTDs = _safe_float(player_data.get('recTDs'))
                existing_projection.rushYards = _safe_float(player_data.get('rushYards'))
                existing_projection.rushTDs = _safe_float(player_data.get('rushTDs'))
                existing_projection.fumbles = _safe_float(player_data.get('fumbles'))
                existing_projection.rank = _safe_int(player_data.get('rank'))
                existing_projection.pprProjections = ppr_projection
                existing_projection.actuals = actuals
                # Explicitly set updated_at timestamp
                existing_projection.updated_at = datetime.utcnow()
                projections_updated += 1
                if i < 3:
                    print(f"DEBUG: Player {i+1}: UPDATED existing projection (PPR: {ppr_projection}, Actuals: {actuals})")
            else:
                # Create new projection
                new_projection = Projection(
                    week_id=week_id,
                    playerDkId=playerDkId,
                    position=player_data['position'],
                    attemps=_safe_float(player_data.get('attemps')),
                    comps=_safe_float(player_data.get('comps')),
                    passYards=_safe_float(player_data.get('passYards')),
                    passTDs=_safe_float(player_data.get('passTDs')),
                    ints=_safe_float(player_data.get('ints')),
                    receptions=_safe_float(player_data.get('receptions')),
                    recYards=_safe_float(player_data.get('recYards')),
                    recTDs=_safe_float(player_data.get('recTDs')),
                    rushYards=_safe_float(player_data.get('rushYards')),
                    rushTDs=_safe_float(player_data.get('rushTDs')),
                    fumbles=_safe_float(player_data.get('fumbles')),
                    rank=_safe_int(player_data.get('rank')),
                    pprProjections=ppr_projection,
                    actuals=actuals,
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
                try:
                    pool_entry.actuals = float(player_data.get('actuals')) if player_data.get('actuals') is not None else pool_entry.actuals
                except Exception:
                    pass
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
            matched_player, match_confidence, candidates = find_player_match(
                db,
                player_data['name'],
                player_data.get('team', ''),
                player_data['position']
            )
            
            if i < 3:  # Debug first 3 players
                print(f"DEBUG: Player {i+1}: {player_data['name']} ({player_data['team']}, {player_data['position']}) -> {match_confidence}")
                if matched_player:
                    print(f"DEBUG: Matched to: {matched_player.displayName} ({matched_player.team}, {matched_player.position})")
                else:
                    print(f"DEBUG: No match found")
            
            if match_confidence.startswith('ambiguous'):
                failed_matches += 1
                unmatched_players.append({
                    'csv_data': player_data,
                    'match_confidence': match_confidence,
                    'possible_matches': candidates,
                })
                continue

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
            
            # Minimal mapping per spec: map Projections -> pprProjections and include Actuals
            projection_data = {
                'week_id': week_id,
                'playerDkId': matched_player.playerDkId,
                'position': player_data['position'],
                'pprProjections': player_data.get('pprProjections'),
                'actuals': player_data.get('actuals'),
                'source': projection_source,
            }
            
            if existing_projection:
                if i < 3:
                    msg = (
                        f"Upsert(existing) {matched_player.displayName} src='{projection_source}' prev_ppr={getattr(existing_projection, 'pprProjections', None)} new_ppr={projection_data['pprProjections']}"
                    )
                    print(f"DEBUG: {msg}")
                    _logger.debug(msg)
                # Update only position, pprProjections, and actuals
                existing_projection.position = projection_data['position']
                existing_projection.pprProjections = projection_data['pprProjections']
                if projection_data.get('actuals') is not None:
                    try:
                        existing_projection.actuals = float(projection_data['actuals'])
                    except Exception:
                        pass
                # Explicitly set updated_at timestamp
                existing_projection.updated_at = datetime.utcnow()
                projections_updated += 1
            else:
                # Create new projection with minimal fields
                if i < 3:
                    msg = (
                        f"Upsert(create) {matched_player.displayName} src='{projection_source}' new_ppr={projection_data['pprProjections']}"
                    )
                    print(f"DEBUG: {msg}")
                    _logger.debug(msg)
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
                try:
                    pool_entry.actuals = float(player_data.get('actuals')) if player_data.get('actuals') is not None else pool_entry.actuals
                except Exception:
                    pass
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

def log_import_activity(db: Session, week_id: int, filename: str, result: ProjectionImportResponse, projection_source: str = "Custom Projections", is_ownership: bool = False, duration_ms: int = None):
    """Log import activity to recent_activity table using ActivityLoggingService"""
    try:
        # Determine import type based on ownership flag
        import_type = "ownership" if is_ownership else "projections"
        
        # Use ActivityLoggingService for centralized logging
        service = ActivityLoggingService(db)
        service.log_import_activity(
            import_type=import_type,
            file_type="CSV",
            week_id=week_id,
            records_added=result.projections_created,
            records_updated=result.projections_updated,
            records_skipped=result.failed_matches,
            records_failed=0,
            file_name=filename,
            import_source=projection_source,
            draft_group=None,
            operation_status="completed",
            duration_ms=duration_ms,
            errors=result.errors if result.errors else None,
            details={
                "successful_matches": result.successful_matches,
                "failed_matches": result.failed_matches,
                "total_processed": result.total_processed,
                "player_pool_updated": result.player_pool_updated
            }
        )
        duration_str = f" in {duration_ms}ms" if duration_ms else ""
        print(f"✅ Successfully logged {import_type}-import activity: {filename}{duration_str}")
    except Exception as e:
        print(f"❌ Failed to log import activity: {str(e)}")
        # Don't raise - logging failure shouldn't break the import

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
        log_import_activity(db, week_id, f"matched_players_{len(matched_players)}", result, projection_source)
        
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

def parse_ownership_csv_data(csv_text: str, projection_source: str) -> List[Dict[str, Any]]:
    """Parse ownership CSV data, extracting only PLAYER and RST% columns"""
    reader = csv.DictReader(io.StringIO(csv_text))
    if not reader.fieldnames:
        raise ValueError("CSV has no header row")

    # Clean headers to remove BOM and extra whitespace
    cleaned_headers = [(h or '').strip().lstrip('\ufeff') for h in reader.fieldnames]
    header_map = { h.lower(): h for h in cleaned_headers }
    print(f"DEBUG: Ownership CSV Headers found: {reader.fieldnames}")
    print(f"DEBUG: Cleaned headers: {cleaned_headers}")
    print(f"DEBUG: Header map: {header_map}")
    _logger.debug(f"Ownership CSV Headers found: {reader.fieldnames}")
    _logger.debug(f"Cleaned headers: {cleaned_headers}")
    _logger.debug(f"Header map: {header_map}")

    def get_val(row: dict, key_variants: list[str]) -> str:
        for k in key_variants:
            # Try exact match first
            real = header_map.get(k)
            if real is not None:
                return (row.get(real) or '').strip()
            
            # Try case-insensitive match
            for header_key, original_header in header_map.items():
                if k.lower() == header_key.lower():
                    return (row.get(original_header) or '').strip()
        return ''

    players: List[Dict[str, Any]] = []
    for i, row in enumerate(reader, start=1):
        name = get_val(row, ['player', 'PLAYER'])
        position = get_val(row, ['pos', 'POS', 'position', 'POSITION'])
        ownership_raw = get_val(row, ['rst%', 'rst', 'ownership', 'RST%'])
        
        if i <= 3:  # Debug first few rows
            print(f"DEBUG: Row {i+1} - name='{name}', position='{position}', ownership_raw='{ownership_raw}'")
            print(f"DEBUG: Row {i+1} - full row keys: {list(row.keys())}")
        
        if not name:
            print(f"DEBUG: Skipping row {i+1} - no player name")
            continue
            
        # Skip Defense positions (D, DST, DEF)
        if position.upper() in ['D', 'DST', 'DEF', 'DEFENSE']:
            print(f"DEBUG: Skipping row {i+1} - Defense position: {name} ({position})")
            continue
            
        if not ownership_raw:
            print(f"DEBUG: Skipping row {i+1} - no ownership data for {name}")
            continue

        try:
            ownership = float(ownership_raw)
            if ownership < 0 or ownership > 100:
                print(f"DEBUG: Skipping row {i+1} - ownership {ownership} out of range for {name}")
                continue
        except ValueError:
            print(f"DEBUG: Skipping row {i+1} - invalid ownership value '{ownership_raw}' for {name}")
            continue

        players.append({
            'name': name,
            'ownership': ownership,
            'source': projection_source
        })

    print(f"DEBUG: Parsed {len(players)} ownership records")
    return players

def process_ownership_projections(db: Session, week_id: int, projection_source: str, csv_data: List[Dict[str, Any]]) -> ProjectionImportResponse:
    """Process ownership projections and update player_pool_entries table"""
    
    total_processed = len(csv_data)
    successful_matches = 0
    failed_matches = 0
    ownership_updated = 0
    ownership_created = 0
    errors = []
    unmatched_players = []

    print(f"DEBUG: Processing {total_processed} ownership records for week {week_id}")

    for i, player_data in enumerate(csv_data):
        try:
            # Use existing player matching service
            matched_player, confidence, possible_matches = find_player_match(
                db, player_data['name'], '', ''
            )
            
            if matched_player:
                successful_matches += 1
                
                # Find or create player pool entry for this week
                pool_entry = db.query(PlayerPoolEntry).filter(
                    and_(
                        PlayerPoolEntry.week_id == week_id,
                        PlayerPoolEntry.playerDkId == matched_player.playerDkId
                    )
                ).first()
                
                if pool_entry:
                    # Update existing entry
                    pool_entry.ownership = player_data['ownership']
                    pool_entry.updated_at = datetime.utcnow()
                    ownership_updated += 1
                    
                    if i < 3:
                        print(f"DEBUG: Updated ownership for {matched_player.displayName}: {player_data['ownership']}%")
                else:
                    # Create new pool entry (this shouldn't happen in normal flow)
                    # but we'll handle it gracefully
                    new_entry = PlayerPoolEntry(
                        week_id=week_id,
                        draftGroup='OWNERSHIP_IMPORT',
                        playerDkId=matched_player.playerDkId,
                        salary=0,  # Default salary
                        ownership=player_data['ownership']
                    )
                    db.add(new_entry)
                    ownership_created += 1
                    
                    if i < 3:
                        print(f"DEBUG: Created new pool entry for {matched_player.displayName}: {player_data['ownership']}%")
            else:
                failed_matches += 1
                unmatched_players.append({
                    'csv_data': {
                        'name': player_data['name'],
                        'ownership': player_data['ownership']
                    },
                    'match_confidence': confidence,
                    'possible_matches': possible_matches
                })
                
                if i < 3:
                    print(f"DEBUG: No match found for {player_data['name']} (confidence: {confidence})")
                    
        except Exception as e:
            failed_matches += 1
            error_msg = f"Error processing {player_data['name']}: {str(e)}"
            errors.append(error_msg)
            print(f"DEBUG: {error_msg}")

    # Commit all changes
    try:
        db.commit()
        print(f"DEBUG: Successfully committed ownership updates")
    except Exception as e:
        db.rollback()
        error_msg = f"Database commit failed: {str(e)}"
        errors.append(error_msg)
        print(f"DEBUG: {error_msg}")
        raise

    return ProjectionImportResponse(
        total_processed=total_processed,
        successful_matches=successful_matches,
        failed_matches=failed_matches,
        projections_created=ownership_created,
        projections_updated=ownership_updated,
        player_pool_updated=ownership_updated + ownership_created,
        errors=errors,
        unmatched_players=unmatched_players
    )

