#!/usr/bin/env python3
"""
Database migration to recreate recent_activity table with improved structure

This migration implements PostgreSQL best practices for the recent_activity table:
- Proper action column with import type identification
- Optimized indexes for common query patterns
- Structured error handling
- Audit trail fields
- Data retention support
- Performance optimizations

Since existing data is not needed, this script drops and recreates the table.
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

def migrate_recent_activity_table():
    """Recreate recent_activity table with improved structure"""
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
            
            if table_exists:
                print("Dropping existing recent_activity table...")
                session.execute(text("DROP TABLE IF EXISTS recent_activity CASCADE;"))
                session.commit()
                print("✅ Existing table dropped")
            
            print("Creating new recent_activity table with improved structure...")
            
            # Create the new table with all improvements
            session.execute(text("""
                CREATE TABLE recent_activity (
                    -- Primary key
                    id SERIAL PRIMARY KEY,
                    
                    -- Core activity information
                    timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
                    action VARCHAR(50) NOT NULL CHECK (action ~ '^[a-z-]+-(import|export)$'),
                    category VARCHAR(30) NOT NULL CHECK (category IN ('data-import', 'data-export', 'system-maintenance', 'user-action')),
                    
                    -- File and source information
                    file_type VARCHAR(20) NOT NULL CHECK (file_type IN ('API', 'CSV', 'JSON', 'XML')),
                    file_name VARCHAR(200),
                    file_size_bytes INTEGER CHECK (file_size_bytes >= 0),
                    import_source VARCHAR(50), -- 'draftkings', 'csv', 'odds-api', 'firecrawl', 'manual'
                    
                    -- Context information
                    week_id INTEGER NOT NULL REFERENCES weeks(id) ON DELETE CASCADE,
                    draft_group VARCHAR(50), -- Increased from 30 to 50 for longer market names
                    
                    -- Operation results
                    records_added INTEGER NOT NULL DEFAULT 0 CHECK (records_added >= 0),
                    records_updated INTEGER NOT NULL DEFAULT 0 CHECK (records_updated >= 0),
                    records_skipped INTEGER NOT NULL DEFAULT 0 CHECK (records_skipped >= 0),
                    records_failed INTEGER NOT NULL DEFAULT 0 CHECK (records_failed >= 0),
                    
                    -- Operation status and performance
                    operation_status VARCHAR(20) NOT NULL DEFAULT 'completed' 
                        CHECK (operation_status IN ('completed', 'failed', 'partial', 'cancelled')),
                    duration_ms INTEGER CHECK (duration_ms >= 0),
                    
                    -- Error handling (structured JSON)
                    errors JSONB, -- Structured error information
                    error_count INTEGER DEFAULT 0 CHECK (error_count >= 0),
                    
                    -- Audit trail
                    created_by VARCHAR(100), -- User who initiated the action
                    ip_address VARCHAR(45), -- For security auditing (IPv6 max length)
                    session_id VARCHAR(100), -- For tracking user sessions
                    user_agent TEXT, -- For debugging API calls
                    
                    -- Relationship tracking
                    parent_activity_id INTEGER REFERENCES recent_activity(id) ON DELETE SET NULL,
                    
                    -- Additional metadata
                    details JSONB, -- Structured metadata
                    user_name VARCHAR(100), -- Legacy field for backward compatibility
                    
                    -- Data retention
                    retention_until TIMESTAMPTZ,
                    is_archived BOOLEAN NOT NULL DEFAULT FALSE,
                    
                    -- Timestamps
                    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
                    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
                );
            """))
            
            print("✅ Table created successfully")
            
            # Create indexes for optimal query performance
            print("Creating performance indexes...")
            
            indexes = [
                # Primary query indexes
                ("idx_recent_activity_timestamp", "CREATE INDEX idx_recent_activity_timestamp ON recent_activity(timestamp DESC);"),
                ("idx_recent_activity_action", "CREATE INDEX idx_recent_activity_action ON recent_activity(action);"),
                ("idx_recent_activity_category", "CREATE INDEX idx_recent_activity_category ON recent_activity(category);"),
                ("idx_recent_activity_week_id", "CREATE INDEX idx_recent_activity_week_id ON recent_activity(week_id);"),
                ("idx_recent_activity_draft_group", "CREATE INDEX idx_recent_activity_draft_group ON recent_activity(draft_group);"),
                ("idx_recent_activity_operation_status", "CREATE INDEX idx_recent_activity_operation_status ON recent_activity(operation_status);"),
                
                # Composite indexes for common query patterns
                ("idx_recent_activity_action_week", "CREATE INDEX idx_recent_activity_action_week ON recent_activity(action, week_id, timestamp DESC);"),
                ("idx_recent_activity_category_status", "CREATE INDEX idx_recent_activity_category_status ON recent_activity(category, operation_status, timestamp DESC);"),
                ("idx_recent_activity_week_status", "CREATE INDEX idx_recent_activity_week_status ON recent_activity(week_id, operation_status, timestamp DESC);"),
                
                # Audit and user tracking indexes
                ("idx_recent_activity_created_by", "CREATE INDEX idx_recent_activity_created_by ON recent_activity(created_by);"),
                ("idx_recent_activity_session_id", "CREATE INDEX idx_recent_activity_session_id ON recent_activity(session_id);"),
                
                # Retention and archival indexes
                ("idx_recent_activity_retention", "CREATE INDEX idx_recent_activity_retention ON recent_activity(retention_until) WHERE retention_until IS NOT NULL;"),
                ("idx_recent_activity_archived", "CREATE INDEX idx_recent_activity_archived ON recent_activity(is_archived, timestamp DESC);"),
                
                # JSON field indexes for structured queries
                ("idx_recent_activity_errors_gin", "CREATE INDEX idx_recent_activity_errors_gin ON recent_activity USING GIN(errors);"),
                ("idx_recent_activity_details_gin", "CREATE INDEX idx_recent_activity_details_gin ON recent_activity USING GIN(details);"),
                
                # Performance indexes for common filters
                ("idx_recent_activity_import_source", "CREATE INDEX idx_recent_activity_import_source ON recent_activity(import_source);"),
                ("idx_recent_activity_file_type", "CREATE INDEX idx_recent_activity_file_type ON recent_activity(file_type);"),
            ]
            
            for index_name, index_sql in indexes:
                try:
                    session.execute(text(index_sql))
                    print(f"  ✅ Created index: {index_name}")
                except Exception as e:
                    print(f"  ⚠️  Failed to create index {index_name}: {e}")
            
            # Create trigger for updated_at timestamp
            print("Creating updated_at trigger...")
            session.execute(text("""
                CREATE OR REPLACE FUNCTION update_recent_activity_updated_at()
                RETURNS TRIGGER AS $$
                BEGIN
                    NEW.updated_at = NOW();
                    RETURN NEW;
                END;
                $$ LANGUAGE plpgsql;
                
                CREATE TRIGGER trigger_update_recent_activity_updated_at
                    BEFORE UPDATE ON recent_activity
                    FOR EACH ROW
                    EXECUTE FUNCTION update_recent_activity_updated_at();
            """))
            print("✅ Updated_at trigger created")
            
            # Create function for automatic retention policy
            print("Creating retention policy function...")
            session.execute(text("""
                CREATE OR REPLACE FUNCTION set_activity_retention()
                RETURNS TRIGGER AS $$
                BEGIN
                    -- Set retention based on action type
                    IF NEW.action LIKE '%-import' THEN
                        NEW.retention_until = NEW.timestamp + INTERVAL '1 year';
                    ELSIF NEW.action LIKE '%-export' THEN
                        NEW.retention_until = NEW.timestamp + INTERVAL '6 months';
                    ELSE
                        NEW.retention_until = NEW.timestamp + INTERVAL '3 months';
                    END IF;
                    
                    -- Set category based on action if not provided
                    IF NEW.category IS NULL THEN
                        IF NEW.action LIKE '%-import' THEN
                            NEW.category = 'data-import';
                        ELSIF NEW.action LIKE '%-export' THEN
                            NEW.category = 'data-export';
                        ELSE
                            NEW.category = 'user-action';
                        END IF;
                    END IF;
                    
                    -- Set error_count from errors JSON if not provided
                    IF NEW.error_count = 0 AND NEW.errors IS NOT NULL THEN
                        NEW.error_count = COALESCE((NEW.errors->>'count')::INTEGER, jsonb_array_length(NEW.errors->'errors'));
                    END IF;
                    
                    RETURN NEW;
                END;
                $$ LANGUAGE plpgsql;
                
                CREATE TRIGGER trigger_set_activity_retention
                    BEFORE INSERT ON recent_activity
                    FOR EACH ROW
                    EXECUTE FUNCTION set_activity_retention();
            """))
            print("✅ Retention policy function created")
            
            # Create view for common queries
            print("Creating common query view...")
            session.execute(text("""
                CREATE OR REPLACE VIEW recent_activity_summary AS
                SELECT 
                    id,
                    timestamp,
                    action,
                    category,
                    file_type,
                    file_name,
                    week_id,
                    draft_group,
                    records_added,
                    records_updated,
                    records_skipped,
                    records_failed,
                    operation_status,
                    duration_ms,
                    error_count,
                    created_by,
                    created_at
                FROM recent_activity
                WHERE is_archived = FALSE
                ORDER BY timestamp DESC;
            """))
            print("✅ Summary view created")
            
            # Create function for archiving old records
            print("Creating archival function...")
            session.execute(text("""
                CREATE OR REPLACE FUNCTION archive_old_activities()
                RETURNS INTEGER AS $$
                DECLARE
                    archived_count INTEGER;
                BEGIN
                    UPDATE recent_activity 
                    SET is_archived = TRUE
                    WHERE retention_until < NOW() 
                    AND is_archived = FALSE;
                    
                    GET DIAGNOSTICS archived_count = ROW_COUNT;
                    RETURN archived_count;
                END;
                $$ LANGUAGE plpgsql;
            """))
            print("✅ Archival function created")
            
            # Commit all changes
            session.commit()
            print("✅ All changes committed successfully")
            
            # Verify table structure
            print("\nVerifying table structure...")
            result = session.execute(text("""
                SELECT column_name, data_type, is_nullable, column_default
                FROM information_schema.columns 
                WHERE table_name = 'recent_activity' 
                ORDER BY ordinal_position;
            """))
            
            columns = result.fetchall()
            print(f"Table has {len(columns)} columns:")
            for col in columns:
                print(f"  - {col[0]}: {col[1]} {'NULL' if col[2] == 'YES' else 'NOT NULL'}")
            
            # Verify indexes
            result = session.execute(text("""
                SELECT indexname, indexdef
                FROM pg_indexes 
                WHERE tablename = 'recent_activity'
                ORDER BY indexname;
            """))
            
            indexes = result.fetchall()
            print(f"\nTable has {len(indexes)} indexes:")
            for idx in indexes:
                print(f"  - {idx[0]}")
            
            return True
                
    except SQLAlchemyError as e:
        print(f"Database error: {e}")
        return False
    except ValueError as e:
        raise e
    except Exception as e:
        print(f"Unexpected error: {e}")
        return False

def main():
    """Main function to run the migration"""
    print("Starting migration to recreate recent_activity table with improved structure...")
    print("=" * 80)
    print("⚠️  WARNING: This will DROP the existing recent_activity table and all its data!")
    print("=" * 80)
    
    try:
        success = migrate_recent_activity_table()
        
        print("=" * 80)
        if success:
            print("✅ Migration completed successfully!")
            print("\nNew features implemented:")
            print("  • Improved action column with import type identification")
            print("  • Structured error handling with JSONB")
            print("  • Audit trail fields (created_by, ip_address, session_id)")
            print("  • Performance indexes for common query patterns")
            print("  • Automatic retention policy based on action type")
            print("  • Data archival support")
            print("  • PostgreSQL best practices (GIN indexes, triggers, functions)")
            print("\nNext steps:")
            print("  1. Update SQLAlchemy models in app/models.py")
            print("  2. Update Pydantic schemas in app/schemas.py")
            print("  3. Update application code to use new field names")
            print("  4. Test the new structure with your application")
        else:
            print("❌ Migration failed!")
            print("Please check the error messages above and try again.")
            sys.exit(1)
    except Exception as e:
        print("=" * 80)
        print("⚠️  Database Environment Not Configured")
        print("=" * 80)
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
        print("  python migrate_recent_activity_table.py")
        print()
        print("=" * 80)
        print("📋 Alternative: Manual SQL Migration")
        print("=" * 80)
        print("If you prefer to run the migration manually, execute the SQL commands")
        print("from the migrate_recent_activity_table.py script.")
        print()
        print(f"Error details: {e}")
        sys.exit(1)

if __name__ == "__main__":
    main()
