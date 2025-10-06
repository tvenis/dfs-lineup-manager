#!/usr/bin/env python3
"""
Migration script to add is_default column to draftgroups table
This allows marking one draft group as the default for each week
"""

import psycopg2
from app.database import get_db
from app.models import DraftGroup
from sqlalchemy import text

def migrate_draftgroups_add_default():
    """Add is_default column to draftgroups table"""
    
    # Get database connection
    db = next(get_db())
    
    try:
        # Add the is_default column
        print("Adding is_default column to draftgroups table...")
        db.execute(text("""
            ALTER TABLE draftgroups 
            ADD COLUMN is_default BOOLEAN DEFAULT FALSE
        """))
        
        # Create a unique constraint to ensure only one default per week
        print("Adding unique constraint for one default per week...")
        db.execute(text("""
            CREATE UNIQUE INDEX idx_draftgroups_week_default 
            ON draftgroups (week_id) 
            WHERE is_default = TRUE
        """))
        
        # Set the main slate as default for each week
        print("Setting main slate as default for each week...")
        db.execute(text("""
            UPDATE draftgroups 
            SET is_default = TRUE 
            WHERE "draftGroup_description" LIKE '%Main Slate%'
        """))
        
        db.commit()
        print("✅ Migration completed successfully!")
        
        # Verify the changes
        print("\nVerifying changes...")
        result = db.execute(text("""
            SELECT week_id, "draftGroup", "draftGroup_description", is_default 
            FROM draftgroups 
            ORDER BY week_id, is_default DESC
        """))
        
        for row in result:
            print(f"  Week {row[0]}: {row[1]} - {row[2]} (Default: {row[3]})")
            
    except Exception as e:
        db.rollback()
        print(f"❌ Migration failed: {e}")
        raise e
    finally:
        db.close()

if __name__ == "__main__":
    migrate_draftgroups_add_default()
