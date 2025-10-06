#!/usr/bin/env python3
"""
Migration script to add salary column to team_stats table
"""

import os
import sys
from sqlalchemy import create_engine, text
from sqlalchemy.exc import SQLAlchemyError

def get_database_url():
    """Get database URL from environment variables"""
    # Try different environment variable names
    for env_var in ['DATABASE_URL', 'DATABASE_DATABASE_URL', 'STORAGE_URL', 'LOCAL_DATABASE_URL']:
        url = os.getenv(env_var)
        if url:
            print(f"Using database URL from {env_var}")
            return url
    
    print("No database URL found in environment variables")
    return None

def add_salary_column():
    """Add salary column to team_stats table"""
    
    # Get database URL
    database_url = get_database_url()
    if not database_url:
        sys.exit(1)
    
    try:
        # Create engine
        engine = create_engine(database_url)
        
        # Test connection
        with engine.connect() as conn:
            result = conn.execute(text("SELECT 1"))
            print("✅ Database connection successful")
        
        # Add salary column
        print("\n🏗️  Adding salary column to team_stats table...")
        with engine.connect() as conn:
            # Start transaction
            trans = conn.begin()
            
            try:
                # Add salary column
                conn.execute(text("ALTER TABLE team_stats ADD COLUMN IF NOT EXISTS salary INTEGER DEFAULT 0;"))
                print("✅ Added salary column to team_stats table")
                
                # Commit transaction
                trans.commit()
                print("✅ Successfully added salary column")
                
            except SQLAlchemyError as e:
                trans.rollback()
                print(f"❌ Error adding column: {e}")
                sys.exit(1)
        
    except SQLAlchemyError as e:
        print(f"❌ Database error: {e}")
        sys.exit(1)
    except Exception as e:
        print(f"❌ Unexpected error: {e}")
        sys.exit(1)

if __name__ == "__main__":
    print("🚀 Starting team_stats salary column migration...")
    add_salary_column()
    print("✅ Migration completed successfully!")
