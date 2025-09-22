#!/usr/bin/env python3
"""
Very specific script to test exact column mapping from RotoWire.
This will help identify the exact issue with field mapping.
"""

import os
import sys
import json
from datetime import datetime

def test_very_specific_rotowire_scraping():
    """Test with very specific column identification."""
    print("🚀 Very Specific RotoWire Column Mapping Test")
    print("="*60)
    
    # Set up environment
    os.environ["FIRECRAWL_API_KEY"] = os.getenv("FIRECRAWL_API_KEY", "")
    
    # RotoWire URL
    rotowire_url = "https://www.rotowire.com/daily/nfl/proj-roster-percent.php?site=DraftKings"
    
    print(f"🎯 Target URL: {rotowire_url}")
    print(f"📅 Test Time: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    print()
    
    try:
        from firecrawl import Firecrawl
        
        print("🔧 Initializing Firecrawl client...")
        app = Firecrawl(api_key=os.getenv("FIRECRAWL_API_KEY"))
        print("✅ Firecrawl client initialized successfully")
        print()
        
        # Very specific prompt to identify exact columns
        specific_prompt = """
        Look at the RotoWire DraftKings ownership table. Identify the exact column headers and extract data from the correct columns:
        
        For each player, extract:
        - name: Player name
        - position: Player position (QB, RB, WR, TE, K, DST)
        - team: Team abbreviation
        - salary: DraftKings salary (usually in $ format)
        - roster_percentage: The percentage from the RST% column (this is ownership percentage)
        - fantasy_points: The number from the FPTS column (this is projected fantasy points)
        - team_total: The number from the TM/P column (this is team total points)
        
        IMPORTANT: 
        - RST% column = roster percentage (ownership)
        - FPTS column = fantasy points prediction
        - TM/P column = team total points
        
        Return as JSON with "players" array. Show me the exact values from each column for the first 5 players so I can verify the mapping is correct.
        """
        
        try:
            print("🌐 Scraping with very specific column identification...")
            result = app.scrape(
                rotowire_url,
                formats=[{
                    "type": "json",
                    "prompt": specific_prompt
                }],
                only_main_content=False,
                timeout=120000
            )
            
            print("✅ Scraping completed successfully!")
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
                print("📊 DETAILED COLUMN MAPPING DATA:")
                print("-" * 40)
                print(json.dumps(json_data, indent=2))
                print()
                
                # Analyze the first few players to verify mapping
                players = json_data.get('players', [])
                if players:
                    print("🔍 DETAILED ANALYSIS OF FIRST 5 PLAYERS:")
                    print("-" * 40)
                    
                    for i, player in enumerate(players[:5]):
                        print(f"Player {i+1}: {player.get('name', 'Unknown')}")
                        print(f"  Position: {player.get('position', 'Unknown')}")
                        print(f"  Team: {player.get('team', 'Unknown')}")
                        print(f"  Salary: ${player.get('salary', 0)}")
                        print(f"  Roster % (RST%): {player.get('roster_percentage', 'Unknown')}")
                        print(f"  Fantasy Points (FPTS): {player.get('fantasy_points', 'Unknown')}")
                        print(f"  Team Total (TM/P): {player.get('team_total', 'Unknown')}")
                        print()
                    
                    print("📋 VERIFICATION CHECKLIST:")
                    print("Please verify that:")
                    print("1. ✅ roster_percentage values are in 0-100% range (ownership)")
                    print("2. ✅ fantasy_points values vary by player (projected points)")
                    print("3. ✅ team_total values are the same for players on same team")
                    print("4. ✅ salary values match DraftKings pricing")
                else:
                    print("⚠️  No player data found")
            else:
                print("⚠️  No JSON data found in response")
            
        except Exception as e:
            print(f"❌ Error with specific scraping: {e}")
            return False
        
        print()
        print("="*60)
        print("🎉 Specific column mapping test completed!")
        
        return True
        
    except ImportError as e:
        print(f"❌ Import error: {e}")
        return False
    except Exception as e:
        print(f"❌ Unexpected error: {e}")
        return False

def main():
    """Run the specific column mapping test."""
    success = test_very_specific_rotowire_scraping()
    
    if success:
        print("\n✅ Test completed successfully!")
        print("\n💡 Based on the results above:")
        print("1. Check if roster_percentage values look like ownership percentages")
        print("2. Check if fantasy_points values look like individual player projections")
        print("3. Check if team_total values are consistent for same-team players")
        print("4. If mapping is correct, we can update the main service")
    else:
        print("\n❌ Test failed. Please check the setup requirements.")
        return 1
    
    return 0

if __name__ == "__main__":
    sys.exit(main())
