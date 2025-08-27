#!/usr/bin/env python3
"""
Database initialization script for DFS Lineup Manager
Creates sample teams and players for testing
"""

import asyncio
from sqlalchemy.orm import Session
from app.database import engine, SessionLocal
from app.models import Base, Team, Player, Week

def init_db():
    """Initialize the database with sample data"""
    # Create all tables
    Base.metadata.create_all(bind=engine)
    
    db = SessionLocal()
    try:
        # Check if data already exists
        existing_teams = db.query(Team).count()
        if existing_teams > 0:
            print("Database already contains data. Skipping initialization.")
            return
        
        print("Initializing database with sample data...")
        
        # Create sample teams
        teams_data = [
            {"id": "BUF", "name": "Buffalo Bills", "abbreviation": "BUF"},
            {"id": "MIA", "name": "Miami Dolphins", "abbreviation": "MIA"},
            {"id": "NE", "name": "New England Patriots", "abbreviation": "NE"},
            {"id": "NYJ", "name": "New York Jets", "abbreviation": "NYJ"},
            {"id": "BAL", "name": "Baltimore Ravens", "abbreviation": "BAL"},
            {"id": "CIN", "name": "Cincinnati Bengals", "abbreviation": "CIN"},
            {"id": "CLE", "name": "Cleveland Browns", "abbreviation": "CLE"},
            {"id": "PIT", "name": "Pittsburgh Steelers", "abbreviation": "PIT"},
            {"id": "HOU", "name": "Houston Texans", "abbreviation": "HOU"},
            {"id": "IND", "name": "Indianapolis Colts", "abbreviation": "IND"},
            {"id": "JAX", "name": "Jacksonville Jaguars", "abbreviation": "JAX"},
            {"id": "TEN", "name": "Tennessee Titans", "abbreviation": "TEN"},
            {"id": "DEN", "name": "Denver Broncos", "abbreviation": "DEN"},
            {"id": "KC", "name": "Kansas City Chiefs", "abbreviation": "KC"},
            {"id": "LV", "name": "Las Vegas Raiders", "abbreviation": "LV"},
            {"id": "LAC", "name": "Los Angeles Chargers", "abbreviation": "LAC"},
            {"id": "DAL", "name": "Dallas Cowboys", "abbreviation": "DAL"},
            {"id": "NYG", "name": "New York Giants", "abbreviation": "NYG"},
            {"id": "PHI", "name": "Philadelphia Eagles", "abbreviation": "PHI"},
            {"id": "WAS", "name": "Washington Commanders", "abbreviation": "WAS"},
            {"id": "CHI", "name": "Chicago Bears", "abbreviation": "CHI"},
            {"id": "DET", "name": "Detroit Lions", "abbreviation": "DET"},
            {"id": "GB", "name": "Green Bay Packers", "abbreviation": "GB"},
            {"id": "MIN", "name": "Minnesota Vikings", "abbreviation": "MIN"},
            {"id": "ATL", "name": "Atlanta Falcons", "abbreviation": "ATL"},
            {"id": "CAR", "name": "Carolina Panthers", "abbreviation": "CAR"},
            {"id": "NO", "name": "New Orleans Saints", "abbreviation": "NO"},
            {"id": "TB", "name": "Tampa Bay Buccaneers", "abbreviation": "TB"},
            {"id": "ARI", "name": "Arizona Cardinals", "abbreviation": "ARI"},
            {"id": "LAR", "name": "Los Angeles Rams", "abbreviation": "LAR"},
            {"id": "SF", "name": "San Francisco 49ers", "abbreviation": "SF"},
            {"id": "SEA", "name": "Seattle Seahawks", "abbreviation": "SEA"}
        ]
        
        for team_data in teams_data:
            team = Team(**team_data)
            db.add(team)
        
        db.commit()
        print(f"Created {len(teams_data)} teams")
        
        # Create sample players
        players_data = [
            # Quarterbacks
            {"id": "QB001", "name": "Josh Allen", "position": "QB", "team_id": "BUF"},
            {"id": "QB002", "name": "Tua Tagovailoa", "position": "QB", "team_id": "MIA"},
            {"id": "QB003", "name": "Patrick Mahomes", "position": "QB", "team_id": "KC"},
            {"id": "QB004", "name": "Lamar Jackson", "position": "QB", "team_id": "BAL"},
            {"id": "QB005", "name": "Jalen Hurts", "position": "QB", "team_id": "PHI"},
            
            # Running Backs
            {"id": "RB001", "name": "Christian McCaffrey", "position": "RB", "team_id": "SF"},
            {"id": "RB002", "name": "Saquon Barkley", "position": "RB", "team_id": "PHI"},
            {"id": "RB003", "name": "Austin Ekeler", "position": "RB", "team_id": "WAS"},
            {"id": "RB004", "name": "Derrick Henry", "position": "RB", "team_id": "BAL"},
            {"id": "RB005", "name": "Raheem Mostert", "position": "RB", "team_id": "MIA"},
            {"id": "RB006", "name": "Alvin Kamara", "position": "RB", "team_id": "NO"},
            {"id": "RB007", "name": "Nick Chubb", "position": "RB", "team_id": "CLE"},
            {"id": "RB008", "name": "Jonathan Taylor", "position": "RB", "team_id": "IND"},
            
            # Wide Receivers
            {"id": "WR001", "name": "Tyreek Hill", "position": "WR", "team_id": "MIA"},
            {"id": "WR002", "name": "Davante Adams", "position": "WR", "team_id": "LV"},
            {"id": "WR003", "name": "Cooper Kupp", "position": "WR", "team_id": "LAR"},
            {"id": "WR004", "name": "Mike Evans", "position": "WR", "team_id": "TB"},
            {"id": "WR005", "name": "Stefon Diggs", "position": "WR", "team_id": "HOU"},
            {"id": "WR006", "name": "DJ Moore", "position": "WR", "team_id": "CHI"},
            {"id": "WR007", "name": "Chris Olave", "position": "WR", "team_id": "NO"},
            {"id": "WR008", "name": "CeeDee Lamb", "position": "WR", "team_id": "DAL"},
            {"id": "WR009", "name": "A.J. Brown", "position": "WR", "team_id": "PHI"},
            {"id": "WR010", "name": "DeVonta Smith", "position": "WR", "team_id": "PHI"},
            {"id": "WR011", "name": "Jaylen Waddle", "position": "WR", "team_id": "MIA"},
            {"id": "WR012", "name": "Brandon Aiyuk", "position": "WR", "team_id": "SF"},
            
            # Tight Ends
            {"id": "TE001", "name": "Travis Kelce", "position": "TE", "team_id": "KC"},
            {"id": "TE002", "name": "Kyle Pitts", "position": "TE", "team_id": "ATL"},
            {"id": "TE003", "name": "Mark Andrews", "position": "TE", "team_id": "BAL"},
            {"id": "TE004", "name": "T.J. Hockenson", "position": "TE", "team_id": "MIN"},
            {"id": "TE005", "name": "George Kittle", "position": "TE", "team_id": "SF"},
            
            # Defenses
            {"id": "DST001", "name": "Baltimore Ravens", "position": "DST", "team_id": "BAL"},
            {"id": "DST002", "name": "San Francisco 49ers", "position": "DST", "team_id": "SF"},
            {"id": "DST003", "name": "Buffalo Bills", "position": "DST", "team_id": "BUF"},
            {"id": "DST004", "name": "Dallas Cowboys", "position": "DST", "team_id": "DAL"},
            {"id": "DST005", "name": "Philadelphia Eagles", "position": "DST", "team_id": "PHI"},
            {"id": "DST006", "name": "Green Bay Packers", "position": "DST", "team_id": "GB"}
        ]
        
        for player_data in players_data:
            player = Player(**player_data)
            db.add(player)
        
        db.commit()
        print(f"Created {len(players_data)} players")
        
        # Create a sample week
        week = Week(id="2024-WK01", notes="Sample week for testing")
        db.add(week)
        db.commit()
        print("Created sample week: 2024-WK01")
        
        print("Database initialization completed successfully!")
        
    except Exception as e:
        print(f"Error initializing database: {e}")
        db.rollback()
        raise
    finally:
        db.close()

if __name__ == "__main__":
    init_db()
