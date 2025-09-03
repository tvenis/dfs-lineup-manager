#!/usr/bin/env python3
"""
Migration script to add odds_api_gameid column to games table
Run this script to add the new odds_api_gameid field to the games table
"""

import sqlite3
import os
from pathlib import Path

def migrate_database():
    """Add odds_api_gameid column to games table"""
    
    # Get the database path
    db_path = Path(__file__).parent / "dfs_app.db"
    
    if not db_path.exists():
        print(f"Database not found at {db_path}")
        return False
    
    try:
        # Connect to the database
        conn = sqlite3.connect(db_path)
        cursor = conn.cursor()
        
        # Check if the games table exists
        cursor.execute("""
            SELECT name FROM sqlite_master 
            WHERE type='table' AND name='games'
        """)
        
        if not cursor.fetchone():
            print("games table does not exist. Please run add_games_table.py first.")
            return False
        
        # Check if the column already exists
        cursor.execute("PRAGMA table_info(games)")
        columns = [column[1] for column in cursor.fetchall()]
        
        if 'odds_api_gameid' in columns:
            print("odds_api_gameid column already exists in games table")
            return True
        
        # Add the new column
        print("Adding odds_api_gameid column to games table...")
        cursor.execute("""
            ALTER TABLE games 
            ADD COLUMN odds_api_gameid VARCHAR(50)
        """)
        
        # Commit the changes
        conn.commit()
        print("Successfully added odds_api_gameid column to games table")
        
        # Verify the column was added
        cursor.execute("PRAGMA table_info(games)")
        columns = [column[1] for column in cursor.fetchall()]
        if 'odds_api_gameid' in columns:
            print("✓ Column verification successful")
            
            # Show updated table structure
            print("\nUpdated games table structure:")
            cursor.execute("PRAGMA table_info(games)")
            columns = cursor.fetchall()
            for column in columns:
                print(f"  - {column[1]} ({column[2]})")
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
    print("Starting migration to add odds_api_gameid column...")
    success = migrate_database()
    
    if success:
        print("\n✅ Migration completed successfully!")
        print("The odds_api_gameid column is now available in the games table.")
    else:
        print("\n❌ Migration failed!")
        exit(1)
