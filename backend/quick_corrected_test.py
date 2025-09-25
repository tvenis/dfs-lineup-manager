#!/usr/bin/env python3
"""
Quick test of the corrected scrape_ownership_data function.
"""

import os
import sys
import json

def quick_corrected_test():
    """Quick test for corrected mapping."""
    print("🚀 Quick Corrected Mapping Test")
    print("="*50)
    
    # Check for API key
    api_key = os.getenv("FIRECRAWL_API_KEY")
    if not api_key:
        print("❌ FIRECRAWL_API_KEY not set")
        return False
    
    print(f"✅ API Key found: {api_key[:8]}...")
    
    try:
        from app.services.firecrawl_service import scrape_ownership_data
        
        print("🌐 Testing corrected scrape_ownership_data function...")
        data = scrape_ownership_data(slate_id="8602")
        
        print("✅ Scraping completed!")
        print("\n📊 RESULTS:")
        print(json.dumps(data, indent=2))
        
        # Quick validation
        players = data.get("players", [])
        if players:
            print(f"\n📈 Quick Stats:")
            print(f"   Total players: {len(players)}")
            
            # Check for Christian McCaffrey
            cmc_found = False
            for player in players:
                if "Christian McCaffrey" in player.get('name', ''):
                    cmc_found = True
                    print(f"\n🔍 Christian McCaffrey:")
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
                        print(f"   ✅ No unwanted fields")
                    
                    # Expected values
                    expected_ownership = 24.84  # RST%
                    expected_projected = 23.51  # FPTS
                    
                    actual_ownership = player.get('ownership_percentage', 0)
                    actual_projected = player.get('projected_points', 0)
                    
                    print(f"\n   📊 Expected vs Actual:")
                    print(f"   Ownership: {actual_ownership} (expected {expected_ownership})")
                    print(f"   Projected: {actual_projected} (expected {expected_projected})")
                    
                    ownership_match = abs(actual_ownership - expected_ownership) < 0.1
                    projected_match = abs(actual_projected - expected_projected) < 0.1
                    
                    print(f"   Ownership match: {'✅' if ownership_match else '❌'}")
                    print(f"   Projected match: {'✅' if projected_match else '❌'}")
                    
                    if ownership_match and projected_match and not found_unwanted:
                        print(f"\n🎉 MAPPING CORRECTED SUCCESSFULLY!")
                    else:
                        print(f"\n⚠️  Mapping still needs work")
                    
                    break
            
            if not cmc_found:
                print("❌ Christian McCaffrey not found")
            
            # Show first few players
            print(f"\n📋 First 3 players:")
            for i, player in enumerate(players[:3]):
                name = player.get('name', 'Unknown')
                ownership = player.get('ownership_percentage', 0)
                projected = player.get('projected_points', 0)
                print(f"   {i+1}. {name}: {ownership}% owned, {projected} FPTS")
        
        return True
        
    except Exception as e:
        print(f"❌ Error: {e}")
        return False

if __name__ == "__main__":
    quick_corrected_test()
