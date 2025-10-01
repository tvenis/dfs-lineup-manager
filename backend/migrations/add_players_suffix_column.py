#!/usr/bin/env python3
"""
Migration: Add suffix column to players table

Adds optional VARCHAR(20) column `suffix` to `players`.

Environment:
- Requires DATABASE_URL (or DATABASE_DATABASE_URL / LOCAL_DATABASE_URL / STORAGE_URL) to point to Neon Postgres

Idempotent: Uses IF NOT EXISTS on the column add.
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
            sql = dedent(
                """
                ALTER TABLE players
                ADD COLUMN IF NOT EXISTS suffix VARCHAR(20)
                """
            ).strip()
            print(f"Applying: {sql}")
            cur.execute(sql)
        conn.commit()
    print("\n✅ Migration complete.")
    return 0


if __name__ == "__main__":
    sys.exit(main())


