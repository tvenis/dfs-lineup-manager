#!/usr/bin/env python3
"""
Migration to enforce FLOAT outcome_point and update unique index to include outcome_point.

Strategy for SQLite:
- If table is empty: drop and recreate with new schema and indexes
- If table has rows: create new table with desired schema, copy data, drop old, rename new
"""

import sqlite3
from pathlib import Path


def migrate() -> bool:
    db_path = Path(__file__).parent / "dfs_app.db"
    if not db_path.exists():
        print(f"Database not found at {db_path}")
        return False

    conn = None
    try:
        conn = sqlite3.connect(db_path)
        cur = conn.cursor()

        # Check table exists
        cur.execute("SELECT name FROM sqlite_master WHERE type='table' AND name='player_prop_bets'")
        exists = cur.fetchone() is not None
        if not exists:
            print("player_prop_bets does not exist; nothing to migrate")
            return True

        # Count rows
        cur.execute("SELECT COUNT(*) FROM player_prop_bets")
        row_count = cur.fetchone()[0]

        # Determine current columns and types
        cur.execute("PRAGMA table_info(player_prop_bets)")
        cols = cur.fetchall()
        col_types = {c[1]: c[2].upper() for c in cols}

        needs_float_point = col_types.get('outcome_point', '').upper() != 'FLOAT'

        # Check if the unique index already includes outcome_point
        cur.execute("PRAGMA index_list(player_prop_bets)")
        indexes = cur.fetchall()
        has_correct_unique = False
        for idx in indexes:
            idx_name = idx[1]
            if idx_name == 'ux_prop_bets_unique':
                cur.execute(f"PRAGMA index_info({idx_name})")
                cols = [r[2] for r in cur.fetchall()]
                has_correct_unique = 'outcome_point' in cols
                break

        if not needs_float_point and has_correct_unique:
            print("Schema already up to date; no migration needed")
            return True

        if row_count == 0:
            print("player_prop_bets empty; recreating with FLOAT outcome_point and updated unique index...")
            cur.execute("DROP TABLE player_prop_bets")
            conn.commit()

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
                    outcome_point FLOAT,
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
                ON player_prop_bets (week_id, game_id, bookmaker, market, outcome_name, playerDkId, outcome_point)
                """
            )
            conn.commit()
            print("Recreated player_prop_bets with updated schema and indexes")
            return True

        # Table has rows: perform copy via new table
        print("player_prop_bets has rows; migrating via copy to new table...")
        cur.execute("DROP TABLE IF EXISTS player_prop_bets_new")
        cur.execute(
            """
            CREATE TABLE player_prop_bets_new (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                week_id INTEGER NOT NULL,
                game_id INTEGER NOT NULL,
                bookmaker VARCHAR(100),
                market VARCHAR(100),
                outcome_name VARCHAR(200),
                outcome_description VARCHAR(500),
                playerDkId INTEGER NOT NULL,
                outcome_price INTEGER,
                outcome_point FLOAT,
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

        # Copy data with cast where needed
        cur.execute(
            """
            INSERT INTO player_prop_bets_new (
                id, week_id, game_id, bookmaker, market, outcome_name, outcome_description, playerDkId,
                outcome_price, outcome_point, outcome_likelihood, updated_by, last_prop_update, created_at, updated_at
            )
            SELECT id, week_id, game_id, bookmaker, market, outcome_name, outcome_description, playerDkId,
                   outcome_price, CAST(outcome_point AS FLOAT), outcome_likelihood, updated_by, last_prop_update, created_at, updated_at
            FROM player_prop_bets
            """
        )

        cur.execute("DROP TABLE player_prop_bets")
        cur.execute("ALTER TABLE player_prop_bets_new RENAME TO player_prop_bets")

        # Recreate indexes
        cur.execute(
            """
            CREATE INDEX idx_prop_bets_week_game_player
            ON player_prop_bets (week_id, game_id, playerDkId)
            """
        )
        cur.execute(
            """
            CREATE UNIQUE INDEX IF NOT EXISTS ux_prop_bets_unique
            ON player_prop_bets (week_id, game_id, bookmaker, market, outcome_name, playerDkId, outcome_point)
            """
        )
        conn.commit()
        print("Migrated player_prop_bets with FLOAT outcome_point and updated unique index")
        return True

    except sqlite3.Error as e:
        print(f"SQLite error: {e}")
        return False
    finally:
        if conn:
            conn.close()


if __name__ == "__main__":
    ok = migrate()
    if ok:
        print("\n✅ Migration completed.")
    else:
        print("\n❌ Migration failed.")
        raise SystemExit(1)


