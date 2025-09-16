import os
from sqlalchemy import create_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker

# Database URL configuration
# Priority: DATABASE_URL > STORAGE_URL > SQLite fallback
DATABASE_URL = (
    os.getenv("DATABASE_URL") or 
    os.getenv("STORAGE_URL") or 
    "sqlite:///./dfs_app.db"
)

# Convert postgresql:// to postgresql+psycopg:// for psycopg3 driver
if DATABASE_URL.startswith("postgresql://"):
    DATABASE_URL = DATABASE_URL.replace("postgresql://", "postgresql+psycopg://", 1)

# Create engine with appropriate configuration
if DATABASE_URL.startswith("sqlite"):
    # SQLite configuration
    engine = create_engine(
        DATABASE_URL, 
        connect_args={"check_same_thread": False}  # Needed for SQLite
    )
else:
    # PostgreSQL configuration
    engine = create_engine(
        DATABASE_URL,
        pool_pre_ping=True,  # Verify connections before use
        pool_recycle=300,    # Recycle connections every 5 minutes
        echo=False           # Set to True for SQL debugging
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
