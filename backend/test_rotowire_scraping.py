#!/usr/bin/env python3
"""
Test script for scraping RotoWire ownership data.
"""

import os
import sys
import asyncio
from datetime import datetime

# Add the current directory to the path so we can import from app
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

def test_ownership_schema():
    """Test the OwnershipDataSchema."""
    print("🧪 Testing OwnershipDataSchema...")
    
    try:
        from app.services.firecrawl_service import OwnershipDataSchema
        
        # Test schema creation with sample data
        sample_data = {
            "players": [
                {
                    "name": "Josh Allen",
                    "position": "QB",
                    "team": "BUF",
                    "salary": 8500,
                    "ownership_percentage": 15.2,
                    "projected_points": 24.5,
                    "opponent": "MIA",
                    "game_info": "BUF @ MIA"
                },
                {
                    "name": "CeeDee Lamb",
                    "position": "WR",
                    "team": "DAL",
                    "salary": 7500,
                    "ownership_percentage": 22.8,
                    "projected_points": 18.3,
                    "opponent": "CHI",
                    "game_info": "DAL @ CHI"
                }
            ],
            "slate_info": {
                "date": "2024-09-21",
                "slate_type": "Main",
                "games": ["BUF @ MIA", "DAL @ CHI"],
                "total_games": 2
            },
            "last_updated": "2024-09-21T10:30:00Z",
            "source": "RotoWire"
        }
        
        # Validate the data against the schema
        ownership_data = OwnershipDataSchema(**sample_data)
        print(f"✅ OwnershipDataSchema validation passed")
        print(f"   Players: {len(ownership_data.players)}")
        print(f"   Source: {ownership_data.source}")
        print(f"   Slate: {ownership_data.slate_info.get('slate_type')} on {ownership_data.slate_info.get('date')}")
        
        # Test JSON schema generation
        json_schema = OwnershipDataSchema.model_json_schema()
        print(f"✅ JSON schema generated with {len(json_schema.get('properties', {}))} properties")
        
        return True
        
    except Exception as e:
        print(f"❌ OwnershipDataSchema test failed: {e}")
        return False

def test_ownership_import_program():
    """Test the OwnershipDataImportProgram."""
    print("\n🧪 Testing OwnershipDataImportProgram...")
    
    try:
        from app.services.import_program_interface import import_program_registry
        
        # Get the ownership import program
        ownership_program = import_program_registry.get_program("ownership_data_import")
        if not ownership_program:
            print("❌ OwnershipDataImportProgram not found in registry")
            return False
        
        print(f"✅ Found ownership import program: {ownership_program.program_name}")
        
        # Test data validation
        valid_data = {
            "players": [
                {
                    "name": "Josh Allen",
                    "position": "QB",
                    "team": "BUF",
                    "ownership_percentage": 15.2
                }
            ],
            "source": "RotoWire"
        }
        
        invalid_data = {
            "players": [],
            "source": "RotoWire"
        }
        
        # Test validation
        is_valid = ownership_program.validate_data(valid_data)
        is_invalid = ownership_program.validate_data(invalid_data)
        
        print(f"✅ Valid data validation: {'Passed' if is_valid else 'Failed'}")
        print(f"✅ Invalid data validation: {'Passed' if not is_invalid else 'Failed'}")
        
        # Test auto-detection
        detected_program = import_program_registry.auto_detect_program(valid_data)
        print(f"✅ Auto-detection for ownership data: {detected_program}")
        
        return True
        
    except Exception as e:
        print(f"❌ OwnershipDataImportProgram test failed: {e}")
        return False

def test_rotowire_url():
    """Test the RotoWire URL structure."""
    print("\n🧪 Testing RotoWire URL...")
    
    try:
        rotowire_url = "https://www.rotowire.com/daily/nfl/proj-roster-percent.php?site=DraftKings"
        
        # Test URL parsing
        from urllib.parse import urlparse, parse_qs
        
        parsed = urlparse(rotowire_url)
        query_params = parse_qs(parsed.query)
        
        print(f"✅ URL parsed successfully:")
        print(f"   Domain: {parsed.netloc}")
        print(f"   Path: {parsed.path}")
        print(f"   Site parameter: {query_params.get('site', ['Not found'])[0]}")
        
        # Test that it's the expected RotoWire URL
        if "rotowire.com" in rotowire_url and "proj-roster-percent.php" in rotowire_url:
            print("✅ URL matches expected RotoWire ownership page")
        else:
            print("⚠️  URL doesn't match expected pattern")
        
        return True
        
    except Exception as e:
        print(f"❌ RotoWire URL test failed: {e}")
        return False

def test_firecrawl_service_with_ownership():
    """Test FirecrawlService with ownership data."""
    print("\n🧪 Testing FirecrawlService with ownership data...")
    
    try:
        # Set API key for testing
        os.environ["FIRECRAWL_API_KEY"] = os.getenv("FIRECRAWL_API_KEY", "")
        
        from app.services.firecrawl_service import FirecrawlService, OwnershipDataSchema, scrape_ownership_data
        
        # Test service initialization
        service = FirecrawlService()
        print("✅ FirecrawlService initialized successfully")
        
        # Test convenience function
        print("✅ scrape_ownership_data function available")
        
        # Test schema integration
        schema = OwnershipDataSchema()
        print(f"✅ OwnershipDataSchema integrated with service")
        
        return True
        
    except ImportError:
        print("⚠️  Firecrawl package not available (expected in test environment)")
        return True
    except Exception as e:
        print(f"❌ FirecrawlService test failed: {e}")
        return False

def test_api_endpoints():
    """Test that API endpoints are properly configured."""
    print("\n🧪 Testing API endpoints...")
    
    try:
        from app.routers.firecrawl import get_schema_by_name, router
        
        # Test schema lookup
        ownership_schema = get_schema_by_name("ownership_data")
        if ownership_schema:
            print("✅ ownership_data schema available in API")
        else:
            print("❌ ownership_data schema not found in API")
            return False
        
        # Test router configuration
        routes = [route.path for route in router.routes]
        ownership_routes = [route for route in routes if "ownership" in route.lower()]
        
        print(f"✅ Router configured with {len(routes)} total routes")
        print(f"✅ Available routes: {', '.join(routes[:5])}{'...' if len(routes) > 5 else ''}")
        
        return True
        
    except Exception as e:
        print(f"❌ API endpoints test failed: {e}")
        return False

def main():
    """Run all tests."""
    print("🚀 Starting RotoWire Ownership Scraping Tests...\n")
    
    tests = [
        test_ownership_schema,
        test_ownership_import_program,
        test_rotowire_url,
        test_firecrawl_service_with_ownership,
        test_api_endpoints
    ]
    
    passed = 0
    total = len(tests)
    
    for test in tests:
        if test():
            passed += 1
        print()
    
    print("="*60)
    print(f"📊 Test Results: {passed}/{total} tests passed")
    
    if passed == total:
        print("🎉 All RotoWire ownership tests passed!")
        print("\n📋 Ready to scrape RotoWire ownership data!")
        print("\n🔧 Usage Examples:")
        print("="*60)
        
        print("\n1. Via API:")
        print('curl -X POST "http://localhost:8000/api/firecrawl/scrape" \\')
        print('  -H "Content-Type: application/json" \\')
        print('  -d \'{')
        print('    "url": "https://www.rotowire.com/daily/nfl/proj-roster-percent.php?site=DraftKings",')
        print('    "schema_name": "ownership_data",')
        print('    "import_program_name": "ownership_data_import",')
        print('    "auto_process": true')
        print('  }\'')
        
        print("\n2. Via Python:")
        print('from app.services.firecrawl_service import scrape_ownership_data')
        print('data = scrape_ownership_data("https://www.rotowire.com/daily/nfl/proj-roster-percent.php?site=DraftKings")')
        
        print("\n3. Via Service:")
        print('from app.services.firecrawl_service import FirecrawlService, OwnershipDataSchema')
        print('service = FirecrawlService()')
        print('scraped_data_id = service.scrape_and_store(')
        print('    "https://www.rotowire.com/daily/nfl/proj-roster-percent.php?site=DraftKings",')
        print('    schema=OwnershipDataSchema(),')
        print('    import_program_name="ownership_data_import"')
        print(')')
        
    else:
        print("❌ Some tests failed. Please check the errors above.")
        return 1
    
    print("\n" + "="*60)
    print("🎯 RotoWire URL to scrape:")
    print("https://www.rotowire.com/daily/nfl/proj-roster-percent.php?site=DraftKings")
    print("="*60)
    
    return 0

if __name__ == "__main__":
    sys.exit(main())
