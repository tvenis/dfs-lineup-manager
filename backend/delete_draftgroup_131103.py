#!/usr/bin/env python3
"""
Script to delete all records from player_pool_entries where draftGroup = 131103
This script will show the count before and after deletion for verification.
"""

import sqlite3
from pathlib import Path


def delete_draftgroup_records() -> bool:
    db_path = Path(__file__).parent / "dfs_app.db"

    if not db_path.exists():
        print(f"Database not found at {db_path}")
        return False

    try:
        conn = sqlite3.connect(db_path)
        cursor = conn.cursor()

        # First, check how many records will be affected
        cursor.execute("SELECT COUNT(*) FROM player_pool_entries WHERE draftGroup = ?", ('131103',))
        records_to_delete = cursor.fetchone()[0]
        
        print(f"Found {records_to_delete} records with draftGroup = '131103'")

        if records_to_delete == 0:
            print("No records found to delete.")
            return True

        # Confirm deletion
        confirm = input(f"Are you sure you want to delete {records_to_delete} records? (yes/no): ")
        if confirm.lower() != 'yes':
            print("Deletion cancelled.")
            return False

        # Delete the records
        cursor.execute("DELETE FROM player_pool_entries WHERE draftGroup = ?", ('131103',))
        deleted_count = cursor.rowcount

        # Verify the deletion
        cursor.execute("SELECT COUNT(*) FROM player_pool_entries WHERE draftGroup = ?", ('131103',))
        remaining_count = cursor.fetchone()[0]

        # Show total remaining records
        cursor.execute("SELECT COUNT(*) FROM player_pool_entries")
        total_remaining = cursor.fetchone()[0]

        conn.commit()

        print(f"✅ Successfully deleted {deleted_count} records")
        print(f"Remaining records with draftGroup = '131103': {remaining_count}")
        print(f"Total remaining records in player_pool_entries: {total_remaining}")

        return True

    except Exception as e:
        print(f"Error: {e}")
        return False

    finally:
        if 'conn' in locals():
            conn.close()


if __name__ == "__main__":
    success = delete_draftgroup_records()
    if success:
        print("✅ Operation completed successfully!")
    else:
        print("❌ Operation failed!")
