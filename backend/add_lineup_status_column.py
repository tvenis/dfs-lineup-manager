#!/usr/bin/env python3
"""
Migration script to add status column to lineups table.
Run this script to update existing databases with the new lineup status field.
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
        conn = sqlite3.connect(str(db_path))
        cursor = conn.cursor()

        # Check if the lineups table exists
        cursor.execute("""
            SELECT name FROM sqlite_master WHERE type='table' AND name='lineups'
        """)
        if cursor.fetchone() is None:
            print("lineups table does not exist; nothing to migrate")
            return True

        # Check if the status column already exists
        cursor.execute("PRAGMA table_info(lineups)")
        columns = [row[1] for row in cursor.fetchall()]
        if 'status' in columns:
            print("status column already exists in lineups table")
            return True

        # Add the new status column with default 'created'
        print("Adding status column to lineups table...")
        cursor.execute("""
            ALTER TABLE lineups
            ADD COLUMN status VARCHAR(20) DEFAULT 'created'
        """)

        conn.commit()
        print("Successfully added status column to lineups table")

        # Verify the column was added
        cursor.execute("PRAGMA table_info(lineups)")
        columns = [row[1] for row in cursor.fetchall()]
        if 'status' in columns:
            print("\u2713 Column verification successful")
        else:
            print("\u2717 Column verification failed")
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
    print("Starting migration to add status column to lineups...")
    success = migrate_database()
    if success:
        print("\n\u2705 Migration completed successfully!")
    else:
        print("\n\u274c Migration failed!")
        exit(1)


