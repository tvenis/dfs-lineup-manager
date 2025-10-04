#!/usr/bin/env python3
"""
Script to safely drop the old team_defense_stats table.
This should only be run after confirming the team_stats table is working correctly.
"""

import os
import sys
from sqlalchemy import create_engine, text, inspect
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
    print("Please set one of: DATABASE_URL, DATABASE_DATABASE_URL, STORAGE_URL, or LOCAL_DATABASE_URL")
    return None

def check_table_exists(engine, table_name):
    """Check if a table exists in the database"""
    inspector = inspect(engine)
    return table_name in inspector.get_table_names()

def get_table_info(engine, table_name):
    """Get information about a table"""
    inspector = inspect(engine)
    if table_name in inspector.get_table_names():
        columns = inspector.get_columns(table_name)
        indexes = inspector.get_indexes(table_name)
        return {
            'exists': True,
            'columns': len(columns),
            'indexes': len(indexes),
            'column_names': [col['name'] for col in columns]
        }
    return {'exists': False}

def main():
    print("🔍 Checking database connection...")
    
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
        
        # Check if old table exists
        print("\n🔍 Checking for old team_defense_stats table...")
        old_table_info = get_table_info(engine, 'team_defense_stats')
        
        if not old_table_info['exists']:
            print("✅ team_defense_stats table does not exist - nothing to drop")
            return
        
        print(f"⚠️  Found team_defense_stats table with {old_table_info['columns']} columns and {old_table_info['indexes']} indexes")
        
        # Check if new table exists and has data
        print("\n🔍 Checking for new team_stats table...")
        new_table_info = get_table_info(engine, 'team_stats')
        
        if not new_table_info['exists']:
            print("❌ team_stats table does not exist! Cannot safely drop old table.")
            print("Please ensure the migration to team_stats is complete first.")
            sys.exit(1)
        
        print(f"✅ Found team_stats table with {new_table_info['columns']} columns and {new_table_info['indexes']} indexes")
        
        # Check if new table has data
        with engine.connect() as conn:
            result = conn.execute(text("SELECT COUNT(*) FROM team_stats"))
            count = result.scalar()
            print(f"📊 team_stats table has {count} records")
        
        if count == 0:
            print("⚠️  team_stats table is empty. Are you sure you want to drop the old table?")
            response = input("Continue anyway? (y/N): ")
            if response.lower() != 'y':
                print("❌ Operation cancelled")
                sys.exit(1)
        
        # Confirm with user
        print(f"\n⚠️  WARNING: This will permanently delete the team_defense_stats table!")
        print(f"   - {old_table_info['columns']} columns will be lost")
        print(f"   - {old_table_info['indexes']} indexes will be dropped")
        print(f"   - All data in the table will be permanently deleted")
        
        response = input("\nAre you sure you want to proceed? (yes/NO): ")
        if response.lower() != 'yes':
            print("❌ Operation cancelled")
            sys.exit(1)
        
        # Drop the table
        print("\n🗑️  Dropping team_defense_stats table...")
        
        with engine.connect() as conn:
            # Start transaction
            trans = conn.begin()
            
            try:
                # Drop indexes first
                print("   Dropping indexes...")
                indexes_to_drop = [
                    'idx_team_defense_stats_week_id',
                    'idx_team_defense_stats_team_id', 
                    'idx_team_defense_stats_opponent_team_id',
                    'idx_team_defense_stats_unique'
                ]
                
                for index_name in indexes_to_drop:
                    try:
                        conn.execute(text(f"DROP INDEX IF EXISTS {index_name}"))
                        print(f"   ✅ Dropped index: {index_name}")
                    except SQLAlchemyError as e:
                        print(f"   ⚠️  Could not drop index {index_name}: {e}")
                
                # Drop the table
                print("   Dropping table...")
                conn.execute(text("DROP TABLE IF EXISTS team_defense_stats"))
                print("   ✅ Dropped table: team_defense_stats")
                
                # Commit transaction
                trans.commit()
                print("\n✅ Successfully dropped team_defense_stats table and its indexes")
                
                # Verify table is gone
                if not check_table_exists(engine, 'team_defense_stats'):
                    print("✅ Verification: team_defense_stats table no longer exists")
                else:
                    print("❌ Verification failed: team_defense_stats table still exists")
                    sys.exit(1)
                
            except SQLAlchemyError as e:
                trans.rollback()
                print(f"❌ Error dropping table: {e}")
                sys.exit(1)
        
    except SQLAlchemyError as e:
        print(f"❌ Database error: {e}")
        sys.exit(1)
    except Exception as e:
        print(f"❌ Unexpected error: {e}")
        sys.exit(1)

if __name__ == "__main__":
    main()
