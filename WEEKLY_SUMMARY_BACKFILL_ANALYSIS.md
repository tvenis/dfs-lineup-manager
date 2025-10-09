# Weekly Player Summary Backfill Analysis
## For Weeks 1, 2, 3 (2025 Season)

**Generated:** October 9, 2025  
**Purpose:** Analyze requirements to backfill `weekly_player_summary` table for historical weeks

---

## Executive Summary

✅ **Good News:** All required source data exists in the database for weeks 1, 2, and 3  
✅ **Process:** Simple API call can generate weekly summaries - no file imports needed  
⚠️  **Optional:** Ownership estimate data is missing but not required for basic functionality

---

## Current Data Status

### Week 1 (2025)
- **Week ID:** 1
- **Status:** Completed
- **Player Pool Entries:** 744 (Draft Group: 131064)
- **Projections:** 328 (Source: WinWithOdds)
- **Ownership Estimates:** 0 ❌
- **Weekly Summaries:** 0 ❌

### Week 2 (2025)
- **Week ID:** 2
- **Status:** Completed
- **Player Pool Entries:** 589 (Draft Group: 133233)
- **Projections:** 446 (Source: WinWithOdds)
- **Ownership Estimates:** 0 ❌
- **Weekly Summaries:** 0 ❌

### Week 3 (2025)
- **Week ID:** 3
- **Status:** Completed
- **Player Pool Entries:** 647 (Draft Group: 133903)
- **Projections:** 440 (Source: WinWithOdds)
- **Ownership Estimates:** 0 ❌
- **Weekly Summaries:** 0 ❌

---

## What is `weekly_player_summary`?

### Table Structure
The `weekly_player_summary` table aggregates key player data for each week:

```sql
CREATE TABLE weekly_player_summary (
    id SERIAL PRIMARY KEY,
    week_id INTEGER NOT NULL REFERENCES weeks(id),
    playerDkId INTEGER NOT NULL REFERENCES players(playerDkId),
    baseline_salary INTEGER NULL,           -- From player_pool_entries
    consensus_projection FLOAT NULL,        -- Average from projections table
    consensus_ownership NUMERIC(5,2) NULL,  -- Average from ownership_estimates
    baseline_source VARCHAR(100) NULL,      -- Which draft group or "multi_slate"
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(week_id, playerDkId)
)
```

### Data Sources for Each Field

1. **baseline_salary** ← `player_pool_entries` table
   - Uses main draft group if specified, otherwise min salary across all draft groups
   - Week 1: Draft Group 131064
   - Week 2: Draft Group 133233
   - Week 3: Draft Group 133903

2. **consensus_projection** ← `projections` table
   - Averages all projection sources for each player
   - All weeks have WinWithOdds projections

3. **consensus_ownership** ← `ownership_estimates` table
   - Averages all ownership estimate sources
   - ⚠️ Currently empty for all 3 weeks (optional field)

4. **baseline_source** ← Metadata
   - Records which draft group was used for salary, or "multi_slate"

---

## Backfill Process: Two Options

### Option 1: Simple API Calls (RECOMMENDED)
**No files needed - uses existing database data**

The system has an API endpoint specifically for populating weekly summaries:

```bash
POST /api/weekly-summary/week/{week_id}/populate?main_draftgroup={draft_group}
```

#### Steps:
1. Start your backend server (if not running)
2. Make API calls for each week:

```bash
# Week 1
curl -X POST "http://localhost:8000/api/weekly-summary/week/1/populate?main_draftgroup=131064"

# Week 2
curl -X POST "http://localhost:8000/api/weekly-summary/week/2/populate?main_draftgroup=133233"

# Week 3
curl -X POST "http://localhost:8000/api/weekly-summary/week/3/populate?main_draftgroup=133903"
```

**Expected Result:** Each call will create/update weekly_player_summary records by:
- Finding all unique players in `player_pool_entries` for that week
- Pulling baseline salary from the specified draft group
- Calculating average consensus projection from `projections` table
- Calculating average consensus ownership from `ownership_estimates` (will be NULL)
- Upserting records into `weekly_player_summary`

**Processing Logic** (from `backend/app/services/weekly_summary_service.py`):
```python
# For each player with pool entries in the week:
#   1. Get baseline salary (main slate first, then min across all)
#   2. Get consensus projection (avg from projections table)
#   3. Get consensus ownership (avg from ownership_estimates table)
#   4. Upsert into weekly_player_summary
```

### Option 2: Create a Backfill Script
If you want more control or want to run all weeks at once:

**Create:** `backend/backfill_weekly_summary.py`
```python
#!/usr/bin/env python3
"""
Backfill script for weekly_player_summary table
"""
import sys
import os
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from app.database import SessionLocal
from app.services.weekly_summary_service import WeeklySummaryService

def main():
    db = SessionLocal()
    
    # Week configurations
    weeks = [
        (1, '131064'),  # week_id, main_draftgroup
        (2, '133233'),
        (3, '133903'),
    ]
    
    try:
        for week_id, draft_group in weeks:
            print(f"Processing Week {week_id} (Draft Group: {draft_group})...")
            count = WeeklySummaryService.populate_weekly_summary(
                db, week_id, draft_group
            )
            print(f"✅ Updated {count} weekly summaries for week {week_id}")
            
    except Exception as e:
        print(f"❌ Error: {str(e)}")
    finally:
        db.close()

if __name__ == "__main__":
    main()
```

**Run:**
```bash
cd /Users/tvenis/DFS_App/backend
python3 backfill_weekly_summary.py
```

---

## What If You Want Ownership Data?

Ownership estimates are **optional** but add value. If you have historical ownership CSV files:

### Import Process
1. Navigate to: `http://localhost:3000/import?section=ownership`
2. Upload CSV files for each week
3. Re-run the weekly summary population

### CSV Format Expected
The system supports various ownership projection formats. Based on the code, common formats include:
- Player Name, Team, Position, Ownership%
- Various vendor formats (automatically detected)

**Location of old files:** Check your local machine for files like:
- `week1_ownership.csv`
- `week2_ownership.csv`
- `week3_ownership.csv`
- Or vendor-specific files from DFS projections sites

### After Importing Ownership
Re-run the API calls to update weekly summaries with ownership data:
```bash
curl -X POST "http://localhost:8000/api/weekly-summary/week/1/populate?main_draftgroup=131064"
```

---

## Data Dependencies & Requirements

### ✅ Already Have (No Action Needed)
1. **Player Pool Data** - Imported from DraftKings API
   - Week 1: 744 entries
   - Week 2: 589 entries  
   - Week 3: 647 entries

2. **Projections** - Imported from CSV (WinWithOdds)
   - Week 1: 328 projections
   - Week 2: 446 projections
   - Week 3: 440 projections

### ⚠️ Optional (Can Import Later)
3. **Ownership Estimates** - Would need to import from CSV
   - Check for historical CSV files locally
   - Not required for basic functionality
   - Adds `consensus_ownership` field to summaries

### ❌ Missing (To Be Generated)
4. **Weekly Summaries** - Generated from items 1-3
   - Run populate endpoint or backfill script
   - Combines data from player pool and projections
   - Can be regenerated/updated at any time

---

## Technical Details

### Service Logic
File: `backend/app/services/weekly_summary_service.py`

**Key Methods:**
- `populate_weekly_summary(db, week_id, main_draftgroup)` - Main entry point
- `_get_baseline_salary()` - Pulls from player_pool_entries
- `_get_consensus_projection()` - Averages from projections table
- `_get_consensus_ownership()` - Averages from ownership_estimates table

**Behavior:**
- Creates new records if they don't exist
- Updates existing records (safe to re-run)
- Processes all players with pool entries for the week
- Returns count of records created/updated

### API Endpoint
File: `backend/app/routers/weekly_summary.py`

```python
@router.post("/week/{week_id}/populate")
def populate_weekly_summary(
    week_id: int,
    main_draftgroup: Optional[str] = Query(None),
    db: Session = Depends(get_db)
):
    """Populate weekly summary for a given week"""
    count = WeeklySummaryService.populate_weekly_summary(
        db, week_id, main_draftgroup
    )
    return {"message": f"Updated {count} weekly summaries", "count": count}
```

### Database Indexes
The table has optimized indexes for queries:
- `idx_weekly_summary_week_player` - Unique index on (week_id, playerDkId)
- `idx_weekly_summary_week` - Index on week_id for fast weekly lookups

---

## Verification Steps

After backfilling, verify the data:

### 1. Check Record Counts
```sql
SELECT week_id, COUNT(*) as summary_count
FROM weekly_player_summary
WHERE week_id IN (1, 2, 3)
GROUP BY week_id
ORDER BY week_id;
```

**Expected Results:**
- Week 1: ~328-744 records (depends on how many players have projections)
- Week 2: ~446-589 records
- Week 3: ~440-647 records

### 2. Verify Data Quality
```sql
-- Check a sample of Week 1 data
SELECT 
    wps.week_id,
    p.displayName,
    p.position,
    wps.baseline_salary,
    wps.consensus_projection,
    wps.consensus_ownership,
    wps.baseline_source
FROM weekly_player_summary wps
JOIN players p ON wps.playerDkId = p.playerDkId
WHERE wps.week_id = 1
LIMIT 10;
```

**Validation Checklist:**
- [ ] baseline_salary is populated (should be > 0)
- [ ] consensus_projection is populated for most players
- [ ] consensus_ownership is NULL (expected if no ownership data)
- [ ] baseline_source shows correct draft group

### 3. Use Diagnostic Script
Re-run the diagnostic script:
```bash
python3 check_week_data.py
```

Should now show:
- Week 1: `Weekly Summaries: XXX` (not 0)
- Week 2: `Weekly Summaries: XXX` (not 0)
- Week 3: `Weekly Summaries: XXX` (not 0)

---

## Recommendations

### Immediate Action
1. ✅ **Use Option 1 (API Calls)** - Simplest approach
2. ✅ Start backend server if not running
3. ✅ Execute 3 curl commands (one per week)
4. ✅ Run verification queries

### Future Considerations
1. **Create a Backfill Script** - For bulk operations
2. **Search for Ownership Files** - Check local machine for historical CSVs
3. **Document Draft Groups** - Keep a reference of main draft groups per week
4. **Automate Process** - Add to weekly workflow for future weeks

### Files to Look For Locally
Based on your mention of "old files stored locally", search for:
```bash
# Ownership files
find ~ -name "*ownership*.csv" -mtime +30  # Files older than 30 days
find ~ -name "*week1*.csv" -o -name "*week2*.csv" -o -name "*week3*.csv"

# Projection files (already imported, but for reference)
find ~ -name "*projection*.csv" -mtime +30
find ~ -name "*WinWithOdds*.csv"
```

---

## Summary

### What You Need to Do
1. **Run 3 API calls** (or 1 backfill script)
2. **No file imports required** (unless you want ownership data)
3. **Verify the results** with SQL queries or diagnostic script

### What You DON'T Need to Do
- ❌ Re-import DraftKings player pool data (already have it)
- ❌ Re-import projections (already have them)
- ❌ Find/process ownership files (optional enhancement)

### Processing Time
- **Expected:** < 5 seconds per week via API
- **Total:** < 15 seconds for all 3 weeks

### Risk Level
- **Low** - Operation is idempotent (safe to re-run)
- **No Data Loss** - Only creates/updates summary records
- **Rollback:** Can delete records if needed:
  ```sql
  DELETE FROM weekly_player_summary WHERE week_id IN (1, 2, 3);
  ```

---

## Next Steps

1. Review this analysis
2. Decide: API calls or backfill script?
3. Execute chosen approach
4. Verify results
5. (Optional) Search for and import ownership data
6. Document for future reference

**Questions or concerns?** Let me know before proceeding!

