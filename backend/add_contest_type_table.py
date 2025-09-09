#!/usr/bin/env python3
"""
Migration script to add contest_type reference table to the database.
Run this script once to create the contest_type table if it does not exist.
"""

import sqlite3
from pathlib import Path


def migrate_database() -> bool:
    db_path = Path(__file__).parent / "dfs_app.db"
    if not db_path.exists():
        print(f"Database not found at {db_path}")
        return False

    conn = None
    try:
        conn = sqlite3.connect(db_path)
        cursor = conn.cursor()

        # Check if the contest_type table already exists
        cursor.execute(
            """
            SELECT name FROM sqlite_master
            WHERE type='table' AND name='contest_type'
            """
        )

        if cursor.fetchone():
            print("contest_type table already exists")
            return True

        # Create the contest_type table
        print("Creating contest_type table...")
        cursor.execute(
            """
            CREATE TABLE contest_type (
                contest_type_id INTEGER PRIMARY KEY AUTOINCREMENT,
                code TEXT NOT NULL UNIQUE
            )
            """
        )

        conn.commit()
        print("Successfully created contest_type table")

        # Verify the table was created
        cursor.execute(
            """
            SELECT name FROM sqlite_master
            WHERE type='table' AND name='contest_type'
            """
        )
        if cursor.fetchone():
            print("\n\u2713 Table verification successful")
            cursor.execute("PRAGMA table_info(contest_type)")
            columns = cursor.fetchall()
            print("\ncontest_type table structure:")
            for column in columns:
                print(f"  - {column[1]} ({column[2]})")
        else:
            print("\n\u2717 Table verification failed")
            return False

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
    print("Starting migration to add contest_type table...")
    success = migrate_database()
    if success:
        print("\n\u2705 Migration completed successfully!")
    else:
        print("\n\u274c Migration failed!")
        raise SystemExit(1)
