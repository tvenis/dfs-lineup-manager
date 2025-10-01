#!/usr/bin/env python3
"""
Data fix: Move name suffixes from players.lastName into players.suffix.

Targets rows where lastName ends with a suffix token: Jr, Sr, II, III, IV (period optional).
Example: "Brown Jr." -> lastName="Brown", suffix="Jr."

Environment:
- Uses DATABASE_URL (or DATABASE_DATABASE_URL / LOCAL_DATABASE_URL / STORAGE_URL) for Neon Postgres.

Idempotent for rows that already moved (will not duplicate suffix).
"""

import os
import sys
from typing import List, Tuple
import psycopg


SUFFIX_REGEX = r"(?i)\\s*[, ]*(Jr\\.?|Sr\\.?|II|III|IV)$"

UPDATE_SQL = f"""
WITH updated AS (
  UPDATE "players"
  SET
    "suffix" = CASE
      WHEN "suffix" IS NULL AND "lastName" ~* '{SUFFIX_REGEX}' THEN
        regexp_replace("lastName", '(?i).*[, ]*(Jr\\.?|Sr\\.?|II|III|IV)$', '\\1')
      ELSE "suffix"
    END,
    "lastName" = regexp_replace("lastName", '(?i){SUFFIX_REGEX}', '')
  WHERE "lastName" ~* '{SUFFIX_REGEX}'
  RETURNING "playerDkId", "firstName", "lastName" AS new_lastname, "suffix" AS new_suffix, "displayName", "position", "team"
)
SELECT * FROM updated;
"""


def main() -> int:
  database_url = (
    os.getenv("DATABASE_URL")
    or os.getenv("DATABASE_DATABASE_URL")
    or os.getenv("LOCAL_DATABASE_URL")
    or os.getenv("STORAGE_URL")
  )
  if not database_url:
    print("ERROR: DATABASE_URL not set.")
    return 1

  print("Connecting to Postgres...")
  with psycopg.connect(database_url) as conn:
    with conn.cursor() as cur:
      print("Applying data fix to move suffix from lastName -> suffix column...")
      cur.execute(UPDATE_SQL)
      rows: List[Tuple] = cur.fetchall()
      conn.commit()

  changed = len(rows)
  print(f"\n✅ Updated {changed} player(s).")
  if changed:
    # Show a small sample for verification
    preview = rows[:10]
    print("\nSample of updated rows (playerDkId, firstName, new_lastname, new_suffix, displayName, position, team):")
    for r in preview:
      print(r)

  return 0


if __name__ == "__main__":
  sys.exit(main())


