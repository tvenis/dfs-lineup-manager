#!/usr/bin/env python3
"""
Performance testing script for Player Profile API
"""

import time
import requests
import statistics
from typing import List, Dict, Any

def test_api_performance(base_url: str = "http://localhost:8000") -> Dict[str, Any]:
    """Test the performance of the Player Profile API"""
    
    test_cases = [
        {"name": "Small dataset", "limit": 10, "expected_time": 1.0},
        {"name": "Medium dataset", "limit": 50, "expected_time": 2.0},
        {"name": "Large dataset", "limit": 100, "expected_time": 3.0},
        {"name": "Full dataset", "limit": 1000, "expected_time": 5.0},
    ]
    
    results = {}
    
    for test_case in test_cases:
        print(f"\n🧪 Testing {test_case['name']} (limit={test_case['limit']})...")
        
        # Test current implementation
        current_times = []
        for i in range(3):  # Run 3 times for average
            start_time = time.time()
            try:
                response = requests.get(
                    f"{base_url}/api/players/profiles-with-pool-data",
                    params={"limit": test_case['limit']},
                    timeout=30
                )
                end_time = time.time()
                
                if response.status_code == 200:
                    current_times.append(end_time - start_time)
                    print(f"  Run {i+1}: {end_time - start_time:.2f}s")
                else:
                    print(f"  Run {i+1}: ERROR {response.status_code}")
            except Exception as e:
                print(f"  Run {i+1}: ERROR {e}")
        
        if current_times:
            avg_time = statistics.mean(current_times)
            min_time = min(current_times)
            max_time = max(current_times)
            
            results[test_case['name']] = {
                'limit': test_case['limit'],
                'avg_time': avg_time,
                'min_time': min_time,
                'max_time': max_time,
                'expected_time': test_case['expected_time'],
                'performance_ratio': avg_time / test_case['expected_time'],
                'status': 'PASS' if avg_time <= test_case['expected_time'] else 'FAIL'
            }
            
            print(f"  📊 Average: {avg_time:.2f}s (Min: {min_time:.2f}s, Max: {max_time:.2f}s)")
            print(f"  🎯 Expected: {test_case['expected_time']}s")
            print(f"  📈 Performance: {avg_time/test_case['expected_time']:.1f}x {'✅' if avg_time <= test_case['expected_time'] else '❌'}")
        else:
            results[test_case['name']] = {
                'status': 'ERROR',
                'error': 'All requests failed'
            }
    
    return results

def analyze_results(results: Dict[str, Any]) -> None:
    """Analyze and report performance results"""
    
    print("\n" + "="*60)
    print("📊 PERFORMANCE ANALYSIS REPORT")
    print("="*60)
    
    total_tests = len(results)
    passed_tests = sum(1 for r in results.values() if r.get('status') == 'PASS')
    failed_tests = sum(1 for r in results.values() if r.get('status') == 'FAIL')
    error_tests = sum(1 for r in results.values() if r.get('status') == 'ERROR')
    
    print(f"Total Tests: {total_tests}")
    print(f"✅ Passed: {passed_tests}")
    print(f"❌ Failed: {failed_tests}")
    print(f"🚨 Errors: {error_tests}")
    
    print("\n📈 DETAILED RESULTS:")
    print("-" * 60)
    
    for test_name, result in results.items():
        if result.get('status') == 'ERROR':
            print(f"{test_name:20} | ERROR: {result.get('error', 'Unknown error')}")
        else:
            status_icon = "✅" if result['status'] == 'PASS' else "❌"
            print(f"{test_name:20} | {result['avg_time']:6.2f}s | {result['performance_ratio']:5.1f}x | {status_icon}")
    
    # Performance recommendations
    print("\n🚀 PERFORMANCE RECOMMENDATIONS:")
    print("-" * 60)
    
    if failed_tests > 0:
        print("1. ⚠️  CRITICAL: Fix N+1 query problem in consistency calculation")
        print("2. 🔍 Add database indexes for YTD queries")
        print("3. 📄 Implement pagination on frontend")
        print("4. 💾 Add caching for frequently accessed data")
        print("5. 🗜️  Consider data denormalization for consistency")
    else:
        print("✅ Performance is within acceptable limits!")
        print("💡 Consider implementing caching for further optimization")

if __name__ == "__main__":
    print("🚀 Starting Player Profile API Performance Tests...")
    print("="*60)
    
    try:
        results = test_api_performance()
        analyze_results(results)
        
        print("\n🎯 Next Steps:")
        print("1. Run the optimized endpoint: /api/players/profiles-with-pool-data-optimized")
        print("2. Add database indexes: python add_performance_indexes.py")
        print("3. Test the optimized frontend: /profile-optimized")
        
    except KeyboardInterrupt:
        print("\n⏹️  Testing interrupted by user")
    except Exception as e:
        print(f"\n❌ Testing failed: {e}")
