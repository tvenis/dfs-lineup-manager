#!/usr/bin/env python3
"""
Database migration script for transitioning to DraftKings API models
This script handles the migration from CSV-based models to API-based models
"""

import sqlite3
import json
from datetime import datetime
import logging

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

def migrate_database():
    """Migrate the database to the new DraftKings API models"""
    
    # Connect to the database
    conn = sqlite3.connect('dfs_app.db')
    cursor = conn.cursor()
    
    try:
        logger.info("Starting database migration to DraftKings API models...")
        
        # Check if migration has already been run
        cursor.execute("""
            SELECT name FROM sqlite_master 
            WHERE type='table' AND name='recent_activity'
        """)
        
        if cursor.fetchone():
            logger.info("Migration already completed. Skipping...")
            return
        
        # Backup existing data
        backup_existing_data(cursor)
        
        # Drop existing tables
        drop_existing_tables(cursor)
        
        # Create new tables with updated schema
        create_new_tables(cursor)
        
        # Commit changes
        conn.commit()
        
        logger.info("Database migration completed successfully!")
        
    except Exception as e:
        logger.error(f"Migration failed: {e}")
        conn.rollback()
        raise
    finally:
        conn.close()

def backup_existing_data(cursor):
    """Backup existing data before migration"""
    logger.info("Backing up existing data...")
    
    # Create backup tables
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS players_backup AS 
        SELECT * FROM players
    """)
    
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS player_pool_entries_backup AS 
        SELECT * FROM player_pool_entries
    """)
    
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS teams_backup AS 
        SELECT * FROM teams
    """)
    
    logger.info("Data backup completed")

def drop_existing_tables(cursor):
    """Drop existing tables to recreate with new schema"""
    logger.info("Dropping existing tables...")
    
    # Drop tables in dependency order
    cursor.execute("DROP TABLE IF EXISTS player_pool_entries")
    cursor.execute("DROP TABLE IF EXISTS players")
    cursor.execute("DROP TABLE IF EXISTS teams")
    
    logger.info("Existing tables dropped")

def create_new_tables(cursor):
    """Create new tables with updated schema"""
    logger.info("Creating new tables with updated schema...")
    
    # Create teams table
    cursor.execute("""
        CREATE TABLE teams (
            id VARCHAR(10) PRIMARY KEY,
            name VARCHAR(100) NOT NULL,
            abbreviation VARCHAR(10) NOT NULL UNIQUE,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    """)
    
    # Create players table
    cursor.execute("""
        CREATE TABLE players (
            playerDkId INTEGER PRIMARY KEY,
            firstName VARCHAR(100) NOT NULL,
            lastName VARCHAR(100) NOT NULL,
            displayName VARCHAR(100) NOT NULL,
            shortName VARCHAR(50),
            position VARCHAR(10) NOT NULL,
            team VARCHAR(10) NOT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (team) REFERENCES teams(abbreviation)
        )
    """)
    
    # Create player_pool_entries table
    cursor.execute("""
        CREATE TABLE player_pool_entries (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            week VARCHAR(10) NOT NULL,
            draftGroup VARCHAR(20) NOT NULL,
            playerDkId INTEGER NOT NULL,
            salary INTEGER NOT NULL,
            status VARCHAR(20) DEFAULT 'Available',
            isDisabled BOOLEAN DEFAULT 0,
            playerGameHash VARCHAR(100),
            competitions TEXT,
            draftStatAttributes TEXT,
            playerAttributes TEXT,
            teamLeagueSeasonAttributes TEXT,
            playerGameAttributes TEXT,
            draftAlerts TEXT,
            externalRequirements TEXT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (playerDkId) REFERENCES players(playerDkId),
            UNIQUE(week, draftGroup, playerDkId)
        )
    """)
    
    # Create recent_activity table
    cursor.execute("""
        CREATE TABLE recent_activity (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            action VARCHAR(20) NOT NULL CHECK (action IN ('import', 'export')),
            fileType VARCHAR(20) NOT NULL CHECK (fileType IN ('API', 'CSV')),
            fileName VARCHAR(200),
            week VARCHAR(10) NOT NULL,
            draftGroup VARCHAR(20) NOT NULL,
            recordsAdded INTEGER DEFAULT 0,
            recordsUpdated INTEGER DEFAULT 0,
            recordsSkipped INTEGER DEFAULT 0,
            errors TEXT,
            user VARCHAR(100),
            details TEXT
        )
    """)
    
    # Create indexes
    cursor.execute("""
        CREATE INDEX idx_week_draftgroup_player 
        ON player_pool_entries(week, draftGroup, playerDkId)
    """)
    
    cursor.execute("""
        CREATE INDEX idx_player_team 
        ON players(team)
    """)
    
    cursor.execute("""
        CREATE INDEX idx_activity_timestamp 
        ON recent_activity(timestamp)
    """)
    
    logger.info("New tables created with updated schema")

def restore_sample_data(cursor):
    """Restore sample data for testing"""
    logger.info("Restoring sample data...")
    
    # Insert sample teams
    teams_data = [
        ("BUF", "Buffalo Bills", "BUF"),
        ("MIA", "Miami Dolphins", "MIA"),
        ("NE", "New England Patriots", "NE"),
        ("NYJ", "New York Jets", "NYJ"),
        ("BAL", "Baltimore Ravens", "BAL"),
        ("CIN", "Cincinnati Bengals", "CIN"),
        ("CLE", "Cleveland Browns", "CLE"),
        ("PIT", "Pittsburgh Steelers", "PIT"),
        ("HOU", "Houston Texans", "HOU"),
        ("IND", "Indianapolis Colts", "IND"),
        ("JAX", "Jacksonville Jaguars", "JAX"),
        ("TEN", "Tennessee Titans", "TEN"),
        ("DEN", "Denver Broncos", "DEN"),
        ("KC", "Kansas City Chiefs", "KC"),
        ("LV", "Las Vegas Raiders", "LV"),
        ("LAC", "Los Angeles Chargers", "LAC"),
        ("DAL", "Dallas Cowboys", "DAL"),
        ("NYG", "New York Giants", "NYG"),
        ("PHI", "Philadelphia Eagles", "PHI"),
        ("WAS", "Washington Commanders", "WAS"),
        ("CHI", "Chicago Bears", "CHI"),
        ("DET", "Detroit Lions", "DET"),
        ("GB", "Green Bay Packers", "GB"),
        ("MIN", "Minnesota Vikings", "MIN"),
        ("ATL", "Atlanta Falcons", "ATL"),
        ("CAR", "Carolina Panthers", "CAR"),
        ("NO", "New Orleans Saints", "NO"),
        ("TB", "Tampa Bay Buccaneers", "TB"),
        ("ARI", "Arizona Cardinals", "ARI"),
        ("LAR", "Los Angeles Rams", "LAR"),
        ("SF", "San Francisco 49ers", "SF"),
        ("SEA", "Seattle Seahawks", "SEA")
    ]
    
    cursor.executemany("""
        INSERT INTO teams (id, name, abbreviation) VALUES (?, ?, ?)
    """, teams_data)
    
    # Insert sample players (using mock DraftKings IDs)
    players_data = [
        (1001, "Josh", "Allen", "Josh Allen", "J. Allen", "QB", "BUF"),
        (1002, "Tua", "Tagovailoa", "Tua Tagovailoa", "T. Tagovailoa", "QB", "MIA"),
        (1003, "Patrick", "Mahomes", "Patrick Mahomes", "P. Mahomes", "QB", "KC"),
        (1004, "Lamar", "Jackson", "Lamar Jackson", "L. Jackson", "QB", "BAL"),
        (1005, "Jalen", "Hurts", "Jalen Hurts", "J. Hurts", "QB", "PHI"),
        (2001, "Christian", "McCaffrey", "Christian McCaffrey", "C. McCaffrey", "RB", "SF"),
        (2002, "Saquon", "Barkley", "Saquon Barkley", "S. Barkley", "RB", "PHI"),
        (2003, "Austin", "Ekeler", "Austin Ekeler", "A. Ekeler", "RB", "WAS"),
        (2004, "Derrick", "Henry", "Derrick Henry", "D. Henry", "RB", "BAL"),
        (2005, "Raheem", "Mostert", "Raheem Mostert", "R. Mostert", "RB", "MIA"),
        (3001, "Tyreek", "Hill", "Tyreek Hill", "T. Hill", "WR", "MIA"),
        (3002, "Davante", "Adams", "Davante Adams", "D. Adams", "WR", "LV"),
        (3003, "Cooper", "Kupp", "Cooper Kupp", "C. Kupp", "WR", "LAR"),
        (3004, "Mike", "Evans", "Mike Evans", "M. Evans", "WR", "TB"),
        (3005, "Stefon", "Diggs", "Stefon Diggs", "S. Diggs", "WR", "HOU"),
        (4001, "Travis", "Kelce", "Travis Kelce", "T. Kelce", "TE", "KC"),
        (4002, "Kyle", "Pitts", "Kyle Pitts", "K. Pitts", "TE", "ATL"),
        (4003, "Mark", "Andrews", "Mark Andrews", "M. Andrews", "TE", "BAL"),
        (5001, "Baltimore", "Ravens", "Baltimore Ravens", "BAL", "DST", "BAL"),
        (5002, "San Francisco", "49ers", "San Francisco 49ers", "SF", "DST", "SF"),
        (5003, "Buffalo", "Bills", "Buffalo Bills", "BUF", "DST", "BUF")
    ]
    
    cursor.executemany("""
        INSERT INTO players (playerDkId, firstName, lastName, displayName, shortName, position, team) 
        VALUES (?, ?, ?, ?, ?, ?, ?)
    """, players_data)
    
    logger.info("Sample data restored")

if __name__ == "__main__":
    try:
        migrate_database()
        print("Migration completed successfully!")
    except Exception as e:
        print(f"Migration failed: {e}")
        exit(1)
