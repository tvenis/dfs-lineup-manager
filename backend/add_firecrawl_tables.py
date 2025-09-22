"""
Migration script to add Firecrawl-related tables to the database.
"""

import os
import sys
from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker

# Add the parent directory to the path so we can import from app
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from app.database import DATABASE_URL
from app.models import Base, ScrapedData, ScrapingJob, ScrapingJobUrl

def create_firecrawl_tables():
    """Create the Firecrawl-related tables in the database."""
    try:
        # Create engine and session
        engine = create_engine(DATABASE_URL)
        SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
        
        print(f"Creating Firecrawl tables in database: {DATABASE_URL}")
        
        # Create all tables (this will only create new ones)
        Base.metadata.create_all(bind=engine)
        
        print("✅ Successfully created Firecrawl tables:")
        print("  - scraped_data")
        print("  - scraping_jobs") 
        print("  - scraping_job_urls")
        
        # Verify tables were created
        session = SessionLocal()
        try:
            # Check if tables exist
            result = session.execute(text("""
                SELECT table_name 
                FROM information_schema.tables 
                WHERE table_schema = 'public' 
                AND table_name IN ('scraped_data', 'scraping_jobs', 'scraping_job_urls')
                ORDER BY table_name
            """))
            
            tables = [row[0] for row in result.fetchall()]
            print(f"\n📋 Verified tables exist: {', '.join(tables)}")
            
            # Check indexes
            result = session.execute(text("""
                SELECT indexname, tablename 
                FROM pg_indexes 
                WHERE tablename IN ('scraped_data', 'scraping_jobs', 'scraping_job_urls')
                ORDER BY tablename, indexname
            """))
            
            indexes = result.fetchall()
            if indexes:
                print(f"\n🔍 Created indexes:")
                for index_name, table_name in indexes:
                    print(f"  - {table_name}.{index_name}")
            
        finally:
            session.close()
        
        print("\n🎉 Firecrawl tables migration completed successfully!")
        
    except Exception as e:
        print(f"❌ Error creating Firecrawl tables: {e}")
        raise


def verify_firecrawl_setup():
    """Verify that the Firecrawl setup is working correctly."""
    try:
        from app.services.firecrawl_service import FirecrawlService
        from app.services.import_program_interface import import_program_registry
        
        print("\n🔧 Verifying Firecrawl service setup...")
        
        # Check if API key is configured
        api_key = os.getenv("FIRECRAWL_API_KEY")
        if api_key:
            print("✅ FIRECRAWL_API_KEY is configured")
        else:
            print("⚠️  FIRECRAWL_API_KEY is not configured (required for scraping)")
        
        # Check import programs
        programs = list(import_program_registry.programs.keys())
        print(f"✅ Import programs registered: {', '.join(programs)}")
        
        # Test service initialization (without API key if not set)
        try:
            service = FirecrawlService()
            print("✅ FirecrawlService initialized successfully")
        except ValueError as e:
            if "API key is required" in str(e):
                print("⚠️  FirecrawlService requires FIRECRAWL_API_KEY to be set")
            else:
                raise
        
        print("\n🎉 Firecrawl setup verification completed!")
        
    except Exception as e:
        print(f"❌ Error verifying Firecrawl setup: {e}")
        raise


if __name__ == "__main__":
    print("🚀 Starting Firecrawl tables migration...")
    
    try:
        create_firecrawl_tables()
        verify_firecrawl_setup()
        
        print("\n" + "="*60)
        print("📖 Next steps:")
        print("1. Set FIRECRAWL_API_KEY environment variable")
        print("2. Add the firecrawl router to your main.py:")
        print("   from app.routers import firecrawl")
        print("   app.include_router(firecrawl.router)")
        print("3. Install the firecrawl-py package:")
        print("   pip install firecrawl-py")
        print("4. Test the API endpoints at /firecrawl/health")
        print("="*60)
        
    except Exception as e:
        print(f"\n❌ Migration failed: {e}")
        sys.exit(1)
