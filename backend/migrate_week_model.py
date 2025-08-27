#!/usr/bin/env python3
"""
Migration script to update the database schema for the new Week model
This script will:
1. Create a backup of the current database
2. Drop and recreate the weeks table with new schema
3. Update related tables to use Integer week_id
"""

import sqlite3
import shutil
import os
from datetime import datetime

def backup_database():
    """Create a backup of the current database"""
    backup_name = f"dfs_app_backup_{datetime.now().strftime('%Y%m%d_%H%M%S')}.db"
    
    if os.path.exists("dfs_app.db"):
        shutil.copy2("dfs_app.db", backup_name)
        print(f"✅ Database backed up to: {backup_name}")
        return backup_name
    else:
        print("⚠️  No existing database found to backup")
        return None

def migrate_database():
    """Perform the database migration"""
    print("🔄 Starting database migration...")
    
    # Connect to the database
    conn = sqlite3.connect("dfs_app.db")
    cursor = conn.cursor()
    
    try:
        # Check if we need to migrate
        cursor.execute("PRAGMA table_info(weeks)")
        columns = [col[1] for col in cursor.fetchall()]
        
        if 'week_number' in columns and 'year' in columns:
            print("✅ Database already has the new Week model structure")
            return True
        
        print("📋 Current weeks table structure:")
        for col in columns:
            print(f"  - {col}")
        
        print("\n🔄 Migrating to new Week model...")
        
        # Create new weeks table with updated schema
        cursor.execute("""
            CREATE TABLE weeks_new (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                week_number INTEGER NOT NULL,
                year INTEGER NOT NULL,
                start_date DATE NOT NULL,
                end_date DATE NOT NULL,
                game_count INTEGER DEFAULT 0,
                status TEXT DEFAULT 'Upcoming',
                notes TEXT,
                imported_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP
            )
        """)
        
        # Create indexes for better performance
        cursor.execute("CREATE INDEX idx_weeks_year_week ON weeks_new(year, week_number)")
        cursor.execute("CREATE INDEX idx_weeks_status ON weeks_new(status)")
        cursor.execute("CREATE INDEX idx_weeks_dates ON weeks_new(start_date, end_date)")
        
        # Migrate existing data if any
        try:
            cursor.execute("SELECT * FROM weeks")
            old_weeks = cursor.fetchall()
            
            if old_weeks:
                print(f"📊 Migrating {len(old_weeks)} existing weeks...")
                
                for old_week in old_weeks:
                    # Parse old week ID format (e.g., "2024-WK01")
                    try:
                        if len(old_week) >= 1:  # Check if we have the old structure
                            old_id = old_week[0] if isinstance(old_week[0], str) else str(old_week[0])
                            
                            if "-WK" in old_id:
                                # Parse "2024-WK01" format
                                year_str, week_str = old_id.split("-WK")
                                year = int(year_str)
                                week_num = int(week_str)
                                
                                # Create sample dates (you may want to adjust this)
                                from datetime import date, timedelta
                                season_start = date(year, 9, 5)  # Approximate NFL season start
                                week_start = season_start + timedelta(days=(week_num - 1) * 7)
                                week_end = week_start + timedelta(days=6)
                                
                                # Determine status
                                today = date.today()
                                if today < week_start:
                                    status = "Upcoming"
                                elif today <= week_end:
                                    status = "Active"
                                else:
                                    status = "Completed"
                                
                                cursor.execute("""
                                    INSERT INTO weeks_new (week_number, year, start_date, end_date, game_count, status, notes, imported_at, created_at)
                                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
                                """, (week_num, year, week_start.isoformat(), week_end.isoformat(), 16, status, f"Week {week_num} of {year}", old_week[3] if len(old_week) > 3 else datetime.now().isoformat(), old_week[2] if len(old_week) > 2 else datetime.now().isoformat()))
                                
                                print(f"  ✅ Migrated week {old_id} to Week {week_num} ({year})")
                            else:
                                print(f"  ⚠️  Skipping week with unknown format: {old_id}")
                        else:
                            print(f"  ⚠️  Skipping week with insufficient data: {old_week}")
                    except Exception as e:
                        print(f"  ❌ Error migrating week {old_week}: {e}")
                        continue
        except sqlite3.OperationalError:
            print("ℹ️  No existing weeks table to migrate")
        
        # Drop old table and rename new one
        cursor.execute("DROP TABLE IF EXISTS weeks")
        cursor.execute("ALTER TABLE weeks_new RENAME TO weeks")
        
        # Update player_pool_entries table to use Integer week_id
        print("\n🔄 Updating player_pool_entries table...")
        
        # Check if we need to update the foreign key
        cursor.execute("PRAGMA foreign_key_list(player_pool_entries)")
        foreign_keys = cursor.fetchall()
        
        # Drop and recreate the table with new schema
        cursor.execute("""
            CREATE TABLE player_pool_entries_new (
                id TEXT PRIMARY KEY,
                week_id INTEGER NOT NULL,
                player_id TEXT NOT NULL,
                salary INTEGER NOT NULL,
                game_info TEXT,
                avg_points REAL,
                status TEXT DEFAULT 'Available',
                excluded BOOLEAN DEFAULT 0,
                roster_position TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP,
                FOREIGN KEY (week_id) REFERENCES weeks (id),
                FOREIGN KEY (player_id) REFERENCES players (id)
            )
        """)
        
        # Migrate existing data
        try:
            cursor.execute("SELECT * FROM player_pool_entries")
            entries = cursor.fetchall()
            
            if entries:
                print(f"📊 Migrating {len(entries)} player pool entries...")
                
                for entry in entries:
                    try:
                        # Parse old week_id format and find new week_id
                        old_week_id = entry[1]
                        if isinstance(old_week_id, str) and "-WK" in old_week_id:
                            year_str, week_str = old_week_id.split("-WK")
                            year = int(year_str)
                            week_num = int(week_str)
                            
                            # Find the new week_id
                            cursor.execute("SELECT id FROM weeks WHERE year = ? AND week_number = ?", (year, week_num))
                            new_week_id = cursor.fetchone()
                            
                            if new_week_id:
                                cursor.execute("""
                                    INSERT INTO player_pool_entries_new (id, week_id, player_id, salary, game_info, avg_points, status, excluded, roster_position, created_at, updated_at)
                                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                                """, (entry[0], new_week_id[0], entry[2], entry[3], entry[4], entry[5], entry[6], entry[7], entry[8], entry[9], entry[10] if len(entry) > 10 else None))
                                
                                print(f"  ✅ Migrated entry {entry[0]}")
                            else:
                                print(f"  ⚠️  Could not find new week_id for {old_week_id}")
                        else:
                            print(f"  ⚠️  Skipping entry with unknown week_id format: {old_week_id}")
                    except Exception as e:
                        print(f"  ❌ Error migrating entry {entry[0]}: {e}")
                        continue
        except sqlite3.OperationalError:
            print("ℹ️  No existing player_pool_entries table to migrate")
        
        # Drop old table and rename new one
        cursor.execute("DROP TABLE IF EXISTS player_pool_entries")
        cursor.execute("ALTER TABLE player_pool_entries_new RENAME TO player_pool_entries")
        
        # Update lineups table to use Integer week_id
        print("\n🔄 Updating lineups table...")
        
        cursor.execute("""
            CREATE TABLE lineups_new (
                id TEXT PRIMARY KEY,
                week_id INTEGER NOT NULL,
                name TEXT NOT NULL,
                tags TEXT,
                game_style TEXT,
                slots TEXT NOT NULL,
                salary_used INTEGER DEFAULT 0,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP,
                FOREIGN KEY (week_id) REFERENCES weeks (id)
            )
        """)
        
        # Migrate existing data
        try:
            cursor.execute("SELECT * FROM lineups")
            lineups = cursor.fetchall()
            
            if lineups:
                print(f"📊 Migrating {len(lineups)} lineups...")
                
                for lineup in lineups:
                    try:
                        old_week_id = lineup[1]
                        if isinstance(old_week_id, str) and "-WK" in old_week_id:
                            year_str, week_str = old_week_id.split("-WK")
                            year = int(year_str)
                            week_num = int(week_str)
                            
                            # Find the new week_id
                            cursor.execute("SELECT id FROM weeks WHERE year = ? AND week_number = ?", (year, week_num))
                            new_week_id = cursor.fetchone()
                            
                            if new_week_id:
                                cursor.execute("""
                                    INSERT INTO lineups_new (id, week_id, name, tags, game_style, slots, salary_used, created_at, updated_at)
                                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
                                """, (lineup[0], new_week_id[0], lineup[2], lineup[3], lineup[4], lineup[5], lineup[6], lineup[7], lineup[8] if len(lineup) > 8 else None))
                                
                                print(f"  ✅ Migrated lineup {lineup[0]}")
                            else:
                                print(f"  ⚠️  Could not find new week_id for {old_week_id}")
                        else:
                            print(f"  ⚠️  Skipping lineup with unknown week_id format: {old_week_id}")
                    except Exception as e:
                        print(f"  ❌ Error migrating lineup {lineup[0]}: {e}")
                        continue
        except sqlite3.OperationalError:
            print("ℹ️  No existing lineups table to migrate")
        
        # Drop old table and rename new one
        cursor.execute("DROP TABLE IF EXISTS lineups")
        cursor.execute("ALTER TABLE lineups_new RENAME TO lineups")
        
        # Commit all changes
        conn.commit()
        print("\n✅ Database migration completed successfully!")
        
        # Show final table structure
        print("\n📋 Final weeks table structure:")
        cursor.execute("PRAGMA table_info(weeks)")
        for col in cursor.fetchall():
            print(f"  - {col[1]} ({col[2]})")
        
        return True
        
    except Exception as e:
        print(f"❌ Migration failed: {e}")
        conn.rollback()
        return False
    
    finally:
        conn.close()

def main():
    """Main migration function"""
    print("🚀 DFS App Week Model Migration")
    print("=" * 40)
    
    # Check if database exists
    if not os.path.exists("dfs_app.db"):
        print("ℹ️  No existing database found. Migration not needed.")
        return
    
    # Create backup
    backup_file = backup_database()
    
    # Perform migration
    if migrate_database():
        print(f"\n🎉 Migration completed successfully!")
        if backup_file:
            print(f"💾 Backup saved as: {backup_file}")
        print("\n📝 Next steps:")
        print("1. Restart your backend server")
        print("2. Run the new test script: python test_new_week_model.py")
        print("3. Test the Player Pool screen in your frontend")
    else:
        print(f"\n❌ Migration failed!")
        if backup_file:
            print(f"💾 You can restore from backup: {backup_file}")
        print("\n🔧 Troubleshooting:")
        print("1. Check the error messages above")
        print("2. Restore from backup if needed")
        print("3. Ensure no other processes are using the database")

if __name__ == "__main__":
    main()
