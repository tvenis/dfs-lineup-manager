"""
Contest Import API Router
Handles endpoints for importing DraftKings contest results from CSV with a review step
"""

from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form
from sqlalchemy.orm import Session
from typing import List, Dict, Any, Set
from datetime import datetime
from zoneinfo import ZoneInfo
import csv
import io
import re
from datetime import datetime as _dt

from app.database import get_db
from app.models import Week, Sport, GameType, Contest, Lineup, ContestType, DKContestDetail
from app.services.activity_logging import ActivityLoggingService
import httpx

router = APIRouter(tags=["contests"])


def _normalize_attr_key(key: Any) -> str:
    try:
        s = str(key).strip().lower()
    except Exception:
        return ""
    return re.sub(r"[^a-z0-9]", "", s)


def _is_h2h_from_attributes(attributes: Dict[str, Any] | None) -> bool:
    if not attributes:
        return False
    normalized = { _normalize_attr_key(k): str(v).lower() for k, v in attributes.items() }
    h2h_markers = ["ish2h", "isheadtohead", "headtohead", "h2h"]
    for marker in h2h_markers:
        if marker in normalized and normalized.get(marker) in ("true", "1", "yes"):
            return True
    for k, v in normalized.items():
        if "h2h" in k and v in ("true", "1", "yes"):
            return True
    return False


def _extract_h2h_opponent(attributes: Dict[str, Any] | None) -> str | None:
    if not attributes:
        return None
    preferred_keys = [
        "Head to Head Opponent Name",
        "Head To Head Opponent Name",
        "head_to_head_opponent_name",
        "HeadToHeadOpponentName",
        "Opponent Name",
        "opponentName",
        "Opponent",
        "opponent",
    ]
    for key in preferred_keys:
        if key in attributes and attributes.get(key):
            val = str(attributes.get(key)).strip()
            if val:
                return val
    for k, v in attributes.items():
        try:
            k_norm = _normalize_attr_key(k)
            if "opponent" in k_norm and str(v).strip():
                return str(v).strip()
        except Exception:
            continue
    return None


def _parse_money(value: str) -> float:
    if value is None:
        return 0.0
    s = str(value).strip()
    if not s:
        return 0.0
    # Remove $ and commas
    s = s.replace("$", "").replace(",", "").strip()
    # Handle parentheses as negative
    if s.startswith("(") and s.endswith(")"):
        s = f"-{s[1:-1]}"
    try:
        return float(s)
    except Exception:
        return 0.0


def _parse_int(value: str) -> int:
    try:
        return int(float(value)) if value not in (None, "") else 0
    except Exception:
        return 0


def _parse_float(value: str) -> float:
    try:
        return float(value) if value not in (None, "") else 0.0
    except Exception:
        return 0.0


def _parse_datetime_est_to_utc(value: str) -> str:
    if not value:
        # fallback to now
        return datetime.now(tz=ZoneInfo("UTC")).isoformat()
    # Try multiple common formats
    candidates = [
        "%m/%d/%Y %I:%M %p",  # 09/07/2025 10:31 PM
        "%Y-%m-%d %H:%M:%S",  # 2025-09-07 22:31:00
        "%Y-%m-%d %I:%M %p",  # 2025-09-07 10:31 PM
        "%m/%d/%Y %H:%M",     # 09/07/2025 22:31
        "%m/%d/%y %I:%M %p",
    ]
    dt_est = None
    for fmt in candidates:
        try:
            dt_est = datetime.strptime(value.strip(), fmt).replace(tzinfo=ZoneInfo("America/New_York"))
            break
        except Exception:
            continue
    if dt_est is None:
        # Fallback: return as UTC now
        return datetime.now(tz=ZoneInfo("UTC")).isoformat()
    return dt_est.astimezone(ZoneInfo("UTC")).isoformat()


def _get_stripped(row: dict, header_map: dict, names: List[str]) -> str:
    for n in names:
        real = header_map.get(n)
        if real is not None:
            return (row.get(real) or "").strip()
    return ""


async def _ensure_dk_contest_details(db: Session, contest_ids: Set[str]):
    """Ensure dk_contest_detail has rows for contest_ids by calling DK API for missing ones."""
    if not contest_ids:
        return
    existing_ids = {
        r[0] for r in db.query(DKContestDetail.contest_id).filter(DKContestDetail.contest_id.in_(list(contest_ids))).all()
    }
    missing = [cid for cid in contest_ids if cid and cid not in existing_ids]
    if not missing:
        return

    # Lookups
    sport_code_to_id = {s.code.upper(): s.sport_id for s in db.query(Sport).all()}
    from app.models import ContestType as ContestTypeModel
    ctype_code_to_id = {c.code: c.contest_type_id for c in db.query(ContestTypeModel).all()}

    def _parse_dt(value: str):
        if not value:
            return None
        try:
            s = value.strip().replace('Z', '+00:00')
            if '.' in s:
                left, right = s.split('.', 1)
                # split on timezone sign if present
                tz_sign = '+' if '+' in right else ('-' if '-' in right else None)
                if tz_sign:
                    frac, tz = right.split(tz_sign, 1)
                    if len(frac) > 6:
                        frac = frac[:6]
                    s = f"{left}.{frac}{tz_sign}{tz}"
                else:
                    frac = right
                    if len(frac) > 6:
                        frac = frac[:6]
                    s = f"{left}.{frac}"
            return _dt.fromisoformat(s)
        except Exception:
            return None

    async with httpx.AsyncClient(timeout=10) as client:
        for cid in missing:
            try:
                url = f"https://api.draftkings.com/contests/v1/contests/{cid}?format=json"
                resp = await client.get(url, headers={"Accept": "application/json"})
                resp.raise_for_status()
                detail = (resp.json() or {}).get("contestDetail", {})
                if not detail:
                    continue

                name = detail.get("name")
                sport_id = sport_code_to_id.get(str(detail.get("sport") or "").upper())
                draft_group_id = detail.get("draftGroupId")
                payout_desc = (detail.get("payoutDescriptions") or {}).get("Cash") or detail.get("PayoutDescription")
                total_payouts = detail.get("totalPayouts")
                is_guaranteed = bool(detail.get("isGuaranteed"))
                is_private = bool(detail.get("isPrivate"))
                is_cashprize_only = bool(detail.get("IsCashPrizeOnly") or detail.get("isCashPrizeOnly"))
                entry_fee = detail.get("entryFee")
                entries = detail.get("entries")
                max_entries = detail.get("maximumEntries")
                max_entries_per_user = detail.get("maximumEntriesPerUser")
                contest_state = detail.get("contestState") or detail.get("contestStateDetail")
                cstart_raw = detail.get("contestStartTime")
                cstart = _parse_dt(cstart_raw)
                summary = detail.get("contestSummary")
                attributes = detail.get("attributes") or {}

                # Detect contest type from attributes (handle variant keys/casing)
                inferred_code = None
                if _is_h2h_from_attributes(attributes):
                    inferred_code = "H2H"
                else:
                    at_norm = { _normalize_attr_key(k): str(v).lower() for k, v in (attributes or {}).items() }
                    if at_norm.get("isfiftyfifty") == "true":
                        inferred_code = "50/50"
                    elif at_norm.get("isdoubleup") == "true":
                        inferred_code = "DoubleUp"
                    elif at_norm.get("istournament") == "true":
                        inferred_code = "Tournament"
                contest_type_id = ctype_code_to_id.get(inferred_code) if inferred_code else None

                # Rake
                rake_percentage = None
                try:
                    if max_entries and entry_fee and total_payouts and float(total_payouts) != 0:
                        calculated_rake = ((float(max_entries) * float(entry_fee)) - float(total_payouts)) / float(total_payouts)
                        rake_percentage = round(calculated_rake * 100, 2)  # Convert to percentage
                except Exception as e:
                    print(f"Rake calculation error for {cid}: {e}")
                    rake_percentage = None

                row = DKContestDetail(
                    contest_id=str(cid),
                    name=name,
                    sport_id=sport_id,
                    contest_type_id=contest_type_id,
                    summary=summary,
                    draftGroupId=draft_group_id,
                    payoutDescription=payout_desc,
                    rake_percentage=rake_percentage,
                    total_payouts=total_payouts,
                    is_guaranteed=is_guaranteed,
                    is_private=is_private,
                    is_cashprize_only=is_cashprize_only,
                    entry_fee=entry_fee,
                    entries=entries,
                    max_entries=max_entries,
                    max_entries_per_user=max_entries_per_user,
                    contest_state=contest_state,
                    contest_start_time=cstart,
                    attributes=attributes,
                )
                db.add(row)
                db.commit()
            except Exception:
                db.rollback()
                continue


@router.get("/weeks")
async def get_active_completed_weeks(db: Session = Depends(get_db)):
    try:
        weeks = db.query(Week).filter(Week.status.in_(["Active", "Completed"]))\
            .order_by(Week.year, Week.week_number).all()
        formatted = [
            {
                "id": w.id,
                "label": f"Week {w.week_number}, {w.year}",
                "week_number": w.week_number,
                "year": w.year,
                "status": w.status,
            }
            for w in weeks
        ]
        return {"weeks": formatted}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/parse")
async def parse_contests_csv(
    file: UploadFile = File(...),
    week_id: int = Form(...),
    default_lineup_id: str = Form(None),
    db: Session = Depends(get_db),
):
    if not file.filename.endswith('.csv'):
        raise HTTPException(status_code=400, detail="File must be a CSV")

    week = db.query(Week).filter(Week.id == week_id).first()
    if not week:
        raise HTTPException(status_code=404, detail=f"Week {week_id} not found")

    import time
    start_time = time.perf_counter()

    try:
        csv_text = (await file.read()).decode('utf-8')
    except Exception as e:
        # Log failed file read
        end_time = time.perf_counter()
        duration_ms = int((end_time - start_time) * 1000)
        try:
            service = ActivityLoggingService(db)
            service.log_import_activity(
                import_type='contests',
                file_type='CSV',
                week_id=week_id,
                records_added=0,
                records_updated=0,
                records_skipped=0,
                records_failed=0,
                file_name=file.filename,
                import_source='csv',
                operation_status='failed',
                duration_ms=duration_ms,
                errors=[f"File read error: {str(e)}"],
                details={"error_type": type(e).__name__, "stage": "file_read"}
            )
        except Exception as log_error:
            print(f"⚠️ Failed to log error activity: {log_error}")
        raise HTTPException(status_code=400, detail=f"Error reading file: {str(e)}")

    try:
        reader = csv.DictReader(io.StringIO(csv_text))
        if not reader.fieldnames:
            raise HTTPException(status_code=400, detail="CSV has no header row")

        # Normalize headers to lowercase for mapping
        header_map = { (h or '').strip().lower(): h for h in reader.fieldnames }

        staged: List[Dict[str, Any]] = []
        contest_keys: Set[str] = set()
        
        for row in reader:
            # Map by provided spec names with variants
            entry_key_raw = _get_stripped(row, header_map, ["entry_key", "entry id", "entry key"]) or "0"
            contest_id_raw = _get_stripped(row, header_map, ["contest_key", "contest id", "contest_id"]) or "0"
            sport_code = _get_stripped(row, header_map, ["sport"]).upper() or "NFL"
            game_type_code = _get_stripped(row, header_map, ["game_type", "game type"]).strip() or "Classic"
            contest_type_code = _get_stripped(row, header_map, ["contest_type", "contest type"]).strip() or ""
            entry_label = _get_stripped(row, header_map, ["entry", "entry label", "contest_description"]) or ""
            opponent = _get_stripped(row, header_map, ["contest_opponent", "opponent"]) or ""
            date_est = _get_stripped(row, header_map, ["contest_date_est", "date", "contest_date"]) or ""
            place = _get_stripped(row, header_map, ["place", "contest_place"]) or ""
            points = _get_stripped(row, header_map, ["points", "contest_points"]) or ""
            entries = _get_stripped(row, header_map, ["contest_entries", "entries"]) or "0"
            places_paid = _get_stripped(row, header_map, ["places_paid", "paid_places"]) or "0"
            entry_fee = _get_stripped(row, header_map, ["entry_fee", "entry_fee_usd"]) or "0"
            prize_pool = _get_stripped(row, header_map, ["prize_pool", "prize_pool_usd"]) or "0"
            win_cash = _get_stripped(row, header_map, ["winnings_non_ticket", "winnings_cash_usd", "winnings cash"]) or "0"
            win_ticket = _get_stripped(row, header_map, ["winnings_ticket", "winnings_ticket_usd", "winnings ticket"]) or "0"

            try:
                entry_key = int(re.sub(r"[^0-9]", "", entry_key_raw))
            except Exception:
                entry_key = 0
            try:
                contest_id = int(re.sub(r"[^0-9]", "", contest_id_raw))
            except Exception:
                contest_id = 0

            if contest_id:
                contest_keys.add(str(contest_id))

            # Compute result flag: 1 if any winnings > 0
            result_flag = 1 if (_parse_money(win_cash) > 0 or _parse_money(win_ticket) > 0) else 0

            # Use default lineup if no lineup specified in CSV
            csv_lineup_id = _get_stripped(row, header_map, ["lineup_id", "lineup id"])
            final_lineup_id = csv_lineup_id or default_lineup_id

            staged.append({
                "entry_key": entry_key,
                "contest_id": contest_id,
                "week_id": week_id,
                "sport_code": sport_code,
                "game_type_code": game_type_code,
                "contest_type_code": contest_type_code,
                "lineup_id": final_lineup_id,
                "contest_description": entry_label,
                "contest_opponent": opponent,
                "contest_date_utc": _parse_datetime_est_to_utc(date_est),
                "contest_place": _parse_int(place),
                "contest_points": _parse_float(points),
                "winnings_non_ticket": _parse_money(win_cash),
                "winnings_ticket": _parse_money(win_ticket),
                "contest_entries": _parse_int(entries),
                "places_paid": _parse_int(places_paid),
                "entry_fee_usd": _parse_money(entry_fee),
                "prize_pool_usd": _parse_money(prize_pool),
                "result": result_flag,
            })

        # Ensure dk_contest_detail contains details for these contests
        # Populate DK contest details for any missing contests
        try:
            await _ensure_dk_contest_details(db, contest_keys)
        except Exception as e:
            # Swallow but return a hint in response for debugging
            return {"staged": staged, "count": len(staged), "dk_detail_error": str(e)}

        # Extract opponent names from DraftKings API for H2H contests
        try:
            from app.models import ContestType as ContestTypeModel
            contest_types = db.query(ContestTypeModel).all()
            code_to_contest_type = {c.code: c.contest_type_id for c in contest_types}
            
            # Get DK contest details for all contests
            dk_details = db.query(DKContestDetail).filter(DKContestDetail.contest_id.in_(list(contest_keys))).all()
            dk_detail_map = {d.contest_id: d for d in dk_details}
            
            # Update staged data with contest type and opponent names from DK API
            for staged_row in staged:
                contest_id = str(staged_row.get("contest_id"))
                if contest_id and contest_id in dk_detail_map:
                    dk_detail = dk_detail_map[contest_id]
                    
                    # Update contest type from DK API
                    if dk_detail.contest_type_id:
                        # Find the contest type code from the ID
                        id_to_code = {c.contest_type_id: c.code for c in contest_types}
                        contest_type_code = id_to_code.get(dk_detail.contest_type_id)
                        if contest_type_code:
                            staged_row["contest_type_code"] = contest_type_code
                    
                    # Update opponent name for H2H contests
                    if dk_detail.contest_type_id == code_to_contest_type.get("H2H") or _is_h2h_from_attributes(dk_detail.attributes):
                        opponent_name = _extract_h2h_opponent(dk_detail.attributes)
                        if opponent_name:
                            staged_row["contest_opponent"] = opponent_name
        except Exception as e:
            # Log error but don't fail the parse
            print(f"Error extracting opponent names: {e}")

        # Now automatically commit the data (simpler flow for user)
        # This mirrors the logic from /commit endpoint
        code_to_sport: Dict[str, int] = {s.code.upper(): s.sport_id for s in db.query(Sport).all()}
        code_to_game_type: Dict[str, int] = {g.code: g.game_type_id for g in db.query(GameType).all()}
        code_to_contest_type = {c.code: c.contest_type_id for c in db.query(ContestTypeModel).all()}
        
        created = 0
        updated = 0
        errors: List[str] = []
        cache: Dict[int, Contest] = {}
        
        for r in staged:
            try:
                entry_key = int(r.get("entry_key")) if r.get("entry_key") is not None else 0
                contest_id = int(r.get("contest_id")) if r.get("contest_id") is not None else 0
                if entry_key <= 0:
                    errors.append("Missing or invalid entry_key")
                    continue
                sport_id = code_to_sport.get(str(r.get("sport_code", "")).upper())
                game_type_id = code_to_game_type.get(str(r.get("game_type_code", "Classic")))
                
                # Get contest_type_id and opponent from dk_contest_detail
                contest_type_id = None
                contest_opponent = None
                dk_detail = dk_detail_map.get(str(contest_id))
                if dk_detail:
                    contest_type_id = dk_detail.contest_type_id
                    # Extract opponent from attributes if it's H2H
                    if dk_detail.contest_type_id == code_to_contest_type.get("H2H") or _is_h2h_from_attributes(dk_detail.attributes):
                        contest_opponent = _extract_h2h_opponent(dk_detail.attributes)
                
                # Fallback to CSV contest_type_code if no DK detail
                if not contest_type_id and r.get("contest_type_code"):
                    contest_type_id = code_to_contest_type.get(str(r.get("contest_type_code")))
                if not sport_id:
                    errors.append(f"Entry {entry_key}: Unknown sport code '{r.get('sport_code')}'")
                    continue
                if not game_type_id:
                    errors.append(f"Entry {entry_key}: Unknown game type '{r.get('game_type_code')}'")
                    continue
                
                net_profit = float(r.get("winnings_non_ticket") or 0) + float(r.get("winnings_ticket") or 0) - float(r.get("entry_fee_usd") or 0)
                result_flag = 1 if ((r.get("winnings_non_ticket") or 0) > 0 or (r.get("winnings_ticket") or 0) > 0) else 0
                # Prefer cached (created earlier in this batch), then DB lookup
                existing = cache.get(entry_key) or db.query(Contest).filter(Contest.entry_key == entry_key).first()
                if existing:
                    existing.week_id = week_id
                    existing.sport_id = sport_id
                    existing.lineup_id = r.get("lineup_id")
                    existing.game_type_id = game_type_id
                    existing.contest_type_id = contest_type_id
                    existing.contest_id = contest_id
                    existing.contest_description = r.get("contest_description")
                    existing.contest_opponent = contest_opponent or r.get("contest_opponent")
                    existing.contest_date_utc = r.get("contest_date_utc")
                    existing.contest_place = r.get("contest_place")
                    existing.contest_points = r.get("contest_points")
                    existing.winnings_non_ticket = r.get("winnings_non_ticket")
                    existing.winnings_ticket = r.get("winnings_ticket")
                    existing.contest_entries = r.get("contest_entries")
                    existing.places_paid = r.get("places_paid")
                    existing.entry_fee_usd = r.get("entry_fee_usd")
                    existing.prize_pool_usd = r.get("prize_pool_usd")
                    existing.net_profit_usd = net_profit
                    existing.result = bool(result_flag)
                    updated += 1
                else:
                    obj = Contest(
                        entry_key=entry_key,
                        contest_id=contest_id,
                        week_id=week_id,
                        sport_id=sport_id,
                        lineup_id=r.get("lineup_id"),
                        game_type_id=game_type_id,
                        contest_type_id=contest_type_id,
                        contest_description=r.get("contest_description"),
                        contest_opponent=contest_opponent or r.get("contest_opponent"),
                        contest_date_utc=r.get("contest_date_utc"),
                        contest_place=r.get("contest_place"),
                        contest_points=r.get("contest_points"),
                        winnings_non_ticket=r.get("winnings_non_ticket"),
                        winnings_ticket=r.get("winnings_ticket"),
                        contest_entries=r.get("contest_entries"),
                        places_paid=r.get("places_paid"),
                        entry_fee_usd=r.get("entry_fee_usd"),
                        prize_pool_usd=r.get("prize_pool_usd"),
                        net_profit_usd=net_profit,
                        result=bool(result_flag),
                    )
                    db.add(obj)
                    # Flush so subsequent iterations can see this row
                    db.flush()
                    cache[entry_key] = obj
                    created += 1
                # If lineup_id is provided, update lineup status to 'submitted'
                try:
                    lineup_id_val = r.get("lineup_id")
                    if lineup_id_val:
                        lineup_obj = db.query(Lineup).filter(Lineup.id == lineup_id_val).first()
                        if lineup_obj and lineup_obj.status != 'submitted':
                            lineup_obj.status = 'submitted'
                except Exception:
                    pass
            except Exception as e:
                errors.append(f"Entry {r.get('entry_key')}: {str(e)}")
        
        db.commit()
        
        # Calculate duration
        end_time = time.perf_counter()
        duration_ms = int((end_time - start_time) * 1000)
        
        # Log activity using ActivityLoggingService
        service = ActivityLoggingService(db)
        service.log_import_activity(
            import_type='contests',
            file_type='CSV',
            week_id=week_id,
            records_added=created,
            records_updated=updated,
            records_skipped=len(errors),
            records_failed=0,
            file_name=file.filename,
            import_source='csv',
            draft_group='CONTEST_IMPORT',
            operation_status='completed' if len(errors) == 0 else 'partial',
            duration_ms=duration_ms,
            errors=errors,
            details={
                'total_processed': len(staged),
                'created': created,
                'updated': updated,
            }
        )
        
        print(f"✅ Contest import completed in {duration_ms}ms: {created} created, {updated} updated")
        
        return {
            'total_processed': len(staged),
            'created': created,
            'updated': updated,
            'errors': errors
        }
    except HTTPException:
        raise
    except Exception as e:
        # Log failed import
        db.rollback()
        end_time = time.perf_counter()
        duration_ms = int((end_time - start_time) * 1000)
        try:
            service = ActivityLoggingService(db)
            service.log_import_activity(
                import_type='contests',
                file_type='CSV',
                week_id=week_id,
                records_added=0,
                records_updated=0,
                records_skipped=0,
                records_failed=0,
                file_name=file.filename,
                import_source='csv',
                operation_status='failed',
                duration_ms=duration_ms,
                errors=[str(e)],
                details={"error_type": type(e).__name__, "stage": "processing"}
            )
            print(f"❌ Contest import failed after {duration_ms}ms: {str(e)}")
        except Exception as log_error:
            print(f"⚠️ Failed to log error activity: {log_error}")
        raise HTTPException(status_code=500, detail=f"Error processing contests: {str(e)}")


@router.post("/commit")
async def commit_contests(payload: Dict[str, Any], db: Session = Depends(get_db)):
    try:
        week_id = int(payload.get("week_id"))
        rows: List[Dict[str, Any]] = payload.get("rows", [])
        filename = payload.get("filename", "contests.csv")

        week = db.query(Week).filter(Week.id == week_id).first()
        if not week:
            raise HTTPException(status_code=404, detail=f"Week {week_id} not found")

        # Build lookup maps
        code_to_sport: Dict[str, int] = {s.code.upper(): s.sport_id for s in db.query(Sport).all()}
        code_to_game_type: Dict[str, int] = {g.code: g.game_type_id for g in db.query(GameType).all()}
        # contest_type is in models module; import lazily to avoid circular import at top
        from app.models import ContestType as ContestTypeModel
        code_to_contest_type: Dict[str, int] = {c.code: c.contest_type_id for c in db.query(ContestTypeModel).all()}
        
        # Build DK contest detail lookup map
        contest_ids = [str(r.get("contest_id")) for r in rows if r.get("contest_id")]
        # Ensure DK details exist for all contest_ids (auto-fetch from DK API if missing)
        try:
            await _ensure_dk_contest_details(db, set(contest_ids))
        except Exception:
            # proceed even if ensure fails; fallback logic will still use CSV data
            pass
        dk_details = db.query(DKContestDetail).filter(DKContestDetail.contest_id.in_(contest_ids)).all()
        dk_detail_map = {d.contest_id: d for d in dk_details}

        created = 0
        updated = 0
        errors: List[str] = []
        cache: Dict[int, Contest] = {}

        for r in rows:
            try:
                entry_key = int(r.get("entry_key")) if r.get("entry_key") is not None else 0
                contest_id = int(r.get("contest_id")) if r.get("contest_id") is not None else 0
                if entry_key <= 0:
                    errors.append("Missing or invalid entry_key")
                    continue
                sport_id = code_to_sport.get(str(r.get("sport_code", "")).upper())
                game_type_id = code_to_game_type.get(str(r.get("game_type_code", "Classic")))
                
                # Get contest_type_id and opponent from dk_contest_detail
                contest_type_id = None
                contest_opponent = None
                dk_detail = dk_detail_map.get(str(contest_id))
                if dk_detail:
                    contest_type_id = dk_detail.contest_type_id
                    # Extract opponent from attributes if it's H2H
                    if dk_detail.contest_type_id == code_to_contest_type.get("H2H") or _is_h2h_from_attributes(dk_detail.attributes):
                        contest_opponent = _extract_h2h_opponent(dk_detail.attributes)
                
                # Fallback to CSV contest_type_code if no DK detail
                if not contest_type_id and r.get("contest_type_code"):
                    contest_type_id = code_to_contest_type.get(str(r.get("contest_type_code")))
                if not sport_id:
                    errors.append(f"Entry {entry_key}: Unknown sport code '{r.get('sport_code')}'")
                    continue
                if not game_type_id:
                    errors.append(f"Entry {entry_key}: Unknown game type '{r.get('game_type_code')}'")
                    continue

                net_profit = float(r.get("winnings_non_ticket") or 0) + float(r.get("winnings_ticket") or 0) - float(r.get("entry_fee_usd") or 0)
                result_flag = 1 if ((r.get("winnings_non_ticket") or 0) > 0 or (r.get("winnings_ticket") or 0) > 0) else 0
                # Prefer cached (created earlier in this batch), then DB lookup
                existing = cache.get(entry_key) or db.query(Contest).filter(Contest.entry_key == entry_key).first()
                if existing:
                    existing.week_id = week_id
                    existing.sport_id = sport_id
                    existing.lineup_id = r.get("lineup_id")
                    existing.game_type_id = game_type_id
                    existing.contest_type_id = contest_type_id
                    existing.contest_id = contest_id
                    existing.contest_description = r.get("contest_description")
                    existing.contest_opponent = contest_opponent or r.get("contest_opponent")
                    existing.contest_date_utc = datetime.fromisoformat(r.get("contest_date_utc")).astimezone(ZoneInfo("UTC"))
                    existing.contest_place = r.get("contest_place")
                    existing.contest_points = r.get("contest_points")
                    existing.winnings_non_ticket = r.get("winnings_non_ticket")
                    existing.winnings_ticket = r.get("winnings_ticket")
                    existing.contest_entries = r.get("contest_entries")
                    existing.places_paid = r.get("places_paid")
                    existing.entry_fee_usd = r.get("entry_fee_usd")
                    existing.prize_pool_usd = r.get("prize_pool_usd")
                    existing.net_profit_usd = net_profit
                    existing.result = bool(result_flag)
                    updated += 1
                else:
                    obj = Contest(
                        entry_key=entry_key,
                        contest_id=contest_id,
                        week_id=week_id,
                        sport_id=sport_id,
                        lineup_id=r.get("lineup_id"),
                        game_type_id=game_type_id,
                        contest_type_id=contest_type_id,
                        contest_description=r.get("contest_description"),
                        contest_opponent=contest_opponent or r.get("contest_opponent"),
                        contest_date_utc=datetime.fromisoformat(r.get("contest_date_utc")).astimezone(ZoneInfo("UTC")),
                        contest_place=r.get("contest_place"),
                        contest_points=r.get("contest_points"),
                        winnings_non_ticket=r.get("winnings_non_ticket"),
                        winnings_ticket=r.get("winnings_ticket"),
                        contest_entries=r.get("contest_entries"),
                        places_paid=r.get("places_paid"),
                        entry_fee_usd=r.get("entry_fee_usd"),
                        prize_pool_usd=r.get("prize_pool_usd"),
                        net_profit_usd=net_profit,
                        result=bool(result_flag),
                    )
                    db.add(obj)
                    # Flush so subsequent iterations can see this row
                    db.flush()
                    cache[entry_key] = obj
                    created += 1
                # If lineup_id is provided, update lineup status to 'submitted'. If H2H, set contest_opponent from DK attributes if available
                try:
                    lineup_id_val = r.get("lineup_id")
                    if lineup_id_val:
                        lineup_obj = db.query(Lineup).filter(Lineup.id == lineup_id_val).first()
                        if lineup_obj and lineup_obj.status != 'submitted':
                            lineup_obj.status = 'submitted'
                    # If H2H per DK detail attributes, parse opponent
                    if contest_id:
                        dk = db.query(DKContestDetail).filter(DKContestDetail.contest_id == str(contest_id)).first()
                        if dk and dk.attributes:
                            if _is_h2h_from_attributes(dk.attributes):
                                opp = _extract_h2h_opponent(dk.attributes)
                                if opp:
                                    (existing if existing else obj).contest_opponent = opp
                except Exception:
                    pass
            except Exception as e:
                errors.append(f"Entry {r.get('entry_key')}: {str(e)}")

        db.commit()

        # Log activity using ActivityLoggingService
        service = ActivityLoggingService(db)
        service.log_import_activity(
            import_type='contests',
            file_type='CSV',
            week_id=week_id,
            records_added=created,
            records_updated=updated,
            records_skipped=len(errors),
            records_failed=0,
            file_name=filename,
            import_source='csv',
            draft_group='CONTEST_IMPORT',
            operation_status='completed' if len(errors) == 0 else 'partial',
            errors=errors,
            details={
                'total_processed': len(rows),
                'created': created,
                'updated': updated,
            }
        )

        return {
            'total_processed': len(rows),
            'created': created,
            'updated': updated,
            'errors': errors,
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("")
async def list_contests(week_id: int | None = None, limit: int = 25000, db: Session = Depends(get_db)):
    """List contests, optionally filtered by week, sorted by most recent first."""
    try:
        query = db.query(Contest)
        if week_id is not None:
            query = query.filter(Contest.week_id == week_id)
        contests = query.order_by(Contest.contest_date_utc.desc()).limit(limit).all()

        def to_number(n):
            try:
                return float(n) if n is not None else 0.0
            except Exception:
                return 0.0

        results = []
        for c in contests:
            results.append({
                "entry_key": int(c.entry_key) if c.entry_key is not None else None,
                "contest_id": int(c.contest_id) if c.contest_id is not None else None,
                "week_id": c.week_id,
                "week_number": getattr(c.week, "week_number", None),
                "year": getattr(c.week, "year", None),
                "sport": getattr(c.sport, "code", None),
                "game_type": getattr(c.game_type, "code", None),
                "contest_type": getattr(c.contest_type, "code", None),
                "lineup_id": c.lineup_id,
                "lineup_name": getattr(c.lineup, "name", None),
                "contest_description": c.contest_description,
                "contest_opponent": c.contest_opponent,
                "contest_date_utc": c.contest_date_utc.isoformat() if c.contest_date_utc else None,
                "contest_place": c.contest_place,
                "contest_points": c.contest_points,
                "winnings_non_ticket": to_number(c.winnings_non_ticket),
                "winnings_ticket": to_number(c.winnings_ticket),
                "contest_entries": c.contest_entries,
                "places_paid": c.places_paid,
                "entry_fee_usd": to_number(c.entry_fee_usd),
                "prize_pool_usd": to_number(c.prize_pool_usd),
                "net_profit_usd": to_number(c.net_profit_usd),
                "result": bool(getattr(c, "result", False)),
            })

        return {"contests": results, "count": len(results)}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/activity")
async def get_recent_activity(limit: int = 20, db: Session = Depends(get_db)):
    try:
        activities = db.query(RecentActivity).filter(
            RecentActivity.draftGroup == 'CONTEST_IMPORT'
        ).order_by(RecentActivity.timestamp.desc()).limit(limit).all()
        return activities
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/game-types")
async def list_game_types(db: Session = Depends(get_db)):
    try:
        game_types = db.query(GameType).order_by(GameType.code.asc()).all()
        return {"game_types": [gt.code for gt in game_types]}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/contest-types")
async def list_contest_types(db: Session = Depends(get_db)):
    try:
        contest_types = db.query(ContestType).order_by(ContestType.code.asc()).all()
        return {"contest_types": [ct.code for ct in contest_types]}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


