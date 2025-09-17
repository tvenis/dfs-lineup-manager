#!/usr/bin/env python3
"""
Script to migrate contest data specifically with proper boolean conversion
"""

import os
import sqlite3
from sqlalchemy import create_engine, text
from datetime import datetime

# Database URLs
SQLITE_URL = "sqlite:///./dfs_app.db"
POSTGRES_URL = os.getenv("LOCAL_DATABASE_URL") or os.getenv("DATABASE_URL")

if not POSTGRES_URL:
    print("❌ Error: Database URL not found")
    exit(1)

# Convert to psycopg driver format
if POSTGRES_URL.startswith("postgresql://"):
    POSTGRES_URL = POSTGRES_URL.replace("postgresql://", "postgresql+psycopg://", 1)

def migrate_contests():
    """Migrate contest data with proper boolean conversion"""
    print("🚀 Migrating contest data...")
    
    # Connect to SQLite
    sqlite_conn = sqlite3.connect("dfs_app.db")
    sqlite_conn.row_factory = sqlite3.Row  # Enable dict-like access
    sqlite_cursor = sqlite_conn.cursor()
    
    # Get all contest data
    sqlite_cursor.execute("SELECT * FROM contest")
    rows = sqlite_cursor.fetchall()
    
    print(f"📊 Found {len(rows)} contests in SQLite")
    
    if not rows:
        print("ℹ️  No contests to migrate")
        return
    
    # Connect to PostgreSQL
    postgres_engine = create_engine(POSTGRES_URL, pool_pre_ping=True)
    
    # Prepare insert statement
    insert_sql = text("""
        INSERT INTO contest (
            entry_key, contest_id, week_id, sport_id, lineup_id, game_type_id, 
            contest_description, contest_opponent, contest_date_utc, contest_place, 
            contest_points, winnings_non_ticket, winnings_ticket, contest_entries, 
            places_paid, entry_fee_usd, prize_pool_usd, net_profit_usd, result, 
            created_at, contest_type_id
        ) VALUES (
            :entry_key, :contest_id, :week_id, :sport_id, :lineup_id, :game_type_id,
            :contest_description, :contest_opponent, :contest_date_utc, :contest_place,
            :contest_points, :winnings_non_ticket, :winnings_ticket, :contest_entries,
            :places_paid, :entry_fee_usd, :prize_pool_usd, :net_profit_usd, :result,
            :created_at, :contest_type_id
        )
    """)
    
    # Convert and insert data
    with postgres_engine.connect() as postgres_conn:
        batch_data = []
        for row in rows:
            # Convert SQLite row to dict with proper boolean conversion
            row_dict = {
                'entry_key': row['entry_key'],
                'contest_id': row['contest_id'],
                'week_id': row['week_id'],
                'sport_id': row['sport_id'],
                'lineup_id': row['lineup_id'],
                'game_type_id': row['game_type_id'],
                'contest_description': row['contest_description'],
                'contest_opponent': row['contest_opponent'],
                'contest_date_utc': row['contest_date_utc'],
                'contest_place': row['contest_place'],
                'contest_points': row['contest_points'],
                'winnings_non_ticket': row['winnings_non_ticket'],
                'winnings_ticket': row['winnings_ticket'],
                'contest_entries': row['contest_entries'],
                'places_paid': row['places_paid'],
                'entry_fee_usd': row['entry_fee_usd'],
                'prize_pool_usd': row['prize_pool_usd'],
                'net_profit_usd': row['net_profit_usd'],
                'result': bool(row['result']),  # Convert 0/1 to boolean
                'created_at': row['created_at'],
                'contest_type_id': row['contest_type_id']
            }
            batch_data.append(row_dict)
        
        # Insert in batches
        batch_size = 50
        for i in range(0, len(batch_data), batch_size):
            batch = batch_data[i:i + batch_size]
            postgres_conn.execute(insert_sql, batch)
            postgres_conn.commit()
            print(f"✅ Inserted batch {i//batch_size + 1} ({len(batch)} contests)")
    
    # Verify
    with postgres_engine.connect() as postgres_conn:
        result = postgres_conn.execute(text("SELECT COUNT(*) FROM contest"))
        count = result.scalar()
        print(f"✅ PostgreSQL now has {count} contests")
    
    sqlite_conn.close()
    print("🎉 Contest migration completed!")

if __name__ == "__main__":
    migrate_contests()
