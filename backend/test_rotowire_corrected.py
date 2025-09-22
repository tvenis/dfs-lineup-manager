#!/usr/bin/env python3
"""
Corrected script to scrape RotoWire ownership data with proper field mapping.
Maps RST% to ownership_percentage and FPTS to projected_points.
"""

import os
import sys
import json
from datetime import datetime

def test_corrected_rotowire_scraping():
    """Test scraping RotoWire ownership data with corrected field mapping."""
    print("🚀 Corrected RotoWire Ownership Data Scraping Test")
    print("="*60)
    
    # Set up environment
    os.environ["FIRECRAWL_API_KEY"] = os.getenv("FIRECRAWL_API_KEY", "")
    
    # RotoWire URL
    rotowire_url = "https://www.rotowire.com/daily/nfl/proj-roster-percent.php?site=DraftKings"
    
    print(f"🎯 Target URL: {rotowire_url}")
    print(f"📅 Test Time: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    print()
    
    try:
        # Import Firecrawl directly
        from firecrawl import Firecrawl
        
        print("🔧 Initializing Firecrawl client...")
        app = Firecrawl(api_key=os.getenv("FIRECRAWL_API_KEY"))
        print("✅ Firecrawl client initialized successfully")
        print()
        
        # Corrected prompt with proper field mapping
        print("📊 Scraping with CORRECTED field mapping")
        print("-" * 40)
        
        corrected_prompt = """
        Extract DFS ownership data from this RotoWire page. For each player, extract:
        - name: Player name
        - position: QB/RB/WR/TE/K/DST
        - team: Team abbreviation
        - salary: DraftKings salary
        - ownership_percentage: From RST% column (roster percentage 0-100%)
        - projected_points: From FPTS column (fantasy points prediction)
        - opponent: Opposing team
        - game_info: Team @ Opponent
        
        Return as JSON with "players" array containing all player data.
        Map RST% to ownership_percentage and FPTS to projected_points.
        """
        
        try:
            print("🌐 Scraping page with corrected field mapping...")
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
            elif isinstance(result, dict) and result.get("success"):
                data = result.get("data", {})
                json_data = data.get("json", {})
            else:
                # Try to extract JSON from the string representation
                import re
                json_match = re.search(r"'json':\s*({.*})", str(result))
                if json_match:
                    try:
                        json_data = eval(json_match.group(1))
                    except:
                        pass
            
            if json_data:
                print("📊 CORRECTED JSON DATA:")
                print("-" * 40)
                print(json.dumps(json_data, indent=2))
                print()
                
                # Display summary with corrected field validation
                players = json_data.get('players', [])
                print(f"📈 CORRECTED FIELD MAPPING SUMMARY:")
                print(f"   Total players extracted: {len(players)}")
                
                if players:
                    # Group by position
                    by_position = {}
                    for player in players:
                        pos = player.get('position', 'Unknown')
                        if pos not in by_position:
                            by_position[pos] = []
                        by_position[pos].append(player)
                    
                    print(f"   Players by position:")
                    for position, pos_players in by_position.items():
                        print(f"     {position}: {len(pos_players)} players")
                    
                    # Show top owned players with corrected fields
                    print(f"   Top owned players (RST% - Roster Percentage):")
                    sorted_players = sorted(players, key=lambda p: p.get('ownership_percentage', 0), reverse=True)
                    for i, player in enumerate(sorted_players[:5]):
                        name = player.get('name', 'Unknown')
                        ownership = player.get('ownership_percentage', 0)
                        position = player.get('position', 'Unknown')
                        team = player.get('team', 'Unknown')
                        salary = player.get('salary', 0)
                        projected = player.get('projected_points', 0)
                        print(f"     {i+1}. {name} ({position}, {team}) - {ownership}% owned, ${salary}, {projected} FPTS")
                    
                    # Validate field mapping
                    print(f"\n🔍 FIELD MAPPING VALIDATION:")
                    sample_player = players[0] if players else {}
                    
                    ownership_val = sample_player.get('ownership_percentage', 0)
                    projected_val = sample_player.get('projected_points', 0)
                    
                    print(f"   Sample player: {sample_player.get('name', 'Unknown')}")
                    print(f"   ownership_percentage (RST%): {ownership_val}")
                    print(f"   projected_points (FPTS): {projected_val}")
                    
                    # Check if values look reasonable
                    if 0 <= ownership_val <= 100:
                        print(f"   ✅ ownership_percentage looks like a percentage (0-100%)")
                    else:
                        print(f"   ⚠️  ownership_percentage doesn't look like a percentage")
                    
                    if 0 <= projected_val <= 50:
                        print(f"   ✅ projected_points looks like fantasy points (0-50 range)")
                    else:
                        print(f"   ⚠️  projected_points doesn't look like typical fantasy points")
                
                # Display slate info
                slate_info = json_data.get('slate_info', {})
                if slate_info:
                    print(f"\n📅 SLATE INFO:")
                    print(f"   Slate: {slate_info.get('slate_type', 'Unknown')} on {slate_info.get('date', 'Unknown')}")
                    games = slate_info.get('games', [])
                    if games:
                        print(f"   Games: {', '.join(games[:3])}{'...' if len(games) > 3 else ''}")
            else:
                print("⚠️  No JSON data found in response")
            
            # Display metadata if available
            if hasattr(result, 'metadata') and result.metadata:
                metadata = result.metadata
                print(f"\n📄 PAGE METADATA:")
                print(f"   Title: {getattr(metadata, 'title', 'Unknown')}")
                print(f"   Source URL: {getattr(metadata, 'source_url', 'Unknown')}")
                print(f"   Status Code: {getattr(metadata, 'status_code', 'Unknown')}")
            
        except Exception as e:
            print(f"❌ Error with corrected scraping: {e}")
            return False
        
        print()
        print("="*60)
        print("🎉 Corrected RotoWire scraping test completed!")
        print("\n📋 Please verify the corrected field mapping:")
        print("1. ✅ ownership_percentage should be from RST% column (0-100% range)")
        print("2. ✅ projected_points should be from FPTS column (fantasy points)")
        print("3. ✅ salary should be DraftKings salary")
        print("4. ✅ name, position, team should be correct")
        
        return True
        
    except ImportError as e:
        print(f"❌ Import error: {e}")
        print("\nMake sure you have installed firecrawl-py:")
        print("pip install firecrawl-py")
        return False
    except Exception as e:
        print(f"❌ Unexpected error: {e}")
        return False

def main():
    """Run the corrected scraping test."""
    success = test_corrected_rotowire_scraping()
    
    if success:
        print("\n✅ Test completed successfully!")
        print("\n💡 If the field mapping looks correct now:")
        print("1. Update the main Firecrawl service with this corrected prompt")
        print("2. Test with different RotoWire pages (Main slate vs Showdown)")
        print("3. Integrate with your DFS lineup optimization")
        print("4. Set up automated scraping with correct field mapping")
    else:
        print("\n❌ Test failed. Please check the setup requirements.")
        return 1
    
    return 0

if __name__ == "__main__":
    sys.exit(main())
