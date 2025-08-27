#!/usr/bin/env python3
"""
Simple test script for the DFS Lineup Manager API
"""

import requests
import json

BASE_URL = "http://localhost:8000"

def test_health():
    """Test the health endpoint"""
    print("Testing health endpoint...")
    response = requests.get(f"{BASE_URL}/health")
    print(f"Status: {response.status_code}")
    print(f"Response: {response.json()}")
    print()

def test_root():
    """Test the root endpoint"""
    print("Testing root endpoint...")
    response = requests.get(f"{BASE_URL}/")
    print(f"Status: {response.status_code}")
    print(f"Response: {response.json()}")
    print()

def test_players():
    """Test the players endpoint"""
    print("Testing players endpoint...")
    response = requests.get(f"{BASE_URL}/api/players")
    print(f"Status: {response.status_code}")
    if response.status_code == 200:
        data = response.json()
        print(f"Total players: {data['total']}")
        print(f"First player: {data['players'][0]['name'] if data['players'] else 'None'}")
    else:
        print(f"Error: {response.text}")
    print()

def test_player_pool():
    """Test the player pool endpoint"""
    print("Testing player pool endpoint...")
    response = requests.get(f"{BASE_URL}/api/players/pool/2024-WK01")
    print(f"Status: {response.status_code}")
    if response.status_code == 200:
        data = response.json()
        print(f"Total pool entries: {data['total']}")
        print(f"Week ID: {data['week_id']}")
    else:
        print(f"Error: {response.text}")
    print()

def test_csv_template():
    """Test the CSV template endpoint"""
    print("Testing CSV template endpoint...")
    response = requests.get(f"{BASE_URL}/api/csv/template")
    print(f"Status: {response.status_code}")
    if response.status_code == 200:
        data = response.json()
        print(f"Template description: {data['description']}")
        print("Template preview:")
        print(data['template'][:200] + "...")
    else:
        print(f"Error: {response.text}")
    print()

def test_weeks():
    """Test the weeks endpoint"""
    print("Testing weeks endpoint...")
    response = requests.get(f"{BASE_URL}/api/csv/weeks")
    print(f"Status: {response.status_code}")
    if response.status_code == 200:
        data = response.json()
        print(f"Available weeks: {len(data['weeks'])}")
        print(f"Suggested week: {data['suggested_week_id']}")
    else:
        print(f"Error: {response.text}")
    print()

def main():
    """Run all tests"""
    print("🚀 Testing DFS Lineup Manager API")
    print("=" * 50)
    
    try:
        test_health()
        test_root()
        test_players()
        test_player_pool()
        test_csv_template()
        test_weeks()
        
        print("✅ All tests completed!")
        
    except requests.exceptions.ConnectionError:
        print("❌ Could not connect to the API server.")
        print("Make sure the server is running on http://localhost:8000")
    except Exception as e:
        print(f"❌ Test failed with error: {e}")

if __name__ == "__main__":
    main()
