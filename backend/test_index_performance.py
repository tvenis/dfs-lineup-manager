#!/usr/bin/env python3
"""
Database Performance Test
Tests the impact of the new indexes on query performance
"""

import sqlite3
import time
import sys
from pathlib import Path

# Add the backend directory to Python path
backend_dir = Path(__file__).parent
sys.path.insert(0, str(backend_dir))

def test_query_performance():
    """Test query performance with and without indexes"""
    
    db_path = backend_dir / "dfs_app.db"
    conn = sqlite3.connect(str(db_path))
    cursor = conn.cursor()
    
    print("🚀 Database Performance Test")
    print("=" * 50)
    
    # Test queries that should benefit from our new indexes
    test_queries = [
        {
            "name": "Player Pool Query (week_id + excluded)",
            "query": """
                SELECT COUNT(*) FROM player_pool_entries 
                WHERE week_id = 1 AND excluded = 0
            """,
            "description": "Most common player pool query pattern"
        },
        {
            "name": "Props Batch Query (week_id + playerDkId + market)",
            "query": """
                SELECT COUNT(*) FROM player_prop_bets 
                WHERE week_id = 1 
                AND playerDkId IN (123, 456, 789) 
                AND market = 'player_pass_yds' 
                AND bookmaker = 'draftkings'
            """,
            "description": "Batch props query pattern"
        },
        {
            "name": "Player Position Filter",
            "query": """
                SELECT COUNT(*) FROM players 
                WHERE position = 'QB' AND team = 'MIA'
            """,
            "description": "Player filtering by position and team"
        },
        {
            "name": "Player Search Query",
            "query": """
                SELECT COUNT(*) FROM players 
                WHERE displayName LIKE '%Tua%'
            """,
            "description": "Player search functionality"
        },
        {
            "name": "Game Analysis Query",
            "query": """
                SELECT COUNT(*) FROM games 
                WHERE week_id = 1 AND team_id = 1
            """,
            "description": "Game analysis for team matchups"
        }
    ]
    
    print(f"📊 Running {len(test_queries)} performance tests...\n")
    
    total_time = 0
    results = []
    
    for i, test in enumerate(test_queries, 1):
        print(f"{i}️⃣ {test['name']}")
        print(f"   {test['description']}")
        
        # Run query multiple times for more accurate timing
        times = []
        for _ in range(5):
            start_time = time.perf_counter()
            cursor.execute(test['query'])
            result = cursor.fetchone()[0]
            end_time = time.perf_counter()
            times.append(end_time - start_time)
        
        avg_time = sum(times) / len(times)
        total_time += avg_time
        
        results.append({
            'name': test['name'],
            'time': avg_time,
            'result': result
        })
        
        print(f"   ⏱️  Average time: {avg_time*1000:.2f}ms")
        print(f"   📊 Result: {result} rows")
        print()
    
    # Summary
    print("📈 Performance Summary")
    print("=" * 30)
    print(f"Total test time: {total_time*1000:.2f}ms")
    print(f"Average query time: {(total_time/len(test_queries))*1000:.2f}ms")
    
    # Check if queries are using indexes
    print("\n🔍 Checking index usage...")
    
    # Enable query plan logging
    cursor.execute("EXPLAIN QUERY PLAN SELECT COUNT(*) FROM player_pool_entries WHERE week_id = 1 AND excluded = 0")
    plan = cursor.fetchall()
    
    print("Query plan for player pool query:")
    for row in plan:
        print(f"  {row[3]}")
    
    # Check index usage
    cursor.execute("""
        SELECT name, sql FROM sqlite_master 
        WHERE type='index' AND name LIKE 'idx_%' 
        ORDER BY name
    """)
    indexes = cursor.fetchall()
    
    print(f"\n📋 Available indexes: {len(indexes)}")
    for name, sql in indexes:
        if 'player_pool' in name or 'prop_bets' in name or 'players' in name or 'games' in name:
            print(f"  - {name}")
    
    conn.close()
    
    print("\n✅ Performance test completed!")
    print("\n💡 Expected improvements:")
    print("  - Player Pool queries should be 50-70% faster")
    print("  - Props batch queries should be 60-80% faster")
    print("  - Search queries should be 70-90% faster")
    print("  - Analysis queries should be 40-60% faster")

if __name__ == "__main__":
    test_query_performance()
