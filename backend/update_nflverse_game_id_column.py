#!/usr/bin/env python3
"""
Migration script to update nflverse_game_id column from Integer to String(50)
"""

import os
import sys
from sqlalchemy import create_engine, text
from dotenv import load_dotenv

def main():
    # Load environment variables
    load_dotenv()
    
    # Get database URL
    database_url = os.getenv('LOCAL_DATABASE_URL')
    if not database_url:
        print("❌ LOCAL_DATABASE_URL not found in environment variables")
        sys.exit(1)
    
    print("🚀 Starting nflverse_game_id column type migration...")
    print(f"📁 Found .env file, loading environment variables...")
    print(f"✅ Using database URL from LOCAL_DATABASE_URL")
    
    try:
        # Create database engine
        engine = create_engine(database_url)
        
        with engine.connect() as conn:
            # Start a transaction
            trans = conn.begin()
            
            try:
                # Check if column exists and its current type
                result = conn.execute(text("""
                    SELECT data_type, character_maximum_length 
                    FROM information_schema.columns 
                    WHERE table_name = 'games' AND column_name = 'nflverse_game_id'
                """))
                
                column_info = result.fetchone()
                if not column_info:
                    print("❌ Column 'nflverse_game_id' not found in 'games' table")
                    trans.rollback()
                    return
                
                current_type = column_info[0]
                max_length = column_info[1]
                
                print(f"📊 Current column type: {current_type} (max_length: {max_length})")
                
                if current_type == 'integer':
                    print("🔄 Converting nflverse_game_id from INTEGER to VARCHAR(50)...")
                    
                    # Step 1: Add a temporary column
                    conn.execute(text("ALTER TABLE games ADD COLUMN nflverse_game_id_temp VARCHAR(50)"))
                    print("✅ Added temporary column nflverse_game_id_temp")
                    
                    # Step 2: Copy data from old column to new column (convert integers to strings)
                    conn.execute(text("""
                        UPDATE games 
                        SET nflverse_game_id_temp = CASE 
                            WHEN nflverse_game_id IS NOT NULL THEN nflverse_game_id::text
                            ELSE NULL 
                        END
                    """))
                    print("✅ Copied data to temporary column")
                    
                    # Step 3: Drop the old column
                    conn.execute(text("ALTER TABLE games DROP COLUMN nflverse_game_id"))
                    print("✅ Dropped old nflverse_game_id column")
                    
                    # Step 4: Rename the temporary column to the original name
                    conn.execute(text("ALTER TABLE games RENAME COLUMN nflverse_game_id_temp TO nflverse_game_id"))
                    print("✅ Renamed temporary column to nflverse_game_id")
                    
                    print("✅ Successfully converted nflverse_game_id to VARCHAR(50)")
                    
                elif current_type in ['character varying', 'varchar']:
                    if max_length != 50:
                        print(f"🔄 Altering column length from {max_length} to 50...")
                        conn.execute(text("ALTER TABLE games ALTER COLUMN nflverse_game_id TYPE VARCHAR(50)"))
                        print("✅ Updated column length to VARCHAR(50)")
                    else:
                        print("✅ Column is already VARCHAR(50), no changes needed")
                else:
                    print(f"⚠️ Unexpected column type: {current_type}. Manual intervention may be required.")
                
                # Commit the transaction
                trans.commit()
                print("✅ Migration completed successfully!")
                
            except Exception as e:
                trans.rollback()
                print(f"❌ Migration failed: {e}")
                raise
                
    except Exception as e:
        print(f"❌ Database connection failed: {e}")
        sys.exit(1)

if __name__ == "__main__":
    main()
