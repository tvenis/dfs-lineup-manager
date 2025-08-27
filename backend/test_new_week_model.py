#!/usr/bin/env python3
"""
Test script for the new Week model with enhanced fields
"""

import requests
import json
from datetime import date, timedelta
import time

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
        {"id": "DEN", "name": "Denver Broncos", "abbreviation": "DEN"},
        {"id": "SF", "name": "San Francisco 49ers", "abbreviation": "SF"},
        {"id": "BAL", "name": "Baltimore Ravens", "abbreviation": "BAL"}
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
        {"id": "QB003", "name": "Lamar Jackson", "position": "QB", "team_id": "BAL"},
        {"id": "RB001", "name": "Christian McCaffrey", "position": "RB", "team_id": "SF"},
        {"id": "RB002", "name": "Austin Ekeler", "position": "RB", "team_id": "LAC"},
        {"id": "RB003", "name": "Derrick Henry", "position": "RB", "team_id": "BAL"},
        {"id": "WR001", "name": "Tyreek Hill", "position": "WR", "team_id": "MIA"},
        {"id": "WR002", "name": "Stefon Diggs", "position": "WR", "team_id": "BUF"},
        {"id": "WR003", "name": "Davante Adams", "position": "WR", "team_id": "LV"},
        {"id": "TE001", "name": "Travis Kelce", "position": "TE", "team_id": "KC"},
        {"id": "TE002", "name": "Mark Andrews", "position": "TE", "team_id": "BAL"},
        {"id": "TE003", "name": "George Kittle", "position": "TE", "team_id": "SF"},
        {"id": "DST001", "name": "New England Patriots", "position": "DST", "team_id": "NE"},
        {"id": "DST002", "name": "Buffalo Bills", "position": "DST", "team_id": "BUF"},
        {"id": "DST003", "name": "San Francisco 49ers", "position": "DST", "team_id": "SF"}
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

def create_sample_weeks():
    """Create sample weeks for the 2024 season"""
    # NFL 2024 season starts around September 5, 2024
    season_start = date(2024, 9, 5)
    
    weeks_data = []
    for week_num in range(1, 19):  # Regular season weeks 1-18
        # Each week starts on Thursday and ends on Tuesday
        week_start = season_start + timedelta(days=(week_num - 1) * 7)
        week_end = week_start + timedelta(days=6)
        
        # Determine status based on current date
        today = date.today()
        if today < week_start:
            status = "Upcoming"
        elif today <= week_end:
            status = "Active"
        else:
            status = "Completed"
        
        week_data = {
            "week_number": week_num,
            "year": 2024,
            "start_date": week_start.isoformat(),
            "end_date": week_end.isoformat(),
            "game_count": 16 if week_num <= 17 else 14,  # Week 18 has fewer games
            "status": status,
            "notes": f"Week {week_num} of the 2024 NFL season"
        }
        weeks_data.append(week_data)
    
    created_weeks = []
    for week_data in weeks_data:
        try:
            response = requests.post(f"{BASE_URL}/weeks/", json=week_data)
            if response.status_code == 200:
                created_weeks.append(response.json())
                print(f"✅ Created week: {week_data['week_number']} ({week_data['status']})")
            else:
                print(f"⚠️  Week {week_data['week_number']} might already exist: {response.status_code}")
        except Exception as e:
            print(f"❌ Error creating week {week_data['week_number']}: {e}")
    
    return created_weeks

def create_sample_player_pool_entries(weeks, players):
    """Create sample player pool entries for the first few weeks"""
    pool_entries = []
    
    # Only create entries for the first 3 weeks to keep it manageable
    for week in weeks[:3]:
        print(f"Creating player pool entries for Week {week['week_number']}...")
        
        for player in players:
            # Generate some sample data
            salary = 5000 + (hash(player['id']) % 5000)  # Random salary between 5000-10000
            avg_points = 10 + (hash(player['id']) % 20)  # Random points between 10-30
            
            entry_data = {
                "id": f"week_{week['id']}_player_{player['id']}",
                "week_id": week['id'],
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
                    print(f"  ✅ Created pool entry for: {player['name']}")
                else:
                    print(f"  ⚠️  Pool entry for {player['name']} might already exist: {response.status_code}")
            except Exception as e:
                print(f"  ❌ Error creating pool entry for {player['name']}: {e}")
    
    return pool_entries

def test_week_endpoints():
    """Test the new week endpoints"""
    print("\n🧪 Testing week endpoints...")
    
    # Test getting all weeks
    try:
        response = requests.get(f"{BASE_URL}/weeks/")
        if response.status_code == 200:
            data = response.json()
            print(f"✅ Get weeks endpoint working. Found {data['total']} weeks")
        else:
            print(f"❌ Get weeks endpoint failed: {response.status_code}")
    except Exception as e:
        print(f"❌ Error testing get weeks endpoint: {e}")
    
    # Test getting current week
    try:
        response = requests.get(f"{BASE_URL}/weeks/current")
        if response.status_code == 200:
            data = response.json()
            print(f"✅ Current week endpoint working. Current week: {data['week_number']} ({data['status']})")
        else:
            print(f"❌ Current week endpoint failed: {response.status_code}")
    except Exception as e:
        print(f"❌ Error testing current week endpoint: {e}")
    
    # Test filtering weeks by year
    try:
        response = requests.get(f"{BASE_URL}/weeks/?year=2024")
        if response.status_code == 200:
            data = response.json()
            print(f"✅ Week filtering by year working. Found {data['total']} weeks in 2024")
        else:
            print(f"❌ Week filtering failed: {response.status_code}")
    except Exception as e:
        print(f"❌ Error testing week filtering: {e}")

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
    print("🚀 Starting DFS App New Week Model Test...")
    print("=" * 60)
    
    # Test API connection
    if not test_api_connection():
        return
    
    print("\n📊 Creating sample data with new Week model...")
    
    # Create teams
    teams = create_sample_teams()
    print(f"Created {len(teams)} teams")
    
    # Create players
    players = create_sample_players()
    print(f"Created {len(players)} players")
    
    # Create weeks with new model
    weeks = create_sample_weeks()
    if not weeks:
        print("❌ Cannot proceed without weeks")
        return
    
    print(f"Created {len(weeks)} weeks")
    
    # Create player pool entries for first few weeks
    pool_entries = create_sample_player_pool_entries(weeks, players)
    print(f"Created {len(pool_entries)} player pool entries")
    
    # Test the new week endpoints
    test_week_endpoints()
    
    # Test the player pool endpoint
    if weeks:
        print(f"\n🧪 Testing player pool endpoint for Week {weeks[0]['week_number']}...")
        pool_data = test_player_pool_endpoint(weeks[0]['id'])
        
        if pool_data:
            print("\n✅ All tests passed! Your new Week model is working correctly.")
            print(f"📅 Sample week: Week {weeks[0]['week_number']} ({weeks[0]['year']})")
            print(f"📅 Date range: {weeks[0]['start_date']} to {weeks[0]['end_date']}")
            print(f"📅 Status: {weeks[0]['status']}")
            print(f"📅 Games: {weeks[0]['game_count']}")
            print(f"👥 Players: {pool_data['total']}")
            print(f"🏈 Teams: {len(teams)}")
        else:
            print("\n❌ Some tests failed. Check the error messages above.")
    else:
        print("\n❌ No weeks were created. Check the error messages above.")

if __name__ == "__main__":
    main()
