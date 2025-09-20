#!/usr/bin/env python3
"""
PostgreSQL Migration Script for Lineups Table

This script fixes the lineups table to ensure it matches the SQLAlchemy model:
- ID column should be VARCHAR(50) for UUID strings, not auto-incrementing integer
- Ensures proper JSON column types for PostgreSQL
- Fixes any data type mismatches from SQLite migration

The issue: PostgreSQL table was created with INTEGER AUTOINCREMENT ID, but the 
application expects to insert UUID strings, causing conflicts.
"""

import os
import sys
from pathlib import Path
from sqlalchemy import create_engine, text, inspect
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
    
    return database_url

def check_table_structure(session):
    """Check current lineups table structure"""
    print("🔍 Checking current lineups table structure...")
    
    try:
        # Check if table exists
        result = session.execute(text("""
            SELECT EXISTS (
                SELECT FROM information_schema.tables 
                WHERE table_schema = 'public' 
                AND table_name = 'lineups'
            )
        """)).fetchone()
        
        if not result[0]:
            print("❌ Lineups table does not exist!")
            return False
        
        # Get table structure
        result = session.execute(text("""
            SELECT column_name, data_type, is_nullable, column_default
            FROM information_schema.columns
            WHERE table_schema = 'public' AND table_name = 'lineups'
            ORDER BY ordinal_position
        """)).fetchall()
        
        print("📋 Current lineups table structure:")
        for row in result:
            print(f"  - {row.column_name}: {row.data_type} (nullable: {row.is_nullable}, default: {row.column_default})")
        
        # Check ID column specifically
        id_column = next((row for row in result if row.column_name == 'id'), None)
        if id_column:
            if 'integer' in id_column.data_type.lower():
                print("⚠️  PROBLEM FOUND: ID column is INTEGER but should be VARCHAR(50) for UUIDs")
                return False
            elif 'varchar' in id_column.data_type.lower() or 'text' in id_column.data_type.lower():
                print("✅ ID column is correctly set to text/varchar type")
                return True
        
        return True
        
    except Exception as e:
        print(f"❌ Error checking table structure: {e}")
        return False

def backup_lineups_data(session):
    """Backup existing lineups data"""
    print("💾 Backing up existing lineups data...")
    
    try:
        result = session.execute(text("SELECT COUNT(*) FROM lineups")).fetchone()
        count = result[0] if result else 0
        
        if count == 0:
            print("ℹ️  No existing lineups data to backup")
            return []
        
        print(f"📊 Found {count} existing lineups to backup")
        
        # Get all lineups data
        result = session.execute(text("""
            SELECT id, week_id, name, tags, game_style, slots, status, salary_used, created_at, updated_at
            FROM lineups
        """)).fetchall()
        
        lineups_data = []
        for row in result:
            lineups_data.append({
                'id': str(row.id),  # Ensure ID is string
                'week_id': row.week_id,
                'name': row.name,
                'tags': row.tags,
                'game_style': row.game_style,
                'slots': row.slots,
                'status': row.status,
                'salary_used': row.salary_used,
                'created_at': row.created_at,
                'updated_at': row.updated_at
            })
        
        print(f"✅ Backed up {len(lineups_data)} lineups")
        return lineups_data
        
    except Exception as e:
        print(f"❌ Error backing up data: {e}")
        return []

def recreate_lineups_table(session):
    """Recreate lineups table with correct schema"""
    print("🔄 Recreating lineups table with correct schema...")
    
    try:
        # Drop existing table
        session.execute(text("DROP TABLE IF EXISTS lineups CASCADE"))
        
        # Create new table with correct schema matching SQLAlchemy model
        session.execute(text("""
            CREATE TABLE lineups (
                id VARCHAR(50) PRIMARY KEY,
                week_id INTEGER NOT NULL,
                name VARCHAR(200) NOT NULL,
                tags JSONB,
                game_style VARCHAR(50),
                slots JSONB NOT NULL,
                status VARCHAR(20) DEFAULT 'created',
                salary_used INTEGER DEFAULT 0,
                created_at TIMESTAMPTZ DEFAULT NOW(),
                updated_at TIMESTAMPTZ,
                CONSTRAINT fk_lineups_week_id FOREIGN KEY (week_id) REFERENCES weeks (id)
            )
        """))
        
        # Create indexes for better performance
        session.execute(text("CREATE INDEX idx_lineups_week_id ON lineups(week_id)"))
        session.execute(text("CREATE INDEX idx_lineups_status ON lineups(status)"))
        session.execute(text("CREATE INDEX idx_lineups_created_at ON lineups(created_at)"))
        
        session.commit()
        print("✅ Lineups table recreated with correct schema")
        return True
        
    except Exception as e:
        print(f"❌ Error recreating table: {e}")
        session.rollback()
        return False

def restore_lineups_data(session, lineups_data):
    """Restore backed up lineups data"""
    if not lineups_data:
        print("ℹ️  No data to restore")
        return True
    
    print(f"📥 Restoring {len(lineups_data)} lineups...")
    
    try:
        for lineup in lineups_data:
            # Ensure we have a valid UUID string for ID
            lineup_id = lineup['id']
            if not isinstance(lineup_id, str) or len(lineup_id) < 10:
                # Generate new UUID if ID is invalid
                import uuid
                lineup_id = str(uuid.uuid4())
                print(f"  ⚠️  Generated new UUID for lineup: {lineup['name']} -> {lineup_id}")
            
            session.execute(text("""
                INSERT INTO lineups (id, week_id, name, tags, game_style, slots, status, salary_used, created_at, updated_at)
                VALUES (:id, :week_id, :name, :tags, :game_style, :slots, :status, :salary_used, :created_at, :updated_at)
            """), {
                'id': lineup_id,
                'week_id': lineup['week_id'],
                'name': lineup['name'],
                'tags': lineup['tags'],
                'game_style': lineup['game_style'],
                'slots': lineup['slots'],
                'status': lineup['status'] or 'created',
                'salary_used': lineup['salary_used'] or 0,
                'created_at': lineup['created_at'],
                'updated_at': lineup['updated_at']
            })
        
        session.commit()
        print(f"✅ Successfully restored {len(lineups_data)} lineups")
        return True
        
    except Exception as e:
        print(f"❌ Error restoring data: {e}")
        session.rollback()
        return False

def verify_migration(session):
    """Verify the migration was successful"""
    print("🔍 Verifying migration...")
    
    try:
        # Check table structure
        result = session.execute(text("""
            SELECT column_name, data_type
            FROM information_schema.columns
            WHERE table_schema = 'public' AND table_name = 'lineups' AND column_name = 'id'
        """)).fetchone()
        
        if result and ('varchar' in result.data_type.lower() or 'text' in result.data_type.lower()):
            print("✅ ID column is correctly VARCHAR/TEXT type")
        else:
            print("❌ ID column type verification failed")
            return False
        
        # Check data count
        result = session.execute(text("SELECT COUNT(*) FROM lineups")).fetchone()
        count = result[0] if result else 0
        print(f"📊 Lineups table contains {count} records")
        
        # Test inserting a new lineup with UUID
        import uuid
        test_id = str(uuid.uuid4())
        
        # First, get a valid week_id
        week_result = session.execute(text("SELECT id FROM weeks LIMIT 1")).fetchone()
        if not week_result:
            print("⚠️  No weeks found, skipping insert test")
            return True
        
        week_id = week_result[0]
        
        session.execute(text("""
            INSERT INTO lineups (id, week_id, name, slots, status)
            VALUES (:id, :week_id, 'Test Lineup', '{"QB": null, "RB1": null}', 'created')
        """), {
            'id': test_id,
            'week_id': week_id
        })
        
        # Clean up test record
        session.execute(text("DELETE FROM lineups WHERE id = :id"), {'id': test_id})
        session.commit()
        
        print("✅ UUID insertion test passed")
        return True
        
    except Exception as e:
        print(f"❌ Verification failed: {e}")
        session.rollback()
        return False

def main():
    """Main migration function"""
    print("🚀 PostgreSQL Lineups Table Migration")
    print("=" * 50)
    
    try:
        # Get database connection
        database_url = get_database_url()
        engine = create_engine(database_url)
        Session = sessionmaker(bind=engine)
        session = Session()
        
        print(f"🔗 Connected to database")
        
        # Check if migration is needed
        if check_table_structure(session):
            print("✅ Lineups table structure is already correct, no migration needed")
            session.close()
            return
        
        print("\n🔄 Migration needed, starting process...")
        
        # Step 1: Backup existing data
        lineups_data = backup_lineups_data(session)
        
        # Step 2: Recreate table with correct schema
        if not recreate_lineups_table(session):
            print("❌ Failed to recreate table")
            session.close()
            return
        
        # Step 3: Restore data
        if not restore_lineups_data(session, lineups_data):
            print("❌ Failed to restore data")
            session.close()
            return
        
        # Step 4: Verify migration
        if not verify_migration(session):
            print("❌ Migration verification failed")
            session.close()
            return
        
        session.close()
        print("\n🎉 Migration completed successfully!")
        print("\n📝 Next steps:")
        print("1. Restart your backend server")
        print("2. Test creating a new lineup in the frontend")
        print("3. Verify existing lineups still work correctly")
        
    except Exception as e:
        print(f"\n❌ Migration failed: {str(e)}")
        sys.exit(1)

if __name__ == "__main__":
    main()
