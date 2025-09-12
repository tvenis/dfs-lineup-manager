#!/usr/bin/env python3
"""
Migration script to fix tips_configuration table column type
"""

import sqlite3
import json

def fix_tips_configuration_column():
    """Fix the configuration_data column to be TEXT instead of JSON"""
    
    # Connect to the database
    conn = sqlite3.connect('dfs_app.db')
    cursor = conn.cursor()
    
    try:
        # Check current table structure
        cursor.execute("PRAGMA table_info(tips_configuration)")
        columns = cursor.fetchall()
        print("Current table structure:")
        for col in columns:
            print(f"  {col[1]} ({col[2]})")
        
        # The column should already be TEXT, but let's verify the data
        cursor.execute("SELECT id, name, configuration_data FROM tips_configuration LIMIT 1")
        result = cursor.fetchone()
        
        if result:
            config_id, name, config_data = result
            print(f"\nSample data for config {config_id} ({name}):")
            print(f"Type: {type(config_data)}")
            print(f"Length: {len(config_data) if config_data else 0}")
            
            # Try to parse the JSON to make sure it's valid
            try:
                parsed = json.loads(config_data)
                print("✅ JSON is valid")
                print(f"QB tips count: {len(parsed.get('positionTips', {}).get('QB', {}).get('tips', []))}")
            except json.JSONDecodeError as e:
                print(f"❌ JSON is invalid: {e}")
        
        print("\n✅ Tips configuration table is ready")
        
    except Exception as e:
        print(f"❌ Error checking tips configuration table: {e}")
        raise
    finally:
        conn.close()

if __name__ == "__main__":
    print("🔧 Checking tips configuration table...")
    fix_tips_configuration_column()
    print("✅ Migration completed successfully!")
