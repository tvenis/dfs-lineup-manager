import os
from sqlalchemy import create_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
from fastapi import HTTPException

# Database URL configuration
# Use Neon PostgreSQL for all environments
# Priority: DATABASE_URL > DATABASE_DATABASE_URL (Neon) > STORAGE_URL > LOCAL_DATABASE_URL
DATABASE_URL = (
    os.getenv("DATABASE_URL") or 
    os.getenv("DATABASE_DATABASE_URL") or  # Neon-generated variable
    os.getenv("STORAGE_URL") or
    os.getenv("LOCAL_DATABASE_URL") or
    None
)

if not DATABASE_URL:
    print("⚠️ Database connection string not found. Database features will be disabled.")
    print("Please set one of these environment variables:")
    print("- DATABASE_URL (for production/Vercel)")
    print("- STORAGE_URL (from Neon integration)") 
    print("- LOCAL_DATABASE_URL (for local development)")
    print("Example: LOCAL_DATABASE_URL='postgresql://user:pass@host/db'")
    # Don't raise error, just set to None
    DATABASE_URL = None

# Convert postgresql:// to postgresql+psycopg:// for psycopg3 driver
if DATABASE_URL and DATABASE_URL.startswith("postgresql://"):
    DATABASE_URL = DATABASE_URL.replace("postgresql://", "postgresql+psycopg://", 1)

# Create PostgreSQL engine
if DATABASE_URL:
    engine = create_engine(
        DATABASE_URL,
        pool_pre_ping=True,      # Verify connections before use
        pool_recycle=300,        # Recycle connections every 5 minutes
        pool_size=5,             # Connection pool size
        max_overflow=10,         # Max additional connections
        echo=False               # Set to True for SQL debugging
    )
else:
    engine = None

# Create SessionLocal class
if engine:
    SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
else:
    SessionLocal = None

# Create Base class
Base = declarative_base()

# Dependency to get database session
def get_db():
    if not SessionLocal:
        raise HTTPException(status_code=503, detail="Database not available")
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
