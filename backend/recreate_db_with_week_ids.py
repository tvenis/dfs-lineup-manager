#!/usr/bin/env python3
"""
Script to recreate the database with new schema using week_id foreign keys
"""

import os
from app.database import engine
from app.models import Base

def recreate_database():
    """Recreate the database with new schema using week_id foreign keys"""
    print("Recreating database with new schema using week_id foreign keys...")
    
    # Remove existing database file
    if os.path.exists('dfs_app.db'):
        os.remove('dfs_app.db')
        print("Removed existing database file")
    
    # Create all tables from models
    Base.metadata.create_all(bind=engine)
    print("Created new database with updated schema")
    
    # Verify tables were created
    from sqlalchemy import inspect
    inspector = inspect(engine)
    tables = inspector.get_table_names()
    print(f"Tables created: {tables}")
    
    # Insert sample data
    insert_sample_data()
    
    print("Database recreation complete!")

def insert_sample_data():
    """Insert sample data for testing"""
    from app.database import SessionLocal
    from app.models import Team, Week, Player
    from datetime import date
    
    db = SessionLocal()
    
    try:
        # Insert sample teams
        teams_data = [
            {"id": "NE", "name": "New England Patriots", "abbreviation": "NE"},
            {"id": "DAL", "name": "Dallas Cowboys", "abbreviation": "DAL"},
            {"id": "KC", "name": "Kansas City Chiefs", "abbreviation": "KC"},
            {"id": "BUF", "name": "Buffalo Bills", "abbreviation": "BUF"},
            {"id": "SF", "name": "San Francisco 49ers", "abbreviation": "SF"}
        ]
        
        for team_data in teams_data:
            team = Team(**team_data)
            db.add(team)
        
        # Insert sample weeks
        weeks_data = [
            {"week_number": 1, "year": 2025, "start_date": date(2025, 9, 4), "end_date": date(2025, 9, 8), "status": "Upcoming"},
            {"week_number": 2, "year": 2025, "start_date": date(2025, 9, 11), "end_date": date(2025, 9, 15), "status": "Upcoming"},
            {"week_number": 3, "year": 2025, "start_date": date(2025, 9, 18), "end_date": date(2025, 9, 22), "status": "Upcoming"},
            {"week_number": 1, "year": 2024, "start_date": date(2024, 9, 5), "end_date": date(2024, 9, 9), "status": "Completed"},
            {"week_number": 2, "year": 2024, "start_date": date(2024, 9, 12), "end_date": date(2024, 9, 16), "status": "Completed"}
        ]
        
        for week_data in weeks_data:
            week = Week(**week_data)
            db.add(week)
        
        # Insert sample players
        players_data = [
            {"playerDkId": 1001, "firstName": "Tom", "lastName": "Brady", "displayName": "Tom Brady", "shortName": "T. Brady", "position": "QB", "team": "NE"},
            {"playerDkId": 1002, "firstName": "Patrick", "lastName": "Mahomes", "displayName": "Patrick Mahomes", "shortName": "P. Mahomes", "position": "QB", "team": "KC"},
            {"playerDkId": 1003, "firstName": "Josh", "lastName": "Allen", "displayName": "Josh Allen", "shortName": "J. Allen", "position": "QB", "team": "BUF"},
            {"playerDkId": 1004, "firstName": "Christian", "lastName": "McCaffrey", "displayName": "Christian McCaffrey", "shortName": "C. McCaffrey", "position": "RB", "team": "SF"},
            {"playerDkId": 1005, "firstName": "Tyreek", "lastName": "Hill", "displayName": "Tyreek Hill", "shortName": "T. Hill", "position": "WR", "team": "KC"}
        ]
        
        for player_data in players_data:
            player = Player(**player_data)
            db.add(player)
        
        db.commit()
        print("Inserted sample data: teams, weeks, and players")
        
    except Exception as e:
        print(f"Error inserting sample data: {e}")
        db.rollback()
    finally:
        db.close()

if __name__ == "__main__":
    recreate_database()
