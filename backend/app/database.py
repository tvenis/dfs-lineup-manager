import os
from sqlalchemy import create_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker

# Database URL configuration
# Use Neon PostgreSQL for all environments
# Priority: DATABASE_URL > STORAGE_URL > LOCAL_DATABASE_URL
DATABASE_URL = (
    os.getenv("DATABASE_URL") or 
    os.getenv("STORAGE_URL") or
    os.getenv("LOCAL_DATABASE_URL") or
    None
)

if not DATABASE_URL:
    raise ValueError(
        "Database connection string not found. Please set one of these environment variables:\n"
        "- DATABASE_URL (for production/Vercel)\n"
        "- STORAGE_URL (from Neon integration)\n" 
        "- LOCAL_DATABASE_URL (for local development)\n"
        "Example: LOCAL_DATABASE_URL='postgresql://user:pass@host/db'"
    )

# Convert postgresql:// to postgresql+psycopg:// for psycopg3 driver
if DATABASE_URL.startswith("postgresql://"):
    DATABASE_URL = DATABASE_URL.replace("postgresql://", "postgresql+psycopg://", 1)

# Create PostgreSQL engine
engine = create_engine(
    DATABASE_URL,
    pool_pre_ping=True,      # Verify connections before use
    pool_recycle=300,        # Recycle connections every 5 minutes
    pool_size=5,             # Connection pool size
    max_overflow=10,         # Max additional connections
    echo=False               # Set to True for SQL debugging
)

# Create SessionLocal class
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

# Create Base class
Base = declarative_base()

# Dependency to get database session
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
