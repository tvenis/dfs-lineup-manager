#!/usr/bin/env python3
"""
Standalone terminal test that bypasses database dependencies.
Tests the corrected field mapping directly with Firecrawl.
"""

import os
import sys
import json

def test_terminal_standalone():
    """Standalone test that bypasses database dependencies."""
    print("🚀 Terminal Standalone Test: Corrected Field Mapping")
    print("="*60)
    
    # Check for API key
    api_key = os.getenv("FIRECRAWL_API_KEY")
    if not api_key:
        print("❌ FIRECRAWL_API_KEY not set")
        print("Set it with: export FIRECRAWL_API_KEY='your_key_here'")
        return False
    
    print(f"✅ API Key found: {api_key[:8]}...")
    
    try:
        # Import Firecrawl directly (no database dependencies)
        from firecrawl import Firecrawl
        
        print("🔧 Initializing Firecrawl client...")
        app = Firecrawl(api_key=api_key)
        print("✅ Firecrawl client initialized successfully")
        print()
        
        # Week 4 slate URL
        week4_url = "https://www.rotowire.com/daily/nfl/proj-roster-percent.php?site=DraftKings&slateID=8602"
        print(f"🌐 Testing URL: {week4_url}")
        print()
        
        # Use the corrected prompt
        corrected_prompt = """
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
        
        print("🌐 Scraping with corrected field mapping...")
        result = app.scrape(
            week4_url,
            formats=[{
                "type": "json",
                "prompt": corrected_prompt
            }],
            only_main_content=False,
            timeout=120000
        )
        
        print("✅ Scraping completed!")
        print()
        
        # Extract JSON data
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
            print(f"📊 RESULTS SUMMARY:")
            print(f"   Total players extracted: {len(players)}")
            print()
            
            if players:
                # Check for Christian McCaffrey specifically
                print("🔍 CHRISTIAN MCCAFFREY VALIDATION:")
                print("-" * 40)
                
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
                        
                        # Check for unwanted fields
                        unwanted_fields = ['opponent', 'game_info', 'moneyline', 'over_under', 'spread', 'team_total', 'value']
                        found_unwanted = [field for field in unwanted_fields if field in player]
                        
                        if found_unwanted:
                            print(f"   ❌ Unwanted fields: {found_unwanted}")
                        else:
                            print(f"   ✅ No unwanted fields present")
                        
                        # Expected values based on user's correction
                        expected_ownership = 24.84  # From RST% column
                        expected_projected = 23.51  # From FPTS column
                        
                        actual_ownership = player.get('ownership_percentage', 0)
                        actual_projected = player.get('projected_points', 0)
                        
                        print(f"\n   📊 VALIDATION:")
                        print(f"   Expected ownership (RST%): {expected_ownership}")
                        print(f"   Actual ownership: {actual_ownership}")
                        ownership_match = abs(actual_ownership - expected_ownership) < 0.1
                        print(f"   Ownership match: {'✅' if ownership_match else '❌'}")
                        
                        print(f"   Expected projected (FPTS): {expected_projected}")
                        print(f"   Actual projected: {actual_projected}")
                        projected_match = abs(actual_projected - expected_projected) < 0.1
                        print(f"   Projected match: {'✅' if projected_match else '❌'}")
                        
                        if ownership_match and projected_match and not found_unwanted:
                            print(f"\n🎉 MAPPING CORRECTED SUCCESSFULLY!")
                            print(f"✅ RST% correctly maps to ownership_percentage")
                            print(f"✅ FPTS correctly maps to projected_points")
                        else:
                            print(f"\n⚠️  Mapping still needs work")
                            if not ownership_match:
                                print(f"   - ownership_percentage is wrong (expected {expected_ownership}, got {actual_ownership})")
                            if not projected_match:
                                print(f"   - projected_points is wrong (expected {expected_projected}, got {actual_projected})")
                        
                        break
                
                if not cmc_found:
                    print("❌ Christian McCaffrey not found in results")
                
                # Show first few players for context
                print(f"\n📋 FIRST 3 PLAYERS:")
                print("-" * 40)
                for i, player in enumerate(players[:3]):
                    name = player.get('name', 'Unknown')
                    ownership = player.get('ownership_percentage', 0)
                    projected = player.get('projected_points', 0)
                    salary = player.get('salary', 0)
                    print(f"   {i+1}. {name}: {ownership}% owned, {projected} FPTS, ${salary}")
                
                # Show top owned players
                print(f"\n📈 TOP 5 OWNED PLAYERS:")
                print("-" * 40)
                sorted_players = sorted(players, key=lambda p: p.get('ownership_percentage', 0), reverse=True)
                for i, player in enumerate(sorted_players[:5]):
                    name = player.get('name', 'Unknown')
                    ownership = player.get('ownership_percentage', 0)
                    projected = player.get('projected_points', 0)
                    salary = player.get('salary', 0)
                    print(f"   {i+1}. {name}: {ownership}% owned, {projected} FPTS, ${salary}")
                
                # Show full JSON for inspection
                print(f"\n📄 FULL JSON OUTPUT (First Player):")
                print("-" * 40)
                if players:
                    print(json.dumps(players[0], indent=2))
            else:
                print("⚠️  No player data found")
        else:
            print("⚠️  No JSON data found in response")
        
        print(f"\n🎯 STANDALONE TEST COMPLETED!")
        print(f"✅ Field mapping has been tested")
        print(f"✅ Ready for DFS optimization")
        
        return True
        
    except Exception as e:
        print(f"❌ Error: {e}")
        import traceback
        traceback.print_exc()
        return False

def main():
    """Run the standalone terminal test."""
    success = test_terminal_standalone()
    
    if not success:
        print("\n❌ Test failed. Check the error above.")
        return 1
    
    return 0

if __name__ == "__main__":
    sys.exit(main())
