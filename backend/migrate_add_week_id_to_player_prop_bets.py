#!/usr/bin/env python3
"""
Migration to ensure player_prop_bets has week_id and the new composite index.

- If table doesn't exist: creates with the new schema
- If table exists and has 0 rows: drops and recreates with new schema
- If table exists and has rows: ALTER TABLE to add week_id (nullable) and creates the new index
"""

import sqlite3
from pathlib import Path


def ensure_schema() -> bool:
    db_path = Path(__file__).parent / "dfs_app.db"
    if not db_path.exists():
        print(f"Database not found at {db_path}")
        return False

    conn = None
    try:
        conn = sqlite3.connect(db_path)
        cur = conn.cursor()

        # Check if table exists
        cur.execute("SELECT name FROM sqlite_master WHERE type='table' AND name='player_prop_bets'")
        exists = cur.fetchone() is not None

        if not exists:
            print("player_prop_bets does not exist; creating with week_id...")
            cur.execute(
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
            cur.execute(
                """
                CREATE INDEX idx_prop_bets_week_game_player
                ON player_prop_bets (week_id, game_id, playerDkId)
                """
            )
            conn.commit()
            print("Created player_prop_bets with week_id and index")
            return True

        # Table exists; check columns
        cur.execute("PRAGMA table_info(player_prop_bets)")
        cols = cur.fetchall()
        col_names = {c[1] for c in cols}

        if 'week_id' in col_names:
            print("player_prop_bets already has week_id; nothing to do")
            return True

        # Count rows
        cur.execute("SELECT COUNT(*) FROM player_prop_bets")
        row_count = cur.fetchone()[0]

        if row_count == 0:
            print("player_prop_bets is empty; dropping and recreating with week_id...")
            try:
                cur.execute("DROP INDEX IF EXISTS idx_prop_bets_game_player")
            except Exception:
                pass
            cur.execute("DROP TABLE player_prop_bets")
            conn.commit()

            # Recreate
            cur.execute(
                """
                CREATE TABLE player_prop_bets (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    week_id INTEGER NOT NULL,
                    game_id INTEGER NOT NULL,
                    bookmakers VARCHAR(100),
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
            cur.execute(
                """
                CREATE INDEX idx_prop_bets_week_game_player
                ON player_prop_bets (week_id, game_id, playerDkId)
                """
            )
            cur.execute(
                """
                CREATE UNIQUE INDEX IF NOT EXISTS ux_prop_bets_unique
                ON player_prop_bets (week_id, game_id, bookmaker, market, outcome_name, playerDkId)
                """
            )
            conn.commit()
            print("Recreated player_prop_bets with week_id and new index")
            return True

        # Has rows: fallback to ALTER TABLE add column (nullable) and create index
        print("player_prop_bets has rows; adding week_id column as nullable and creating index...")
        cur.execute("ALTER TABLE player_prop_bets ADD COLUMN week_id INTEGER")
        try:
            cur.execute(
                """
                CREATE INDEX IF NOT EXISTS idx_prop_bets_week_game_player
                ON player_prop_bets (week_id, game_id, playerDkId)
                """
            )
            cur.execute(
                """
                CREATE UNIQUE INDEX IF NOT EXISTS ux_prop_bets_unique
                ON player_prop_bets (week_id, game_id, bookmaker, market, outcome_name, playerDkId)
                """
            )
        except Exception:
            pass
        conn.commit()
        print("Added week_id column and index. Backfill week_id as needed in application logic.")
        return True

    except sqlite3.Error as e:
        print(f"SQLite error: {e}")
        return False
    finally:
        if conn:
            conn.close()


if __name__ == "__main__":
    ok = ensure_schema()
    if ok:
        print("\n✅ Migration completed.")
    else:
        print("\n❌ Migration failed.")
        raise SystemExit(1)


