#!/usr/bin/env python3
"""
Quick script to check if there are player prop bets in the database
"""

import sqlite3
from pathlib import Path

def check_props_data():
    db_path = Path(__file__).parent / "dfs_app.db"
    
    if not db_path.exists():
        print(f"Database not found at {db_path}")
        return
    
    try:
        conn = sqlite3.connect(db_path)
        cursor = conn.cursor()
        
        # Check if player_prop_bets table exists
        cursor.execute("""
            SELECT name FROM sqlite_master 
            WHERE type='table' AND name='player_prop_bets'
        """)
        
        if not cursor.fetchone():
            print("❌ player_prop_bets table does not exist")
            return
        
        # Count total props
        cursor.execute("SELECT COUNT(*) FROM player_prop_bets")
        total_props = cursor.fetchone()[0]
        print(f"📊 Total props in database: {total_props}")
        
        if total_props == 0:
            print("❌ No props data found in database")
            return
        
        # Check props by week
        cursor.execute("""
            SELECT week_id, COUNT(*) as count 
            FROM player_prop_bets 
            GROUP BY week_id 
            ORDER BY week_id
        """)
        weeks = cursor.fetchall()
        print(f"📅 Props by week:")
        for week_id, count in weeks:
            print(f"   Week {week_id}: {count} props")
        
        # Check props by bookmaker
        cursor.execute("""
            SELECT bookmaker, COUNT(*) as count 
            FROM player_prop_bets 
            WHERE bookmaker IS NOT NULL
            GROUP BY bookmaker 
            ORDER BY count DESC
        """)
        bookmakers = cursor.fetchall()
        print(f"🏦 Props by bookmaker:")
        for bookmaker, count in bookmakers:
            print(f"   {bookmaker}: {count} props")
        
        # Check props by market
        cursor.execute("""
            SELECT market, COUNT(*) as count 
            FROM player_prop_bets 
            WHERE market IS NOT NULL
            GROUP BY market 
            ORDER BY count DESC
        """)
        markets = cursor.fetchall()
        print(f"🎯 Props by market:")
        for market, count in markets:
            print(f"   {market}: {count} props")
        
        # Sample some recent props
        cursor.execute("""
            SELECT playerDkId, bookmaker, market, outcome_point, outcome_price, outcome_likelihood
            FROM player_prop_bets 
            ORDER BY created_at DESC 
            LIMIT 5
        """)
        samples = cursor.fetchall()
        print(f"🔍 Sample recent props:")
        for prop in samples:
            print(f"   Player {prop[0]} | {prop[1]} | {prop[2]} | Point: {prop[3]} | Price: {prop[4]} | Likelihood: {prop[5]}")
        
    except Exception as e:
        print(f"❌ Error: {e}")
    finally:
        if 'conn' in locals():
            conn.close()

if __name__ == "__main__":
    check_props_data()
