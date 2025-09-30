#!/usr/bin/env python3
"""
Add ownership column to player_pool_entries table in PostgreSQL (Neon)

This script adds an 'ownership' column to the player_pool_entries table
to store ownership percentage data from CSV imports.
"""

import os
import sys
import psycopg2
from urllib.parse import urlparse

def migrate_database():
    """Add ownership column to player_pool_entries table in PostgreSQL"""
    
    # Get database URL from environment
    db_url = os.getenv('LOCAL_DATABASE_URL')
    if not db_url:
        print("ERROR: LOCAL_DATABASE_URL environment variable not set")
        sys.exit(1)
    
    print(f"Adding ownership column to player_pool_entries table in PostgreSQL")
    
    try:
        # Parse the database URL
        parsed_url = urlparse(db_url)
        
        # Connect to PostgreSQL database
        conn = psycopg2.connect(
            host=parsed_url.hostname,
            port=parsed_url.port,
            database=parsed_url.path[1:],  # Remove leading slash
            user=parsed_url.username,
            password=parsed_url.password,
            sslmode='require'
        )
        
        cursor = conn.cursor()
        
        # Check if column already exists
        cursor.execute("""
            SELECT column_name 
            FROM information_schema.columns 
            WHERE table_name = 'player_pool_entries' 
            AND column_name = 'ownership'
        """)
        
        if cursor.fetchone():
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
        cursor.execute("""
            SELECT column_name, data_type, numeric_precision, numeric_scale
            FROM information_schema.columns 
            WHERE table_name = 'player_pool_entries' 
            AND column_name = 'ownership'
        """)
        
        result = cursor.fetchone()
        if result:
            print(f"Verification successful: ownership column exists with type {result[1]}({result[2]},{result[3]})")
        else:
            print("ERROR: ownership column was not added")
            
    except psycopg2.Error as e:
        print(f"PostgreSQL error: {e}")
        sys.exit(1)
    except Exception as e:
        print(f"Error: {e}")
        sys.exit(1)
    finally:
        if conn:
            conn.close()

if __name__ == "__main__":
    migrate_database()
