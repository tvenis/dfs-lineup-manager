#!/usr/bin/env python3
"""
Quick test script for Week 4 scraping once API key is set.
This will test slate_id="8602" and show the results for field mapping verification.
"""

import os
import sys
import json

def quick_week4_test():
    """Quick test for Week 4 with slate_id=8602."""
    print("🚀 Quick Week 4 Test (slate_id=8602)")
    print("="*50)
    
    # Check for API key
    api_key = os.getenv("FIRECRAWL_API_KEY")
    if not api_key:
        print("❌ FIRECRAWL_API_KEY not set")
        print("Set it with: export FIRECRAWL_API_KEY='your_key_here'")
        return False
    
    print(f"✅ API Key found: {api_key[:8]}...")
    
    try:
        from app.services.firecrawl_service import scrape_ownership_data
        
        print("🌐 Scraping Week 4 data...")
        data = scrape_ownership_data(slate_id="8602")
        
        print("✅ Scraping completed!")
        print("\n📊 RESULTS:")
        print(json.dumps(data, indent=2))
        
        # Quick validation
        players = data.get("players", [])
        if players:
            print(f"\n📈 Quick Stats:")
            print(f"   Total players: {len(players)}")
            
            # Show first few players
            print(f"\n🔍 First 5 players:")
            for i, player in enumerate(players[:5]):
                name = player.get('name', 'Unknown')
                ownership = player.get('ownership_percentage', 0)
                projected = player.get('projected_points', 0)
                salary = player.get('salary', 0)
                print(f"   {i+1}. {name}: {ownership}% owned, {projected} FPTS, ${salary}")
        
        return True
        
    except Exception as e:
        print(f"❌ Error: {e}")
        return False

if __name__ == "__main__":
    quick_week4_test()
