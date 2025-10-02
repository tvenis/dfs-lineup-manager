#!/usr/bin/env python3
"""
Add performance indexes for Player Profile page optimization
"""

import os
import sys
from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker

# Add the backend directory to the Python path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from app.database import get_db
from app.models import Base, PlayerActuals, PlayerPoolEntry

def add_performance_indexes():
    """Add indexes to improve Player Profile page performance"""
    
    # Get database connection
    from app.database import engine
    Session = sessionmaker(bind=engine)
    session = Session()
    
    try:
        print("Adding performance indexes...")
        
        # Index for PlayerActuals YTD queries (playerDkId + week_id range)
        session.execute(text("""
            CREATE INDEX IF NOT EXISTS idx_player_actuals_player_week_range 
            ON player_actuals ("playerDkId", week_id) 
            WHERE dk_actuals IS NOT NULL
        """))
        print("✓ Added idx_player_actuals_player_week_range")
        
        # Index for PlayerPoolEntry YTD projected points queries
        session.execute(text("""
            CREATE INDEX IF NOT EXISTS idx_player_pool_entries_player_week_range 
            ON player_pool_entries ("playerDkId", week_id) 
            WHERE "projectedPoints" IS NOT NULL
        """))
        print("✓ Added idx_player_pool_entries_player_week_range")
        
        # Index for current week player pool entries (most common query)
        session.execute(text("""
            CREATE INDEX IF NOT EXISTS idx_player_pool_entries_current_week 
            ON player_pool_entries (week_id, "playerDkId") 
            INCLUDE ("projectedPoints", salary, ownership, status)
        """))
        print("✓ Added idx_player_pool_entries_current_week")
        
        # Index for player filtering
        session.execute(text("""
            CREATE INDEX IF NOT EXISTS idx_players_position_team_hidden 
            ON players (position, team, hidden) 
            INCLUDE ("playerDkId", "displayName", "playerImage50")
        """))
        print("✓ Added idx_players_position_team_hidden")
        
        # Index for player search
        session.execute(text("""
            CREATE INDEX IF NOT EXISTS idx_players_display_name 
            ON players ("displayName") 
            WHERE hidden = false
        """))
        print("✓ Added idx_players_display_name")
        
        session.commit()
        print("\n✅ All performance indexes added successfully!")
        
    except Exception as e:
        print(f"❌ Error adding indexes: {e}")
        session.rollback()
        raise
    finally:
        session.close()

if __name__ == "__main__":
    add_performance_indexes()