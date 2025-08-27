#!/usr/bin/env python3
"""
Migration script to add projectedPoints column to PlayerPoolEntry table
Run this script to update existing databases with the new projected points field
"""

import sqlite3
import os
from pathlib import Path

def migrate_database():
    """Add projectedPoints column to PlayerPoolEntry table"""
    
    # Get the database path
    db_path = Path(__file__).parent / "dfs_app.db"
    
    if not db_path.exists():
        print(f"Database not found at {db_path}")
        return False
    
    try:
        # Connect to the database
        conn = sqlite3.connect(db_path)
        cursor = conn.cursor()
        
        # Check if the column already exists
        cursor.execute("PRAGMA table_info(player_pool_entries)")
        columns = [column[1] for column in cursor.fetchall()]
        
        if 'projectedPoints' in columns:
            print("projectedPoints column already exists in player_pool_entries table")
            return True
        
        # Add the new column
        print("Adding projectedPoints column to player_pool_entries table...")
        cursor.execute("""
            ALTER TABLE player_pool_entries 
            ADD COLUMN projectedPoints FLOAT
        """)
        
        # Commit the changes
        conn.commit()
        print("Successfully added projectedPoints column to player_pool_entries table")
        
        # Verify the column was added
        cursor.execute("PRAGMA table_info(player_pool_entries)")
        columns = [column[1] for column in cursor.fetchall()]
        if 'projectedPoints' in columns:
            print("✓ Column verification successful")
        else:
            print("✗ Column verification failed")
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
    print("Starting migration to add projectedPoints column...")
    success = migrate_database()
    
    if success:
        print("\n✅ Migration completed successfully!")
    else:
        print("\n❌ Migration failed!")
        exit(1)
