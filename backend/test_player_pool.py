#!/usr/bin/env python3
"""
Test script to verify database connection and add sample data for player pool testing
"""

import asyncio
import requests
import json

BASE_URL = "http://localhost:8000/api"

def test_api_connection():
    """Test if the API is running and accessible"""
    try:
        response = requests.get(f"{BASE_URL.replace('/api', '')}/health")
        if response.status_code == 200:
            print("✅ API is running and accessible")
            return True
        else:
            print(f"❌ API returned status code: {response.status_code}")
            return False
    except requests.exceptions.ConnectionError:
        print("❌ Cannot connect to API. Make sure the backend is running on port 8000")
        return False

def create_sample_teams():
    """Create some sample teams"""
    teams_data = [
        {"id": "NE", "name": "New England Patriots", "abbreviation": "NE"},
        {"id": "BUF", "name": "Buffalo Bills", "abbreviation": "BUF"},
        {"id": "MIA", "name": "Miami Dolphins", "abbreviation": "MIA"},
        {"id": "NYJ", "name": "New York Jets", "abbreviation": "NYJ"},
        {"id": "KC", "name": "Kansas City Chiefs", "abbreviation": "KC"},
        {"id": "LAC", "name": "Los Angeles Chargers", "abbreviation": "LAC"},
        {"id": "LV", "name": "Las Vegas Raiders", "abbreviation": "LV"},
        {"id": "DEN", "name": "Denver Broncos", "abbreviation": "DEN"}
    ]
    
    created_teams = []
    for team_data in teams_data:
        try:
            response = requests.post(f"{BASE_URL}/teams/", json=team_data)
            if response.status_code == 200:
                created_teams.append(response.json())
                print(f"✅ Created team: {team_data['name']}")
            else:
                print(f"⚠️  Team {team_data['name']} might already exist: {response.status_code}")
        except Exception as e:
            print(f"❌ Error creating team {team_data['name']}: {e}")
    
    return created_teams

def create_sample_players():
    """Create some sample players"""
    players_data = [
        {"id": "QB001", "name": "Patrick Mahomes", "position": "QB", "team_id": "KC"},
        {"id": "QB002", "name": "Josh Allen", "position": "QB", "team_id": "BUF"},
        {"id": "RB001", "name": "Christian McCaffrey", "position": "RB", "team_id": "SF"},
        {"id": "RB002", "name": "Austin Ekeler", "position": "RB", "team_id": "LAC"},
        {"id": "WR001", "name": "Tyreek Hill", "position": "WR", "team_id": "MIA"},
        {"id": "WR002", "name": "Stefon Diggs", "position": "WR", "team_id": "BUF"},
        {"id": "TE001", "name": "Travis Kelce", "position": "TE", "team_id": "KC"},
        {"id": "TE002", "name": "Mark Andrews", "position": "TE", "team_id": "BAL"},
        {"id": "DST001", "name": "New England Patriots", "position": "DST", "team_id": "NE"}
    ]
    
    created_players = []
    for player_data in players_data:
        try:
            response = requests.post(f"{BASE_URL}/players/", json=player_data)
            if response.status_code == 200:
                created_players.append(response.json())
                print(f"✅ Created player: {player_data['name']}")
            else:
                print(f"⚠️  Player {player_data['name']} might already exist: {response.status_code}")
        except Exception as e:
            print(f"❌ Error creating player {player_data['name']}: {e}")
    
    return created_players

def create_sample_week():
    """Create a sample week"""
    week_data = {"id": "2024-WK01", "notes": "Week 1 of 2024 season"}
    
    try:
        response = requests.post(f"{BASE_URL}/weeks/", json=week_data)
        if response.status_code == 200:
            week = response.json()
            print(f"✅ Created week: {week['id']}")
            return week
        else:
            print(f"⚠️  Week might already exist: {response.status_code}")
            return None
    except Exception as e:
        print(f"❌ Error creating week: {e}")
        return None

def create_sample_player_pool_entries(week_id, players):
    """Create sample player pool entries"""
    pool_entries = []
    
    for player in players:
        # Generate some sample data
        salary = 5000 + (hash(player['id']) % 5000)  # Random salary between 5000-10000
        avg_points = 10 + (hash(player['id']) % 20)  # Random points between 10-30
        
        entry_data = {
            "id": f"{week_id}_{player['id']}",
            "week_id": week_id,
            "player_id": player['id'],
            "salary": salary,
            "game_info": f"{player['team']['abbreviation']} vs OPP 1:00PM ET",
            "avg_points": avg_points,
            "status": "Available",
            "excluded": False,
            "roster_position": player['position']
        }
        
        try:
            response = requests.post(f"{BASE_URL}/players/pool", json=entry_data)
            if response.status_code == 200:
                pool_entries.append(response.json())
                print(f"✅ Created pool entry for: {player['name']}")
            else:
                print(f"⚠️  Pool entry for {player['name']} might already exist: {response.status_code}")
        except Exception as e:
            print(f"❌ Error creating pool entry for {player['name']}: {e}")
    
    return pool_entries

def test_player_pool_endpoint(week_id):
    """Test the player pool endpoint"""
    try:
        response = requests.get(f"{BASE_URL}/players/pool/{week_id}")
        if response.status_code == 200:
            data = response.json()
            print(f"✅ Player pool endpoint working. Found {data['total']} entries for week {data['week_id']}")
            return data
        else:
            print(f"❌ Player pool endpoint failed: {response.status_code}")
            return None
    except Exception as e:
        print(f"❌ Error testing player pool endpoint: {e}")
        return None

def main():
    """Main test function"""
    print("🚀 Starting DFS App Database Test...")
    print("=" * 50)
    
    # Test API connection
    if not test_api_connection():
        return
    
    print("\n📊 Creating sample data...")
    
    # Create teams
    teams = create_sample_teams()
    print(f"Created {len(teams)} teams")
    
    # Create players
    players = create_sample_players()
    print(f"Created {len(players)} players")
    
    # Create week
    week = create_sample_week()
    if not week:
        print("❌ Cannot proceed without a week")
        return
    
    # Create player pool entries
    pool_entries = create_sample_player_pool_entries(week['id'], players)
    print(f"Created {len(pool_entries)} player pool entries")
    
    # Test the player pool endpoint
    print("\n🧪 Testing player pool endpoint...")
    pool_data = test_player_pool_endpoint(week['id'])
    
    if pool_data:
        print("\n✅ All tests passed! Your database is ready for the Player Pool screen.")
        print(f"📅 Week: {week['id']}")
        print(f"👥 Players: {pool_data['total']}")
        print(f"🏈 Teams: {len(teams)}")
    else:
        print("\n❌ Some tests failed. Check the error messages above.")

if __name__ == "__main__":
    main()
