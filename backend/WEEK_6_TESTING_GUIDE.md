# Week 6 Testing Guide - OPRK Migration

## Quick Start: What Changed?

Players no longer duplicate on the Player Props page! 🎉

**The Fix**: OPRK data moved from pool-specific table to week-specific table.

---

## Testing Steps for Week 6

### 1️⃣ Import Week 6 Player Pool (As Normal)

Import your Week 6 player pool data exactly as you normally would. The system will now automatically:
- ✅ Import player pool entries (as before)
- ✅ **NEW**: Extract OPRK and save to `weekly_player_summary` table

**What to Watch For:**
Check your import logs for messages like:
```
Successfully updated X weekly summary records
Extracted OPRK for player XXXXX: value=X, quality=High/Medium/Low
```

---

### 2️⃣ Navigate to Player Props Page

Go to: `/leaderboard/player-props`

**Before the fix:** Players in both "Main Slate" and "Showdown" appeared twice
**After the fix:** Each player appears exactly once ✨

---

### 3️⃣ Quick Visual Check

Select Week 6 and look for:

✅ **No duplicate players** - Each player name appears only once
✅ **OPRK column shows values** - Numbers and colored indicators display
✅ **All data intact** - Opponent, bookmaker, market, probability all correct
✅ **Filters work** - Position, Tier, Market, Bookmaker filters function normally

---

### 4️⃣ Test Edge Cases

#### Test Different Markets
- Anytime TD
- Passing Yards
- Receiving Yards
- 1.5+ Player TDs

**Expected**: No duplicates in any market

#### Test Position Filters
- QB
- RB
- WR
- TE

**Expected**: No duplicates for any position

#### Test Tier Filter
- Tier 1
- Tier 2
- Tier 3
- Tier 4

**Expected**: Tier filter works correctly with no duplicates

---

## If You See Issues

### Issue: No OPRK values showing
**Check:**
```sql
SELECT COUNT(*) FROM weekly_player_summary 
WHERE week_id = <YOUR_WEEK_6_ID> 
AND oprk_value IS NOT NULL;
```

If count is 0 or very low:
- Re-run the import
- Check that `draftStatAttributes` has data in `player_pool_entries`

### Issue: Still seeing duplicates
**Check:**
1. Clear your browser cache
2. Refresh the page
3. Check if backend was restarted after code changes
4. Verify you're on Week 6 (not an older week)

### Issue: Other errors
Check backend logs for errors in:
- `WeeklySummaryService.populate_weekly_summary()`
- `get_player_props_for_leaderboard()` endpoint

---

## Success Indicators

✅ Import completes with "Successfully updated X weekly summary records"
✅ Player Props page loads without errors
✅ Each player appears exactly once
✅ OPRK values display correctly
✅ All filters work as expected
✅ Page performance feels faster (simplified queries)

---

## Verification Commands

### Count Players with OPRK
```sql
SELECT COUNT(*) as players_with_oprk
FROM weekly_player_summary
WHERE week_id = <WEEK_6_ID>
AND oprk_value IS NOT NULL;
```

### View Sample OPRK Data
```sql
SELECT 
    p.displayName,
    p.position,
    wps.oprk_value,
    wps.oprk_quality
FROM weekly_player_summary wps
JOIN players p ON p.playerDkId = wps.playerDkId
WHERE wps.week_id = <WEEK_6_ID>
AND wps.oprk_value IS NOT NULL
ORDER BY wps.oprk_value
LIMIT 10;
```

### Test API Endpoint Directly
```bash
# Replace with your week_id
curl "http://localhost:8000/api/leaderboard/player-props?week=<WEEK_6_ID>&market=anytime_td"
```

Check the response for:
- No duplicate `player_id` values
- `oprk_value` and `oprk_quality` fields present

---

## Need Help?

All changes are documented in:
- `OPRK_MIGRATION_SUMMARY.md` - Complete technical details
- `OPRK_MIGRATION_STEP1.md` - Step-by-step implementation log
- `MIGRATION_COMMANDS.md` - Quick commands reference

The migration is **fully reversible** - original OPRK data is still in `player_pool_entries` if needed.

