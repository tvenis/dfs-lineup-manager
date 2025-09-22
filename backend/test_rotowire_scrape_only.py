#!/usr/bin/env python3
"""
Simple script to scrape RotoWire ownership data and print the JSON response.
No database operations - just scraping and displaying the results.
"""

import os
import sys
import json
from datetime import datetime

# Add the current directory to the path so we can import from app
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

def test_rotowire_scraping():
    """Test scraping RotoWire ownership data and display the results."""
    print("🚀 Testing RotoWire Ownership Data Scraping")
    print("="*60)
    
    # Set up environment
    os.environ["FIRECRAWL_API_KEY"] = "fc-91a8ab6e29dc438caaa9afac2f935a12"
    
    # RotoWire URL
    rotowire_url = "https://www.rotowire.com/daily/nfl/proj-roster-percent.php?site=DraftKings"
    
    print(f"🎯 Target URL: {rotowire_url}")
    print(f"📅 Test Time: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    print()
    
    try:
        from app.services.firecrawl_service import FirecrawlService, OwnershipDataSchema
        
        # Initialize the service
        print("🔧 Initializing Firecrawl service...")
        service = FirecrawlService()
        print("✅ Service initialized successfully")
        print()
        
        # Test 1: Scrape with custom prompt (more flexible)
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
            scraped_data = service.scrape_with_prompt(
                rotowire_url,
                custom_prompt,
                timeout=120000,
                only_main_content=False
            )
            
            print("✅ Scraping completed successfully!")
            print()
            
            # Display the raw response
            print("📋 RAW RESPONSE:")
            print("-" * 40)
            print(json.dumps(scraped_data, indent=2))
            print()
            
            # Extract and display the JSON data
            json_data = scraped_data.get('json', {})
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
                        print(f"     {i+1}. {name} ({position}, {team}) - {ownership}% owned")
                
                # Display slate info
                slate_info = json_data.get('slate_info', {})
                if slate_info:
                    print(f"   Slate: {slate_info.get('slate_type', 'Unknown')} on {slate_info.get('date', 'Unknown')}")
                    games = slate_info.get('games', [])
                    if games:
                        print(f"   Games: {', '.join(games[:3])}{'...' if len(games) > 3 else ''}")
            else:
                print("⚠️  No JSON data found in response")
            
            # Display metadata
            metadata = scraped_data.get('metadata', {})
            if metadata:
                print(f"\n📄 PAGE METADATA:")
                print(f"   Title: {metadata.get('title', 'Unknown')}")
                print(f"   Description: {metadata.get('description', 'Unknown')}")
                print(f"   Source URL: {metadata.get('sourceURL', 'Unknown')}")
            
        except Exception as e:
            print(f"❌ Error with custom prompt scraping: {e}")
            return False
        
        print()
        print("="*60)
        
        # Test 2: Scrape with schema (if custom prompt worked)
        if json_data and json_data.get('players'):
            print("📊 Test 2: Scraping with ownership schema")
            print("-" * 40)
            
            try:
                print("🌐 Scraping page with ownership schema...")
                schema_data = service.scrape_with_schema(
                    rotowire_url,
                    OwnershipDataSchema(),
                    timeout=120000,
                    only_main_content=False
                )
                
                print("✅ Schema scraping completed successfully!")
                print()
                
                # Display schema response
                schema_json = schema_data.get('json', {})
                if schema_json:
                    print("📋 SCHEMA RESPONSE:")
                    print("-" * 40)
                    print(json.dumps(schema_json, indent=2))
                    print()
                    
                    # Compare with custom prompt results
                    schema_players = schema_json.get('players', [])
                    print(f"📈 SCHEMA SUMMARY:")
                    print(f"   Total players extracted: {len(schema_players)}")
                    
                    if schema_players:
                        # Show first few players
                        print(f"   Sample players:")
                        for i, player in enumerate(schema_players[:3]):
                            name = player.get('name', 'Unknown')
                            ownership = player.get('ownership_percentage', 0)
                            position = player.get('position', 'Unknown')
                            team = player.get('team', 'Unknown')
                            salary = player.get('salary', 0)
                            print(f"     {i+1}. {name} ({position}, {team}) - {ownership}% owned, ${salary}")
                else:
                    print("⚠️  No JSON data found in schema response")
                
            except Exception as e:
                print(f"❌ Error with schema scraping: {e}")
        
        print()
        print("="*60)
        print("🎉 RotoWire scraping test completed!")
        print("\n📋 Next steps:")
        print("1. Review the JSON data above to ensure it looks correct")
        print("2. Check that ownership percentages and salaries are properly extracted")
        print("3. Verify that player names, positions, and teams are accurate")
        print("4. If satisfied, you can integrate this with your DFS app")
        
        return True
        
    except ImportError as e:
        print(f"❌ Import error: {e}")
        print("\nMake sure you have:")
        print("1. Installed firecrawl-py: pip install firecrawl-py")
        print("2. Set FIRECRAWL_API_KEY environment variable")
        return False
    except Exception as e:
        print(f"❌ Unexpected error: {e}")
        return False

def main():
    """Run the scraping test."""
    success = test_rotowire_scraping()
    
    if success:
        print("\n✅ Test completed successfully!")
        print("\n💡 Tips for reviewing the data:")
        print("- Check that ownership percentages are realistic (0-100%)")
        print("- Verify salaries match DraftKings pricing")
        print("- Ensure player names are spelled correctly")
        print("- Confirm positions match the players")
        print("- Check that team abbreviations are correct")
    else:
        print("\n❌ Test failed. Please check the setup requirements.")
        return 1
    
    return 0

if __name__ == "__main__":
    sys.exit(main())
