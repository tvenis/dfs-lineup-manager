#!/usr/bin/env python3
"""
Migration script to add dk_contest_detail table.
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
        cur = conn.cursor()

        cur.execute(
            """
            SELECT name FROM sqlite_master
            WHERE type='table' AND name='dk_contest_detail'
            """
        )
        if cur.fetchone():
            print("dk_contest_detail table already exists")
            return True

        print("Creating dk_contest_detail table...")
        cur.execute(
            """
            CREATE TABLE dk_contest_detail (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                contest_id VARCHAR(50) NOT NULL,
                name VARCHAR(250),
                sport_id INTEGER,
                contest_type_id INTEGER,
                summary TEXT,
                draftGroupId INTEGER,
                payoutDescription TEXT,
                rake_percentage FLOAT,
                total_payouts NUMERIC(12,2),
                is_guaranteed BOOLEAN,
                is_private BOOLEAN,
                is_cashprize_only BOOLEAN,
                entry_fee NUMERIC(12,2),
                entries INTEGER,
                max_entries INTEGER,
                max_entries_per_user INTEGER,
                contest_state VARCHAR(50),
                contest_start_time DATETIME,
                attributes TEXT,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                updated_at DATETIME
            )
            """
        )

        cur.execute("CREATE UNIQUE INDEX idx_dkdetail_contest_id ON dk_contest_detail(contest_id)")
        cur.execute("CREATE INDEX idx_dkdetail_sport ON dk_contest_detail(sport_id)")
        cur.execute("CREATE INDEX idx_dkdetail_contest_type ON dk_contest_detail(contest_type_id)")

        conn.commit()
        print("dk_contest_detail table created")
        return True
    except sqlite3.Error as e:
        print("SQLite error:", e)
        if conn: conn.rollback()
        return False
    finally:
        if conn:
            conn.close()


if __name__ == "__main__":
    print("Starting migration to add dk_contest_detail table...")
    ok = migrate_database()
    if ok:
        print("\n\u2705 Migration completed successfully!")
    else:
        print("\n\u274c Migration failed!")
        raise SystemExit(1)


