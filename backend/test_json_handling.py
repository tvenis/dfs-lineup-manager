#!/usr/bin/env python3
"""
Test script to check JSON field handling in SQLAlchemy with SQLite
"""

import sqlite3
from pathlib import Path

def test_direct_sqlite():
    """Test direct SQLite access to see the raw data"""
    db_path = Path(__file__).parent / "dfs_app.db"
    
    if not db_path.exists():
        print(f"Database not found at {db_path}")
        return
    
    try:
        conn = sqlite3.connect(db_path)
        cursor = conn.cursor()
        
        # Check the lineup data directly
        cursor.execute("SELECT id, name, week_id, slots FROM lineups LIMIT 1")
        row = cursor.fetchone()
        
        if row:
            lineup_id, name, week_id, slots = row
            print(f"Lineup ID: {lineup_id}")
            print(f"Name: {name}")
            print(f"Week ID: {week_id}")
            print(f"Slots type: {type(slots)}")
            print(f"Slots value: {slots}")
            print(f"Slots length: {len(slots) if slots else 0}")
            
            # Try to parse as JSON
            try:
                import json
                parsed_slots = json.loads(slots)
                print(f"Parsed slots: {parsed_slots}")
                print(f"Parsed slots type: {type(parsed_slots)}")
            except json.JSONDecodeError as e:
                print(f"JSON decode error: {e}")
        else:
            print("No lineups found")
            
    except sqlite3.Error as e:
        print(f"SQLite error: {e}")
    except Exception as e:
        print(f"Error: {e}")
    finally:
        if conn:
            conn.close()

if __name__ == "__main__":
    print("Testing JSON field handling...")
    test_direct_sqlite()
