#!/usr/bin/env python3
"""
Migration script to add player_actuals table for storing player statistical data from CSV imports.
This table will store actual performance data for players in specific weeks.
"""

import sqlite3
from pathlib import Path


def migrate_database() -> bool:
    db_path = Path(__file__).parent / "dfs_app.db"

    if not db_path.exists():
        print(f"Database not found at {db_path}")
        return False

    try:
        conn = sqlite3.connect(db_path)
        cursor = conn.cursor()

        print("Creating player_actuals table...")
        cursor.execute(
            """
            CREATE TABLE player_actuals (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                week_id INTEGER NOT NULL,
                playerDkId INTEGER NOT NULL,
                team VARCHAR(10) NOT NULL,
                position VARCHAR(10) NOT NULL,
                completions FLOAT,
                attempts FLOAT,
                pass_yds FLOAT,
                pass_tds FLOAT,
                interceptions FLOAT,
                rush_att FLOAT,
                rush_yds FLOAT,
                rush_tds FLOAT,
                rec_tgt FLOAT,
                receptions FLOAT,
                rec_yds FLOAT,
                rec_tds FLOAT,
                fumbles FLOAT,
                fumbles_lost FLOAT,
                total_tds FLOAT,
                two_pt_md FLOAT,
                two_pt_pass FLOAT,
                dk_actuals FLOAT,
                vbd FLOAT,
                pos_rank INTEGER,
                ov_rank INTEGER,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                updated_at DATETIME,
                FOREIGN KEY (week_id) REFERENCES weeks (id),
                FOREIGN KEY (playerDkId) REFERENCES players (playerDkId)
            )
            """
        )

        print("Creating unique index on (week_id, playerDkId)...")
        cursor.execute(
            """
            CREATE UNIQUE INDEX IF NOT EXISTS idx_player_actuals_week_player
            ON player_actuals (week_id, playerDkId)
            """
        )

        print("Creating index on week_id for performance...")
        cursor.execute(
            """
            CREATE INDEX IF NOT EXISTS idx_player_actuals_week
            ON player_actuals (week_id)
            """
        )

        print("Creating index on playerDkId for performance...")
        cursor.execute(
            """
            CREATE INDEX IF NOT EXISTS idx_player_actuals_player
            ON player_actuals (playerDkId)
            """
        )

        conn.commit()
        print("Migration completed successfully.")
        return True

    except Exception as e:
        print(f"Migration failed: {e}")
        return False

    finally:
        if 'conn' in locals():
            conn.close()


if __name__ == "__main__":
    success = migrate_database()
    if success:
        print("✅ Player actuals table created successfully!")
    else:
        print("❌ Migration failed!")
