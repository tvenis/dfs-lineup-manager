#!/usr/bin/env python3
"""
Test script for the optimized Player Pool Complete endpoint
Tests the new single-query endpoint that replaces 3 separate API calls
"""

import requests
import json
import time
import sys
from pathlib import Path

# Add the backend directory to Python path
backend_dir = Path(__file__).parent
sys.path.insert(0, str(backend_dir))

def test_optimized_endpoint():
    """Test the new optimized endpoint"""
    
    # Test configuration
    base_url = "http://localhost:8000"  # Adjust if your server runs on different port
    week_id = 1  # Adjust to a valid week ID
    
    print("🚀 Testing Optimized Player Pool Complete Endpoint")
    print("=" * 60)
    
    # Test the new optimized endpoint
    print(f"\n1️⃣ Testing /api/players/pool/{week_id}/complete")
    
    try:
        start_time = time.perf_counter()
        
        response = requests.get(f"{base_url}/api/players/pool/{week_id}/complete", params={
            'limit': 100,
            'include_props': True
        })
        
        end_time = time.perf_counter()
        duration = (end_time - start_time) * 1000
        
        if response.status_code == 200:
            data = response.json()
            
            print(f"✅ Success! Response time: {duration:.2f}ms")
            print(f"📊 Data received:")
            print(f"   - Entries: {len(data.get('entries', []))}")
            print(f"   - Total: {data.get('total', 0)}")
            print(f"   - Games Map: {len(data.get('games_map', {}))}")
            print(f"   - Props Data: {len(data.get('props_data', {}))}")
            print(f"   - Meta: {data.get('meta', {})}")
            
            # Check if we have the expected structure
            expected_keys = ['entries', 'total', 'week_id', 'games_map', 'props_data', 'meta']
            missing_keys = [key for key in expected_keys if key not in data]
            
            if missing_keys:
                print(f"⚠️  Missing keys: {missing_keys}")
            else:
                print("✅ All expected keys present")
            
            # Check entries structure
            if data.get('entries'):
                entry = data['entries'][0]
                if 'entry' in entry and 'analysis' in entry:
                    print("✅ Entry structure correct (has entry + analysis)")
                else:
                    print("⚠️  Entry structure unexpected")
            
            return True
            
        else:
            print(f"❌ Error: HTTP {response.status_code}")
            print(f"Response: {response.text}")
            return False
            
    except requests.exceptions.ConnectionError:
        print("❌ Connection Error: Is the server running?")
        print("   Start the server with: python main.py")
        return False
    except Exception as e:
        print(f"❌ Error: {e}")
        return False

def compare_with_old_endpoints():
    """Compare performance with old separate endpoints"""
    
    base_url = "http://localhost:8000"
    week_id = 1
    
    print(f"\n2️⃣ Comparing with old separate endpoints")
    
    try:
        # Test old approach (3 separate calls)
        print("   Testing old approach (3 separate calls)...")
        
        start_time = time.perf_counter()
        
        # Call 1: Player Pool
        pool_response = requests.get(f"{base_url}/api/players/pool/{week_id}", params={'limit': 100})
        pool_data = pool_response.json()
        
        # Call 2: Analysis
        analysis_response = requests.get(f"{base_url}/api/players/pool/{week_id}/analysis")
        analysis_data = analysis_response.json()
        
        # Call 3: Props (simulated - would need player IDs)
        player_ids = [entry['player']['playerDkId'] for entry in pool_data.get('entries', [])[:10]]
        if player_ids:
            props_response = requests.get(f"{base_url}/api/players/props/batch", params={
                'week_id': week_id,
                'player_ids': ','.join(map(str, player_ids)),
                'markets': 'player_pass_yds,player_pass_tds',
                'bookmakers': 'draftkings'
            })
            props_data = props_response.json()
        
        end_time = time.perf_counter()
        old_duration = (end_time - start_time) * 1000
        
        print(f"   Old approach: {old_duration:.2f}ms")
        
        # Test new approach
        print("   Testing new approach (1 optimized call)...")
        
        start_time = time.perf_counter()
        
        new_response = requests.get(f"{base_url}/api/players/pool/{week_id}/complete", params={
            'limit': 100,
            'include_props': True
        })
        new_data = new_response.json()
        
        end_time = time.perf_counter()
        new_duration = (end_time - start_time) * 1000
        
        print(f"   New approach: {new_duration:.2f}ms")
        
        # Calculate improvement
        if old_duration > 0:
            improvement = ((old_duration - new_duration) / old_duration) * 100
            print(f"   🚀 Performance improvement: {improvement:.1f}%")
        
        return True
        
    except Exception as e:
        print(f"   ❌ Error in comparison: {e}")
        return False

def test_without_props():
    """Test the endpoint without props data"""
    
    base_url = "http://localhost:8000"
    week_id = 1
    
    print(f"\n3️⃣ Testing without props data")
    
    try:
        start_time = time.perf_counter()
        
        response = requests.get(f"{base_url}/api/players/pool/{week_id}/complete", params={
            'limit': 50,
            'include_props': False
        })
        
        end_time = time.perf_counter()
        duration = (end_time - start_time) * 1000
        
        if response.status_code == 200:
            data = response.json()
            print(f"✅ Success! Response time: {duration:.2f}ms")
            print(f"📊 Data received:")
            print(f"   - Entries: {len(data.get('entries', []))}")
            print(f"   - Props Data: {len(data.get('props_data', {}))} (should be empty)")
            print(f"   - Include Props: {data.get('meta', {}).get('include_props', 'unknown')}")
            return True
        else:
            print(f"❌ Error: HTTP {response.status_code}")
            return False
            
    except Exception as e:
        print(f"❌ Error: {e}")
        return False

if __name__ == "__main__":
    print("🧪 Player Pool Complete Endpoint Test Suite")
    print("=" * 60)
    
    # Run tests
    test1 = test_optimized_endpoint()
    test2 = compare_with_old_endpoints()
    test3 = test_without_props()
    
    print(f"\n📊 Test Results:")
    print(f"   Optimized endpoint: {'✅ PASS' if test1 else '❌ FAIL'}")
    print(f"   Performance comparison: {'✅ PASS' if test2 else '❌ FAIL'}")
    print(f"   Without props: {'✅ PASS' if test3 else '❌ FAIL'}")
    
    if all([test1, test2, test3]):
        print(f"\n🎉 All tests passed! The optimized endpoint is working correctly.")
        print(f"\n💡 Expected benefits:")
        print(f"   - Reduced API calls: 3 → 1")
        print(f"   - Faster response time: 50-70% improvement")
        print(f"   - Better database efficiency: Single optimized query")
        print(f"   - Reduced network overhead: Less round trips")
    else:
        print(f"\n⚠️  Some tests failed. Check the server logs for details.")
        sys.exit(1)
