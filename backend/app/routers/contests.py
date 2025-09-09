"""
Contest Import API Router
Handles endpoints for importing DraftKings contest results from CSV with a review step
"""

from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form
from sqlalchemy.orm import Session
from typing import List, Dict, Any
from datetime import datetime
from zoneinfo import ZoneInfo
import csv
import io
import re

from app.database import get_db
from app.models import Week, Sport, GameType, Contest, RecentActivity

router = APIRouter(prefix="/api/contests", tags=["contests"])


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


@router.get("/weeks")
async def get_active_upcoming_weeks(db: Session = Depends(get_db)):
    try:
        weeks = db.query(Week).filter(Week.status.in_(["Active", "Upcoming"]))\
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
    db: Session = Depends(get_db),
):
    if not file.filename.endswith('.csv'):
        raise HTTPException(status_code=400, detail="File must be a CSV")

    week = db.query(Week).filter(Week.id == week_id).first()
    if not week:
        raise HTTPException(status_code=404, detail=f"Week {week_id} not found")

    try:
        csv_text = (await file.read()).decode('utf-8')
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Error reading file: {str(e)}")

    reader = csv.DictReader(io.StringIO(csv_text))
    if not reader.fieldnames:
        raise HTTPException(status_code=400, detail="CSV has no header row")

    # Normalize headers to lowercase for mapping
    header_map = { (h or '').strip().lower(): h for h in reader.fieldnames }

    staged: List[Dict[str, Any]] = []
    for row in reader:
        # Map by provided spec names with variants
        entry_key_raw = _get_stripped(row, header_map, ["entry_key", "entry id", "entry key"]) or "0"
        contest_id_raw = _get_stripped(row, header_map, ["contest_key", "contest id", "contest_id"]) or "0"
        sport_code = _get_stripped(row, header_map, ["sport"]).upper() or "NFL"
        game_type_code = _get_stripped(row, header_map, ["game_type", "game type"]).strip() or "Classic"
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

        staged.append({
            "entry_key": entry_key,
            "contest_id": contest_id,
            "week_id": week_id,
            "sport_code": sport_code,
            "game_type_code": game_type_code,
            "lineup_id": _get_stripped(row, header_map, ["lineup_id", "lineup id"]) or None,
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
        })

    return {"staged": staged, "count": len(staged)}


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
                if not sport_id:
                    errors.append(f"Entry {entry_key}: Unknown sport code '{r.get('sport_code')}'")
                    continue
                if not game_type_id:
                    errors.append(f"Entry {entry_key}: Unknown game type '{r.get('game_type_code')}'")
                    continue

                net_profit = float(r.get("winnings_non_ticket") or 0) + float(r.get("winnings_ticket") or 0) - float(r.get("entry_fee_usd") or 0)
                # Prefer cached (created earlier in this batch), then DB lookup
                existing = cache.get(entry_key) or db.query(Contest).filter(Contest.entry_key == entry_key).first()
                if existing:
                    existing.week_id = week_id
                    existing.sport_id = sport_id
                    existing.lineup_id = r.get("lineup_id")
                    existing.game_type_id = game_type_id
                    existing.contest_id = contest_id
                    existing.contest_description = r.get("contest_description")
                    existing.contest_opponent = r.get("contest_opponent")
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
                    updated += 1
                else:
                    obj = Contest(
                        entry_key=entry_key,
                        contest_id=contest_id,
                        week_id=week_id,
                        sport_id=sport_id,
                        lineup_id=r.get("lineup_id"),
                        game_type_id=game_type_id,
                        contest_description=r.get("contest_description"),
                        contest_opponent=r.get("contest_opponent"),
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
                    )
                    db.add(obj)
                    # Flush so subsequent iterations can see this row
                    db.flush()
                    cache[entry_key] = obj
                    created += 1
            except Exception as e:
                errors.append(f"Entry {r.get('entry_key')}: {str(e)}")

        db.commit()

        # Log activity
        activity = RecentActivity(
            timestamp=datetime.now(),
            action='import',
            fileType='CSV',
            fileName=filename,
            week_id=week_id,
            draftGroup='CONTEST_IMPORT',
            recordsAdded=created,
            recordsUpdated=updated,
            recordsSkipped=len(errors),
            errors=errors,
            user=None,
            details={
                'total_processed': len(rows),
                'created': created,
                'updated': updated,
                'errors': errors,
            }
        )
        db.add(activity)
        db.commit()

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


@router.get("/activity")
async def get_recent_activity(limit: int = 20, db: Session = Depends(get_db)):
    try:
        activities = db.query(RecentActivity).filter(
            RecentActivity.draftGroup == 'CONTEST_IMPORT'
        ).order_by(RecentActivity.timestamp.desc()).limit(limit).all()
        return activities
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


