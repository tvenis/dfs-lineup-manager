#!/usr/bin/env python3
"""
Migration script to add contest_roster_details table to the PostgreSQL database.
This table stores detailed contest roster information including opponent lineup composition and scores.
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


def check_table_exists(session):
    """Check if contest_roster_details table already exists"""
    try:
        result = session.execute(text("""
            SELECT EXISTS (
                SELECT FROM information_schema.tables 
                WHERE table_schema = 'public' 
                AND table_name = 'contest_roster_details'
            );
        """)).fetchone()
        return result[0] if result else False
    except Exception as e:
        print(f"Error checking table existence: {e}")
        return False


def create_contest_roster_details_table(session):
    """Create the contest_roster_details table with all required columns"""
    try:
        print("Creating contest_roster_details table...")
        
        # Create the table
        session.execute(text("""
            CREATE TABLE contest_roster_details (
                id SERIAL PRIMARY KEY,
                draftgroup INTEGER,
                contest_id BIGINT,
                enter_key BIGINT,
                username VARCHAR(255),
                contest_json JSONB,
                fantasy_points DOUBLE PRECISION,
                qb_name VARCHAR(255),
                qb_score DOUBLE PRECISION,
                rb1_name VARCHAR(255),
                rb1_score DOUBLE PRECISION,
                rb2_name VARCHAR(255),
                rb2_score DOUBLE PRECISION,
                wr1_name VARCHAR(255),
                wr1_score DOUBLE PRECISION,
                wr2_name VARCHAR(255),
                wr2_score DOUBLE PRECISION,
                wr3_name VARCHAR(255),
                wr3_score DOUBLE PRECISION,
                te_name VARCHAR(255),
                te_score DOUBLE PRECISION,
                flex_name VARCHAR(255),
                flex_score DOUBLE PRECISION,
                dst_name VARCHAR(255),
                dst_score DOUBLE PRECISION,
                created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
            );
        """))
        
        print("✅ contest_roster_details table created successfully")
        return True
        
    except Exception as e:
        print(f"❌ Error creating contest_roster_details table: {e}")
        session.rollback()
        return False


def create_indexes(session):
    """Create indexes for better query performance"""
    try:
        print("Creating indexes...")
        
        indexes = [
            # Primary lookup indexes
            "CREATE INDEX IF NOT EXISTS idx_contest_roster_details_contest_id ON contest_roster_details(contest_id);",
            "CREATE INDEX IF NOT EXISTS idx_contest_roster_details_draftgroup ON contest_roster_details(draftgroup);",
            "CREATE INDEX IF NOT EXISTS idx_contest_roster_details_enter_key ON contest_roster_details(enter_key);",
            "CREATE INDEX IF NOT EXISTS idx_contest_roster_details_username ON contest_roster_details(username);",
            
            # Composite indexes for common queries
            "CREATE INDEX IF NOT EXISTS idx_contest_roster_details_contest_draftgroup ON contest_roster_details(contest_id, draftgroup);",
            "CREATE INDEX IF NOT EXISTS idx_contest_roster_details_draftgroup_username ON contest_roster_details(draftgroup, username);",
            
            # Performance indexes
            "CREATE INDEX IF NOT EXISTS idx_contest_roster_details_fantasy_points ON contest_roster_details(fantasy_points DESC);",
            "CREATE INDEX IF NOT EXISTS idx_contest_roster_details_created_at ON contest_roster_details(created_at DESC);",
            
            # Player position indexes for roster analysis
            "CREATE INDEX IF NOT EXISTS idx_contest_roster_details_qb_name ON contest_roster_details(qb_name);",
            "CREATE INDEX IF NOT EXISTS idx_contest_roster_details_rb1_name ON contest_roster_details(rb1_name);",
            "CREATE INDEX IF NOT EXISTS idx_contest_roster_details_rb2_name ON contest_roster_details(rb2_name);",
            "CREATE INDEX IF NOT EXISTS idx_contest_roster_details_wr1_name ON contest_roster_details(wr1_name);",
            "CREATE INDEX IF NOT EXISTS idx_contest_roster_details_wr2_name ON contest_roster_details(wr2_name);",
            "CREATE INDEX IF NOT EXISTS idx_contest_roster_details_wr3_name ON contest_roster_details(wr3_name);",
            "CREATE INDEX IF NOT EXISTS idx_contest_roster_details_te_name ON contest_roster_details(te_name);",
            "CREATE INDEX IF NOT EXISTS idx_contest_roster_details_flex_name ON contest_roster_details(flex_name);",
            "CREATE INDEX IF NOT EXISTS idx_contest_roster_details_dst_name ON contest_roster_details(dst_name);",
            
            # JSONB index for contest_json queries
            "CREATE INDEX IF NOT EXISTS idx_contest_roster_details_contest_json ON contest_roster_details USING GIN (contest_json);"
        ]
        
        for index_sql in indexes:
            session.execute(text(index_sql))
        
        print("✅ All indexes created successfully")
        return True
        
    except Exception as e:
        print(f"❌ Error creating indexes: {e}")
        session.rollback()
        return False


def create_updated_at_trigger(session):
    """Create a trigger to automatically update the updated_at column"""
    try:
        print("Creating updated_at trigger...")
        
        # Create the trigger function
        session.execute(text("""
            CREATE OR REPLACE FUNCTION update_updated_at_column()
            RETURNS TRIGGER AS $$
            BEGIN
                NEW.updated_at = CURRENT_TIMESTAMP;
                RETURN NEW;
            END;
            $$ language 'plpgsql';
        """))
        
        # Create the trigger
        session.execute(text("""
            DROP TRIGGER IF EXISTS update_contest_roster_details_updated_at ON contest_roster_details;
            CREATE TRIGGER update_contest_roster_details_updated_at
                BEFORE UPDATE ON contest_roster_details
                FOR EACH ROW
                EXECUTE FUNCTION update_updated_at_column();
        """))
        
        print("✅ Updated_at trigger created successfully")
        return True
        
    except Exception as e:
        print(f"❌ Error creating updated_at trigger: {e}")
        session.rollback()
        return False


def verify_table_structure(session):
    """Verify the table was created correctly"""
    try:
        print("Verifying table structure...")
        
        # Get column information
        result = session.execute(text("""
            SELECT column_name, data_type, is_nullable, column_default
            FROM information_schema.columns 
            WHERE table_name = 'contest_roster_details' 
            AND table_schema = 'public'
            ORDER BY ordinal_position;
        """)).fetchall()
        
        if not result:
            print("❌ Table verification failed - no columns found")
            return False
        
        print("\n📋 contest_roster_details table structure:")
        print("-" * 60)
        for row in result:
            column_name, data_type, is_nullable, default = row
            nullable = "NULL" if is_nullable == "YES" else "NOT NULL"
            default_str = f", DEFAULT: {default}" if default else ""
            print(f"  {column_name:<20} {data_type:<20} {nullable}{default_str}")
        
        # Check indexes
        index_result = session.execute(text("""
            SELECT indexname, indexdef
            FROM pg_indexes 
            WHERE tablename = 'contest_roster_details'
            ORDER BY indexname;
        """)).fetchall()
        
        if index_result:
            print(f"\n📊 Created {len(index_result)} indexes:")
            for index_name, index_def in index_result:
                print(f"  - {index_name}")
        
        print("\n✅ Table structure verification completed")
        return True
        
    except Exception as e:
        print(f"❌ Error verifying table structure: {e}")
        return False


def migrate_database():
    """Main migration function"""
    print("🚀 PostgreSQL Contest Roster Details Table Migration")
    print("=" * 50)
    
    try:
        # Get database connection
        database_url = get_database_url()
        engine = create_engine(database_url, pool_pre_ping=True)
        Session = sessionmaker(bind=engine)
        session = Session()
        
        print(f"🔗 Connected to database")
        
        # Check if table already exists
        if check_table_exists(session):
            print("✅ contest_roster_details table already exists, skipping migration")
            session.close()
            return True
        
        print("\n🔄 Starting migration...")
        
        # Step 1: Create table
        if not create_contest_roster_details_table(session):
            print("❌ Failed to create table")
            session.close()
            return False
        
        # Step 2: Create indexes
        if not create_indexes(session):
            print("❌ Failed to create indexes")
            session.close()
            return False
        
        # Step 3: Create updated_at trigger
        if not create_updated_at_trigger(session):
            print("❌ Failed to create updated_at trigger")
            session.close()
            return False
        
        # Step 4: Verify table structure
        if not verify_table_structure(session):
            print("❌ Table structure verification failed")
            session.close()
            return False
        
        # Commit all changes
        session.commit()
        session.close()
        
        print("\n🎉 Migration completed successfully!")
        print("\n📝 Table Features:")
        print("  - Auto-incrementing ID (SERIAL)")
        print("  - JSONB column for flexible contest roster data storage")
        print("  - Optimized indexes for common query patterns")
        print("  - Automatic updated_at timestamp management")
        print("  - PostgreSQL best practices applied")
        
        return True
        
    except Exception as e:
        print(f"\n❌ Migration failed: {str(e)}")
        return False


if __name__ == "__main__":
    success = migrate_database()
    if success:
        print("\n✅ Contest roster details table migration completed successfully!")
        sys.exit(0)
    else:
        print("\n❌ Migration failed!")
        sys.exit(1)
