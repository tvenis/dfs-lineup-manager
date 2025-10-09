# Week API Endpoints Documentation

## Overview

This document describes the dedicated API endpoints for retrieving active and last completed weeks. These endpoints provide a reliable, consistent way to access critical week data across the application.

## Why These Endpoints Are Important

Week selection is **critical** to the DFS application because it affects:
- Lineup creation and management
- Player pool data
- Contest results
- Historical data analysis
- Import operations
- Scoring and actuals

Previously, this logic was duplicated across multiple frontend pages with inconsistent implementations. These dedicated endpoints centralize this logic in the backend.

---

## Backend API Endpoints

### 1. GET `/api/weeks/active`

Returns the current active week (status = 'Active').

**Response Codes:**
- `200 OK` - Active week found
- `404 Not Found` - No active week exists

**Success Response:**
```json
{
  "id": 10,
  "week_number": 10,
  "year": 2025,
  "start_date": "2025-03-10",
  "end_date": "2025-03-16",
  "game_count": 16,
  "status": "Active",
  "notes": null,
  "imported_at": "2025-01-01T00:00:00Z",
  "created_at": "2025-01-01T00:00:00Z",
  "updated_at": null
}
```

**Error Response (404):**
```json
{
  "detail": "No active week found"
}
```

**Use Cases:**
- Default week selection for lineup builder
- Player pool imports (DraftKings)
- Weekly lineup manager
- Any page that needs the "current" week

---

### 2. GET `/api/weeks/last-completed`

Returns the most recent completed week (status = 'Completed'), sorted by year and week_number descending.

**Response Codes:**
- `200 OK` - Completed week found
- `404 Not Found` - No completed week exists

**Success Response:**
```json
{
  "id": 9,
  "week_number": 9,
  "year": 2025,
  "start_date": "2025-03-03",
  "end_date": "2025-03-09",
  "game_count": 16,
  "status": "Completed",
  "notes": null,
  "imported_at": "2025-01-01T00:00:00Z",
  "created_at": "2025-01-01T00:00:00Z",
  "updated_at": "2025-03-10T00:00:00Z"
}
```

**Error Response (404):**
```json
{
  "detail": "No completed week found"
}
```

**Use Cases:**
- Default week selection for player actuals imports
- Default week selection for team stats imports
- Default week selection for game results imports
- Historical data analysis
- Scoreboard page (showing last completed week's results)

---

### 3. GET `/api/weeks/current` (Legacy)

This is the legacy endpoint that provides fallback logic. For new implementations, use `/active` or `/last-completed` instead.

**Fallback Logic:**
1. Returns active week (status = 'Active')
2. If no active week, returns week containing today's date
3. If no current week, returns next upcoming week

---

## Frontend Service Methods

### WeekService.getActiveWeek()

```typescript
const activeWeek = await WeekService.getActiveWeek();

if (activeWeek) {
  console.log(`Active week: ${activeWeek.week_number} (${activeWeek.year})`);
} else {
  console.log('No active week found');
}
```

**Returns:** `Promise<Week | null>`
- Returns `Week` object if active week exists
- Returns `null` if no active week found or on error

---

### WeekService.getLastCompletedWeek()

```typescript
const lastCompletedWeek = await WeekService.getLastCompletedWeek();

if (lastCompletedWeek) {
  console.log(`Last completed: Week ${lastCompletedWeek.week_number} (${lastCompletedWeek.year})`);
} else {
  console.log('No completed week found');
}
```

**Returns:** `Promise<Week | null>`
- Returns `Week` object if completed week exists
- Returns `null` if no completed week found or on error

---

## Testing

### Running Backend Tests

```bash
cd backend
python test_weeks_api.py
```

The test suite includes:
- ✅ Active week retrieval (success and not found)
- ✅ Last completed week retrieval (success and not found)
- ✅ Multiple completed weeks (ensures most recent is returned)
- ✅ Multiple years (ensures year takes precedence)
- ✅ Edge cases (special characters, data integrity issues)
- ✅ Filtering and ordering

**Expected Output:**
```
🧪 Running Comprehensive Week API Tests
======================================================================

📋 Running TestGetActiveWeek
----------------------------------------------------------------------
✅ test_get_active_week_success passed
✅ test_get_active_week_not_found passed
✅ test_get_active_week_only_returns_active passed
✅ test_get_active_week_when_multiple_active passed

📋 Running TestGetLastCompletedWeek
----------------------------------------------------------------------
✅ test_get_last_completed_week_success passed
✅ test_get_last_completed_week_not_found passed
✅ test_get_last_completed_week_returns_most_recent passed
✅ test_get_last_completed_week_across_multiple_years passed
✅ test_get_last_completed_week_ignores_other_statuses passed

📊 Test Results
======================================================================
Total Tests: 14
✅ Passed: 14
❌ Failed: 0
Success Rate: 100.0%
======================================================================
```

### Running Frontend Tests

```bash
cd web
npm test -- weekService.test.ts
```

The test suite includes:
- ✅ Active week retrieval (success, 404, network errors)
- ✅ Last completed week retrieval (success, 404, network errors)
- ✅ Error handling (malformed JSON, timeouts)
- ✅ Integration scenarios (both exist, neither exists, one exists)

---

## Migration Guide

### Before (Old Pattern - Don't Use)

```typescript
// ❌ OLD - Duplicated logic across pages
const weeksResponse = await fetch(`${API_URL}/api/weeks`);
const weeksData = await weeksResponse.json();
const completedWeeks = weeksData.weeks.filter((w: any) => w.status === 'Completed');
const sortedWeeks = completedWeeks.sort((a: any, b: any) => {
  if (a.year !== b.year) return b.year - a.year;
  return b.week_number - a.week_number;
});
const lastCompletedWeek = sortedWeeks[0];
```

### After (New Pattern - Use This)

```typescript
// ✅ NEW - Centralized, tested, reliable
const lastCompletedWeek = await WeekService.getLastCompletedWeek();
```

---

## Example Usage Patterns

### Pattern 1: Default to Active Week with Fallback

```typescript
// For lineup builder, player pool, etc.
const activeWeek = await WeekService.getActiveWeek();
const defaultWeek = activeWeek || weeks[0]; // Fallback to first week if needed
```

### Pattern 2: Default to Last Completed Week

```typescript
// For imports (actuals, team stats), scoreboard
const lastCompletedWeek = await WeekService.getLastCompletedWeek();
if (lastCompletedWeek) {
  setSelectedWeekId(lastCompletedWeek.id);
}
```

### Pattern 3: Show Both Active and Last Completed

```typescript
const [activeWeek, lastCompletedWeek] = await Promise.all([
  WeekService.getActiveWeek(),
  WeekService.getLastCompletedWeek()
]);

console.log('Active:', activeWeek?.week_number);
console.log('Last Completed:', lastCompletedWeek?.week_number);
```

---

## Benefits of New Endpoints

### 1. **Consistency**
- Same logic everywhere in the app
- Reduces bugs from inconsistent implementations

### 2. **Performance**
- Single targeted query instead of fetching all weeks
- Reduces data transfer and client-side processing

### 3. **Maintainability**
- Logic centralized in backend
- Easier to update/fix in one place

### 4. **Testability**
- Comprehensive test coverage (14+ backend tests, 15+ frontend tests)
- Critical functionality is validated

### 5. **Reliability**
- Proper error handling
- Clear 404 responses when data doesn't exist
- No null pointer exceptions

---

## Files Modified

### Backend
- `backend/app/routers/weeks.py` - Added `/active` and `/last-completed` endpoints
- `backend/test_weeks_api.py` - New comprehensive test suite

### Frontend
- `web/src/lib/weekService.ts` - Added `getActiveWeek()` and `getLastCompletedWeek()` methods
- `web/src/__tests__/weekService.test.ts` - New comprehensive test suite

### Documentation
- `docs/WEEK_API_ENDPOINTS.md` - This file

---

## Next Steps

The following pages should be migrated to use the new endpoints:

1. ✅ **Backend API** - Complete with tests
2. ✅ **Frontend Service** - Complete with tests
3. ⏳ **Scoreboard Page** - Update to use `getLastCompletedWeek()` by default
4. ⏳ **Other Pages** - Migrate to centralized service methods

---

## Support

For issues or questions:
1. Check test suite output for examples
2. Review this documentation
3. Check existing implementations in `weekService.ts`

---

**Last Updated:** October 9, 2025
**Version:** 1.0.0

