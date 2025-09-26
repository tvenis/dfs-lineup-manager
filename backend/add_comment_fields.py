#!/usr/bin/env python3
"""
Add url, title, and source fields to comments table
"""

import os
import sys
from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker

# Add the backend directory to the path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from load_env import load_env_file
from app.database import get_database_url

def check_column_exists(session, table_name, column_name):
    """Check if a column exists in the table"""
    try:
        result = session.execute(text(f"""
            SELECT column_name 
            FROM information_schema.columns 
            WHERE table_name = '{table_name}' 
            AND column_name = '{column_name}'
        """))
        return result.fetchone() is not None
    except Exception as e:
        print(f"Error checking column {column_name}: {e}")
        return False

def add_comment_fields():
    """Add url, title, and source fields to comments table"""
    
    try:
        # Load environment variables
        load_env_file()
        
        # Get database connection
        database_url = get_database_url()
        engine = create_engine(database_url)
        SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
        
        with SessionLocal() as session:
            print("Checking comments table structure...")
            
            # Check if columns already exist
            url_exists = check_column_exists(session, 'comments', 'url')
            title_exists = check_column_exists(session, 'comments', 'title')
            source_exists = check_column_exists(session, 'comments', 'source')
            
            print(f"url column exists: {url_exists}")
            print(f"title column exists: {title_exists}")
            print(f"source column exists: {source_exists}")
            
            if url_exists and title_exists and source_exists:
                print("✅ All comment fields already exist. No migration needed.")
                return
            
            # Add missing columns
            if not url_exists:
                print("Adding url column...")
                session.execute(text("ALTER TABLE comments ADD COLUMN url TEXT"))
                print("✅ Added url column")
            
            if not title_exists:
                print("Adding title column...")
                session.execute(text("ALTER TABLE comments ADD COLUMN title TEXT"))
                print("✅ Added title column")
            
            if not source_exists:
                print("Adding source column...")
                session.execute(text("ALTER TABLE comments ADD COLUMN source VARCHAR(50)"))
                print("✅ Added source column")
            
            # Commit the changes
            session.commit()
            print("✅ Successfully added comment fields to database")
            
    except Exception as e:
        print(f"❌ Error adding comment fields: {e}")
        raise

if __name__ == "__main__":
    add_comment_fields()
