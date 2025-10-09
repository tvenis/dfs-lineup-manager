# OPRK Migration to Weekly Player Summary - Step 1 Complete

## Overview
This document tracks the migration of OPRK (Opponent Rank) data from `player_pool_entries` to `weekly_player_summary` table.

## Problem
Players appearing in multiple draft groups (e.g., "Main Slate" + "Showdown") were causing duplicates on the Player Props page because the query joined to `player_pool_entries` which has one row per (week, draftGroup, player) combination.

## Solution
Move OPRK to `weekly_player_summary` table since it's week-specific but NOT pool-specific (same player, same week, same opponent = same OPRK regardless of draft group).

---

## Step 1: Add OPRK Columns to Database ✅ COMPLETE

### Files Modified

#### 1. **Migration Script Created**
- **File**: `backend/add_oprk_to_weekly_summary.py`
- **Purpose**: Adds `oprk_value` and `oprk_quality` columns to `weekly_player_summary` table
- **Columns Added**:
  - `oprk_value` (INTEGER NULL) - Opponent Rank value (lower = better matchup)
  - `oprk_quality` (VARCHAR(20) NULL) - Opponent Rank quality ('High', 'Medium', 'Low')

#### 2. **Model Updated**
- **File**: `backend/app/models.py`
- **Lines**: 791-792
- **Changes**: Added `oprk_value` and `oprk_quality` columns to `WeeklyPlayerSummary` model

#### 3. **Schema Updated**
- **File**: `backend/app/schemas.py`
- **Lines**: 1275-1276, 1286-1287
- **Changes**: 
  - Added `oprk_value` and `oprk_quality` to `WeeklyPlayerSummaryBase`
  - Added `oprk_value` and `oprk_quality` to `WeeklyPlayerSummaryUpdate`

### How to Run Migration

```bash
cd /Users/tvenis/DFS_App/backend
python add_oprk_to_weekly_summary.py
```

### Expected Output
```
🔍 Checking if weekly_player_summary table exists...
✅ Table 'weekly_player_summary' found
📝 Adding oprk_value column...
✅ Added oprk_value column
📝 Adding oprk_quality column...
✅ Added oprk_quality column

✅ Migration completed successfully!
```

### Verification
The script will:
1. Check if table exists
2. Check if columns already exist (idempotent)
3. Add columns only if they don't exist
4. Display current table structure

---

## Step 2: ~~Backfill OPRK Data~~ (SKIPPED) ✅
User chose to skip backfill and start fresh with Week 6 data.

---

## Step 3: Update DraftKings Import Service ✅ COMPLETE

### Files Modified

#### **backend/app/services/weekly_summary_service.py**

**Changes Made:**
1. Added `Tuple` to imports (line 3)
2. Updated `populate_weekly_summary()` method:
   - Added call to `_get_oprk_data()` (lines 41-44)
   - Added `oprk_value` and `oprk_quality` to update logic (lines 59-60)
   - Added `oprk_value` and `oprk_quality` to create logic (lines 69-70)

3. Added new method `_get_oprk_data()` (lines 132-189):
   - Extracts OPRK from `PlayerPoolEntry.draftStatAttributes`
   - Looks for attribute with `id == -2`
   - Returns `(oprk_value, oprk_quality)` tuple
   - Handles both main draft group and fallback to any draft group
   - Robust error handling

**How It Works:**
When DraftKings import completes, it calls `WeeklySummaryService.populate_weekly_summary()` which now:
1. Queries all players with pool entries for the week
2. For each player, extracts OPRK from their pool entry's `draftStatAttributes` JSON
3. Creates/updates a `weekly_player_summary` record with the OPRK data
4. Result: OPRK is now available in `weekly_player_summary` table (week-specific, not pool-specific)

---

## Step 4: Modify `/api/leaderboard/player-props` Endpoint ✅ COMPLETE

### Files Modified

#### **backend/app/routers/leaderboard.py**

**Changes Made:**

1. **Updated Imports** (line 6):
   - Added `WeeklyPlayerSummary` to imports
   - Kept `PlayerPoolEntry` for tier filtering

2. **Modified Query** (lines 25-41):
   - Changed from `PlayerPoolEntry` join to `WeeklyPlayerSummary` outer join for OPRK
   - Added `PlayerPoolEntry` as outer join (only needed for tier filter)
   - **KEY FIX**: Added `DISTINCT(PlayerPropBet.id)` to eliminate duplicates (line 101)
   - Updated ORDER BY to include `PlayerPropBet.id` first (line 104)

3. **Simplified OPRK Extraction** (lines 120-125):
   - **REMOVED**: Complex JSON parsing from `draftStatAttributes`
   - **ADDED**: Simple field access from `weekly_summary_row`
   - Just two lines: `oprk_value = weekly_summary_row.oprk_value`, `oprk_quality = weekly_summary_row.oprk_quality`

4. **Updated Result Processing** (line 111):
   - Added `weekly_summary_row` to unpacking tuple
   - Now: `for prop_row, game_row, week_row, player_row, weekly_summary_row, pool_entry_row in results:`

**Why This Fixes Duplicates:**
- **Before**: Join to `PlayerPoolEntry` on `(playerDkId, week_id)` matched multiple rows per player (one per draft group)
- **After**: Join to `WeeklyPlayerSummary` on `(playerDkId, week_id)` matches only ONE row per player
- **Plus**: Added `DISTINCT(PlayerPropBet.id)` as safety net to prevent any duplicates

---

## Step 5: (Optional) Update Other Endpoints - FUTURE WORK

### Endpoints Still Using Old OPRK Extraction:
- `backend/app/routers/players.py` - `get_player_game_log` endpoint (lines 936-953)
- `backend/app/routers/actuals.py` - `get_all_player_actuals` endpoint (lines 413-420)

**Current Status**: These endpoints still extract OPRK from `player_pool_entries.draftStatAttributes`

**Recommendation**: Update these endpoints in a future PR to use `weekly_player_summary.oprk_value/oprk_quality` for consistency and better performance.

---

## Status
✅ **All Implementation Steps COMPLETE** - Ready for Week 6 testing!

## Notes
- Migration is idempotent (safe to run multiple times)
- No data loss - original OPRK data remains in `player_pool_entries`
- Can roll back by simply not using the new columns

