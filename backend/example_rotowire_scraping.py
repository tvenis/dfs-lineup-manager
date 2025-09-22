#!/usr/bin/env python3
"""
Example script for scraping RotoWire ownership data.
This demonstrates how to use the Firecrawl service to extract DFS ownership data.
"""

import os
import sys
import json
from datetime import datetime

# Add the current directory to the path so we can import from app
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

def example_scrape_rotowire_ownership():
    """
    Example of how to scrape RotoWire ownership data.
    This function shows the complete workflow.
    """
    print("🚀 RotoWire Ownership Data Scraping Example")
    print("="*60)
    
    # Set up environment
    os.environ["FIRECRAWL_API_KEY"] = "fc-91a8ab6e29dc438caaa9afac2f935a12"
    
    try:
        from app.services.firecrawl_service import (
            FirecrawlService, 
            OwnershipDataSchema,
            scrape_ownership_data
        )
        
        # RotoWire URL
        rotowire_url = "https://www.rotowire.com/daily/nfl/proj-roster-percent.php?site=DraftKings"
        
        print(f"🎯 Target URL: {rotowire_url}")
        print(f"📅 Date: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
        print()
        
        # Method 1: Using convenience function
        print("Method 1: Using convenience function")
        print("-" * 40)
        try:
            ownership_data = scrape_ownership_data(rotowire_url)
            print("✅ Successfully scraped ownership data!")
            print(f"📊 Players found: {len(ownership_data.get('json', {}).get('players', []))}")
            
            # Display sample data
            players = ownership_data.get('json', {}).get('players', [])
            if players:
                print("\n📋 Sample players:")
                for i, player in enumerate(players[:3]):  # Show first 3 players
                    name = player.get('name', 'Unknown')
                    position = player.get('position', 'Unknown')
                    team = player.get('team', 'Unknown')
                    ownership = player.get('ownership_percentage', 0)
                    salary = player.get('salary', 0)
                    print(f"   {i+1}. {name} ({position}, {team}) - {ownership}% owned, ${salary}")
            
        except Exception as e:
            print(f"❌ Error with convenience function: {e}")
        
        print()
        
        # Method 2: Using FirecrawlService directly
        print("Method 2: Using FirecrawlService directly")
        print("-" * 40)
        try:
            service = FirecrawlService()
            
            # Scrape with schema
            scraped_data = service.scrape_with_schema(
                rotowire_url,
                OwnershipDataSchema(),
                timeout=120000,
                only_main_content=False
            )
            
            print("✅ Successfully scraped with schema!")
            
            # Display metadata
            metadata = scraped_data.get('metadata', {})
            if metadata:
                print(f"📄 Page title: {metadata.get('title', 'Unknown')}")
                print(f"🔗 Source URL: {metadata.get('sourceURL', 'Unknown')}")
            
        except Exception as e:
            print(f"❌ Error with direct service: {e}")
        
        print()
        
        # Method 3: Using custom prompt
        print("Method 3: Using custom prompt")
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
            service = FirecrawlService()
            
            scraped_data = service.scrape_with_prompt(
                rotowire_url,
                custom_prompt,
                timeout=120000,
                only_main_content=False
            )
            
            print("✅ Successfully scraped with custom prompt!")
            
            # Display results
            json_data = scraped_data.get('json', {})
            players = json_data.get('players', [])
            
            print(f"📊 Total players extracted: {len(players)}")
            
            if players:
                # Group by position
                by_position = {}
                for player in players:
                    pos = player.get('position', 'Unknown')
                    if pos not in by_position:
                        by_position[pos] = []
                    by_position[pos].append(player)
                
                print("\n📋 Players by position:")
                for position, pos_players in by_position.items():
                    print(f"   {position}: {len(pos_players)} players")
                    
                    # Show top owned player in each position
                    if pos_players:
                        top_player = max(pos_players, key=lambda p: p.get('ownership_percentage', 0))
                        name = top_player.get('name', 'Unknown')
                        ownership = top_player.get('ownership_percentage', 0)
                        print(f"     Top owned: {name} ({ownership}%)")
            
            # Display slate info
            slate_info = json_data.get('slate_info', {})
            if slate_info:
                print(f"\n📅 Slate: {slate_info.get('slate_type', 'Unknown')} on {slate_info.get('date', 'Unknown')}")
                games = slate_info.get('games', [])
                if games:
                    print(f"🎮 Games: {', '.join(games[:3])}{'...' if len(games) > 3 else ''}")
        
        except Exception as e:
            print(f"❌ Error with custom prompt: {e}")
        
        print()
        
        # Method 4: Store in database (if database is available)
        print("Method 4: Store in database with import processing")
        print("-" * 40)
        
        try:
            service = FirecrawlService()
            
            # This will scrape, store in database, and process with import program
            scraped_data_id = service.scrape_and_store(
                rotowire_url,
                schema=OwnershipDataSchema(),
                import_program_name="ownership_data_import",
                auto_process=True
            )
            
            if scraped_data_id:
                print(f"✅ Successfully stored in database with ID: {scraped_data_id}")
                print("✅ Data processed with ownership import program")
            else:
                print("❌ Failed to store in database")
                
        except Exception as e:
            print(f"⚠️  Database storage failed (database not configured): {e}")
            print("   This is expected if you haven't set up your database connection yet.")
        
        print("\n" + "="*60)
        print("🎉 RotoWire ownership scraping example completed!")
        print("\n📋 Summary of methods:")
        print("1. Convenience function: scrape_ownership_data(url)")
        print("2. Direct service: service.scrape_with_schema(url, schema)")
        print("3. Custom prompt: service.scrape_with_prompt(url, prompt)")
        print("4. Full workflow: service.scrape_and_store(url, schema, import_program)")
        
        return True
        
    except ImportError as e:
        print(f"❌ Import error: {e}")
        print("Make sure you have:")
        print("1. Installed firecrawl-py: pip install firecrawl-py")
        print("2. Set FIRECRAWL_API_KEY environment variable")
        print("3. Set up database connection (for full workflow)")
        return False
    except Exception as e:
        print(f"❌ Unexpected error: {e}")
        return False

def example_api_usage():
    """Example of using the API endpoints."""
    print("\n🌐 API Usage Examples")
    print("="*60)
    
    rotowire_url = "https://www.rotowire.com/daily/nfl/proj-roster-percent.php?site=DraftKings"
    
    print("1. Health check:")
    print('curl "http://localhost:8000/api/firecrawl/health"')
    print()
    
    print("2. Get available schemas:")
    print('curl "http://localhost:8000/api/firecrawl/schemas"')
    print()
    
    print("3. Get available import programs:")
    print('curl "http://localhost:8000/api/firecrawl/import-programs"')
    print()
    
    print("4. Scrape with ownership schema:")
    print(f'curl -X POST "http://localhost:8000/api/firecrawl/scrape" \\')
    print('  -H "Content-Type: application/json" \\')
    print('  -d \'{')
    print('    "url": "' + rotowire_url + '",')
    print('    "schema_name": "ownership_data",')
    print('    "import_program_name": "ownership_data_import",')
    print('    "auto_process": true')
    print('  }\'')
    print()
    
    print("5. Scrape with custom prompt:")
    print(f'curl -X POST "http://localhost:8000/api/firecrawl/scrape" \\')
    print('  -H "Content-Type: application/json" \\')
    print('  -d \'{')
    print('    "url": "' + rotowire_url + '",')
    print('    "custom_prompt": "Extract all DFS ownership data from this RotoWire page...",')
    print('    "auto_process": true')
    print('  }\'')
    print()
    
    print("6. Get scraped data:")
    print('curl "http://localhost:8000/api/firecrawl/scraped-data/1"')
    print()
    
    print("7. Get raw scraped data:")
    print('curl "http://localhost:8000/api/firecrawl/scraped-data/1/raw"')

def main():
    """Run the example."""
    print("🚀 RotoWire Ownership Data Scraping - Complete Example")
    print("="*80)
    
    # Run the scraping example
    success = example_scrape_rotowire_ownership()
    
    # Show API usage examples
    example_api_usage()
    
    if success:
        print("\n🎉 Example completed successfully!")
        print("\n📋 Next steps:")
        print("1. Set up your database connection")
        print("2. Start your FastAPI server: python main.py")
        print("3. Test the API endpoints")
        print("4. Integrate with your DFS lineup optimization")
    else:
        print("\n❌ Example failed. Please check the setup requirements.")
        return 1
    
    return 0

if __name__ == "__main__":
    sys.exit(main())
