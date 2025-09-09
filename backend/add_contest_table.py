#!/usr/bin/env python3
"""
Migration script to add contest table to the database.
"""

import sqlite3
from pathlib import Path


def migrate_database() -> bool:
    db_path = Path(__file__).parent / "dfs_app.db"
    if not db_path.exists():
        print(f"Database not found at {db_path}")
        return False

    conn = None
    try:
        conn = sqlite3.connect(db_path)
        cursor = conn.cursor()

        # Check if contest table already exists
        cursor.execute(
            """
            SELECT name FROM sqlite_master
            WHERE type='table' AND name='contest'
            """
        )
        if cursor.fetchone():
            print("contest table already exists")
            return True

        print("Creating contest table...")
        cursor.execute(
            """
            CREATE TABLE contest (
                entry_key INTEGER PRIMARY KEY, -- Entry_Key unique per entry
                contest_id INTEGER, -- external Contest_Key (not unique)
                week_id INTEGER,
                sport_id INTEGER NOT NULL,
                lineup_id VARCHAR(50),
                game_type_id INTEGER NOT NULL,
                contest_description VARCHAR(500),
                contest_opponent VARCHAR(200),
                contest_date_utc DATETIME NOT NULL,
                contest_place INTEGER,
                contest_points FLOAT,
                winnings_non_ticket NUMERIC(12,2),
                winnings_ticket NUMERIC(12,2),
                contest_entries INTEGER NOT NULL CHECK (contest_entries > 0),
                places_paid INTEGER NOT NULL CHECK (places_paid >= 0),
                entry_fee_usd NUMERIC(12,2) NOT NULL CHECK (entry_fee_usd >= 0),
                prize_pool_usd NUMERIC(12,2) NOT NULL CHECK (prize_pool_usd >= 0),
                net_profit_usd NUMERIC(12,2) NOT NULL CHECK (net_profit_usd >= 0),
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (week_id) REFERENCES weeks(id),
                FOREIGN KEY (sport_id) REFERENCES sport(sport_id),
                FOREIGN KEY (lineup_id) REFERENCES lineups(id),
                FOREIGN KEY (game_type_id) REFERENCES game_type(game_type_id)
            )
            """
        )

        # Indexes
        cursor.execute("CREATE INDEX IF NOT EXISTS idx_contest_week ON contest(week_id)")
        cursor.execute("CREATE INDEX IF NOT EXISTS idx_contest_sport ON contest(sport_id)")
        cursor.execute("CREATE INDEX IF NOT EXISTS idx_contest_game_type ON contest(game_type_id)")
        cursor.execute("CREATE INDEX IF NOT EXISTS idx_contest_contest_id ON contest(contest_id)")

        conn.commit()
        print("Successfully created contest table and indexes")
        return True
    except sqlite3.Error as e:
        print(f"SQLite error: {e}")
        if conn:
            conn.rollback()
        return False
    except Exception as e:
        print(f"Error: {e}")
        if conn:
            conn.rollback()
        return False
    finally:
        if conn:
            conn.close()


if __name__ == "__main__":
    print("Starting migration to add contest table...")
    success = migrate_database()
    if success:
        print("\n\u2705 Migration completed successfully!")
    else:
        print("\n\u274c Migration failed!")
        raise SystemExit(1)


