"""
Direct database migration script to add points_allowed column to team_stats table.

This script uses SQLAlchemy directly to add the points_allowed column.
"""

import os
import sys
from sqlalchemy import create_engine, text, inspect
from sqlalchemy.orm import sessionmaker

# Add the backend directory to the path so we can import our modules
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from app.database import DATABASE_URL

def add_points_allowed_column():
    """Add points_allowed column to team_stats table."""
    print("🚀 Adding points_allowed column to team_stats table...")
    
    # Get database URL
    database_url = DATABASE_URL
    engine = create_engine(database_url)
    
    # Create inspector to check existing columns
    inspector = inspect(engine)
    
    try:
        # Check if column already exists
        columns = inspector.get_columns('team_stats')
        column_exists = any(col['name'] == 'points_allowed' for col in columns)
        
        if column_exists:
            print("✅ points_allowed column already exists in team_stats table")
            return True
        
        # Add the column
        with engine.connect() as conn:
            conn.execute(text("ALTER TABLE team_stats ADD COLUMN points_allowed INTEGER DEFAULT 0"))
            conn.commit()
        
        print("✅ Successfully added points_allowed column to team_stats table")
        return True
        
    except Exception as e:
        print(f"❌ Error adding points_allowed column: {e}")
        return False

if __name__ == "__main__":
    success = add_points_allowed_column()
    if success:
        print("🎉 Migration completed successfully!")
    else:
        print("💥 Migration failed!")
        sys.exit(1)
