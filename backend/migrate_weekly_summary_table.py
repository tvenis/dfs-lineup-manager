#!/usr/bin/env python3
"""
Migration script to add weekly_player_summary table
"""

import asyncio
import asyncpg
import os
from dotenv import load_dotenv

load_dotenv()

async def migrate_database():
    """Add weekly_player_summary table"""
    
    # Get database URL from environment
    database_url = os.getenv('DATABASE_URL') or os.getenv('DATABASE_DATABASE_URL') or os.getenv('STORAGE_URL') or os.getenv('LOCAL_DATABASE_URL')
    if not database_url:
        print("❌ No DATABASE_URL found in environment")
        return False
    
    try:
        # Connect to database
        conn = await asyncpg.connect(database_url)
        
        print("🔍 Checking if weekly_player_summary table already exists...")
        
        # Check if table exists
        table_exists = await conn.fetchval(
            "SELECT EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'weekly_player_summary')"
        )
        
        if table_exists:
            print("⚠️  Table 'weekly_player_summary' already exists!")
            return True
        
        print("📝 Creating weekly_player_summary table...")
        await conn.execute("""
            CREATE TABLE weekly_player_summary (
                id SERIAL PRIMARY KEY,
                week_id INTEGER NOT NULL REFERENCES weeks(id),
                "playerDkId" INTEGER NOT NULL REFERENCES players("playerDkId"),
                baseline_salary INTEGER NULL,
                consensus_projection FLOAT NULL,
                consensus_ownership NUMERIC(5,2) NULL,
                baseline_source VARCHAR(100) NULL,
                created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
                updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
                UNIQUE(week_id, "playerDkId")
            )
        """)
        
        print("📊 Creating indexes...")
        await conn.execute('CREATE INDEX idx_weekly_summary_week_player ON weekly_player_summary(week_id, "playerDkId")')
        await conn.execute("CREATE INDEX idx_weekly_summary_week ON weekly_player_summary(week_id)")
        
        print("✅ Successfully created weekly_player_summary table!")
        print("📋 Table structure:")
        print("   - id: SERIAL PRIMARY KEY")
        print("   - week_id: INTEGER NOT NULL REFERENCES weeks(id)")
        print("   - playerDkId: INTEGER NOT NULL REFERENCES players(playerDkId)")
        print("   - baseline_salary: INTEGER NULL")
        print("   - consensus_projection: FLOAT NULL")
        print("   - consensus_ownership: NUMERIC(5,2) NULL")
        print("   - baseline_source: VARCHAR(100) NULL")
        print("   - created_at: TIMESTAMP WITH TIME ZONE DEFAULT NOW()")
        print("   - updated_at: TIMESTAMP WITH TIME ZONE DEFAULT NOW()")
        print("   - UNIQUE(week_id, playerDkId)")
        print("   - Indexes: idx_weekly_summary_week_player, idx_weekly_summary_week")
        
        return True
        
    except Exception as e:
        print(f"❌ Migration failed: {str(e)}")
        return False
    finally:
        await conn.close()

if __name__ == "__main__":
    asyncio.run(migrate_database())
