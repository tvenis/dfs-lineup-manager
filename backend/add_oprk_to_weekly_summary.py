#!/usr/bin/env python3
"""
Migration script to add OPRK columns to weekly_player_summary table
"""

import asyncio
import asyncpg
import os
from dotenv import load_dotenv

load_dotenv()

async def migrate_database():
    """Add oprk_value and oprk_quality columns to weekly_player_summary table"""
    
    # Get database URL from environment
    database_url = os.getenv('DATABASE_URL') or os.getenv('DATABASE_DATABASE_URL') or os.getenv('STORAGE_URL') or os.getenv('LOCAL_DATABASE_URL')
    if not database_url:
        print("❌ No DATABASE_URL found in environment")
        return False
    
    try:
        # Connect to database
        conn = await asyncpg.connect(database_url)
        
        print("🔍 Checking if weekly_player_summary table exists...")
        
        # Check if table exists
        table_exists = await conn.fetchval(
            "SELECT EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'weekly_player_summary')"
        )
        
        if not table_exists:
            print("❌ Table 'weekly_player_summary' does not exist! Please create it first.")
            return False
        
        print("✅ Table 'weekly_player_summary' found")
        
        # Check if oprk_value column already exists
        oprk_value_exists = await conn.fetchval(
            """
            SELECT EXISTS (
                SELECT FROM information_schema.columns 
                WHERE table_name = 'weekly_player_summary' 
                AND column_name = 'oprk_value'
            )
            """
        )
        
        # Check if oprk_quality column already exists
        oprk_quality_exists = await conn.fetchval(
            """
            SELECT EXISTS (
                SELECT FROM information_schema.columns 
                WHERE table_name = 'weekly_player_summary' 
                AND column_name = 'oprk_quality'
            )
            """
        )
        
        if oprk_value_exists and oprk_quality_exists:
            print("⚠️  OPRK columns already exist in 'weekly_player_summary' table!")
            return True
        
        # Add oprk_value column if it doesn't exist
        if not oprk_value_exists:
            print("📝 Adding oprk_value column...")
            await conn.execute("""
                ALTER TABLE weekly_player_summary 
                ADD COLUMN oprk_value INTEGER NULL
            """)
            print("✅ Added oprk_value column")
        else:
            print("⏭️  oprk_value column already exists, skipping")
        
        # Add oprk_quality column if it doesn't exist
        if not oprk_quality_exists:
            print("📝 Adding oprk_quality column...")
            await conn.execute("""
                ALTER TABLE weekly_player_summary 
                ADD COLUMN oprk_quality VARCHAR(20) NULL
            """)
            print("✅ Added oprk_quality column")
        else:
            print("⏭️  oprk_quality column already exists, skipping")
        
        print("\n✅ Migration completed successfully!")
        print("📋 New columns added to weekly_player_summary:")
        print("   - oprk_value: INTEGER NULL (Opponent Rank value, lower is better matchup)")
        print("   - oprk_quality: VARCHAR(20) NULL (Opponent Rank quality: 'High', 'Medium', 'Low')")
        
        # Show current table structure
        print("\n📊 Current table structure:")
        columns = await conn.fetch("""
            SELECT column_name, data_type, is_nullable
            FROM information_schema.columns
            WHERE table_name = 'weekly_player_summary'
            ORDER BY ordinal_position
        """)
        
        for col in columns:
            nullable = "NULL" if col['is_nullable'] == 'YES' else "NOT NULL"
            print(f"   - {col['column_name']}: {col['data_type']} {nullable}")
        
        return True
        
    except Exception as e:
        print(f"❌ Migration failed: {str(e)}")
        import traceback
        traceback.print_exc()
        return False
    finally:
        await conn.close()

if __name__ == "__main__":
    result = asyncio.run(migrate_database())
    exit(0 if result else 1)

