#!/usr/bin/env python3
"""
Standalone script to scrape RotoWire ownership data using Firecrawl directly.
No database dependencies - just pure scraping and JSON output.
"""

import os
import sys
import json
from datetime import datetime

def test_rotowire_scraping_standalone():
    """Test scraping RotoWire ownership data using Firecrawl directly."""
    print("🚀 Standalone RotoWire Ownership Data Scraping Test")
    print("="*60)
    
    # Set up environment
    os.environ["FIRECRAWL_API_KEY"] = "fc-91a8ab6e29dc438caaa9afac2f935a12"
    
    # RotoWire URL
    rotowire_url = "https://www.rotowire.com/daily/nfl/proj-roster-percent.php?site=DraftKings"
    
    print(f"🎯 Target URL: {rotowire_url}")
    print(f"📅 Test Time: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    print()
    
    try:
        # Import Firecrawl directly (no database dependencies)
        from firecrawl import Firecrawl
        
        print("🔧 Initializing Firecrawl client...")
        app = Firecrawl(api_key=os.getenv("FIRECRAWL_API_KEY"))
        print("✅ Firecrawl client initialized successfully")
        print()
        
        # Test 1: Scrape with custom prompt
        print("📊 Test 1: Scraping with custom prompt")
        print("-" * 40)
        
        custom_prompt = """
        Extract DFS ownership data from this RotoWire page. Return a JSON object with the following structure:
        
        {
            "players": [
                {
                    "name": "Player Name",
                    "position": "QB/RB/WR/TE/K/DST",
                    "team": "Team abbreviation (e.g., BUF, DAL)",
                    "salary": salary_amount_as_number,
                    "ownership_percentage": percentage_as_number,
                    "projected_points": projected_fantasy_points_as_number,
                    "opponent": "Opposing team abbreviation",
                    "game_info": "Team @ Opponent"
                }
            ],
            "slate_info": {
                "date": "YYYY-MM-DD",
                "slate_type": "Main/Showdown/etc",
                "games": ["Team @ Opponent"],
                "total_games": number
            },
            "last_updated": "ISO_timestamp",
            "source": "RotoWire"
        }
        
        Extract all players with their DraftKings ownership percentages, salaries, and projected points.
        Focus on the main slate data and include all positions (QB, RB, WR, TE, K, DST).
        """
        
        try:
            print("🌐 Scraping page with custom prompt...")
            result = app.scrape(
                rotowire_url,
                formats=[{
                    "type": "json",
                    "prompt": custom_prompt
                }],
                only_main_content=False,
                timeout=120000
            )
            
            print("✅ Scraping completed successfully!")
            print()
            
            # Display the raw response (handle non-serializable objects)
            print("📋 RAW FIRECRAWL RESPONSE:")
            print("-" * 40)
            try:
                print(json.dumps(result, indent=2, default=str))
            except Exception as e:
                print(f"Raw response (non-JSON): {result}")
                print(f"Response type: {type(result)}")
            print()
            
            # Extract and display the JSON data
            # Handle different response formats
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
                print("📊 EXTRACTED JSON DATA:")
                print("-" * 40)
                print(json.dumps(json_data, indent=2))
                print()
                
                # Display summary
                players = json_data.get('players', [])
                print(f"📈 SUMMARY:")
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
                    
                    # Show top owned players
                    print(f"   Top owned players:")
                    sorted_players = sorted(players, key=lambda p: p.get('ownership_percentage', 0), reverse=True)
                    for i, player in enumerate(sorted_players[:5]):
                        name = player.get('name', 'Unknown')
                        ownership = player.get('ownership_percentage', 0)
                        position = player.get('position', 'Unknown')
                        team = player.get('team', 'Unknown')
                        salary = player.get('salary', 0)
                        print(f"     {i+1}. {name} ({position}, {team}) - {ownership}% owned, ${salary}")
                
                # Display slate info
                slate_info = json_data.get('slate_info', {})
                if slate_info:
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
            print(f"❌ Error with custom prompt scraping: {e}")
            return False
        
        print()
        print("="*60)
        
        # Test 2: Scrape with a simpler prompt
        print("📊 Test 2: Scraping with simpler prompt")
        print("-" * 40)
        
        simple_prompt = """
        Extract all NFL player ownership data from this DraftKings RotoWire page. 
        For each player, extract: name, position, team, salary, ownership percentage, and projected points.
        Return as JSON with a "players" array containing all the data.
        """
        
        try:
            print("🌐 Scraping page with simpler prompt...")
            simple_result = app.scrape(
                rotowire_url,
                formats=[{
                    "type": "json",
                    "prompt": simple_prompt
                }],
                only_main_content=False,
                timeout=120000
            )
            
            print("✅ Simple prompt scraping completed!")
            print()
            
            if simple_result.get("success"):
                simple_data = simple_result.get("data", {})
                simple_json = simple_data.get("json", {})
                
                if simple_json:
                    print("📋 SIMPLE PROMPT RESPONSE:")
                    print("-" * 40)
                    try:
                        print(json.dumps(simple_json, indent=2, default=str))
                    except Exception as e:
                        print(f"Simple response (non-JSON): {simple_json}")
                        print(f"Response type: {type(simple_json)}")
                    print()
                    
                    # Show comparison
                    if isinstance(simple_json, dict) and "players" in simple_json:
                        simple_players = simple_json.get("players", [])
                        print(f"📈 SIMPLE PROMPT SUMMARY:")
                        print(f"   Total players extracted: {len(simple_players)}")
                        
                        if simple_players:
                            print(f"   Sample players:")
                            for i, player in enumerate(simple_players[:3]):
                                name = player.get('name', 'Unknown')
                                ownership = player.get('ownership_percentage', player.get('ownership', 0))
                                position = player.get('position', 'Unknown')
                                team = player.get('team', 'Unknown')
                                print(f"     {i+1}. {name} ({position}, {team}) - {ownership}% owned")
                else:
                    print("⚠️  No JSON data found in simple prompt response")
            else:
                print(f"❌ Simple prompt scraping failed: {simple_result}")
        
        except Exception as e:
            print(f"❌ Error with simple prompt scraping: {e}")
        
        print()
        print("="*60)
        print("🎉 RotoWire scraping test completed!")
        print("\n📋 Review the JSON data above to verify:")
        print("1. ✅ Player names are correctly extracted")
        print("2. ✅ Ownership percentages are realistic (0-100%)")
        print("3. ✅ Salaries match DraftKings pricing")
        print("4. ✅ Positions are correct (QB, RB, WR, TE, K, DST)")
        print("5. ✅ Team abbreviations are accurate")
        print("6. ✅ Projected points are reasonable")
        
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
    """Run the standalone scraping test."""
    success = test_rotowire_scraping_standalone()
    
    if success:
        print("\n✅ Test completed successfully!")
        print("\n💡 If the data looks good, you can now:")
        print("1. Use this data in your DFS lineup optimization")
        print("2. Set up database storage for future scraping")
        print("3. Integrate with your existing DFS app")
        print("4. Create automated scraping jobs")
    else:
        print("\n❌ Test failed. Please check the setup requirements.")
        return 1
    
    return 0

if __name__ == "__main__":
    sys.exit(main())
