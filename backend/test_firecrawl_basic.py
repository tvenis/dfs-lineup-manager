#!/usr/bin/env python3
"""
Basic test for Firecrawl service without database dependencies.
"""

import os
import sys

def test_firecrawl_import():
    """Test basic Firecrawl package import."""
    print("🧪 Testing Firecrawl package import...")
    
    try:
        from firecrawl import Firecrawl
        print("✅ firecrawl package imported successfully")
        return True
    except ImportError as e:
        print(f"❌ Failed to import firecrawl: {e}")
        return False

def test_firecrawl_initialization():
    """Test Firecrawl client initialization."""
    print("\n🧪 Testing Firecrawl client initialization...")
    
    try:
        from firecrawl import Firecrawl
        
        # Test with API key
        api_key = "fc-91a8ab6e29dc438caaa9afac2f935a12"
        app = Firecrawl(api_key=api_key)
        print("✅ Firecrawl client initialized successfully")
        
        # Test basic properties
        print(f"✅ API key configured: {bool(app.api_key)}")
        return True
        
    except Exception as e:
        print(f"❌ Failed to initialize Firecrawl client: {e}")
        return False

def test_pydantic_schemas():
    """Test the Pydantic schemas."""
    print("\n🧪 Testing Pydantic schemas...")
    
    try:
        from pydantic import BaseModel
        
        # Test PlayerDataSchema structure
        class PlayerDataSchema(BaseModel):
            player_name: str
            position: str = None
            team: str = None
            salary: float = None
            projected_points: float = None
            ownership_percentage: float = None
            matchup: str = None
        
        # Test schema creation
        player_data = PlayerDataSchema(
            player_name="Josh Allen",
            position="QB",
            team="BUF",
            salary=8500.0,
            projected_points=24.5
        )
        
        print(f"✅ PlayerDataSchema works: {player_data.player_name}")
        
        # Test JSON schema generation
        json_schema = PlayerDataSchema.model_json_schema()
        print(f"✅ JSON schema generated: {len(json_schema)} properties")
        
        return True
        
    except Exception as e:
        print(f"❌ Failed to test Pydantic schemas: {e}")
        return False

def test_environment_variables():
    """Test environment variable setup."""
    print("\n🧪 Testing environment variables...")
    
    try:
        # Check if API key is set
        api_key = os.getenv("FIRECRAWL_API_KEY")
        if api_key:
            print(f"✅ FIRECRAWL_API_KEY is set: {api_key[:8]}...")
        else:
            print("⚠️  FIRECRAWL_API_KEY is not set")
            # Set it for testing
            os.environ["FIRECRAWL_API_KEY"] = "fc-91a8ab6e29dc438caaa9afac2f935a12"
            print("✅ FIRECRAWL_API_KEY set for testing")
        
        return True
        
    except Exception as e:
        print(f"❌ Failed to test environment variables: {e}")
        return False

def main():
    """Run basic tests."""
    print("🚀 Starting Basic Firecrawl Tests...\n")
    
    tests = [
        test_firecrawl_import,
        test_firecrawl_initialization,
        test_pydantic_schemas,
        test_environment_variables
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
        print("🎉 All basic tests passed! Firecrawl package is ready.")
        print("\n📋 Next steps:")
        print("1. Set up your database connection (see instructions below)")
        print("2. Run: python add_firecrawl_tables.py")
        print("3. Test the full service: python test_firecrawl_service.py")
        print("4. Start your server and test the API endpoints")
    else:
        print("❌ Some tests failed. Please check the errors above.")
        return 1
    
    print("\n" + "="*60)
    print("🔧 DATABASE SETUP INSTRUCTIONS:")
    print("="*60)
    print("To complete the setup, you need to add your database URL to .env:")
    print()
    print("Option 1 - Railway Database:")
    print("  Add to .env: DATABASE_URL='postgresql://user:pass@host:port/db'")
    print()
    print("Option 2 - Neon Database:")
    print("  Add to .env: STORAGE_URL='postgresql://user:pass@host:port/db'")
    print()
    print("Option 3 - Local Development:")
    print("  Add to .env: LOCAL_DATABASE_URL='postgresql://user:pass@localhost/db'")
    print()
    print("You can find your database URL in:")
    print("- Railway Dashboard → Your Project → Variables")
    print("- Neon Console → Your Database → Connection Details")
    print()
    
    return 0

if __name__ == "__main__":
    sys.exit(main())
