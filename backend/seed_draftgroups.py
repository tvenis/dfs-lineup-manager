#!/usr/bin/env python3
"""
Script to seed draftgroups table with sample data
"""

import sqlite3
import sys
from pathlib import Path

def seed_draftgroups():
    """Add sample draft group data"""
    
    # Get the database path
    db_path = Path(__file__).parent / "dfs_app.db"
    
    if not db_path.exists():
        print(f"❌ Database not found at {db_path}")
        return False
    
    try:
        # Connect to the database
        conn = sqlite3.connect(str(db_path))
        cursor = conn.cursor()
        
        print("🔍 Checking for existing weeks...")
        
        # Get available weeks
        cursor.execute("SELECT id, week_number, year FROM weeks ORDER BY week_number, year")
        weeks = cursor.fetchall()
        
        if not weeks:
            print("❌ No weeks found in database. Please add weeks first.")
            return False
        
        print(f"📅 Found {len(weeks)} weeks:")
        for week in weeks:
            print(f"   - Week {week[1]} {week[2]} (ID: {week[0]})")
        
        # Sample draft groups for each week
        sample_draftgroups = [
            (131103, "Main Slate - Sunday"),
            (131104, "Sunday Night Football"),
            (131105, "Monday Night Football"),
            (131106, "Thursday Night Football"),
            (131107, "Saturday Slate"),
        ]
        
        print("🌱 Adding sample draft groups...")
        
        for week_id, week_number, year in weeks:
            print(f"   Adding draft groups for Week {week_number} {year}...")
            
            for draft_group, description in sample_draftgroups:
                # Check if already exists
                cursor.execute("""
                    SELECT id FROM draftgroups 
                    WHERE draftGroup = ? AND week_id = ?
                """, (draft_group, week_id))
                
                if cursor.fetchone():
                    print(f"     ⚠️  Draft group {draft_group} already exists for Week {week_number}")
                    continue
                
                # Insert draft group
                cursor.execute("""
                    INSERT INTO draftgroups (draftGroup, week_id, draftGroup_description)
                    VALUES (?, ?, ?)
                """, (draft_group, week_id, description))
                
                print(f"     ✅ Added draft group {draft_group}: {description}")
        
        # Commit the changes
        conn.commit()
        
        print("✅ Successfully seeded draftgroups table!")
        
        # Show summary
        cursor.execute("SELECT COUNT(*) FROM draftgroups")
        count = cursor.fetchone()[0]
        print(f"📊 Total draft groups in database: {count}")
        
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
    print("🚀 Starting draftgroups seeding...")
    success = seed_draftgroups()
    
    if success:
        print("🎉 Seeding completed successfully!")
        sys.exit(0)
    else:
        print("💥 Seeding failed!")
        sys.exit(1)
