#!/usr/bin/env python3
"""
Seed the sport reference table with initial rows.
Idempotent: upserts by unique code.
"""

import sqlite3
from pathlib import Path


SEED_SPORTS = [
    ("NFL", "National Football League"),
    ("NBA", "National Basketball Association"),
    ("MLB", "Major League Baseball"),
]


def seed_sport_table() -> bool:
    db_path = Path(__file__).parent / "dfs_app.db"
    if not db_path.exists():
        print(f"Database not found at {db_path}")
        return False

    conn = None
    try:
        conn = sqlite3.connect(db_path)
        cursor = conn.cursor()

        # Ensure table exists
        cursor.execute(
            """
            SELECT name FROM sqlite_master
            WHERE type='table' AND name='sport'
            """
        )
        if not cursor.fetchone():
            print("sport table does not exist; run migration first")
            return False

        print("Seeding sport table (upsert by code)...")
        before_changes = conn.total_changes

        for code, name in SEED_SPORTS:
            cursor.execute(
                """
                INSERT INTO sport (code, name)
                VALUES (?, ?)
                ON CONFLICT(code) DO UPDATE SET
                  name=excluded.name
                """,
                (code, name),
            )

        conn.commit()
        after_changes = conn.total_changes
        delta = after_changes - before_changes
        print(f"Applied {delta} changes (inserts/updates)")

        # Show current rows
        cursor.execute("SELECT sport_id, code, name FROM sport ORDER BY code")
        rows = cursor.fetchall()
        print("Current sport rows:")
        for row in rows:
            print(f"  - id={row[0]} code={row[1]} name={row[2]}")

        return True
    except sqlite3.Error as e:
        print(f"SQLite error: {e}")
        return False
    except Exception as e:
        print(f"Error: {e}")
        return False
    finally:
        if conn:
            conn.close()


if __name__ == "__main__":
    ok = seed_sport_table()
    if ok:
        print("\n\u2705 Seed completed successfully")
    else:
        print("\n\u274c Seed failed")
        raise SystemExit(1)


