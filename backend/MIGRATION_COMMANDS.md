# OPRK Migration - Quick Reference

## Run the Migration

```bash
# Navigate to backend directory
cd /Users/tvenis/DFS_App/backend

# Run the migration script
python add_oprk_to_weekly_summary.py
```

## Verify Migration

Check that the columns were added:

```sql
-- Connect to your database and run:
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'weekly_player_summary'
ORDER BY ordinal_position;
```

Expected to see:
- `oprk_value` (integer, nullable)
- `oprk_quality` (character varying, nullable)

## Rollback (if needed)

If you need to remove the columns:

```sql
ALTER TABLE weekly_player_summary DROP COLUMN oprk_value;
ALTER TABLE weekly_player_summary DROP COLUMN oprk_quality;
```

## What's Changed

### Database
- ✅ `weekly_player_summary.oprk_value` (INTEGER NULL)
- ✅ `weekly_player_summary.oprk_quality` (VARCHAR(20) NULL)

### Code
- ✅ `backend/app/models.py` - WeeklyPlayerSummary model updated
- ✅ `backend/app/schemas.py` - WeeklyPlayerSummary schemas updated
- ✅ `backend/add_oprk_to_weekly_summary.py` - Migration script created

### Not Yet Changed (Next Steps)
- ⏳ DraftKings import service (to populate OPRK)
- ⏳ Leaderboard player-props endpoint (to use new OPRK columns)

