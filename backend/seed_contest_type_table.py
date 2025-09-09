#!/usr/bin/env python3
"""
Seed the contest_type reference table with initial rows.
Idempotent: upserts by unique code.
"""

import sqlite3
from pathlib import Path


SEED_TYPES = [
    ("h2h",),
    ("50/50",),
    ("double-up",),
    ("tournament",),
    ("Classic",),
]


def seed_contest_type_table() -> bool:
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
            WHERE type='table' AND name='contest_type'
            """
        )
        if not cursor.fetchone():
            print("contest_type table does not exist; run migration first")
            return False

        print("Seeding contest_type table (upsert by code)...")
        before_changes = conn.total_changes

        for (code,) in SEED_TYPES:
            cursor.execute(
                """
                INSERT INTO contest_type (code)
                VALUES (?)
                ON CONFLICT(code) DO NOTHING
                """,
                (code,),
            )

        conn.commit()
        after_changes = conn.total_changes
        delta = after_changes - before_changes
        print(f"Applied {delta} changes (inserts)")

        # Show current rows
        cursor.execute("SELECT contest_type_id, code FROM contest_type ORDER BY code")
        rows = cursor.fetchall()
        print("Current contest_type rows:")
        for row in rows:
            print(f"  - id={row[0]} code={row[1]}")

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
    ok = seed_contest_type_table()
    if ok:
        print("\n\u2705 Seed completed successfully")
    else:
        print("\n\u274c Seed failed")
        raise SystemExit(1)


