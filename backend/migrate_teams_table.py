#!/usr/bin/env python3
"""
Migration script to drop and recreate the Teams table with new structure.

New structure:
- id: sequential integer starting at 1 (primary key)
- full_name: varchar
- abbreviation: varchar
- mascat: varchar
- created_at: timestamp
- updated_at: timestamp
- odds_api_id: varchar

This migration will:
1. Drop the existing teams table
2. Create the new teams table with the updated structure
3. Update foreign key references in other tables
"""

import sqlite3
import sys
import os
from datetime import datetime

def get_db_path():
    """Get the database path"""
    script_dir = os.path.dirname(os.path.abspath(__file__))
    return os.path.join(script_dir, 'dfs_app.db')

def backup_database(db_path):
    """Create a backup of the database before migration"""
    backup_path = f"{db_path}.backup_{datetime.now().strftime('%Y%m%d_%H%M%S')}"
    print(f"Creating backup: {backup_path}")
    
    # Copy the database file
    import shutil
    shutil.copy2(db_path, backup_path)
    print(f"Backup created successfully: {backup_path}")
    return backup_path

def migrate_teams_table():
    """Perform the teams table migration"""
    db_path = get_db_path()
    
    if not os.path.exists(db_path):
        print(f"Database not found at {db_path}")
        return False
    
    # Create backup
    backup_path = backup_database(db_path)
    
    try:
        conn = sqlite3.connect(db_path)
        cursor = conn.cursor()
        
        print("Starting teams table migration...")
        
        # 1. Drop existing teams table
        print("Dropping existing teams table...")
        cursor.execute("DROP TABLE IF EXISTS teams")
        
        # 2. Create new teams table with updated structure
        print("Creating new teams table...")
        cursor.execute("""
            CREATE TABLE teams (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                full_name VARCHAR(100) NOT NULL,
                abbreviation VARCHAR(10) NOT NULL UNIQUE,
                mascat VARCHAR(50),
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                odds_api_id VARCHAR(50)
            )
        """)
        
        # 3. Create trigger for updated_at
        print("Creating updated_at trigger...")
        cursor.execute("""
            CREATE TRIGGER update_teams_updated_at 
            AFTER UPDATE ON teams
            BEGIN
                UPDATE teams SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
            END
        """)
        
        # 4. Update foreign key references in other tables
        print("Updating foreign key references...")
        
        # Check if games table exists and update team_id foreign key
        cursor.execute("SELECT name FROM sqlite_master WHERE type='table' AND name='games'")
        if cursor.fetchone():
            print("Updating games table foreign key...")
            # Drop the existing foreign key constraint by recreating the table
            cursor.execute("SELECT sql FROM sqlite_master WHERE type='table' AND name='games'")
            games_sql = cursor.fetchone()[0]
            
            # Create a temporary table with the new structure
            cursor.execute("""
                CREATE TABLE games_new (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    week_id INTEGER NOT NULL,
                    team_id INTEGER NOT NULL,
                    homeoraway VARCHAR(1) NOT NULL,
                    proj_spread REAL,
                    proj_total REAL,
                    implied_team_total REAL,
                    money_line REAL,
                    actual_spread REAL,
                    actual_total REAL,
                    odds_api_gameid VARCHAR(50),
                    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                    FOREIGN KEY (week_id) REFERENCES weeks(id),
                    FOREIGN KEY (team_id) REFERENCES teams(id)
                )
            """)
            
            # Copy data from old table to new table (if any exists)
            cursor.execute("SELECT COUNT(*) FROM games")
            games_count = cursor.fetchone()[0]
            if games_count > 0:
                print(f"Found {games_count} games records. Note: These will need to be re-imported due to team_id type change.")
            
            # Drop old table and rename new one
            cursor.execute("DROP TABLE games")
            cursor.execute("ALTER TABLE games_new RENAME TO games")
            
            # Recreate the unique index
            cursor.execute("CREATE UNIQUE INDEX idx_week_team ON games(week_id, team_id)")
        
        # Check if players table exists and update team foreign key
        cursor.execute("SELECT name FROM sqlite_master WHERE type='table' AND name='players'")
        if cursor.fetchone():
            print("Updating players table foreign key...")
            # The players table references teams.abbreviation, so we need to update this
            # For now, we'll keep it as is since it references abbreviation, not id
            # This might need to be updated later depending on your requirements
            print("Note: Players table still references teams.abbreviation. Consider updating to reference teams.id if needed.")
        
        # Commit all changes
        conn.commit()
        print("Migration completed successfully!")
        
        # Verify the new table structure
        print("\nVerifying new teams table structure...")
        cursor.execute("PRAGMA table_info(teams)")
        columns = cursor.fetchall()
        print("New teams table columns:")
        for col in columns:
            print(f"  {col[1]} ({col[2]}) - {'NOT NULL' if col[3] else 'NULL'} - {'PRIMARY KEY' if col[5] else ''}")
        
        return True
        
    except Exception as e:
        print(f"Migration failed: {e}")
        print(f"Restoring from backup: {backup_path}")
        
        # Restore from backup
        import shutil
        shutil.copy2(backup_path, db_path)
        print("Database restored from backup")
        return False
        
    finally:
        if 'conn' in locals():
            conn.close()

def main():
    """Main function"""
    print("Teams Table Migration Script")
    print("=" * 40)
    
    if len(sys.argv) > 1 and sys.argv[1] == '--force':
        print("Force mode enabled - proceeding without confirmation")
        proceed = True
    else:
        response = input("This will drop and recreate the teams table. Continue? (y/N): ")
        proceed = response.lower() in ['y', 'yes']
    
    if not proceed:
        print("Migration cancelled")
        return
    
    success = migrate_teams_table()
    
    if success:
        print("\n✅ Migration completed successfully!")
        print("\nNext steps:")
        print("1. Update the Team model in models.py")
        print("2. Update the Team schemas in schemas.py")
        print("3. Re-import team data if needed")
        print("4. Test the application")
    else:
        print("\n❌ Migration failed. Database has been restored from backup.")

if __name__ == "__main__":
    main()
