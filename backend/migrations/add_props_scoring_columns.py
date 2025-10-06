#!/usr/bin/env python3
"""
Migration: Add props scoring columns to player_prop_bets

Adds result_status and actual_value columns to support prop bet scoring:
- result_status: VARCHAR(20) - 'HIT', 'MISS', 'PUSH', or NULL
- actual_value: DOUBLE PRECISION - the actual stat value from player_actuals

Environment:
  - Requires DATABASE_URL to point to Neon Postgres

Idempotent: Uses IF NOT EXISTS on each column add.
"""

import os
import sys
from textwrap import dedent
import psycopg


def main() -> int:
    database_url = os.getenv("DATABASE_URL") or os.getenv("DATABASE_DATABASE_URL") or os.getenv("LOCAL_DATABASE_URL") or os.getenv("STORAGE_URL")
    if not database_url:
        print("ERROR: DATABASE_URL not set.")
        return 1

    print("Connecting to Postgres...")
    with psycopg.connect(database_url) as conn:
        conn.execute("SET statement_timeout TO '5min'")
        
        # Add result_status column
        print("Adding result_status column...")
        conn.execute(dedent("""
            ALTER TABLE player_prop_bets 
            ADD COLUMN IF NOT EXISTS result_status VARCHAR(20);
        """))
        
        # Add actual_value column  
        print("Adding actual_value column...")
        conn.execute(dedent("""
            ALTER TABLE player_prop_bets 
            ADD COLUMN IF NOT EXISTS actual_value DOUBLE PRECISION;
        """))
        
        # Add comment explaining the columns
        print("Adding column comments...")
        conn.execute(dedent("""
            COMMENT ON COLUMN player_prop_bets.result_status IS 
            'Prop bet result: HIT, MISS, PUSH, or NULL if not yet scored';
        """))
        
        conn.execute(dedent("""
            COMMENT ON COLUMN player_prop_bets.actual_value IS 
            'Actual stat value from player_actuals table used for scoring';
        """))
        
        # Create index for efficient querying by result status
        print("Creating index on result_status...")
        conn.execute(dedent("""
            CREATE INDEX IF NOT EXISTS idx_player_prop_bets_result_status 
            ON player_prop_bets (result_status);
        """))
        
        # Create index for efficient querying by actual_value
        print("Creating index on actual_value...")
        conn.execute(dedent("""
            CREATE INDEX IF NOT EXISTS idx_player_prop_bets_actual_value 
            ON player_prop_bets (actual_value);
        """))
        
        # Create composite index for player performance queries
        print("Creating composite index for player performance queries...")
        conn.execute(dedent("""
            CREATE INDEX IF NOT EXISTS idx_player_prop_bets_player_result 
            ON player_prop_bets ("playerDkId", result_status);
        """))
        
        conn.commit()
        print("✅ Migration completed successfully!")
        
        # Verify the columns were added
        print("\nVerifying column additions...")
        with conn.cursor() as cur:
            cur.execute(dedent("""
                SELECT column_name, data_type, is_nullable 
                FROM information_schema.columns 
                WHERE table_name = 'player_prop_bets' 
                AND column_name IN ('result_status', 'actual_value')
                ORDER BY column_name;
            """))
            
            columns = cur.fetchall()
            for col_name, data_type, nullable in columns:
                print(f"  ✅ {col_name}: {data_type} (nullable: {nullable})")
        
        # Show index information
        print("\nVerifying indexes...")
        with conn.cursor() as cur:
            cur.execute(dedent("""
                SELECT indexname, indexdef 
                FROM pg_indexes 
                WHERE tablename = 'player_prop_bets' 
                AND indexname LIKE '%result_status%' OR indexname LIKE '%actual_value%'
                ORDER BY indexname;
            """))
            
            indexes = cur.fetchall()
            for idx_name, idx_def in indexes:
                print(f"  ✅ {idx_name}")
        
        return 0


if __name__ == "__main__":
    try:
        exit_code = main()
        sys.exit(exit_code)
    except Exception as e:
        print(f"❌ Migration failed: {e}")
        sys.exit(1)
