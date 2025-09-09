#!/usr/bin/env python3
"""
SQLite migration to drop net_profit_usd nonnegative check by recreating contest table.
Preserves data.
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
        cur.execute("PRAGMA foreign_keys=off")
        conn.commit()

        # 1) Rename old table
        cur.execute("ALTER TABLE contest RENAME TO contest_old")

        # 2) Create new table schema with entry_key PK and contest_id non-unique, no net_profit check
        cur.execute(
            """
            CREATE TABLE contest (
                entry_key INTEGER PRIMARY KEY,
                contest_id INTEGER,
                week_id INTEGER,
                sport_id INTEGER NOT NULL,
                lineup_id VARCHAR(50),
                game_type_id INTEGER NOT NULL,
                contest_type_id INTEGER,
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
                net_profit_usd NUMERIC(12,2) NOT NULL,
                result INTEGER DEFAULT 0,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (week_id) REFERENCES weeks(id),
                FOREIGN KEY (sport_id) REFERENCES sport(sport_id),
                FOREIGN KEY (lineup_id) REFERENCES lineups(id),
                FOREIGN KEY (game_type_id) REFERENCES game_type(game_type_id),
                FOREIGN KEY (contest_type_id) REFERENCES contest_type(contest_type_id)
            )
            """
        )

        # 3) Copy data
        cur.execute(
            """
            INSERT INTO contest (
                entry_key, contest_id, week_id, sport_id, lineup_id, game_type_id, contest_description,
                contest_opponent, contest_date_utc, contest_place, contest_points,
                winnings_non_ticket, winnings_ticket, contest_entries, places_paid,
                entry_fee_usd, prize_pool_usd, net_profit_usd, result, created_at, contest_type_id
            )
            SELECT 
                contest_id as entry_key, contest_id, week_id, sport_id, lineup_id, game_type_id, contest_description,
                contest_opponent, contest_date_utc, contest_place, contest_points,
                winnings_non_ticket, winnings_ticket, contest_entries, places_paid,
                entry_fee_usd, prize_pool_usd, net_profit_usd, 0 as result, created_at, NULL as contest_type_id
            FROM contest_old
            """
        )

        # 4) Recreate indexes
        cur.execute("CREATE INDEX IF NOT EXISTS idx_contest_week ON contest(week_id)")
        cur.execute("CREATE INDEX IF NOT EXISTS idx_contest_sport ON contest(sport_id)")
        cur.execute("CREATE INDEX IF NOT EXISTS idx_contest_game_type ON contest(game_type_id)")
        cur.execute("CREATE INDEX IF NOT EXISTS idx_contest_contest_id ON contest(contest_id)")
        cur.execute("CREATE INDEX IF NOT EXISTS idx_contest_contest_type ON contest(contest_type_id)")

        # 5) Drop old table
        cur.execute("DROP TABLE contest_old")

        conn.commit()
        print("Contest table recreated without net_profit_usd check.")
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
            cur.execute("PRAGMA foreign_keys=on")
            conn.commit()
            conn.close()


if __name__ == "__main__":
    print("Starting migration to drop net_profit_usd check...")
    ok = migrate()
    if ok:
        print("\n\u2705 Migration completed successfully!")
    else:
        print("\n\u274c Migration failed!")
        raise SystemExit(1)


