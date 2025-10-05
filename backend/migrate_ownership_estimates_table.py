#!/usr/bin/env python3
"""
Migration script to add ownership_estimates table
"""

import asyncio
import asyncpg
import os
from dotenv import load_dotenv

load_dotenv()

async def migrate_database():
    """Add ownership_estimates table"""
    
    # Get database URL from environment
    database_url = os.getenv('DATABASE_URL') or os.getenv('DATABASE_DATABASE_URL') or os.getenv('STORAGE_URL') or os.getenv('LOCAL_DATABASE_URL')
    if not database_url:
        print("❌ No DATABASE_URL found in environment")
        return False
    
    try:
        # Connect to database
        conn = await asyncpg.connect(database_url)
        
        print("🔍 Checking if ownership_estimates table already exists...")
        
        # Check if table exists
        table_exists = await conn.fetchval(
            "SELECT EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'ownership_estimates')"
        )
        
        if table_exists:
            print("⚠️  Table 'ownership_estimates' already exists!")
            return True
        
        print("📝 Creating ownership_estimates table...")
        await conn.execute("""
            CREATE TABLE ownership_estimates (
                id SERIAL PRIMARY KEY,
                week_id INTEGER NOT NULL REFERENCES weeks(id),
                "playerDkId" INTEGER NOT NULL REFERENCES players("playerDkId"),
                source VARCHAR(100) NOT NULL,
                ownership NUMERIC(5,2) NOT NULL,
                draftGroup VARCHAR(20) NULL,
                created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
                updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
                UNIQUE(week_id, "playerDkId", source, draftGroup)
            )
        """)
        
        print("📊 Creating indexes...")
        await conn.execute('CREATE INDEX idx_ownership_week_player ON ownership_estimates(week_id, "playerDkId")')
        await conn.execute('CREATE INDEX idx_ownership_week_draftgroup ON ownership_estimates(week_id, draftGroup)')
        
        print("✅ Successfully created ownership_estimates table!")
        print("📋 Table structure:")
        print("   - id: SERIAL PRIMARY KEY")
        print("   - week_id: INTEGER NOT NULL REFERENCES weeks(id)")
        print("   - playerDkId: INTEGER NOT NULL REFERENCES players(\"playerDkId\")")
        print("   - source: VARCHAR(100) NOT NULL")
        print("   - ownership: NUMERIC(5,2) NOT NULL")
        print("   - draftGroup: VARCHAR(20) NULL")
        print("   - created_at: TIMESTAMP WITH TIME ZONE DEFAULT NOW()")
        print("   - updated_at: TIMESTAMP WITH TIME ZONE DEFAULT NOW()")
        print("   - UNIQUE(week_id, \"playerDkId\", source, draftGroup)")
        print("   - Indexes: idx_ownership_week_player, idx_ownership_week_draftgroup")
        
        return True
        
    except Exception as e:
        print(f"❌ Migration failed: {str(e)}")
        return False
    finally:
        await conn.close()

if __name__ == "__main__":
    asyncio.run(migrate_database())
