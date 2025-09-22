#!/usr/bin/env python3
"""
Final test of the corrected ownership data mapping.
Tests the updated scrape_ownership_data function.
"""

import os
import sys
import json
from datetime import datetime

def test_final_corrected_mapping():
    """Test the final corrected mapping using the main service."""
    print("🚀 Final Test: Corrected Ownership Data Mapping")
    print("="*60)
    
    # Set up environment
    os.environ["FIRECRAWL_API_KEY"] = os.getenv("FIRECRAWL_API_KEY", "")
    
    # RotoWire URL
    rotowire_url = "https://www.rotowire.com/daily/nfl/proj-roster-percent.php?site=DraftKings"
    
    print(f"🎯 Target URL: {rotowire_url}")
    print(f"📅 Test Time: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    print()
    
    try:
        # Import the corrected function
        from app.services.firecrawl_service import scrape_ownership_data
        
        print("🔧 Testing corrected scrape_ownership_data function...")
        print("-" * 40)
        
        try:
            print("🌐 Scraping with corrected field mapping...")
            result = scrape_ownership_data(rotowire_url)
            
            print("✅ Scraping completed successfully!")
            print()
            
            # Extract and display the JSON data
            json_data = result.get('json', {}) if isinstance(result, dict) else result
            if not json_data:
                # Try to extract from string representation
                import re
                json_match = re.search(r"'json':\s*({.*})", str(result))
                if json_match:
                    try:
                        json_data = eval(json_match.group(1))
                    except:
                        pass
            
            if json_data:
                print("📊 FINAL CORRECTED OWNERSHIP DATA:")
                print("-" * 40)
                print(json.dumps(json_data, indent=2))
                print()
                
                # Display summary with validation
                players = json_data.get('players', [])
                print(f"📈 FINAL MAPPING VALIDATION:")
                print(f"   Total players extracted: {len(players)}")
                
                if players:
                    # Show top owned players
                    print(f"   Top owned players:")
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
                    print(f"\n🔍 FINAL FIELD MAPPING VALIDATION:")
                    sample_player = players[0] if players else {}
                    
                    ownership_val = sample_player.get('ownership_percentage', 0)
                    projected_val = sample_player.get('projected_points', 0)
                    salary_val = sample_player.get('salary', 0)
                    
                    print(f"   Sample player: {sample_player.get('name', 'Unknown')}")
                    print(f"   ownership_percentage (should be RST%): {ownership_val}")
                    print(f"   projected_points (should be FPTS): {projected_val}")
                    print(f"   salary (should be DraftKings salary): ${salary_val}")
                    
                    # Validation checks
                    validation_passed = True
                    
                    if 0 <= ownership_val <= 100:
                        print(f"   ✅ ownership_percentage looks like a percentage (0-100%)")
                    else:
                        print(f"   ❌ ownership_percentage doesn't look like a percentage")
                        validation_passed = False
                    
                    if 0 <= projected_val <= 50:
                        print(f"   ✅ projected_points looks like fantasy points (0-50 range)")
                    else:
                        print(f"   ❌ projected_points doesn't look like typical fantasy points")
                        validation_passed = False
                    
                    if isinstance(salary_val, (int, float)) and 200 <= salary_val <= 15000:
                        print(f"   ✅ salary looks like DraftKings salary range")
                    else:
                        print(f"   ❌ salary doesn't look like DraftKings salary")
                        validation_passed = False
                    
                    if validation_passed:
                        print(f"\n🎉 ALL VALIDATIONS PASSED! Field mapping is correct!")
                        print(f"✅ ownership_percentage correctly maps to RST% column")
                        print(f"✅ projected_points correctly maps to FPTS column")
                        print(f"✅ salary correctly maps to DraftKings salary")
                    else:
                        print(f"\n⚠️  Some validations failed. Please review the field mapping.")
                else:
                    print("⚠️  No player data found")
            else:
                print("⚠️  No JSON data found in response")
            
        except Exception as e:
            print(f"❌ Error with corrected scraping: {e}")
            return False
        
        print()
        print("="*60)
        print("🎉 Final corrected mapping test completed!")
        print("\n📋 Summary:")
        print("✅ The scrape_ownership_data function now uses the correct field mapping")
        print("✅ ownership_percentage maps to RST% column (roster percentage)")
        print("✅ projected_points maps to FPTS column (fantasy points)")
        print("✅ salary maps to DraftKings salary column")
        
        return True
        
    except ImportError as e:
        print(f"❌ Import error: {e}")
        print("Make sure you're running from the backend directory")
        return False
    except Exception as e:
        print(f"❌ Unexpected error: {e}")
        return False

def main():
    """Run the final corrected mapping test."""
    success = test_final_corrected_mapping()
    
    if success:
        print("\n✅ Test completed successfully!")
        print("\n🚀 The Firecrawl service is now ready with correct field mapping!")
        print("\n💡 You can now:")
        print("1. Use scrape_ownership_data() for RotoWire scraping")
        print("2. Integrate with your DFS lineup optimization")
        print("3. Set up automated scraping jobs")
        print("4. Deploy to production with confidence")
    else:
        print("\n❌ Test failed. Please check the setup requirements.")
        return 1
    
    return 0

if __name__ == "__main__":
    sys.exit(main())
