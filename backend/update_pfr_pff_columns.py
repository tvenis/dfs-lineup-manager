#!/usr/bin/env python3
"""
Migration script to update pfr and pff columns from Integer to String(50)
"""

import os
import sys
from sqlalchemy import create_engine, text
from dotenv import load_dotenv

def main():
    # Load environment variables
    load_dotenv()
    
    # Get database URL
    database_url = os.getenv('LOCAL_DATABASE_URL')
    if not database_url:
        print("❌ LOCAL_DATABASE_URL not found in environment variables")
        sys.exit(1)
    
    print("🚀 Starting pfr and pff columns type migration...")
    print(f"📁 Found .env file, loading environment variables...")
    print(f"✅ Using database URL from LOCAL_DATABASE_URL")
    
    try:
        # Create database engine
        engine = create_engine(database_url)
        
        with engine.connect() as conn:
            # Start a transaction
            trans = conn.begin()
            
            try:
                # Update pfr column
                print("🔄 Converting pfr column from INTEGER to VARCHAR(50)...")
                conn.execute(text("ALTER TABLE games ALTER COLUMN pfr TYPE VARCHAR(50) USING pfr::text"))
                print("✅ Updated pfr column to VARCHAR(50)")
                
                # Update pff column
                print("🔄 Converting pff column from INTEGER to VARCHAR(50)...")
                conn.execute(text("ALTER TABLE games ALTER COLUMN pff TYPE VARCHAR(50) USING pff::text"))
                print("✅ Updated pff column to VARCHAR(50)")
                
                # Commit the transaction
                trans.commit()
                print("✅ Migration completed successfully!")
                
            except Exception as e:
                trans.rollback()
                print(f"❌ Migration failed: {e}")
                raise
                
    except Exception as e:
        print(f"❌ Database connection failed: {e}")
        sys.exit(1)

if __name__ == "__main__":
    main()
