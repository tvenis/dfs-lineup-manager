#!/usr/bin/env python3
"""
Test script to examine the player pool entries structure
"""

import requests
import json

def test_player_structure():
    base_url = "http://localhost:8000"
    week_id = 2  # Week 2 (active week)
    
    try:
        response = requests.get(f"{base_url}/api/players/pool/{week_id}/complete", params={
            'limit': 10,  # Small limit for easier debugging
            'include_props': True
        })
        
        if response.status_code == 200:
            data = response.json()
            
            print("🔍 Player Pool Entries Structure Analysis")
            print("=" * 50)
            
            entries = data.get('entries', [])
            print(f"📊 Total Entries: {len(entries)}")
            
            # Examine first few entries
            for i, entry in enumerate(entries[:5]):
                print(f"\n👤 Entry {i}:")
                print(f"   Type: {type(entry)}")
                print(f"   Keys: {list(entry.keys()) if isinstance(entry, dict) else 'Not a dict'}")
                
                if 'entry' in entry:
                    player_entry = entry['entry']
                    print(f"   Entry Keys: {list(player_entry.keys())}")
                    print(f"   PlayerDkId: {player_entry.get('playerDkId')}")
                    print(f"   Player: {player_entry.get('player', {}).get('playerDkId') if player_entry.get('player') else 'No player'}")
                else:
                    print(f"   Direct PlayerDkId: {entry.get('playerDkId')}")
                    print(f"   Player: {entry.get('player', {}).get('playerDkId') if entry.get('player') else 'No player'}")
            
            # Check props data keys vs player IDs
            props_data = data.get('props_data', {})
            props_player_ids = set(props_data.keys())
            
            player_ids = set()
            for entry in entries:
                if 'entry' in entry:
                    player_entry = entry['entry']
                    if 'player' in player_entry and player_entry['player']:
                        player_ids.add(str(player_entry['player']['playerDkId']))
                    else:
                        player_ids.add(str(player_entry.get('playerDkId')))
                else:
                    if 'player' in entry and entry['player']:
                        player_ids.add(str(entry['player']['playerDkId']))
                    else:
                        player_ids.add(str(entry.get('playerDkId')))
            
            print(f"\n🔍 Player ID Comparison:")
            print(f"   Props Data Player IDs: {sorted(props_player_ids)}")
            print(f"   Player Pool Player IDs: {sorted(player_ids)}")
            print(f"   Matching IDs: {sorted(props_player_ids.intersection(player_ids))}")
            print(f"   Missing from Props: {sorted(player_ids - props_player_ids)}")
            print(f"   Extra in Props: {sorted(props_player_ids - player_ids)}")
            
        else:
            print(f"❌ Error: HTTP {response.status_code}")
            print(f"Response: {response.text}")
            
    except Exception as e:
        print(f"❌ Error: {e}")

if __name__ == "__main__":
    test_player_structure()
