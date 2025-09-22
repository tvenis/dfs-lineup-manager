#!/usr/bin/env python3
"""
Migration script to add RB1 and RB2 columns to the contest_roster_details table.
"""

import os
import sys
from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker


def get_database_url():
    """Get database URL from environment variables"""
    database_url = (
        os.getenv('DATABASE_URL') or 
        os.getenv('DATABASE_DATABASE_URL') or
        os.getenv('STORAGE_URL') or 
        os.getenv('LOCAL_DATABASE_URL')
    )
    
    if not database_url:
        raise ValueError(
            "Database connection string not found. Please set one of these environment variables:\n"
            "- DATABASE_URL (for production/Vercel)\n"
            "- DATABASE_DATABASE_URL (alternative)\n"
            "- STORAGE_URL (from Neon integration)\n"
            "- LOCAL_DATABASE_URL (for local development)\n"
            "Example: LOCAL_DATABASE_URL='postgresql://user:pass@host/db'"
        )
    
    # Convert postgresql:// to postgresql+psycopg:// for psycopg3 driver
    if database_url.startswith("postgresql://"):
        database_url = database_url.replace("postgresql://", "postgresql+psycopg://", 1)
    
    return database_url


def check_columns_exist(session):
    """Check if RB columns already exist"""
    try:
        result = session.execute(text("""
            SELECT column_name 
            FROM information_schema.columns 
            WHERE table_name = 'contest_roster_details' 
            AND table_schema = 'public'
            AND column_name IN ('rb1_name', 'rb1_score', 'rb2_name', 'rb2_score');
        """)).fetchall()
        
        existing_columns = [row[0] for row in result]
        return existing_columns
        
    except Exception as e:
        print(f"Error checking columns: {e}")
        return []


def add_rb_columns(session):
    """Add RB1 and RB2 columns to the table"""
    try:
        print("Adding RB1 and RB2 columns...")
        
        # Add RB1 columns
        session.execute(text("""
            ALTER TABLE contest_roster_details 
            ADD COLUMN IF NOT EXISTS rb1_name VARCHAR(255);
        """))
        
        session.execute(text("""
            ALTER TABLE contest_roster_details 
            ADD COLUMN IF NOT EXISTS rb1_score DOUBLE PRECISION;
        """))
        
        # Add RB2 columns
        session.execute(text("""
            ALTER TABLE contest_roster_details 
            ADD COLUMN IF NOT EXISTS rb2_name VARCHAR(255);
        """))
        
        session.execute(text("""
            ALTER TABLE contest_roster_details 
            ADD COLUMN IF NOT EXISTS rb2_score DOUBLE PRECISION;
        """))
        
        print("✅ RB columns added successfully")
        return True
        
    except Exception as e:
        print(f"❌ Error adding RB columns: {e}")
        session.rollback()
        return False


def add_rb_indexes(session):
    """Add indexes for the new RB columns"""
    try:
        print("Adding indexes for RB columns...")
        
        indexes = [
            "CREATE INDEX IF NOT EXISTS idx_contest_roster_details_rb1_name ON contest_roster_details(rb1_name);",
            "CREATE INDEX IF NOT EXISTS idx_contest_roster_details_rb2_name ON contest_roster_details(rb2_name);"
        ]
        
        for index_sql in indexes:
            session.execute(text(index_sql))
        
        print("✅ RB indexes created successfully")
        return True
        
    except Exception as e:
        print(f"❌ Error creating RB indexes: {e}")
        session.rollback()
        return False


def verify_table_structure(session):
    """Verify the table structure includes RB columns"""
    try:
        print("Verifying table structure...")
        
        # Get column information
        result = session.execute(text("""
            SELECT column_name, data_type, is_nullable
            FROM information_schema.columns 
            WHERE table_name = 'contest_roster_details' 
            AND table_schema = 'public'
            AND column_name LIKE '%rb%'
            ORDER BY ordinal_position;
        """)).fetchall()
        
        if result:
            print("\n📋 RB columns in contest_roster_details table:")
            print("-" * 40)
            for column_name, data_type, is_nullable in result:
                nullable = "NULL" if is_nullable == "YES" else "NOT NULL"
                print(f"  {column_name:<15} {data_type:<20} {nullable}")
        else:
            print("❌ No RB columns found in table")
            return False
        
        return True
        
    except Exception as e:
        print(f"❌ Error verifying table structure: {e}")
        return False


def migrate_database():
    """Main migration function"""
    print("🚀 PostgreSQL Contest Roster Details - Add RB Columns Migration")
    print("=" * 60)
    
    try:
        # Get database connection
        database_url = get_database_url()
        engine = create_engine(database_url, pool_pre_ping=True)
        Session = sessionmaker(bind=engine)
        session = Session()
        
        print(f"🔗 Connected to database")
        
        # Check if RB columns already exist
        existing_columns = check_columns_exist(session)
        if len(existing_columns) >= 4:
            print(f"✅ RB columns already exist: {existing_columns}")
            session.close()
            return True
        
        print(f"📋 Found {len(existing_columns)} existing RB columns: {existing_columns}")
        
        print("\n🔄 Starting migration...")
        
        # Step 1: Add RB columns
        if not add_rb_columns(session):
            print("❌ Failed to add RB columns")
            session.close()
            return False
        
        # Step 2: Add RB indexes
        if not add_rb_indexes(session):
            print("❌ Failed to add RB indexes")
            session.close()
            return False
        
        # Step 3: Verify table structure
        if not verify_table_structure(session):
            print("❌ Table structure verification failed")
            session.close()
            return False
        
        # Commit all changes
        session.commit()
        session.close()
        
        print("\n🎉 Migration completed successfully!")
        print("\n📝 Added Features:")
        print("  - rb1_name and rb1_score columns")
        print("  - rb2_name and rb2_score columns")
        print("  - Indexes for RB player name lookups")
        print("  - Support for 2 RB lineup structure")
        
        return True
        
    except Exception as e:
        print(f"\n❌ Migration failed: {str(e)}")
        return False


if __name__ == "__main__":
    success = migrate_database()
    if success:
        print("\n✅ RB columns migration completed successfully!")
        sys.exit(0)
    else:
        print("\n❌ Migration failed!")
        sys.exit(1)
