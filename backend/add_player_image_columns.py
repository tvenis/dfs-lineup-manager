#!/usr/bin/env python3
"""
Migration script to add playerImage50 and playerImage160 columns to Player table
Run this script to update existing databases with the new image URL fields
"""

import sqlite3
import os
from pathlib import Path

def migrate_database():
    """Add playerImage50 and playerImage160 columns to Player table"""
    
    # Get the database path
    db_path = Path(__file__).parent / "dfs_app.db"
    
    if not db_path.exists():
        print(f"Database not found at {db_path}")
        return False
    
    try:
        # Connect to the database
        conn = sqlite3.connect(db_path)
        cursor = conn.cursor()
        
        # Check if the columns already exist
        cursor.execute("PRAGMA table_info(players)")
        columns = [column[1] for column in cursor.fetchall()]
        
        columns_to_add = []
        if 'playerImage50' not in columns:
            columns_to_add.append('playerImage50')
        if 'playerImage160' not in columns:
            columns_to_add.append('playerImage160')
        
        if not columns_to_add:
            print("playerImage50 and playerImage160 columns already exist in players table")
            return True
        
        # Add the new columns
        for column_name in columns_to_add:
            print(f"Adding {column_name} column to players table...")
            cursor.execute(f"""
                ALTER TABLE players 
                ADD COLUMN {column_name} VARCHAR(500)
            """)
        
        # Commit the changes
        conn.commit()
        print(f"Successfully added {len(columns_to_add)} columns to players table")
        
        # Verify the columns were added
        cursor.execute("PRAGMA table_info(players)")
        columns = [column[1] for column in cursor.fetchall()]
        
        if 'playerImage50' in columns and 'playerImage160' in columns:
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
    print("Starting migration to add player image columns...")
    success = migrate_database()
    
    if success:
        print("\n✅ Migration completed successfully!")
    else:
        print("\n❌ Migration failed!")
        exit(1)
