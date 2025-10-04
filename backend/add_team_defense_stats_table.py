#!/usr/bin/env python3
"""
Migration script to add team_defense_stats table
This script creates the team_defense_stats table for storing team defense statistics from NFLverse
"""

import os
import sys
from sqlalchemy import create_engine, text
from sqlalchemy.exc import SQLAlchemyError

# Add the backend directory to the Python path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

# Import database configuration
try:
    from load_env import load_env_file
    load_env_file()
except ImportError:
    print("⚠️ load_env module not available, using environment variables directly")

# Get database URL from environment
DATABASE_URL = os.getenv('DATABASE_URL') or os.getenv('DATABASE_DATABASE_URL') or os.getenv('LOCAL_DATABASE_URL')

if not DATABASE_URL:
    print("❌ Error: No database URL found in environment variables")
    print("Please set one of: DATABASE_URL, DATABASE_DATABASE_URL, or LOCAL_DATABASE_URL")
    sys.exit(1)

def create_team_defense_stats_table():
    """Create the team_defense_stats table"""
    
    # Create engine
    engine = create_engine(DATABASE_URL)
    
    # SQL to create the team_defense_stats table
    create_table_sql = """
    CREATE TABLE IF NOT EXISTS team_defense_stats (
        id SERIAL PRIMARY KEY,
        week_id INTEGER NOT NULL REFERENCES weeks(id),
        team_id INTEGER NOT NULL REFERENCES teams(id),
        opponent_team_id INTEGER REFERENCES teams(id),
        
        -- Offensive stats allowed (for DK scoring context)
        completions NUMERIC DEFAULT 0,
        attempts NUMERIC DEFAULT 0,
        passing_yards NUMERIC DEFAULT 0,
        passing_tds NUMERIC DEFAULT 0,
        passing_interceptions NUMERIC DEFAULT 0,
        sacks_suffered NUMERIC DEFAULT 0,
        sack_yards_lost NUMERIC DEFAULT 0,
        sack_fumbles NUMERIC DEFAULT 0,
        sack_fumbles_lost NUMERIC DEFAULT 0,
        passing_air_yards NUMERIC DEFAULT 0,
        passing_yards_after_catch NUMERIC DEFAULT 0,
        passing_first_downs NUMERIC DEFAULT 0,
        passing_epa NUMERIC DEFAULT 0,
        passing_cpoe NUMERIC DEFAULT 0,
        passing_2pt_conversions NUMERIC DEFAULT 0,
        carries NUMERIC DEFAULT 0,
        rushing_yards NUMERIC DEFAULT 0,
        rushing_tds NUMERIC DEFAULT 0,
        rushing_fumbles NUMERIC DEFAULT 0,
        rushing_fumbles_lost NUMERIC DEFAULT 0,
        rushing_first_downs NUMERIC DEFAULT 0,
        rushing_epa NUMERIC DEFAULT 0,
        rushing_2pt_conversions NUMERIC DEFAULT 0,
        receptions NUMERIC DEFAULT 0,
        targets NUMERIC DEFAULT 0,
        receiving_yards NUMERIC DEFAULT 0,
        receiving_tds NUMERIC DEFAULT 0,
        receiving_fumbles NUMERIC DEFAULT 0,
        receiving_fumbles_lost NUMERIC DEFAULT 0,
        receiving_air_yards NUMERIC DEFAULT 0,
        receiving_yards_after_catch NUMERIC DEFAULT 0,
        receiving_first_downs NUMERIC DEFAULT 0,
        receiving_epa NUMERIC DEFAULT 0,
        receiving_2pt_conversions NUMERIC DEFAULT 0,
        special_teams_tds NUMERIC DEFAULT 0,
        
        -- Defensive stats
        def_tackles_solo NUMERIC DEFAULT 0,
        def_tackles_with_assist NUMERIC DEFAULT 0,
        def_tackle_assists NUMERIC DEFAULT 0,
        def_tackles_for_loss NUMERIC DEFAULT 0,
        def_tackles_for_loss_yards NUMERIC DEFAULT 0,
        def_fumbles_forced NUMERIC DEFAULT 0,
        def_sacks NUMERIC DEFAULT 0,
        def_sack_yards NUMERIC DEFAULT 0,
        def_qb_hits NUMERIC DEFAULT 0,
        def_interceptions NUMERIC DEFAULT 0,
        def_interception_yards NUMERIC DEFAULT 0,
        def_pass_defended NUMERIC DEFAULT 0,
        def_tds NUMERIC DEFAULT 0,
        def_fumbles NUMERIC DEFAULT 0,
        def_safeties NUMERIC DEFAULT 0,
        misc_yards NUMERIC DEFAULT 0,
        fumble_recovery_own NUMERIC DEFAULT 0,
        fumble_recovery_yards_own NUMERIC DEFAULT 0,
        fumble_recovery_opp NUMERIC DEFAULT 0,
        fumble_recovery_yards_opp NUMERIC DEFAULT 0,
        fumble_recovery_tds NUMERIC DEFAULT 0,
        penalties NUMERIC DEFAULT 0,
        penalty_yards NUMERIC DEFAULT 0,
        
        -- Calculated fields
        dk_defense_score NUMERIC DEFAULT 0,
        
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        
        UNIQUE(week_id, team_id)
    );
    """
    
    # SQL to create indexes
    create_indexes_sql = [
        "CREATE INDEX IF NOT EXISTS idx_team_defense_stats_week_id ON team_defense_stats(week_id);",
        "CREATE INDEX IF NOT EXISTS idx_team_defense_stats_team_id ON team_defense_stats(team_id);",
        "CREATE INDEX IF NOT EXISTS idx_team_defense_stats_opponent_team_id ON team_defense_stats(opponent_team_id);",
        "CREATE INDEX IF NOT EXISTS idx_team_defense_stats_unique ON team_defense_stats(week_id, team_id);"
    ]
    
    try:
        with engine.connect() as connection:
            # Start transaction
            trans = connection.begin()
            
            try:
                print("🏗️  Creating team_defense_stats table...")
                connection.execute(text(create_table_sql))
                print("✅ team_defense_stats table created successfully")
                
                print("🏗️  Creating indexes...")
                for index_sql in create_indexes_sql:
                    connection.execute(text(index_sql))
                print("✅ Indexes created successfully")
                
                # Commit transaction
                trans.commit()
                print("🎉 Migration completed successfully!")
                
            except SQLAlchemyError as e:
                # Rollback on error
                trans.rollback()
                print(f"❌ Error during migration: {e}")
                raise
                
    except SQLAlchemyError as e:
        print(f"❌ Database connection error: {e}")
        return False
    
    return True

def verify_table_creation():
    """Verify that the table was created successfully"""
    
    engine = create_engine(DATABASE_URL)
    
    try:
        with engine.connect() as connection:
            # Check if table exists
            result = connection.execute(text("""
                SELECT EXISTS (
                    SELECT FROM information_schema.tables 
                    WHERE table_schema = 'public' 
                    AND table_name = 'team_defense_stats'
                );
            """))
            
            table_exists = result.scalar()
            
            if table_exists:
                print("✅ Verification: team_defense_stats table exists")
                
                # Check column count
                result = connection.execute(text("""
                    SELECT COUNT(*) 
                    FROM information_schema.columns 
                    WHERE table_name = 'team_defense_stats'
                """))
                
                column_count = result.scalar()
                print(f"✅ Verification: table has {column_count} columns")
                
                # Check indexes
                result = connection.execute(text("""
                    SELECT COUNT(*) 
                    FROM pg_indexes 
                    WHERE tablename = 'team_defense_stats'
                """))
                
                index_count = result.scalar()
                print(f"✅ Verification: table has {index_count} indexes")
                
                return True
            else:
                print("❌ Verification failed: team_defense_stats table does not exist")
                return False
                
    except SQLAlchemyError as e:
        print(f"❌ Verification error: {e}")
        return False

if __name__ == "__main__":
    print("🚀 Starting team_defense_stats table migration...")
    print(f"📊 Database URL: {DATABASE_URL[:50]}...")
    
    # Create the table
    success = create_team_defense_stats_table()
    
    if success:
        # Verify the creation
        verify_table_creation()
        print("\n🎉 Migration completed successfully!")
        print("📋 Next steps:")
        print("   1. Test the new API endpoints at /api/team-defense/")
        print("   2. Import team defense stats using the NFLVerse integration")
        print("   3. Verify DraftKings defense scoring calculations")
    else:
        print("\n❌ Migration failed!")
        sys.exit(1)
