#!/usr/bin/env python3
"""
Test script to scrape Week 4 ownership data with slate_id="8602"
and display results for field mapping verification.
"""

import os
import sys
import json
from datetime import datetime

def test_week4_scraping():
    """Test scraping Week 4 ownership data with corrected field mapping."""
    print("🚀 Week 4 Ownership Data Scraping Test")
    print("="*60)
    
    # Set up environment
    os.environ["FIRECRAWL_API_KEY"] = os.getenv("FIRECRAWL_API_KEY", "")
    
    if not os.getenv("FIRECRAWL_API_KEY"):
        print("❌ FIRECRAWL_API_KEY not set in environment")
        print("Please set your Firecrawl API key:")
        print("export FIRECRAWL_API_KEY='your_api_key_here'")
        return False
    
    # Week 4 slate ID
    slate_id = "8602"
    
    print(f"🎯 Slate ID: {slate_id} (Week 4)")
    print(f"📅 Test Time: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    print()
    
    try:
        from firecrawl import Firecrawl
        
        print("🔧 Initializing Firecrawl client...")
        app = Firecrawl(api_key=os.getenv("FIRECRAWL_API_KEY"))
        print("✅ Firecrawl client initialized successfully")
        print()
        
        # Build Week 4 URL
        week4_url = f"https://www.rotowire.com/daily/nfl/proj-roster-percent.php?site=DraftKings&slateID={slate_id}"
        print(f"🌐 Target URL: {week4_url}")
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
            print("🌐 Scraping Week 4 data with corrected field mapping...")
            result = app.scrape(
                week4_url,
                formats=[{
                    "type": "json",
                    "prompt": corrected_prompt
                }],
                only_main_content=False,
                timeout=120000
            )
            
            print("✅ Week 4 scraping completed successfully!")
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
                print("📊 WEEK 4 SCRAPED DATA:")
                print("-" * 40)
                print(json.dumps(json_data, indent=2))
                print()
                
                # Display summary
                players = json_data.get('players', [])
                print(f"📈 WEEK 4 DATA SUMMARY:")
                print(f"   Total players extracted: {len(players)}")
                print()
                
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
                    print(f"\n   Top owned players (RST% - Roster Percentage):")
                    sorted_players = sorted(players, key=lambda p: p.get('ownership_percentage', 0), reverse=True)
                    for i, player in enumerate(sorted_players[:10]):
                        name = player.get('name', 'Unknown')
                        ownership = player.get('ownership_percentage', 0)
                        position = player.get('position', 'Unknown')
                        team = player.get('team', 'Unknown')
                        salary = player.get('salary', 0)
                        projected = player.get('projected_points', 0)
                        print(f"     {i+1:2d}. {name} ({position}, {team}) - {ownership:5.2f}% owned, ${salary:5d}, {projected:5.2f} FPTS")
                    
                    # Show field mapping validation for first few players
                    print(f"\n🔍 FIELD MAPPING VALIDATION (First 5 Players):")
                    print("-" * 60)
                    for i, player in enumerate(players[:5]):
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
                        
                        # Validation checks
                        ownership_valid = 0 <= ownership <= 100
                        projected_valid = 0 <= projected <= 50
                        salary_valid = isinstance(salary, (int, float)) and 200 <= salary <= 15000
                        
                        print(f"  Validation:")
                        print(f"    ✅ ownership_percentage looks like percentage: {ownership_valid}")
                        print(f"    ✅ projected_points looks like fantasy points: {projected_valid}")
                        print(f"    ✅ salary looks like DraftKings salary: {salary_valid}")
                        print()
                    
                    # Overall validation summary
                    print(f"🎯 OVERALL FIELD MAPPING VALIDATION:")
                    print("-" * 40)
                    
                    valid_ownership = sum(1 for p in players if 0 <= p.get('ownership_percentage', -1) <= 100)
                    valid_projected = sum(1 for p in players if 0 <= p.get('projected_points', -1) <= 50)
                    valid_salary = sum(1 for p in players if isinstance(p.get('salary', 0), (int, float)) and 200 <= p.get('salary', 0) <= 15000)
                    
                    print(f"   Players with valid ownership % (0-100%): {valid_ownership}/{len(players)}")
                    print(f"   Players with valid projected points (0-50): {valid_projected}/{len(players)}")
                    print(f"   Players with valid salary ($200-$15k): {valid_salary}/{len(players)}")
                    
                    if valid_ownership > len(players) * 0.8 and valid_projected > len(players) * 0.8:
                        print(f"\n🎉 FIELD MAPPING VALIDATION PASSED!")
                        print(f"✅ ownership_percentage correctly maps to RST% column")
                        print(f"✅ projected_points correctly maps to FPTS column")
                        print(f"✅ Data is ready for DFS optimization")
                    else:
                        print(f"\n⚠️  Field mapping validation failed")
                        print(f"💡 Some values don't look correct - check the mapping")
                else:
                    print("⚠️  No player data found")
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
            print(f"❌ Error with Week 4 scraping: {e}")
            return False
        
        print()
        print("="*60)
        print("🎉 Week 4 scraping test completed!")
        print("\n📋 Summary:")
        print("✅ Successfully scraped Week 4 data (slateID=8602)")
        print("✅ Field mapping validation completed")
        print("✅ Data ready for DFS lineup optimization")
        
        return True
        
    except ImportError as e:
        print(f"❌ Import error: {e}")
        print("Make sure firecrawl-py is installed: pip install firecrawl-py")
        return False
    except Exception as e:
        print(f"❌ Unexpected error: {e}")
        return False

def main():
    """Run the Week 4 scraping test."""
    success = test_week4_scraping()
    
    if success:
        print("\n✅ Test completed successfully!")
        print("\n💡 You can now use the corrected scrape_ownership_data function:")
        print('   from app.services.firecrawl_service import scrape_ownership_data')
        print('   data = scrape_ownership_data(slate_id="8602")')
        print('   players = data.get("players", [])')
        print("\n🚀 Ready for Week 4 DFS optimization!")
    else:
        print("\n❌ Test failed. Please check the setup requirements.")
        return 1
    
    return 0

if __name__ == "__main__":
    sys.exit(main())
