#!/usr/bin/env python3
"""
Migration script to add actuals column to player_pool_entries table
Run this script to update existing databases with the new actuals field
"""

import sqlite3
from pathlib import Path


def migrate_database():
    """Add actuals column to player_pool_entries table"""

    db_path = Path(__file__).parent / "dfs_app.db"

    if not db_path.exists():
        print(f"Database not found at {db_path}")
        return False

    try:
        conn = sqlite3.connect(db_path)
        cursor = conn.cursor()

        # Check if the column already exists
        cursor.execute("PRAGMA table_info(player_pool_entries)")
        columns = [column[1] for column in cursor.fetchall()]

        if 'actuals' in columns:
            print("actuals column already exists in player_pool_entries table")
            return True

        # Add the new column
        print("Adding actuals column to player_pool_entries table...")
        cursor.execute(
            """
            ALTER TABLE player_pool_entries
            ADD COLUMN actuals FLOAT
            """
        )

        conn.commit()
        print("Successfully added actuals column to player_pool_entries table")

        # Verify
        cursor.execute("PRAGMA table_info(player_pool_entries)")
        columns = [column[1] for column in cursor.fetchall()]
        if 'actuals' in columns:
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
        try:
            conn.close()
        except Exception:
            pass


if __name__ == "__main__":
    print("Starting migration to add actuals column to player_pool_entries...")
    success = migrate_database()

    if success:
        print("\n\u2705 Migration completed successfully!")
    else:
        print("\n\u274c Migration failed!")
        exit(1)
