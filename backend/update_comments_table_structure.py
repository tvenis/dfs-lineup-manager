#!/usr/bin/env python3
"""
Migration script to update the comments table structure in PostgreSQL database.

Changes:
- Change id from String(50) to proper PostgreSQL serial (auto-incrementing integer)
- Rename player_id to playerDkId and make it nullable
- Add week_id column (nullable) with foreign key to weeks table
- Update foreign key relationships accordingly

This migration will:
1. Create a new comments table with the updated structure
2. Migrate existing data (if any) to the new table
3. Drop the old table
4. Rename the new table to comments
"""

import os
import sys
from pathlib import Path
from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker

# Load environment variables from .env file if it exists
def load_env_file():
    """Load .env file if it exists"""
    env_file = Path(".env")
    if env_file.exists():
        print("📁 Found .env file, loading environment variables...")
        with open(env_file, 'r') as f:
            for line in f:
                line = line.strip()
                if line and not line.startswith('#') and '=' in line:
                    key, value = line.split('=', 1)
                    # Remove quotes if present
                    value = value.strip('"').strip("'")
                    os.environ[key] = value
        return True
    else:
        print("📁 No .env file found")
        return False


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
    
    # Convert postgresql:// to postgresql+psycopg:// for psycopg3 driver
    if database_url.startswith("postgresql://"):
        database_url = database_url.replace("postgresql://", "postgresql+psycopg://", 1)
    
    return database_url


def check_table_exists(session):
    """Check if comments table exists"""
    result = session.execute(text("""
        SELECT EXISTS (
            SELECT FROM information_schema.tables 
            WHERE table_schema = 'public' 
            AND table_name = 'comments'
        );
    """))
    return result.scalar()


def get_existing_data(session):
    """Get existing comments data if any"""
    try:
        result = session.execute(text("SELECT * FROM comments"))
        return result.fetchall()
    except Exception as e:
        print(f"Could not fetch existing data: {e}")
        return []


def migrate_database():
    """Update comments table structure"""
    
    try:
        # Load environment variables first
        load_env_file()
        
        # Get database connection
        database_url = get_database_url()
        engine = create_engine(database_url)
        SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
        
        with SessionLocal() as session:
            print("Checking if comments table exists...")
            table_exists = check_table_exists(session)
            
            if not table_exists:
                print("Comments table does not exist. Creating new table with updated structure...")
                
                # Create new comments table with updated structure
                session.execute(text("""
                    CREATE TABLE comments (
                        id SERIAL PRIMARY KEY,
                        "playerDkId" INTEGER,
                        week_id INTEGER,
                        content TEXT NOT NULL,
                        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
                        updated_at TIMESTAMP WITH TIME ZONE,
                        FOREIGN KEY ("playerDkId") REFERENCES players ("playerDkId"),
                        FOREIGN KEY (week_id) REFERENCES weeks (id)
                    );
                """))
                
                print("✅ Created new comments table with updated structure")
                
            else:
                print("Comments table exists. Migrating to new structure...")
                
                # Get existing data
                existing_data = get_existing_data(session)
                print(f"Found {len(existing_data)} existing comments")
                
                # Create new table with updated structure
                session.execute(text("""
                    CREATE TABLE comments_new (
                        id SERIAL PRIMARY KEY,
                        "playerDkId" INTEGER,
                        week_id INTEGER,
                        content TEXT NOT NULL,
                        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
                        updated_at TIMESTAMP WITH TIME ZONE,
                        FOREIGN KEY ("playerDkId") REFERENCES players ("playerDkId"),
                        FOREIGN KEY (week_id) REFERENCES weeks (id)
                    );
                """))
                
                # Migrate existing data (if any)
                if existing_data:
                    print("Migrating existing data...")
                    for row in existing_data:
                        # Handle different column structures
                        if len(row) >= 4:  # id, player_id, content, created_at, updated_at
                            old_id, old_player_id, content, created_at, updated_at = row[0], row[1], row[2], row[3], row[4] if len(row) > 4 else None
                            
                            # Convert old player_id to playerDkId if it's an integer
                            player_dk_id = old_player_id if isinstance(old_player_id, int) else None
                            
                            session.execute(text("""
                                INSERT INTO comments_new ("playerDkId", content, created_at, updated_at)
                                VALUES (:playerDkId, :content, :created_at, :updated_at)
                            """), {
                                'playerDkId': player_dk_id,
                                'content': content,
                                'created_at': created_at,
                                'updated_at': updated_at
                            })
                
                # Drop old table and rename new table
                session.execute(text("DROP TABLE comments"))
                session.execute(text("ALTER TABLE comments_new RENAME TO comments"))
                
                print("✅ Successfully migrated comments table structure")
            
            # Create indexes for better performance
            print("Creating indexes...")
            session.execute(text("""
                CREATE INDEX IF NOT EXISTS idx_comments_player_dk_id 
                ON comments ("playerDkId");
            """))
            
            session.execute(text("""
                CREATE INDEX IF NOT EXISTS idx_comments_week_id 
                ON comments (week_id);
            """))
            
            session.execute(text("""
                CREATE INDEX IF NOT EXISTS idx_comments_created_at 
                ON comments (created_at);
            """))
            
            print("✅ Created performance indexes")
            
            # Commit all changes
            session.commit()
            print("✅ Migration completed successfully!")
            
            # Verify the new table structure
            print("\nVerifying new table structure...")
            result = session.execute(text("""
                SELECT column_name, data_type, is_nullable, column_default
                FROM information_schema.columns 
                WHERE table_name = 'comments' 
                AND table_schema = 'public'
                ORDER BY ordinal_position;
            """))
            
            columns = result.fetchall()
            print("\nNew comments table structure:")
            for col in columns:
                nullable = "NULL" if col[2] == "YES" else "NOT NULL"
                default = f" DEFAULT {col[3]}" if col[3] else ""
                print(f"  - {col[0]}: {col[1]} {nullable}{default}")
            
            return True
            
    except Exception as e:
        print(f"❌ Migration failed: {e}")
        return False


if __name__ == "__main__":
    print("Starting comments table structure migration...")
    print("This will update the comments table with:")
    print("  - id: String(50) → SERIAL (auto-incrementing integer)")
    print("  - player_id → playerDkId (nullable)")
    print("  - Add week_id (nullable)")
    print("  - Update foreign key relationships")
    print()
    
    success = migrate_database()
    if success:
        print("\n🎉 Migration completed successfully!")
    else:
        print("\n💥 Migration failed!")
        sys.exit(1)
