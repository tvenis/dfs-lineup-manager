#!/usr/bin/env python3

from app.database import get_db
from app.models import PlayerPoolEntry, Week

def analyze_draft_groups():
    db = next(get_db())
    
    # Get the most recent week
    latest_week = db.query(Week).order_by(Week.year.desc(), Week.week_number.desc()).first()
    print(f'Week {latest_week.week_number} ({latest_week.year}) Draft Group Analysis:')
    print('=' * 60)
    
    entries = db.query(PlayerPoolEntry).filter(PlayerPoolEntry.week_id == latest_week.id).all()
    
    draft_group_stats = {}
    for entry in entries:
        draft_group = entry.draftGroup or 'NULL'
        if draft_group not in draft_group_stats:
            draft_group_stats[draft_group] = {
                'count': 0,
                'total_salary': 0,
                'avg_salary': 0,
                'has_projections': 0,
                'positions': set()
            }
        
        stats = draft_group_stats[draft_group]
        stats['count'] += 1
        stats['total_salary'] += entry.salary or 0
        if entry.projectedPoints and entry.projectedPoints > 0:
            stats['has_projections'] += 1
        if entry.player:
            stats['positions'].add(entry.player.position)
    
    # Calculate averages and show results
    for draft_group, stats in draft_group_stats.items():
        stats['avg_salary'] = stats['total_salary'] / stats['count'] if stats['count'] > 0 else 0
        print(f'\nDraft Group: {draft_group}')
        print(f'  Entries: {stats["count"]}')
        print(f'  Avg Salary: ${stats["avg_salary"]:.0f}')
        print(f'  With Projections: {stats["has_projections"]} ({stats["has_projections"]/stats["count"]*100:.1f}%)')
        print(f'  Positions: {sorted(stats["positions"])}')

if __name__ == "__main__":
    analyze_draft_groups()
