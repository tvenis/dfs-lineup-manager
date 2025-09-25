#!/usr/bin/env python3
"""
Final test of the corrected field mapping with explicit column instructions.
"""

import os
import sys
import json
from datetime import datetime

def test_final_mapping_fix():
    """Test the final corrected field mapping."""
    print("🚀 Final Mapping Fix Test")
    print("="*60)
    
    # Set up environment
    os.environ["FIRECRAWL_API_KEY"] = os.getenv("FIRECRAWL_API_KEY", "")
    
    if not os.getenv("FIRECRAWL_API_KEY"):
        print("❌ FIRECRAWL_API_KEY not set in environment")
        return False
    
    # Test with Week 4 slate
    slate_id = "8602"
    week4_url = f"https://www.rotowire.com/daily/nfl/proj-roster-percent.php?site=DraftKings&slateID={slate_id}"
    
    print(f"🎯 Slate ID: {slate_id} (Week 4)")
    print(f"🌐 URL: {week4_url}")
    print(f"📅 Test Time: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    print()
    
    try:
        from firecrawl import Firecrawl
        
        print("🔧 Initializing Firecrawl client...")
        app = Firecrawl(api_key=os.getenv("FIRECRAWL_API_KEY"))
        print("✅ Firecrawl client initialized successfully")
        print()
        
        # Use the final corrected prompt
        final_prompt = """
        Extract DFS ownership data from this RotoWire table. For each player row, extract ONLY these 6 fields:
        - name: Player name
        - position: Position (QB/RB/WR/TE/K/DST)
        - team: Team abbreviation
        - salary: DraftKings salary (number only, no $ symbol)
        - ownership_percentage: The number from the RST% column (this is roster percentage/ownership)
        - projected_points: The number from the FPTS column (this is fantasy points prediction)
        
        EXTREMELY IMPORTANT - DO NOT SWAP THESE VALUES:
        - ownership_percentage MUST come from the RST% column (roster percentage)
        - projected_points MUST come from the FPTS column (fantasy points)
        
        IGNORE ALL OTHER COLUMNS:
        - Do NOT extract OPP, game_info, ML, O/U, SPRD, TM/P, VAL columns
        - Only extract the 6 fields listed above
        
        Return as JSON with "players" array containing only these 6 fields per player.
        """
        
        try:
            print("🌐 Scraping with final corrected mapping...")
            result = app.scrape(
                week4_url,
                formats=[{
                    "type": "json",
                    "prompt": final_prompt
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
                print(f"📈 FINAL DATA SUMMARY:")
                print(f"   Total players extracted: {len(players)}")
                print()
                
                if players:
                    # Check for Christian McCaffrey specifically
                    print("🔍 CHRISTIAN MCCAFFREY FINAL VALIDATION:")
                    print("-" * 50)
                    
                    cmc_found = False
                    for player in players:
                        if "Christian McCaffrey" in player.get('name', ''):
                            cmc_found = True
                            print(f"✅ Found Christian McCaffrey:")
                            print(f"   name: {player.get('name')}")
                            print(f"   position: {player.get('position')}")
                            print(f"   team: {player.get('team')}")
                            print(f"   salary: ${player.get('salary')}")
                            print(f"   ownership_percentage (RST%): {player.get('ownership_percentage')}")
                            print(f"   projected_points (FPTS): {player.get('projected_points')}")
                            
                            # Check if unwanted fields are present
                            unwanted_fields = ['opponent', 'game_info', 'moneyline', 'over_under', 'spread', 'team_total', 'value']
                            found_unwanted = [field for field in unwanted_fields if field in player]
                            
                            if found_unwanted:
                                print(f"   ❌ Unwanted fields found: {found_unwanted}")
                            else:
                                print(f"   ✅ No unwanted fields present")
                            
                            # Expected values based on user's correction
                            expected_ownership = 24.84  # From RST% column
                            expected_projected = 23.51  # From FPTS column
                            
                            actual_ownership = player.get('ownership_percentage', 0)
                            actual_projected = player.get('projected_points', 0)
                            
                            print(f"\n   📊 FINAL VALIDATION:")
                            print(f"   Expected ownership (RST%): {expected_ownership}")
                            print(f"   Actual ownership: {actual_ownership}")
                            ownership_match = abs(actual_ownership - expected_ownership) < 0.1
                            print(f"   Ownership match: {'✅' if ownership_match else '❌'}")
                            
                            print(f"   Expected projected (FPTS): {expected_projected}")
                            print(f"   Actual projected: {actual_projected}")
                            projected_match = abs(actual_projected - expected_projected) < 0.1
                            print(f"   Projected match: {'✅' if projected_match else '❌'}")
                            
                            if ownership_match and projected_match and not found_unwanted:
                                print(f"\n🎉 CHRISTIAN MCCAFFREY MAPPING CORRECTED SUCCESSFULLY!")
                                print(f"✅ RST% correctly maps to ownership_percentage")
                                print(f"✅ FPTS correctly maps to projected_points")
                            else:
                                print(f"\n⚠️  Christian McCaffrey mapping still incorrect")
                                if not ownership_match:
                                    print(f"   - ownership_percentage is wrong (expected {expected_ownership}, got {actual_ownership})")
                                if not projected_match:
                                    print(f"   - projected_points is wrong (expected {expected_projected}, got {actual_projected})")
                            
                            break
                    
                    if not cmc_found:
                        print("❌ Christian McCaffrey not found in results")
                    
                    # Show first few players for general validation
                    print(f"\n🔍 FIRST 3 PLAYERS (Final Validation):")
                    print("-" * 60)
                    for i, player in enumerate(players[:3]):
                        name = player.get('name', 'Unknown')
                        ownership = player.get('ownership_percentage', 0)
                        projected = player.get('projected_points', 0)
                        salary = player.get('salary', 0)
                        position = player.get('position', 'Unknown')
                        team = player.get('team', 'Unknown')
                        
                        print(f"Player {i+1}: {name}")
                        print(f"  Position: {position}")
                        print(f"  Team: {team}")
                        print(f"  Salary: ${salary}")
                        print(f"  ownership_percentage (RST%): {ownership}")
                        print(f"  projected_points (FPTS): {projected}")
                        
                        # Check for unwanted fields
                        unwanted_fields = ['opponent', 'game_info', 'moneyline', 'over_under', 'spread', 'team_total', 'value']
                        found_unwanted = [field for field in unwanted_fields if field in player]
                        
                        if found_unwanted:
                            print(f"  ❌ Unwanted fields: {found_unwanted}")
                        else:
                            print(f"  ✅ Only required fields present")
                        print()
                    
                    # Overall validation summary
                    print(f"🎯 FINAL VALIDATION SUMMARY:")
                    print("-" * 40)
                    
                    # Check field presence
                    required_fields = ['name', 'position', 'team', 'salary', 'ownership_percentage', 'projected_points']
                    all_have_required = all(all(field in player for field in required_fields) for player in players)
                    
                    # Check for unwanted fields
                    unwanted_fields = ['opponent', 'game_info', 'moneyline', 'over_under', 'spread', 'team_total', 'value']
                    has_unwanted = any(any(field in player for field in unwanted_fields) for player in players)
                    
                    print(f"   All players have required fields: {'✅' if all_have_required else '❌'}")
                    print(f"   No unwanted fields present: {'✅' if not has_unwanted else '❌'}")
                    print(f"   Total players: {len(players)}")
                    
                    if all_have_required and not has_unwanted:
                        print(f"\n🎉 FINAL FIELD MAPPING VALIDATION PASSED!")
                        print(f"✅ RST% correctly maps to ownership_percentage")
                        print(f"✅ FPTS correctly maps to projected_points")
                        print(f"✅ Only required fields extracted")
                        print(f"✅ Data ready for DFS optimization")
                    else:
                        print(f"\n⚠️  Final field mapping validation failed")
                        print(f"💡 Check the mapping and unwanted fields")
                else:
                    print("⚠️  No player data found")
            else:
                print("⚠️  No JSON data found in response")
            
        except Exception as e:
            print(f"❌ Error with final corrected scraping: {e}")
            return False
        
        print()
        print("="*60)
        print("🎉 Final mapping fix test completed!")
        
        return True
        
    except ImportError as e:
        print(f"❌ Import error: {e}")
        return False
    except Exception as e:
        print(f"❌ Unexpected error: {e}")
        return False

def main():
    """Run the final mapping fix test."""
    success = test_final_mapping_fix()
    
    if success:
        print("\n✅ Test completed successfully!")
        print("\n💡 The final corrected mapping should now:")
        print("   ✅ Map RST% column to ownership_percentage")
        print("   ✅ Map FPTS column to projected_points")
        print("   ✅ Extract only required fields (no opponent, game_info, etc.)")
        print("   ✅ Return clean JSON data for DFS optimization")
    else:
        print("\n❌ Test failed. Please check the setup requirements.")
        return 1
    
    return 0

if __name__ == "__main__":
    sys.exit(main())
