#!/usr/bin/env python3
"""
Migration script to add player_prop_bets table to the database
Run this script to create the player_prop_bets table with all required columns
"""

import sqlite3
from pathlib import Path


def migrate_database():
    """Add player_prop_bets table to the database"""

    db_path = Path(__file__).parent / "dfs_app.db"

    if not db_path.exists():
        print(f"Database not found at {db_path}")
        return False

    try:
        conn = sqlite3.connect(db_path)
        cursor = conn.cursor()

        # Check if the player_prop_bets table already exists
        cursor.execute(
            """
            SELECT name FROM sqlite_master 
            WHERE type='table' AND name='player_prop_bets'
            """
        )
        if cursor.fetchone():
            print("player_prop_bets table already exists")
            return True

        # Create the player_prop_bets table
        print("Creating player_prop_bets table...")
        cursor.execute(
            """
            CREATE TABLE player_prop_bets (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                week_id INTEGER NOT NULL,
                game_id INTEGER NOT NULL,
                bookmaker VARCHAR(100),
                market VARCHAR(100),
                outcome_name VARCHAR(200),
                outcome_description VARCHAR(500),
                playerDkId INTEGER NOT NULL,
                outcome_price INTEGER,
                outcome_point INTEGER,
                outcome_likelihood FLOAT,
                updated_by VARCHAR(100) DEFAULT 'API',
                last_prop_update DATETIME,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                updated_at DATETIME,
                FOREIGN KEY (week_id) REFERENCES weeks (id),
                FOREIGN KEY (game_id) REFERENCES games (id),
                FOREIGN KEY (playerDkId) REFERENCES players (playerDkId)
            )
            """
        )

        # Index for faster lookups by game and player
        print("Creating index idx_prop_bets_week_game_player on (week_id, game_id, playerDkId)...")
        cursor.execute(
            """
            CREATE INDEX idx_prop_bets_week_game_player
            ON player_prop_bets (week_id, game_id, playerDkId)
            """
        )

        # Unique index for upsert keys
        print("Creating unique index ux_prop_bets_unique on (week_id, game_id, bookmakers, market, outcome_name, playerDkId)...")
        cursor.execute(
            """
            CREATE UNIQUE INDEX IF NOT EXISTS ux_prop_bets_unique
            ON player_prop_bets (week_id, game_id, bookmaker, market, outcome_name, playerDkId)
            """
        )

        conn.commit()
        print("Successfully created player_prop_bets table and index")

        # Verify the table was created
        cursor.execute(
            """
            SELECT name FROM sqlite_master 
            WHERE type='table' AND name='player_prop_bets'
            """
        )
        if cursor.fetchone():
            print("\n\u2713 Table verification successful")
            cursor.execute("PRAGMA table_info(player_prop_bets)")
            columns = cursor.fetchall()
            print("\nplayer_prop_bets table structure:")
            for column in columns:
                print(f"  - {column[1]} ({column[2]})")
        else:
            print("\n\u2717 Table verification failed")
            return False

        return True

    except sqlite3.Error as e:
        print(f"SQLite error: {e}")
        return False
    except Exception as e:
        print(f"Error: {e}")
        return False
    finally:
        if 'conn' in locals():
            conn.close()


if __name__ == "__main__":
    print("Starting migration to add player_prop_bets table...")
    success = migrate_database()
    if success:
        print("\n\ud83d\udc4d Migration completed successfully!")
    else:
        print("\n\u274c Migration failed!")
        exit(1)


