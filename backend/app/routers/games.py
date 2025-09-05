from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import or_
from typing import List, Dict, Any

from app.database import get_db
from app.models import Game, Week, Team

router = APIRouter()


@router.get("/week/{week_id}")
def get_games_for_week(week_id: int, future: bool = False, db: Session = Depends(get_db)) -> Dict[str, Any]:
    """Return all game rows for a week with team/opponent abbreviations and key odds fields.

    This endpoint is tailored for the Player Pool page to map players to their
    opponent and betting context. Each record represents the perspective of a
    single team in a given game (so there are two rows per game: home and away).
    """
    # Validate week exists
    week = db.query(Week).filter(Week.id == week_id).first()
    if not week:
        raise HTTPException(status_code=404, detail="Week not found")

    # Use explicit aliases for Team to avoid ambiguous column names
    from sqlalchemy.orm import aliased

    team_alias = aliased(Team)
    opp_alias = aliased(Team)

    from datetime import datetime
    query = (
        db.query(Game, team_alias, opp_alias)
        .join(team_alias, Game.team_id == team_alias.id)
        .outerjoin(opp_alias, Game.opponent_team_id == opp_alias.id)
        .filter(Game.week_id == week_id)
    )
    if future:
        now = datetime.utcnow()
        query = query.filter(or_(Game.start_time == None, Game.start_time >= now))
    rows = query.all()

    result: List[Dict[str, Any]] = []
    for game, team, opponent in rows:
        result.append(
            {
                "id": game.id,
                "week_id": game.week_id,
                "team_abbr": getattr(team, "abbreviation", None),
                "team_name": getattr(team, "full_name", None),
                "opponent_abbr": getattr(opponent, "abbreviation", None),
                "opponent_name": getattr(opponent, "full_name", None),
                "homeoraway": game.homeoraway,
                "start_time": game.start_time,
                "proj_spread": game.proj_spread,
                "proj_total": game.proj_total,
                "implied_team_total": game.implied_team_total,
                "money_line": game.money_line,
                "odds_api_gameid": game.odds_api_gameid,
            }
        )

    return {"games": result, "total": len(result), "week_id": week_id}


