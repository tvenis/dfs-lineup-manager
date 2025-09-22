#!/usr/bin/env python3
"""
Test script to verify specific player ownership percentages.
Tests Jordan Mason (27.80%) and Kenneth Walker (27.60%) ownership values.
"""

import os
import sys
import json
from datetime import datetime

def test_specific_player_ownership():
    """Test scraping with focus on specific players and their ownership percentages."""
    print("🚀 Specific Player Ownership Test")
    print("="*60)
    
    # Set up environment
    os.environ["FIRECRAWL_API_KEY"] = os.getenv("FIRECRAWL_API_KEY", "")
    
    # RotoWire URL with main Sunday slate
    rotowire_url = "https://www.rotowire.com/daily/nfl/proj-roster-percent.php?site=DraftKings&slateID=8536"
    
    print(f"🎯 Target URL: {rotowire_url}")
    print(f"📅 Test Time: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    print()
    
    # Expected values
    expected_ownership = {
        "Jordan Mason": 27.80,
        "Kenneth Walker": 27.60
    }
    
    print("🎯 EXPECTED OWNERSHIP VALUES:")
    print("-" * 40)
    for player, ownership in expected_ownership.items():
        print(f"   {player}: {ownership}%")
    print()
    
    try:
        from firecrawl import Firecrawl
        
        print("🔧 Initializing Firecrawl client...")
        app = Firecrawl(api_key=os.getenv("FIRECRAWL_API_KEY"))
        print("✅ Firecrawl client initialized successfully")
        print()
        
        # Use the corrected prompt for proper field mapping
        corrected_prompt = """
        Extract DFS ownership data from this RotoWire page. For each player, extract:
        - name: Player name
        - position: QB/RB/WR/TE/K/DST
        - team: Team abbreviation
        - salary: DraftKings salary (remove $ symbol, use number only)
        - ownership_percentage: From RST% column (roster percentage 0-100%)
        - projected_points: From FPTS column (fantasy points prediction)
        - opponent: Opposing team
        - game_info: Team @ Opponent
        
        IMPORTANT FIELD MAPPING:
        - ownership_percentage = RST% column (roster percentage)
        - projected_points = FPTS column (fantasy points)
        - Do NOT use TM/P (team total) for projected_points
        
        Return as JSON with "players" array containing all player data.
        Focus on extracting accurate RST% values for all players.
        """
        
        try:
            print("🌐 Scraping with corrected field mapping...")
            result = app.scrape(
                rotowire_url,
                formats=[{
                    "type": "json",
                    "prompt": corrected_prompt
                }],
                only_main_content=False,
                timeout=120000
            )
            
            print("✅ Scraping completed successfully!")
            print()
            
            # Extract and display the JSON data
            json_data = None
            if hasattr(result, 'json') and result.json:
                json_data = result.json
            else:
                import re
                json_match = re.search(r"'json':\s*({.*})", str(result))
                if json_match:
                    try:
                        json_data = eval(json_match.group(1))
                    except:
                        pass
            
            if json_data:
                players = json_data.get('players', [])
                print(f"📊 SCRAPED DATA SUMMARY:")
                print(f"   Total players extracted: {len(players)}")
                print()
                
                # Search for specific players
                print("🔍 SEARCHING FOR SPECIFIC PLAYERS:")
                print("-" * 40)
                
                found_players = {}
                for player in players:
                    name = player.get('name', '').lower()
                    if 'jordan mason' in name or 'kenneth walker' in name or 'ken walker' in name:
                        found_players[player.get('name', 'Unknown')] = player
                
                if found_players:
                    print("✅ Found target players:")
                    for player_name, player_data in found_players.items():
                        ownership = player_data.get('ownership_percentage', 0)
                        projected = player_data.get('projected_points', 0)
                        salary = player_data.get('salary', 0)
                        position = player_data.get('position', 'Unknown')
                        team = player_data.get('team', 'Unknown')
                        
                        print(f"   📊 {player_name} ({position}, {team})")
                        print(f"      Ownership: {ownership}%")
                        print(f"      Projected Points: {projected}")
                        print(f"      Salary: ${salary}")
                        
                        # Check against expected values
                        expected = None
                        for expected_name, expected_value in expected_ownership.items():
                            if expected_name.lower() in player_name.lower():
                                expected = expected_value
                                break
                        
                        if expected:
                            if abs(ownership - expected) < 0.1:
                                print(f"      ✅ Ownership matches expected value ({expected}%)")
                            else:
                                print(f"      ❌ Ownership differs from expected ({expected}%)")
                        print()
                else:
                    print("⚠️  Target players not found in scraped data")
                    print("   Looking for: Jordan Mason, Kenneth Walker")
                    
                    # Show some sample players for debugging
                    print("\n📋 SAMPLE PLAYERS FOUND:")
                    for i, player in enumerate(players[:10]):
                        name = player.get('name', 'Unknown')
                        ownership = player.get('ownership_percentage', 0)
                        print(f"   {i+1}. {name}: {ownership}%")
                
                # Show top owned players for context
                print("\n📈 TOP OWNED PLAYERS (for context):")
                print("-" * 40)
                sorted_players = sorted(players, key=lambda p: p.get('ownership_percentage', 0), reverse=True)
                for i, player in enumerate(sorted_players[:10]):
                    name = player.get('name', 'Unknown')
                    ownership = player.get('ownership_percentage', 0)
                    position = player.get('position', 'Unknown')
                    team = player.get('team', 'Unknown')
                    print(f"   {i+1}. {name} ({position}, {team}): {ownership}%")
                
                # Validation summary
                print(f"\n🔍 VALIDATION SUMMARY:")
                print("-" * 40)
                validation_passed = True
                
                for expected_name, expected_value in expected_ownership.items():
                    found = False
                    for player in players:
                        if expected_name.lower() in player.get('name', '').lower():
                            actual_value = player.get('ownership_percentage', 0)
                            if abs(actual_value - expected_value) < 0.1:
                                print(f"✅ {expected_name}: {actual_value}% (matches expected {expected_value}%)")
                            else:
                                print(f"❌ {expected_name}: {actual_value}% (expected {expected_value}%)")
                                validation_passed = False
                            found = True
                            break
                    
                    if not found:
                        print(f"⚠️  {expected_name}: Not found in scraped data")
                        validation_passed = False
                
                if validation_passed:
                    print(f"\n🎉 ALL VALIDATIONS PASSED!")
                    print(f"✅ Field mapping is working correctly")
                    print(f"✅ RST% column is being mapped to ownership_percentage")
                else:
                    print(f"\n⚠️  Some validations failed")
                    print(f"💡 This could indicate:")
                    print(f"   - Players not in current slate")
                    print(f"   - Different slate ID needed")
                    print(f"   - Field mapping still needs adjustment")
            else:
                print("⚠️  No JSON data found in response")
            
        except Exception as e:
            print(f"❌ Error with scraping: {e}")
            return False
        
        print()
        print("="*60)
        print("🎉 Specific player ownership test completed!")
        
        return True
        
    except ImportError as e:
        print(f"❌ Import error: {e}")
        return False
    except Exception as e:
        print(f"❌ Unexpected error: {e}")
        return False

def main():
    """Run the specific player ownership test."""
    success = test_specific_player_ownership()
    
    if success:
        print("\n✅ Test completed successfully!")
        print("\n💡 To use the corrected scrape_ownership_data function:")
        print('   from app.services.firecrawl_service import scrape_ownership_data')
        print('   data = scrape_ownership_data(slate_id="8536")')
        print('   players = data.get("players", [])')
    else:
        print("\n❌ Test failed. Please check the setup requirements.")
        return 1
    
    return 0

if __name__ == "__main__":
    sys.exit(main())
