#!/usr/bin/env python3
"""
Migration script to add draftgroups table
"""

import sqlite3
import sys
from pathlib import Path

def add_draftgroups_table():
    """Add draftgroups table to the database"""
    
    # Get the database path
    db_path = Path(__file__).parent / "dfs_app.db"
    
    if not db_path.exists():
        print(f"❌ Database not found at {db_path}")
        return False
    
    try:
        # Connect to the database
        conn = sqlite3.connect(str(db_path))
        cursor = conn.cursor()
        
        print("🔍 Checking if draftgroups table already exists...")
        
        # Check if table already exists
        cursor.execute("""
            SELECT name FROM sqlite_master 
            WHERE type='table' AND name='draftgroups'
        """)
        
        if cursor.fetchone():
            print("⚠️  Table 'draftgroups' already exists!")
            return True
        
        print("📝 Creating draftgroups table...")
        
        # Create the draftgroups table
        cursor.execute("""
            CREATE TABLE draftgroups (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                draftGroup INTEGER NOT NULL,
                week_id INTEGER NOT NULL,
                draftGroup_description VARCHAR(255),
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (week_id) REFERENCES weeks(id)
            )
        """)
        
        # Create indexes for better performance
        print("📊 Creating indexes...")
        cursor.execute("CREATE INDEX idx_draftgroups_week_id ON draftgroups(week_id)")
        cursor.execute("CREATE INDEX idx_draftgroups_draftgroup ON draftgroups(draftGroup)")
        cursor.execute("CREATE UNIQUE INDEX idx_draftgroups_unique ON draftgroups(draftGroup, week_id)")
        
        # Commit the changes
        conn.commit()
        
        print("✅ Successfully created draftgroups table!")
        print("📋 Table structure:")
        print("   - id: INTEGER PRIMARY KEY AUTOINCREMENT")
        print("   - draftGroup: INTEGER NOT NULL")
        print("   - week_id: INTEGER NOT NULL (FK to weeks table)")
        print("   - draftGroup_description: VARCHAR(255)")
        print("   - created_at: DATETIME DEFAULT CURRENT_TIMESTAMP")
        print("   - updated_at: DATETIME DEFAULT CURRENT_TIMESTAMP")
        print("   - Unique constraint on (draftGroup, week_id)")
        
        return True
        
    except sqlite3.Error as e:
        print(f"❌ Database error: {e}")
        return False
    except Exception as e:
        print(f"❌ Unexpected error: {e}")
        return False
    finally:
        if conn:
            conn.close()

if __name__ == "__main__":
    print("🚀 Starting draftgroups table creation...")
    success = add_draftgroups_table()
    
    if success:
        print("🎉 Migration completed successfully!")
        sys.exit(0)
    else:
        print("💥 Migration failed!")
        sys.exit(1)
