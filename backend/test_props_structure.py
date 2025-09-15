#!/usr/bin/env python3
"""
Test script to examine the props data structure in detail
"""

import requests
import json

def test_props_structure():
    base_url = "http://localhost:8000"
    week_id = 2  # Week 2 (active week)
    
    try:
        response = requests.get(f"{base_url}/api/players/pool/{week_id}/complete", params={
            'limit': 10,  # Small limit for easier debugging
            'include_props': True
        })
        
        if response.status_code == 200:
            data = response.json()
            
            print("🔍 Props Data Structure Analysis")
            print("=" * 50)
            
            props_data = data.get('props_data', {})
            print(f"📊 Props Data Keys: {list(props_data.keys())[:10]}")  # First 10 keys
            print(f"📊 Total Props Data Entries: {len(props_data)}")
            
            # Examine first few props entries
            for i, (player_id, player_props) in enumerate(list(props_data.items())[:3]):
                print(f"\n🎯 Player {player_id} Props:")
                print(f"   Markets: {list(player_props.keys())}")
                
                for market, prop_data in player_props.items():
                    print(f"   {market}: {prop_data}")
            
            # Check if we have the expected markets
            all_markets = set()
            for player_props in props_data.values():
                all_markets.update(player_props.keys())
            
            print(f"\n📋 All Markets Found: {sorted(all_markets)}")
            
            # Check bookmakers
            all_bookmakers = set()
            for player_props in props_data.values():
                for prop_data in player_props.values():
                    if 'bookmaker' in prop_data:
                        all_bookmakers.add(prop_data['bookmaker'])
            
            print(f"🏦 All Bookmakers Found: {sorted(all_bookmakers)}")
            
            # Sample a specific player's props
            if props_data:
                first_player_id = list(props_data.keys())[0]
                first_player_props = props_data[first_player_id]
                print(f"\n🔍 Sample Player {first_player_id} Props:")
                for market, prop_data in first_player_props.items():
                    print(f"   {market}: {json.dumps(prop_data, indent=2)}")
            
        else:
            print(f"❌ Error: HTTP {response.status_code}")
            print(f"Response: {response.text}")
            
    except Exception as e:
        print(f"❌ Error: {e}")

if __name__ == "__main__":
    test_props_structure()
