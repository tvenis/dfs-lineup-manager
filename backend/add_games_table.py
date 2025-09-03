#!/usr/bin/env python3
"""
Migration script to add games table to the database
Run this script to create the games table with all required columns
"""

import sqlite3
import os
from pathlib import Path

def migrate_database():
    """Add games table to the database"""
    
    # Get the database path
    db_path = Path(__file__).parent / "dfs_app.db"
    
    if not db_path.exists():
        print(f"Database not found at {db_path}")
        return False
    
    try:
        # Connect to the database
        conn = sqlite3.connect(db_path)
        cursor = conn.cursor()
        
        # Check if the games table already exists
        cursor.execute("""
            SELECT name FROM sqlite_master 
            WHERE type='table' AND name='games'
        """)
        
        if cursor.fetchone():
            print("games table already exists")
            return True
        
        # Create the games table
        print("Creating games table...")
        cursor.execute("""
            CREATE TABLE games (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                week_id INTEGER NOT NULL,
                team_id VARCHAR(10) NOT NULL,
                homeoraway VARCHAR(1) NOT NULL,
                proj_spread FLOAT,
                proj_total FLOAT,
                implied_team_total FLOAT,
                money_line FLOAT,
                actual_spread FLOAT,
                actual_total FLOAT,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                updated_at DATETIME,
                FOREIGN KEY (week_id) REFERENCES weeks (id),
                FOREIGN KEY (team_id) REFERENCES teams (id)
            )
        """)
        
        # Create unique index on week_id and team_id
        print("Creating unique index on week_id and team_id...")
        cursor.execute("""
            CREATE UNIQUE INDEX idx_week_team 
            ON games (week_id, team_id)
        """)
        
        # Commit the changes
        conn.commit()
        print("Successfully created games table with unique index")
        
        # Verify the table was created
        cursor.execute("""
            SELECT name FROM sqlite_master 
            WHERE type='table' AND name='games'
        """)
        
        if cursor.fetchone():
            print("✓ Table verification successful")
            
            # Show table structure
            cursor.execute("PRAGMA table_info(games)")
            columns = cursor.fetchall()
            print("\nGames table structure:")
            for column in columns:
                print(f"  - {column[1]} ({column[2]})")
        else:
            print("✗ Table verification failed")
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
    print("Starting migration to add games table...")
    success = migrate_database()
    
    if success:
        print("\n✅ Migration completed successfully!")
        print("The games table is now ready for API population.")
    else:
        print("\n❌ Migration failed!")
        exit(1)
