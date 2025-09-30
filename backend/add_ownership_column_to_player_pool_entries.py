#!/usr/bin/env python3
"""
Add ownership column to player_pool_entries table

This script adds an 'ownership' column to the player_pool_entries table
to store ownership percentage data from CSV imports.
"""

import os
import sys
import sqlite3
from datetime import datetime

def migrate_database():
    """Add ownership column to player_pool_entries table"""
    
    # Get database path from environment or use default
    db_path = os.getenv('DATABASE_URL', 'dfs_app.db')
    
    # Handle different database URL formats
    if db_path.startswith('postgresql://'):
        print("PostgreSQL database detected. Please run this migration manually:")
        print("ALTER TABLE player_pool_entries ADD COLUMN ownership DECIMAL(5,2);")
        return
    elif db_path.startswith('sqlite:///'):
        db_path = db_path.replace('sqlite:///', '')
    
    print(f"Adding ownership column to player_pool_entries table in {db_path}")
    
    try:
        # Connect to database
        conn = sqlite3.connect(db_path)
        cursor = conn.cursor()
        
        # Check if column already exists
        cursor.execute("PRAGMA table_info(player_pool_entries)")
        columns = [column[1] for column in cursor.fetchall()]
        
        if 'ownership' in columns:
            print("Column 'ownership' already exists in player_pool_entries table")
            return
        
        # Add ownership column
        cursor.execute("""
            ALTER TABLE player_pool_entries 
            ADD COLUMN ownership DECIMAL(5,2)
        """)
        
        # Commit changes
        conn.commit()
        print("Successfully added 'ownership' column to player_pool_entries table")
        
        # Verify the column was added
        cursor.execute("PRAGMA table_info(player_pool_entries)")
        columns = [column[1] for column in cursor.fetchall()]
        if 'ownership' in columns:
            print("Verification successful: ownership column exists")
        else:
            print("ERROR: ownership column was not added")
            
    except sqlite3.Error as e:
        print(f"SQLite error: {e}")
        sys.exit(1)
    except Exception as e:
        print(f"Error: {e}")
        sys.exit(1)
    finally:
        if conn:
            conn.close()

if __name__ == "__main__":
    migrate_database()
