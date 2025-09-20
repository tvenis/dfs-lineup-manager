# PostgreSQL Migration Issues

This document covers common issues when migrating from SQLite to PostgreSQL.

## 1. Sequence Synchronization

## Issue Overview

When migrating from SQLite to PostgreSQL or importing data with explicit IDs, PostgreSQL auto-increment sequences can become out of sync with the actual data in the tables. This causes `duplicate key value violates unique constraint` errors when trying to insert new records.

## Root Cause

- **SQLite**: Uses `AUTOINCREMENT` without sequences, automatically handles ID assignment
- **PostgreSQL**: Uses sequences (e.g., `table_name_id_seq`) to generate auto-increment values
- **Problem**: When data is migrated or imported with explicit IDs, the sequence counter doesn't automatically update to reflect the highest existing ID

## Symptoms

```
psycopg.errors.UniqueViolation: duplicate key value violates unique constraint "table_name_pkey"
DETAIL: Key (id)=(3) already exists.
```

This happens because:
1. Table has existing records with IDs 1, 2, 3, 4, 5, etc.
2. Sequence is still at 1 (or some low number)
3. New insert tries to use ID=3 (from sequence), but ID=3 already exists
4. Database throws unique constraint violation

## Solution

### Manual Fix (One-time)

```sql
-- Check current sequence value
SELECT currval('table_name_id_seq');

-- Check maximum ID in table
SELECT MAX(id) FROM table_name;

-- Set sequence to correct next value
SELECT setval('table_name_id_seq', (SELECT MAX(id) FROM table_name) + 1, false);
```

### Automated Fix

Use the provided utility script:

```bash
cd backend
source venv/bin/activate
export DATABASE_URL="your_postgres_connection_string"
python sync_postgres_sequences.py
```

### Programmatic Fix (Python)

```python
from sqlalchemy import text

# Get max ID
result = session.execute(text('SELECT MAX(id) FROM table_name')).fetchone()
max_id = result[0] if result and result[0] else 0

# Set sequence next value
if max_id > 0:
    next_id = max_id + 1
    session.execute(text(f"SELECT setval('table_name_id_seq', {next_id}, false)"))
    session.commit()
```

## Prevention

### For Future Migrations

1. Always run sequence synchronization after data migration
2. Use the `sync_postgres_sequences.py` utility
3. Test imports on a small dataset first

### For Application Code

1. Let PostgreSQL handle ID assignment (don't specify ID in INSERT)
2. Use proper upsert patterns when needed
3. Handle IntegrityError exceptions gracefully

## Affected Tables

In this project, tables with auto-increment IDs include:
- `player_pool_entries`
- `recent_activity`
- `weeks`
- `teams`
- `games`
- `contests`
- `draftgroups`
- `player_actuals`
- `player_prop_bets`
- `tips_configuration`

## Verification

After fixing sequences, verify they work:

```sql
-- Insert a test record (should get next available ID)
INSERT INTO table_name (column1, column2) VALUES ('test', 'value');

-- Check the assigned ID
SELECT id FROM table_name WHERE column1 = 'test';

-- Clean up test record
DELETE FROM table_name WHERE column1 = 'test';
```

## Tools

- `sync_postgres_sequences.py`: Automated utility to fix all sequences
- Manual SQL commands for individual tables
- Database monitoring to catch sequence issues early

## Best Practices

1. **Always** sync sequences after migrating from SQLite
2. **Never** hardcode IDs in application code
3. **Use** proper error handling for constraint violations
4. **Test** imports on development environment first
5. **Monitor** for sequence-related errors in production logs

## 2. Case Sensitivity Issues

### Issue Overview

PostgreSQL is case-sensitive for string comparisons by default, while SQLite was more forgiving. This causes player matching and lookup failures when migrating from SQLite.

### Symptoms

- Projection imports show "no matches" when players exist in database
- Player searches fail to find existing players
- Team lookups fail with valid team abbreviations

```python
# This works in SQLite but fails in PostgreSQL:
Player.team == "buf"  # Won't match "BUF" in PostgreSQL

# This works in both:
func.upper(Player.team) == "buf".upper()  # Matches "BUF"
```

### Root Cause

- **SQLite**: Case-insensitive string comparisons by default
- **PostgreSQL**: Case-sensitive string comparisons by default
- **Problem**: Code written for SQLite fails in PostgreSQL

### Solution

Replace case-sensitive comparisons with case-insensitive ones using `func.upper()` or `func.lower()`:

```python
# Before (SQLite-compatible, PostgreSQL-incompatible)
Player.team == team_abbrev
Player.position == position
Team.abbreviation == abbrev

# After (PostgreSQL-compatible)
func.upper(Player.team) == team_abbrev.upper()
func.upper(Player.position) == position.upper()
func.upper(Team.abbreviation) == abbrev.upper()
```

### Files Fixed

- `app/routers/projections.py`: Player matching in projection imports
- `app/routers/players.py`: Player filtering and searches
- `app/routers/teams.py`: Team abbreviation lookups
- `app/services/draftkings_import.py`: Team lookups during import

### Alternative Solutions

1. **Use citext extension** (PostgreSQL-specific):
   ```sql
   ALTER TABLE players ALTER COLUMN team TYPE citext;
   ```

2. **Use ILIKE for pattern matching**:
   ```python
   Player.displayName.ilike(f"%{name}%")  # Case-insensitive LIKE
   ```

3. **Create functional indexes**:
   ```sql
   CREATE INDEX idx_players_team_upper ON players (UPPER(team));
   ```

### Prevention

1. **Always** use case-insensitive comparisons for user-facing data
2. **Test** with both uppercase and lowercase inputs
3. **Use** `func.upper()` or `func.lower()` for string comparisons
4. **Consider** using PostgreSQL's `citext` type for case-insensitive columns
5. **Document** case sensitivity requirements in API specifications
