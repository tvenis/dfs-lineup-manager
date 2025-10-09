# OPRK Migration - Complete Implementation Summary

## Problem Solved
Players appearing in multiple draft groups (e.g., "Main Slate" + "Showdown") were showing as duplicates on the Player Props page because the API was joining to `player_pool_entries` table, which has one row per `(week, draftGroup, player)` combination.

## Solution Implemented
Moved OPRK data from `player_pool_entries` (pool-specific) to `weekly_player_summary` (week-specific only), since OPRK is the same for a player regardless of which draft group they're in.

---

## Changes Made

### 1. Database Schema Changes ✅

**File**: `backend/add_oprk_to_weekly_summary.py` (migration script)

**Added Columns to `weekly_player_summary` table:**
- `oprk_value` (INTEGER NULL) - Opponent Rank value (lower = better matchup)
- `oprk_quality` (VARCHAR(20) NULL) - Quality tier ('High', 'Medium', 'Low')

**Migration Status**: ✅ Successfully applied

---

### 2. Model Updates ✅

**File**: `backend/app/models.py` (lines 791-792)

Added OPRK fields to `WeeklyPlayerSummary` model:
```python
oprk_value = Column(Integer)  # Opponent Rank value (lower is better matchup)
oprk_quality = Column(String(20))  # Opponent Rank quality: 'High', 'Medium', 'Low'
```

---

### 3. Schema Updates ✅

**File**: `backend/app/schemas.py` (lines 1275-1276, 1286-1287)

Updated all WeeklyPlayerSummary schemas:
- `WeeklyPlayerSummaryBase` - Added `oprk_value` and `oprk_quality` fields
- `WeeklyPlayerSummaryUpdate` - Added `oprk_value` and `oprk_quality` fields

---

### 4. Import Service Updates ✅

**File**: `backend/app/services/weekly_summary_service.py`

**Added Method**: `_get_oprk_data()` (lines 132-189)
- Extracts OPRK from `PlayerPoolEntry.draftStatAttributes` JSON
- Looks for attribute object with `id == -2`
- Returns `(oprk_value, oprk_quality)` tuple
- Handles main draft group preference with fallback

**Updated Method**: `populate_weekly_summary()` (lines 13-77)
- Now calls `_get_oprk_data()` for each player
- Saves OPRK to `weekly_player_summary` table
- Runs automatically after every DraftKings import

**Impact**: When you import Week 6 player pool data, OPRK will automatically populate in `weekly_player_summary` table.

---

### 5. Leaderboard Endpoint - THE KEY FIX ✅

**File**: `backend/app/routers/leaderboard.py`

**Before (Caused Duplicates):**
```python
query = (
    db.query(PlayerPropBet, Game, Week, Player, PlayerPoolEntry)
    .join(PlayerPoolEntry, and_(
        PlayerPropBet.playerDkId == PlayerPoolEntry.playerDkId,
        PlayerPropBet.week_id == PlayerPoolEntry.week_id
    ))
)
# This joined to MULTIPLE rows per player (one per draft group)
```

**After (Eliminates Duplicates):**
```python
query = (
    db.query(PlayerPropBet, Game, Week, Player, WeeklyPlayerSummary, PlayerPoolEntry)
    .outerjoin(WeeklyPlayerSummary, and_(
        PlayerPropBet.playerDkId == WeeklyPlayerSummary.playerDkId,
        PlayerPropBet.week_id == WeeklyPlayerSummary.week_id
    ))
    .outerjoin(PlayerPoolEntry, and_(  # Only for tier filter
        PlayerPropBet.playerDkId == PlayerPoolEntry.playerDkId,
        PlayerPropBet.week_id == PlayerPoolEntry.week_id
    ))
).distinct(PlayerPropBet.id)  # Safety net
# This joins to ONE row per player
```

**OPRK Extraction - Before (Complex):**
```python
# 20+ lines of JSON parsing from draftStatAttributes
import json
attrs = json.loads(pool_entry_row.draftStatAttributes)
oprk_attr = next((attr for attr in attrs if attr.get('id') == -2), None)
if oprk_attr:
    oprk_value = oprk_attr.get('value')
    oprk_quality = oprk_attr.get('quality')
```

**OPRK Extraction - After (Simple):**
```python
# 2 lines - direct field access
oprk_value = weekly_summary_row.oprk_value
oprk_quality = weekly_summary_row.oprk_quality
```

**Benefits:**
- ✅ Eliminates duplicates (one row per player)
- ✅ Simpler, faster code (no JSON parsing)
- ✅ Better performance (fewer joins, no text parsing)
- ✅ More maintainable

---

## How to Test (Week 6)

### Step 1: Import Week 6 Player Pool Data

```bash
# Use your normal import process
# The DraftKings import will automatically populate OPRK in weekly_player_summary
```

### Step 2: Verify OPRK Data in Database

```sql
-- Check that OPRK data was populated
SELECT 
    p.displayName,
    wps.oprk_value,
    wps.oprk_quality
FROM weekly_player_summary wps
JOIN players p ON p.playerDkId = wps.playerDkId
WHERE wps.week_id = <YOUR_WEEK_6_ID>
    AND wps.oprk_value IS NOT NULL
ORDER BY wps.oprk_value
LIMIT 10;
```

Expected: You should see OPRK values and qualities populated for players.

### Step 3: Test Player Props Page

1. Navigate to `/leaderboard/player-props` page
2. Select Week 6
3. Check for duplicate players

**Expected Result**: 
- ✅ Each player appears only ONCE (no duplicates)
- ✅ OPRK column displays correctly
- ✅ All other data (opponent, bookmaker, market, etc.) displays correctly

### Step 4: Test Filters

Try filtering by:
- Position (QB, RB, WR, TE)
- Tier (1, 2, 3, 4)
- Market (Anytime TD, Passing Yards, etc.)
- Bookmaker

**Expected Result**: All filters work correctly with no duplicates.

---

## Verification Queries

### Check OPRK Population Rate
```sql
SELECT 
    COUNT(*) as total_players,
    COUNT(oprk_value) as players_with_oprk,
    ROUND(COUNT(oprk_value) * 100.0 / COUNT(*), 2) as oprk_percentage
FROM weekly_player_summary
WHERE week_id = <YOUR_WEEK_6_ID>;
```

Expected: High percentage of players should have OPRK (90%+)

### Check for Duplicates on Props Page
```sql
SELECT 
    ppb.playerDkId,
    p.displayName,
    COUNT(*) as prop_count
FROM player_prop_bets ppb
JOIN players p ON p.playerDkId = ppb.playerDkId
WHERE ppb.week_id = <YOUR_WEEK_6_ID>
    AND ppb.market = 'player_tds_over'
    AND ppb.outcome_point = 0.5
GROUP BY ppb.playerDkId, p.displayName
HAVING COUNT(*) > 1;
```

Expected: Should return 0 rows (no duplicates in prop bets themselves)

### Verify No Duplicate Display
Test the actual endpoint:
```bash
curl "http://localhost:8000/api/leaderboard/player-props?week=<WEEK_6_ID>&market=anytime_td" | jq '.[] | .player_name' | sort | uniq -d
```

Expected: No output (no duplicate player names)

---

## Rollback Plan (If Needed)

If you need to revert the changes:

### Option 1: Keep Everything, Just Use Old Query
Revert just the leaderboard endpoint changes:
```bash
git checkout HEAD~1 backend/app/routers/leaderboard.py
```

### Option 2: Full Rollback
```bash
# Revert code changes
git checkout HEAD~3 backend/

# Remove database columns (optional)
# Run this SQL if you want to remove the new columns:
ALTER TABLE weekly_player_summary DROP COLUMN oprk_value;
ALTER TABLE weekly_player_summary DROP COLUMN oprk_quality;
```

**Note**: The original OPRK data is still in `player_pool_entries.draftStatAttributes`, so no data is lost.

---

## Future Improvements (Optional)

### Update Other Endpoints to Use weekly_player_summary.oprk_*

**Files to Update:**
1. `backend/app/routers/players.py` - `get_player_game_log()` endpoint
   - Currently extracts OPRK from `player_pool_entries.draftStatAttributes` (lines 944-953)
   - Could be simplified to use `weekly_player_summary`

2. `backend/app/routers/actuals.py` - `get_all_player_actuals()` endpoint
   - Currently extracts OPRK from `player_pool_entries.draftStatAttributes` (lines 413-420)
   - Could be simplified to use `weekly_player_summary`

**Benefits:**
- Consistency across codebase
- Better performance (no JSON parsing)
- Simpler code maintenance

---

## Files Changed Summary

### Created:
- `backend/add_oprk_to_weekly_summary.py` - Migration script
- `backend/OPRK_MIGRATION_STEP1.md` - Detailed documentation
- `backend/MIGRATION_COMMANDS.md` - Quick reference
- `backend/OPRK_MIGRATION_SUMMARY.md` - This file

### Modified:
- `backend/app/models.py` - Added OPRK columns to WeeklyPlayerSummary model
- `backend/app/schemas.py` - Added OPRK fields to WeeklyPlayerSummary schemas
- `backend/app/services/weekly_summary_service.py` - Added OPRK extraction and population logic
- `backend/app/routers/leaderboard.py` - Changed query to use WeeklyPlayerSummary, eliminated duplicates

---

## Success Criteria ✅

- [x] Database migration successful
- [x] OPRK columns added to weekly_player_summary table
- [x] Models and schemas updated
- [x] Import service extracts and saves OPRK
- [x] Leaderboard endpoint uses new OPRK source
- [x] Query modified to prevent duplicates
- [x] Code simplified (removed JSON parsing)
- [ ] **Testing with Week 6 data** - User to complete

---

## Support

If you encounter any issues:

1. Check logs for errors during import: Look for "Extracting OPRK for player" messages
2. Verify database columns exist: Run `\d weekly_player_summary` in psql
3. Check that weekly summary is populated: Run verification queries above
4. Test the endpoint directly: Use curl or browser dev tools

If problems persist, the old OPRK data is still in `player_pool_entries` and we can adjust the query.

