#!/usr/bin/env python3
"""
Fix draftgroup column type from INTEGER to BIGINT

The draftgroup column is currently INTEGER (32-bit) but needs to be BIGINT (64-bit)
to accommodate the large entry_key values from the contest table.
"""

import os
import sys
import logging
from sqlalchemy import create_engine, text

# Setup logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

def get_database_url():
    """Get database URL from environment variables"""
    database_url = os.getenv('DATABASE_URL') or os.getenv('LOCAL_DATABASE_URL') or os.getenv('STORAGE_URL')
    if not database_url:
        raise ValueError("No database URL found. Please set DATABASE_URL, LOCAL_DATABASE_URL, or STORAGE_URL environment variable.")
    return database_url

def fix_draftgroup_column():
    """Fix the draftgroup column type from INTEGER to BIGINT"""
    try:
        # Get database connection
        database_url = get_database_url()
        engine = create_engine(database_url)
        
        with engine.connect() as conn:
            # Start transaction
            trans = conn.begin()
            
            try:
                logger.info("Starting draftgroup column type fix...")
                
                # 1. Check current column type
                logger.info("Checking current column definition...")
                check_query = text("""
                    SELECT column_name, data_type, numeric_precision
                    FROM information_schema.columns 
                    WHERE table_name = 'contest_roster_details'
                    AND column_name = 'draftgroup'
                """)
                result = conn.execute(check_query)
                current_def = result.fetchone()
                
                if current_def:
                    logger.info(f"Current draftgroup column: {current_def.data_type} (precision: {current_def.numeric_precision})")
                    
                    if current_def.data_type == 'integer':
                        logger.info("Column is INTEGER, needs to be changed to BIGINT")
                        
                        # 2. Alter column type to BIGINT
                        logger.info("Altering draftgroup column to BIGINT...")
                        alter_query = text("""
                            ALTER TABLE contest_roster_details 
                            ALTER COLUMN draftgroup TYPE BIGINT
                        """)
                        conn.execute(alter_query)
                        logger.info("✅ Successfully changed draftgroup column to BIGINT")
                        
                    else:
                        logger.info(f"Column is already {current_def.data_type}, no change needed")
                else:
                    logger.warning("draftgroup column not found in contest_roster_details table")
                
                # 3. Verify the change
                logger.info("Verifying column type change...")
                verify_query = text("""
                    SELECT column_name, data_type, numeric_precision
                    FROM information_schema.columns 
                    WHERE table_name = 'contest_roster_details'
                    AND column_name = 'draftgroup'
                """)
                result = conn.execute(verify_query)
                new_def = result.fetchone()
                
                if new_def:
                    logger.info(f"New draftgroup column: {new_def.data_type} (precision: {new_def.numeric_precision})")
                    if new_def.data_type == 'bigint':
                        logger.info("✅ Column type successfully changed to BIGINT")
                    else:
                        logger.warning(f"Column type is {new_def.data_type}, expected BIGINT")
                else:
                    logger.error("Could not verify column type change")
                
                # Commit transaction
                trans.commit()
                logger.info("✅ Migration completed successfully")
                
            except Exception as e:
                # Rollback on error
                trans.rollback()
                logger.error(f"❌ Migration failed: {e}")
                raise
                
    except Exception as e:
        logger.error(f"❌ Database connection failed: {e}")
        sys.exit(1)

if __name__ == "__main__":
    fix_draftgroup_column()
