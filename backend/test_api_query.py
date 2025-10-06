#!/usr/bin/env python3

from app.database import get_db
from app.models import PlayerPoolEntry, Week

def test_api_query():
    db = next(get_db())
    
    # Get the most recent week
    latest_week = db.query(Week).order_by(Week.year.desc(), Week.week_number.desc()).first()
    print(f'Testing API call for Week {latest_week.week_number} with draft_group=134675')
    
    # Test the query that the API would use
    entries = db.query(PlayerPoolEntry).filter(
        PlayerPoolEntry.week_id == latest_week.id,
        PlayerPoolEntry.draftGroup == '134675'
    ).limit(5).all()
    
    print(f'Found {len(entries)} entries')
    for entry in entries[:3]:
        player_name = entry.player.displayName if entry.player else 'Unknown'
        print(f'  - {player_name} (${entry.salary})')

if __name__ == "__main__":
    test_api_query()
