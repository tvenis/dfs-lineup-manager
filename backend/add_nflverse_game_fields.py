#!/usr/bin/env python3
"""
Migration script to add NFLVerse game results fields to the games table.

This script adds the following columns to the existing games table:
- nflverse_game_id (Integer)
- away_score (Integer) 
- home_score (Integer)
- result (Float)
- total (Float)
- overtime (Boolean)
- weekday (String(10))
- gsis (Integer)
- pfr (Integer)
- pff (Integer)
- espn (Integer)
- away_rest (Integer)
- home_rest (Integer)
- div_game (Boolean)
- roof (String(20))
- surface (String(20))
- temp (Integer)
- wind (Integer)
- stadium_id (String(50))
- stadium (String(100))

Usage:
    python add_nflverse_game_fields.py

This script is safe to run multiple times - it checks if columns already exist.
"""

import os
import sys
from sqlalchemy import create_engine, text, inspect
from sqlalchemy.exc import SQLAlchemyError

# Add the backend directory to the Python path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from load_env import load_env_file

def get_database_url():
    """Get database URL from environment variables"""
    load_env_file()
    
    # Try different environment variable names
    for var_name in ['DATABASE_URL', 'DATABASE_DATABASE_URL', 'STORAGE_URL', 'LOCAL_DATABASE_URL']:
        db_url = os.getenv(var_name)
        if db_url:
            print(f"✅ Using database URL from {var_name}")
            return db_url
    
    raise ValueError("No database URL found in environment variables")

def column_exists(engine, table_name, column_name):
    """Check if a column exists in a table"""
    inspector = inspect(engine)
    columns = [col['name'] for col in inspector.get_columns(table_name)]
    return column_name in columns

def add_column_if_not_exists(engine, table_name, column_name, column_definition):
    """Add a column to a table if it doesn't already exist"""
    if column_exists(engine, table_name, column_name):
        print(f"✅ Column {column_name} already exists in {table_name}")
        return False
    else:
        try:
            with engine.connect() as conn:
                alter_sql = f"ALTER TABLE {table_name} ADD COLUMN {column_name} {column_definition}"
                conn.execute(text(alter_sql))
                conn.commit()
                print(f"✅ Added column {column_name} to {table_name}")
                return True
        except SQLAlchemyError as e:
            print(f"❌ Error adding column {column_name} to {table_name}: {e}")
            return False

def main():
    """Main migration function"""
    print("🚀 Starting NFLVerse game fields migration...")
    
    try:
        # Get database URL
        db_url = get_database_url()
        
        # Create engine
        engine = create_engine(db_url)
        
        # Test connection
        with engine.connect() as conn:
            conn.execute(text("SELECT 1"))
        print("✅ Database connection successful")
        
        # Define the columns to add
        columns_to_add = [
            ("nflverse_game_id", "INTEGER"),
            ("away_score", "INTEGER"),
            ("home_score", "INTEGER"),
            ("result", "FLOAT"),
            ("total", "FLOAT"),
            ("overtime", "BOOLEAN"),
            ("weekday", "VARCHAR(10)"),
            ("gsis", "INTEGER"),
            ("pfr", "INTEGER"),
            ("pff", "INTEGER"),
            ("espn", "INTEGER"),
            ("away_rest", "INTEGER"),
            ("home_rest", "INTEGER"),
            ("div_game", "BOOLEAN"),
            ("roof", "VARCHAR(20)"),
            ("surface", "VARCHAR(20)"),
            ("temp", "INTEGER"),
            ("wind", "INTEGER"),
            ("stadium_id", "VARCHAR(50)"),
            ("stadium", "VARCHAR(100)")
        ]
        
        # Check if games table exists
        inspector = inspect(engine)
        if 'games' not in inspector.get_table_names():
            print("❌ Games table does not exist. Please run the main database setup first.")
            return False
        
        print(f"✅ Games table exists")
        
        # Add columns
        added_count = 0
        for column_name, column_definition in columns_to_add:
            if add_column_if_not_exists(engine, 'games', column_name, column_definition):
                added_count += 1
        
        print(f"\n📊 Migration Summary:")
        print(f"   - Total columns processed: {len(columns_to_add)}")
        print(f"   - New columns added: {added_count}")
        print(f"   - Columns already existed: {len(columns_to_add) - added_count}")
        
        if added_count > 0:
            print(f"\n✅ Migration completed successfully! Added {added_count} new columns.")
        else:
            print(f"\n✅ Migration completed - all columns already exist.")
        
        return True
        
    except Exception as e:
        print(f"❌ Migration failed: {e}")
        return False

if __name__ == "__main__":
    success = main()
    sys.exit(0 if success else 1)
