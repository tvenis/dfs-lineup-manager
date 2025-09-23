#!/usr/bin/env python3
"""
Database Migration: Ensure contest_roster_details table matches ContestRosterDetails model
This script adds missing constraints, indexes, and ensures proper field requirements
"""

import os
import sys
import logging
from sqlalchemy import create_engine, text, inspect
from sqlalchemy.exc import SQLAlchemyError

# Setup logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

def get_database_url():
    """Get database URL from environment variables"""
    database_url = os.getenv('DATABASE_URL') or os.getenv('LOCAL_DATABASE_URL') or os.getenv('STORAGE_URL')
    if not database_url:
        raise ValueError("No database URL found. Please set DATABASE_URL, LOCAL_DATABASE_URL, or STORAGE_URL environment variable.")
    return database_url

def check_table_exists(engine, table_name):
    """Check if table exists in the database"""
    inspector = inspect(engine)
    return table_name in inspector.get_table_names()

def check_index_exists(engine, index_name):
    """Check if index exists in the database"""
    try:
        result = engine.execute(text("""
            SELECT EXISTS (
                SELECT 1 FROM pg_indexes 
                WHERE indexname = :index_name
            );
        """), {"index_name": index_name})
        return result.fetchone()[0]
    except Exception as e:
        logger.warning(f"Error checking index {index_name}: {e}")
        return False

def check_constraint_exists(engine, constraint_name):
    """Check if constraint exists in the database"""
    try:
        result = engine.execute(text("""
            SELECT EXISTS (
                SELECT 1 FROM information_schema.table_constraints 
                WHERE constraint_name = :constraint_name
            );
        """), {"constraint_name": constraint_name})
        return result.fetchone()[0]
    except Exception as e:
        logger.warning(f"Error checking constraint {constraint_name}: {e}")
        return False

def main():
    """Main migration function"""
    try:
        # Get database connection
        database_url = get_database_url()
        logger.info(f"Connecting to database...")
        
        engine = create_engine(database_url)
        
        # Check if table exists
        if not check_table_exists(engine, 'contest_roster_details'):
            logger.error("Table 'contest_roster_details' does not exist. Please run the table creation migration first.")
            return False
        
        logger.info("✅ Table 'contest_roster_details' exists")
        
        with engine.begin() as conn:
            # 1. Update nullable constraints for required fields
            logger.info("Updating nullable constraints...")
            
            nullable_updates = [
                "ALTER TABLE contest_roster_details ALTER COLUMN contest_id SET NOT NULL;",
                "ALTER TABLE contest_roster_details ALTER COLUMN enter_key SET NOT NULL;",
                "ALTER TABLE contest_roster_details ALTER COLUMN username SET NOT NULL;",
                "ALTER TABLE contest_roster_details ALTER COLUMN fantasy_points SET NOT NULL;",
            ]
            
            for update_sql in nullable_updates:
                try:
                    conn.execute(text(update_sql))
                    logger.info(f"✅ Executed: {update_sql}")
                except Exception as e:
                    logger.warning(f"Warning executing {update_sql}: {e}")
            
            # 2. Add missing indexes for player positions
            logger.info("Adding missing player position indexes...")
            
            missing_indexes = [
                ("idx_contest_roster_details_qb_name", "CREATE INDEX IF NOT EXISTS idx_contest_roster_details_qb_name ON contest_roster_details(qb_name);"),
                ("idx_contest_roster_details_wr1_name", "CREATE INDEX IF NOT EXISTS idx_contest_roster_details_wr1_name ON contest_roster_details(wr1_name);"),
                ("idx_contest_roster_details_wr2_name", "CREATE INDEX IF NOT EXISTS idx_contest_roster_details_wr2_name ON contest_roster_details(wr2_name);"),
                ("idx_contest_roster_details_wr3_name", "CREATE INDEX IF NOT EXISTS idx_contest_roster_details_wr3_name ON contest_roster_details(wr3_name);"),
                ("idx_contest_roster_details_te_name", "CREATE INDEX IF NOT EXISTS idx_contest_roster_details_te_name ON contest_roster_details(te_name);"),
                ("idx_contest_roster_details_flex_name", "CREATE INDEX IF NOT EXISTS idx_contest_roster_details_flex_name ON contest_roster_details(flex_name);"),
                ("idx_contest_roster_details_dst_name", "CREATE INDEX IF NOT EXISTS idx_contest_roster_details_dst_name ON contest_roster_details(dst_name);"),
            ]
            
            for index_name, index_sql in missing_indexes:
                if not check_index_exists(engine, index_name):
                    try:
                        conn.execute(text(index_sql))
                        logger.info(f"✅ Created index: {index_name}")
                    except Exception as e:
                        logger.warning(f"Warning creating index {index_name}: {e}")
                else:
                    logger.info(f"⏭️  Index {index_name} already exists")
            
            # 3. Clean up duplicates before adding unique constraint
            logger.info("Cleaning up duplicate records...")
            
            try:
                # Find and remove duplicates, keeping the latest record
                cleanup_sql = """
                    DELETE FROM contest_roster_details 
                    WHERE id NOT IN (
                        SELECT DISTINCT ON (contest_id, enter_key) id
                        FROM contest_roster_details
                        ORDER BY contest_id, enter_key, created_at DESC
                    );
                """
                result = conn.execute(text(cleanup_sql))
                deleted_count = result.rowcount
                logger.info(f"✅ Removed {deleted_count} duplicate records")
            except Exception as e:
                logger.warning(f"Warning during duplicate cleanup: {e}")
            
            # 4. Add unique constraint on contest_id + enter_key
            logger.info("Adding unique constraint...")
            
            unique_constraint_name = "contest_roster_details_unique"
            try:
                unique_sql = f"""
                    ALTER TABLE contest_roster_details 
                    ADD CONSTRAINT {unique_constraint_name} 
                    UNIQUE (contest_id, enter_key);
                """
                conn.execute(text(unique_sql))
                logger.info(f"✅ Created unique constraint: {unique_constraint_name}")
            except Exception as e:
                if "already exists" in str(e).lower():
                    logger.info(f"⏭️  Unique constraint {unique_constraint_name} already exists")
                else:
                    logger.warning(f"Warning creating unique constraint: {e}")
            
            # 5. Add check constraint for non-negative fantasy_points
            logger.info("Adding check constraint...")
            
            check_constraint_name = "ck_contest_roster_fantasy_points_nonnegative"
            try:
                check_sql = f"""
                    ALTER TABLE contest_roster_details 
                    ADD CONSTRAINT {check_constraint_name} 
                    CHECK (fantasy_points >= 0);
                """
                conn.execute(text(check_sql))
                logger.info(f"✅ Created check constraint: {check_constraint_name}")
            except Exception as e:
                if "already exists" in str(e).lower():
                    logger.info(f"⏭️  Check constraint {check_constraint_name} already exists")
                else:
                    logger.warning(f"Warning creating check constraint: {e}")
            
            # 6. Add updated_at trigger if it doesn't exist
            logger.info("Adding updated_at trigger...")
            
            trigger_function_sql = """
                CREATE OR REPLACE FUNCTION update_updated_at_column()
                RETURNS TRIGGER AS $$
                BEGIN
                    NEW.updated_at = CURRENT_TIMESTAMP;
                    RETURN NEW;
                END;
                $$ language 'plpgsql';
            """
            
            trigger_sql = """
                DROP TRIGGER IF EXISTS update_contest_roster_details_updated_at ON contest_roster_details;
                CREATE TRIGGER update_contest_roster_details_updated_at
                    BEFORE UPDATE ON contest_roster_details
                    FOR EACH ROW
                    EXECUTE FUNCTION update_updated_at_column();
            """
            
            try:
                conn.execute(text(trigger_function_sql))
                conn.execute(text(trigger_sql))
                logger.info("✅ Created updated_at trigger")
            except Exception as e:
                logger.warning(f"Warning creating trigger: {e}")
            
            # 7. Verify final table structure
            logger.info("Verifying final table structure...")
            
            result = conn.execute(text("""
                SELECT column_name, data_type, is_nullable, column_default
                FROM information_schema.columns 
                WHERE table_name = 'contest_roster_details' 
                ORDER BY ordinal_position;
            """))
            
            columns = result.fetchall()
            logger.info("Final table structure:")
            for col in columns:
                nullable_status = "NULL" if col[2] == "YES" else "NOT NULL"
                logger.info(f"  {col[0]}: {col[1]} ({nullable_status})")
            
            # Check all indexes
            result = conn.execute(text("""
                SELECT indexname, indexdef
                FROM pg_indexes 
                WHERE tablename = 'contest_roster_details'
                ORDER BY indexname;
            """))
            
            indexes = result.fetchall()
            logger.info(f"\nFinal indexes ({len(indexes)} total):")
            for idx in indexes:
                logger.info(f"  {idx[0]}")
            
            # Check constraints
            result = conn.execute(text("""
                SELECT constraint_name, constraint_type
                FROM information_schema.table_constraints 
                WHERE table_name = 'contest_roster_details'
                ORDER BY constraint_name;
            """))
            
            constraints = result.fetchall()
            logger.info(f"\nFinal constraints ({len(constraints)} total):")
            for constraint in constraints:
                logger.info(f"  {constraint[0]}: {constraint[1]}")
        
        logger.info("\n🎉 Migration completed successfully!")
        return True
        
    except Exception as e:
        logger.error(f"❌ Migration failed: {e}")
        return False

def test_migration():
    """Test the migration with sample data"""
    try:
        database_url = get_database_url()
        engine = create_engine(database_url)
        
        logger.info("Testing migration with sample data...")
        
        with engine.begin() as conn:
            # Insert test data
            test_data_sql = """
                INSERT INTO contest_roster_details (
                    draftgroup, contest_id, enter_key, username, fantasy_points,
                    qb_name, qb_score, rb1_name, rb1_score, rb2_name, rb2_score,
                    wr1_name, wr1_score, wr2_name, wr2_score, wr3_name, wr3_score,
                    te_name, te_score, flex_name, flex_score, dst_name, dst_score,
                    contest_json
                ) VALUES (
                    133904, 182400525, 4864049593, 'test_migration_user', 175.5,
                    'Test QB', 25.0, 'Test RB1', 20.0, 'Test RB2', 18.5,
                    'Test WR1', 22.0, 'Test WR2', 19.0, 'Test WR3', 17.0,
                    'Test TE', 16.0, 'Test FLEX', 15.0, 'Test DST', 13.0,
                    '{"test": "migration_data", "source": "migration_test"}'
                ) ON CONFLICT (contest_id, enter_key) DO NOTHING;
            """
            
            conn.execute(text(test_data_sql))
            logger.info("✅ Test data inserted successfully")
            
            # Query test data
            result = conn.execute(text("""
                SELECT id, username, fantasy_points, qb_name, rb1_name, wr1_name
                FROM contest_roster_details 
                WHERE username = 'test_migration_user'
                LIMIT 1;
            """))
            
            row = result.fetchone()
            if row:
                logger.info(f"✅ Test data retrieved: ID={row[0]}, Username={row[1]}, Points={row[2]}")
                logger.info(f"   QB={row[3]}, RB1={row[4]}, WR1={row[5]}")
            else:
                logger.warning("⚠️  Test data not found")
            
            # Test constraints
            try:
                # Test negative fantasy points (should fail)
                conn.execute(text("""
                    INSERT INTO contest_roster_details (contest_id, enter_key, username, fantasy_points)
                    VALUES (182400526, 4864049594, 'negative_test', -10.0);
                """))
                logger.error("❌ Constraint test failed: negative fantasy points should be rejected")
            except Exception as e:
                if "check constraint" in str(e).lower():
                    logger.info("✅ Check constraint working: negative fantasy points rejected")
                else:
                    logger.warning(f"⚠️  Unexpected error testing constraint: {e}")
            
            try:
                # Test duplicate contest_id + enter_key (should fail)
                conn.execute(text("""
                    INSERT INTO contest_roster_details (contest_id, enter_key, username, fantasy_points)
                    VALUES (182400525, 4864049593, 'duplicate_test', 100.0);
                """))
                logger.error("❌ Constraint test failed: duplicate contest_id + enter_key should be rejected")
            except Exception as e:
                if "unique constraint" in str(e).lower():
                    logger.info("✅ Unique constraint working: duplicate contest_id + enter_key rejected")
                else:
                    logger.warning(f"⚠️  Unexpected error testing constraint: {e}")
        
        logger.info("🎉 Migration test completed successfully!")
        return True
        
    except Exception as e:
        logger.error(f"❌ Migration test failed: {e}")
        return False

if __name__ == "__main__":
    print("=" * 80)
    print("ContestRosterDetails Model Migration")
    print("=" * 80)
    
    # Run migration
    migration_success = main()
    
    if migration_success:
        # Run tests
        test_success = test_migration()
        
        if test_success:
            print("\n🎉 All operations completed successfully!")
            sys.exit(0)
        else:
            print("\n❌ Migration completed but tests failed.")
            sys.exit(1)
    else:
        print("\n❌ Migration failed.")
        sys.exit(1)
