#!/usr/bin/env python3
"""
Simple script to recreate the database with new DraftKings models
"""

import os
from app.database import engine
from app.models import Base

def recreate_database():
    """Recreate the database with new schema"""
    print("Recreating database with new DraftKings models...")
    
    # Remove existing database file
    if os.path.exists('dfs_app.db'):
        os.remove('dfs_app.db')
        print("Removed existing database file")
    
    # Create all tables from models
    Base.metadata.create_all(bind=engine)
    print("Created new database with updated schema")
    
    # Verify tables were created
    from sqlalchemy import inspect
    inspector = inspect(engine)
    tables = inspector.get_table_names()
    print(f"Tables created: {tables}")

if __name__ == "__main__":
    recreate_database()
