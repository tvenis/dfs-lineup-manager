#!/usr/bin/env python3
"""
Database migration to increase draftGroup column length from VARCHAR(20) to VARCHAR(30)
in the recent_activity table to support longer market names like 'player_pass_completions'
"""

import os
import sys
from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker
from sqlalchemy.exc import SQLAlchemyError

def get_database_url():
    """Get database URL from environment variables in order of preference"""
    db_urls = [
        'DATABASE_URL',
        'DATABASE_DATABASE_URL', 
        'STORAGE_URL',
        'LOCAL_DATABASE_URL'
    ]
    
    for url_key in db_urls:
        url = os.getenv(url_key)
        if url:
            print(f"Using database URL from {url_key}")
            return url
    
    raise ValueError("No database URL found in environment variables")

def alter_draftgroup_column():
    """Alter the draftGroup column to increase length from VARCHAR(20) to VARCHAR(30)"""
    try:
        database_url = get_database_url()
        
        # Convert postgresql:// to postgresql+psycopg:// if needed
        if database_url.startswith("postgresql://"):
            database_url = database_url.replace("postgresql://", "postgresql+psycopg://", 1)
        
        engine = create_engine(database_url)
        Session = sessionmaker(bind=engine)
        
        with Session() as session:
            print("Connected to database successfully")
            
            # Check if the table exists
            result = session.execute(text("""
                SELECT EXISTS (
                    SELECT FROM information_schema.tables 
                    WHERE table_name = 'recent_activity'
                );
            """))
            table_exists = result.fetchone()[0]
            
            if not table_exists:
                print("ERROR: recent_activity table does not exist")
                return False
            
            # Check current column definition
            result = session.execute(text("""
                SELECT column_name, data_type, character_maximum_length
                FROM information_schema.columns 
                WHERE table_name = 'recent_activity' 
                AND column_name = 'draftGroup';
            """))
            column_info = result.fetchone()
            
            if not column_info:
                print("ERROR: draftGroup column does not exist in recent_activity table")
                return False
            
            column_name, data_type, max_length = column_info
            print(f"Current column definition: {column_name} {data_type}({max_length})")
            
            if max_length == 30:
                print("Column is already VARCHAR(30). No migration needed.")
                return True
            
            # Perform the migration
            print("Altering draftGroup column from VARCHAR(20) to VARCHAR(30)...")
            session.execute(text("""
                ALTER TABLE recent_activity 
                ALTER COLUMN "draftGroup" TYPE VARCHAR(30);
            """))
            
            # Verify the change
            result = session.execute(text("""
                SELECT character_maximum_length
                FROM information_schema.columns 
                WHERE table_name = 'recent_activity' 
                AND column_name = 'draftGroup';
            """))
            new_length = result.fetchone()[0]
            
            if new_length == 30:
                print(f"✅ Successfully altered draftGroup column to VARCHAR(30)")
                session.commit()
                return True
            else:
                print(f"❌ Migration failed. Column length is still {new_length}")
                session.rollback()
                return False
                
    except SQLAlchemyError as e:
        print(f"Database error: {e}")
        return False
    except ValueError as e:
        # Re-raise ValueError so it can be caught in main()
        raise e
    except Exception as e:
        print(f"Unexpected error: {e}")
        return False

def main():
    """Main function to run the migration"""
    print("Starting migration to alter recent_activity.draftGroup column length...")
    print("=" * 60)
    
    try:
        success = alter_draftgroup_column()
        
        print("=" * 60)
        if success:
            print("✅ Migration completed successfully!")
            print("The draftGroup column now supports up to 30 characters.")
            print("Pass Completions imports should now work correctly.")
        else:
            print("❌ Migration failed!")
            print("Please check the error messages above and try again.")
            sys.exit(1)
    except Exception as e:
        print("=" * 60)
        print("⚠️  Database Environment Not Configured")
        print("=" * 60)
        print()
        print("To run this migration, you need to set up your database environment.")
        print("This project uses Neon PostgreSQL exclusively.")
        print()
        print("Please set one of these environment variables:")
        print("  • DATABASE_URL (for production/Vercel)")
        print("  • DATABASE_DATABASE_URL (Neon-generated variable)")
        print("  • STORAGE_URL (from Neon integration)")
        print("  • LOCAL_DATABASE_URL (for local development)")
        print()
        print("Example:")
        print("  export LOCAL_DATABASE_URL='postgresql://user:pass@host:5432/dbname'")
        print()
        print("Then run this script again:")
        print("  python alter_recent_activity_draftgroup_length.py")
        print()
        print("=" * 60)
        print("📋 Alternative: Manual SQL Migration")
        print("=" * 60)
        print("If you prefer to run the migration manually, execute this SQL:")
        print()
        print("  ALTER TABLE recent_activity ALTER COLUMN \"draftGroup\" TYPE VARCHAR(30);")
        print()
        print(f"Error details: {e}")
        sys.exit(1)

if __name__ == "__main__":
    main()
