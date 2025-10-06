#!/usr/bin/env python3

from app.database import get_db
from app.models import PlayerPoolEntry, Week

def debug_draft_groups():
    db = next(get_db())
    
    # Get the most recent week
    latest_week = db.query(Week).order_by(Week.year.desc(), Week.week_number.desc()).first()
    print(f'Latest week: Week {latest_week.week_number} ({latest_week.year})')
    
    # Check what draft groups exist for this week
    entries = db.query(PlayerPoolEntry).filter(PlayerPoolEntry.week_id == latest_week.id).all()
    print(f'Total entries: {len(entries)}')
    
    # Group by draft group and show some sample data
    draft_group_data = {}
    for entry in entries:
        draft_group = entry.draftGroup or 'NULL'
        if draft_group not in draft_group_data:
            draft_group_data[draft_group] = []
        if len(draft_group_data[draft_group]) < 3:  # Show first 3 entries
            player_name = entry.player.displayName if entry.player else 'Unknown'
            position = entry.player.position if entry.player else 'Unknown'
            salary = entry.salary
            draft_group_data[draft_group].append({
                'player_name': player_name,
                'position': position,
                'salary': salary
            })
    
    for draft_group, samples in draft_group_data.items():
        print(f'\nDraft Group: {draft_group} ({len([e for e in entries if e.draftGroup == draft_group])} entries)')
        for sample in samples:
            print(f'  - {sample["player_name"]} ({sample["position"]}) - ${sample["salary"]}')

if __name__ == "__main__":
    debug_draft_groups()
