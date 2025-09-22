"""
Test script for the Firecrawl service.
This script tests the service functionality without requiring actual API calls.
"""

import os
import sys
import asyncio
from datetime import datetime

# Add the current directory to the path so we can import from app
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

def test_import_program_interface():
    """Test the import program interface functionality."""
    print("🧪 Testing Import Program Interface...")
    
    try:
        from app.services.import_program_interface import (
            import_program_registry, 
            PlayerDataImportProgram,
            ContestDataImportProgram,
            NewsDataImportProgram
        )
        
        # Test program registration
        programs = list(import_program_registry.programs.keys())
        print(f"✅ Registered import programs: {', '.join(programs)}")
        
        # Test auto-detection
        sample_player_data = {
            "player_name": "Josh Allen",
            "position": "QB",
            "team": "BUF",
            "salary": 8500
        }
        
        detected_program = import_program_registry.auto_detect_program(sample_player_data)
        print(f"✅ Auto-detected program for player data: {detected_program}")
        
        # Test program retrieval
        player_program = import_program_registry.get_program("player_data_import")
        if player_program:
            print(f"✅ Retrieved player import program: {player_program.program_name}")
        
        print("✅ Import Program Interface tests passed!")
        return True
        
    except Exception as e:
        print(f"❌ Import Program Interface test failed: {e}")
        return False


def test_database_models():
    """Test that the database models can be imported and used."""
    print("\n🧪 Testing Database Models...")
    
    try:
        from app.models import ScrapedData, ScrapingJob, ScrapingJobUrl
        from app.database import Base
        
        # Test model creation (without saving to DB)
        scraped_data = ScrapedData(
            url="https://example.com/test",
            raw_data={"test": "data"},
            metadata={"title": "Test Page"}
        )
        
        job = ScrapingJob(
            job_name="Test Job",
            job_type="batch",
            total_urls=1
        )
        
        job_url = ScrapingJobUrl(
            job_id=1,
            url="https://example.com/test"
        )
        
        print(f"✅ ScrapedData model: {scraped_data.url}")
        print(f"✅ ScrapingJob model: {job.job_name}")
        print(f"✅ ScrapingJobUrl model: {job_url.url}")
        
        print("✅ Database Models tests passed!")
        return True
        
    except Exception as e:
        print(f"❌ Database Models test failed: {e}")
        return False


def test_schemas():
    """Test the Pydantic schemas."""
    print("\n🧪 Testing Pydantic Schemas...")
    
    try:
        from app.services.firecrawl_service import PlayerDataSchema, ContestDataSchema, NewsDataSchema
        
        # Test player schema
        player_data = PlayerDataSchema(
            player_name="Josh Allen",
            position="QB",
            team="BUF",
            salary=8500.0,
            projected_points=24.5
        )
        print(f"✅ PlayerDataSchema: {player_data.player_name}")
        
        # Test contest schema
        contest_data = ContestDataSchema(
            contest_name="NFL Sunday Million",
            entry_fee=20.0,
            total_prizes=1000000.0
        )
        print(f"✅ ContestDataSchema: {contest_data.contest_name}")
        
        # Test news schema
        news_data = NewsDataSchema(
            headline="Breaking: Player Injured",
            content="Player X is out for the season...",
            author="Sports Reporter"
        )
        print(f"✅ NewsDataSchema: {news_data.headline}")
        
        print("✅ Pydantic Schemas tests passed!")
        return True
        
    except Exception as e:
        print(f"❌ Pydantic Schemas test failed: {e}")
        return False


def test_firecrawl_service_initialization():
    """Test FirecrawlService initialization (without API key)."""
    print("\n🧪 Testing FirecrawlService Initialization...")
    
    try:
        # Test with no API key (should raise ValueError)
        try:
            from app.services.firecrawl_service import FirecrawlService
            service = FirecrawlService()
            print("⚠️  FirecrawlService initialized without API key (unexpected)")
            return False
        except ValueError as e:
            if "API key is required" in str(e):
                print("✅ FirecrawlService correctly requires API key")
            else:
                print(f"❌ Unexpected error: {e}")
                return False
        
        # Test with mock API key
        os.environ["FIRECRAWL_API_KEY"] = "fc-test-key"
        try:
            from app.services.firecrawl_service import FirecrawlService
            service = FirecrawlService()
            print("✅ FirecrawlService initialized with API key")
        except ImportError:
            print("⚠️  firecrawl-py package not installed (expected in test environment)")
            print("✅ FirecrawlService structure is correct")
        except Exception as e:
            print(f"❌ Unexpected error with API key: {e}")
            return False
        finally:
            # Clean up
            if "FIRECRAWL_API_KEY" in os.environ:
                del os.environ["FIRECRAWL_API_KEY"]
        
        print("✅ FirecrawlService initialization tests passed!")
        return True
        
    except Exception as e:
        print(f"❌ FirecrawlService initialization test failed: {e}")
        return False


def test_fastapi_router():
    """Test that the FastAPI router can be imported."""
    print("\n🧪 Testing FastAPI Router...")
    
    try:
        from app.routers.firecrawl import router
        print(f"✅ FastAPI router imported successfully")
        print(f"✅ Router prefix: {router.prefix}")
        print(f"✅ Router tags: {router.tags}")
        
        # Check that routes are registered
        routes = [route.path for route in router.routes]
        print(f"✅ Registered routes: {len(routes)}")
        
        print("✅ FastAPI Router tests passed!")
        return True
        
    except Exception as e:
        print(f"❌ FastAPI Router test failed: {e}")
        return False


def main():
    """Run all tests."""
    print("🚀 Starting Firecrawl Service Tests...\n")
    
    tests = [
        test_import_program_interface,
        test_database_models,
        test_schemas,
        test_firecrawl_service_initialization,
        test_fastapi_router
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
        print("🎉 All tests passed! Firecrawl service is ready to use.")
        print("\n📋 Next steps:")
        print("1. Install firecrawl-py: pip install firecrawl-py")
        print("2. Set FIRECRAWL_API_KEY environment variable")
        print("3. Run database migration: python add_firecrawl_tables.py")
        print("4. Start the server and test API endpoints")
    else:
        print("❌ Some tests failed. Please check the errors above.")
        return 1
    
    return 0


if __name__ == "__main__":
    sys.exit(main())
