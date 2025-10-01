#!/usr/bin/env python3
"""
Migration: Add normalized name columns to players table

Adds three VARCHAR(100) columns for normalized names to improve matching:
- normalized_display_name
- normalized_first_name  
- normalized_last_name

Environment:
- Uses DATABASE_URL (or DATABASE_DATABASE_URL / LOCAL_DATABASE_URL / STORAGE_URL) for Neon Postgres.

Idempotent: Uses IF NOT EXISTS on each column add.
"""

import os
import sys
from textwrap import dedent
import psycopg


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
            columns = [
                "normalized_display_name",
                "normalized_first_name", 
                "normalized_last_name"
            ]
            
            for col_name in columns:
                sql = dedent(
                    f"""
                    ALTER TABLE "players"
                    ADD COLUMN IF NOT EXISTS "{col_name}" VARCHAR(100)
                    """
                ).strip()
                print(f"Applying: {sql}")
                cur.execute(sql)
        conn.commit()
    print("\n✅ Migration complete.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
