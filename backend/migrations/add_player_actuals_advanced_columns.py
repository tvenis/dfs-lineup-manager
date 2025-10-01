#!/usr/bin/env python3
"""
Migration: Add advanced NFLVerse columns to player_actuals

Adds 19 columns with NOT NULL DEFAULT 0 so existing rows are backfilled to 0.

Environment:
  - Requires DATABASE_URL to point to Neon Postgres

Idempotent: Uses IF NOT EXISTS on each column add.
"""

import os
import sys
from textwrap import dedent
import psycopg


ADVANCED_COLUMNS = [
    ("sacks_suffered", "INTEGER"),
    ("sack_yards_lost", "INTEGER"),
    ("sack_fumbles_lost", "INTEGER"),
    ("passing_air_yards", "DOUBLE PRECISION"),
    ("passing_yards_after_catch", "DOUBLE PRECISION"),
    ("passing_first_downs", "INTEGER"),
    ("passing_epa", "DOUBLE PRECISION"),
    ("passing_cpoe", "DOUBLE PRECISION"),
    ("pacr", "DOUBLE PRECISION"),
    ("rushing_first_downs", "INTEGER"),
    ("rushing_epa", "DOUBLE PRECISION"),
    ("receiving_air_yards", "DOUBLE PRECISION"),
    ("receiving_yards_after_catch", "DOUBLE PRECISION"),
    ("receiving_first_downs", "INTEGER"),
    ("receiving_epa", "DOUBLE PRECISION"),
    ("racr", "DOUBLE PRECISION"),
    ("target_share", "DOUBLE PRECISION"),
    ("air_yards_share", "DOUBLE PRECISION"),
    ("wopr", "DOUBLE PRECISION"),
]


def main() -> int:
    database_url = os.getenv("DATABASE_URL") or os.getenv("DATABASE_DATABASE_URL") or os.getenv("LOCAL_DATABASE_URL") or os.getenv("STORAGE_URL")
    if not database_url:
        print("ERROR: DATABASE_URL not set.")
        return 1

    print("Connecting to Postgres...")
    with psycopg.connect(database_url) as conn:
        conn.execute("SET statement_timeout TO '5min'")
        with conn.cursor() as cur:
            for col_name, col_type in ADVANCED_COLUMNS:
                sql = dedent(
                    f"""
                    ALTER TABLE player_actuals
                    ADD COLUMN IF NOT EXISTS {col_name} {col_type} NOT NULL DEFAULT 0
                    """
                ).strip()
                print(f"Applying: {sql}")
                cur.execute(sql)
        conn.commit()
    print("\n✅ Migration complete.")
    return 0


if __name__ == "__main__":
    sys.exit(main())


