#!/usr/bin/env python3
"""
Migration script to drop and recreate the projections table for the new projections CSV format.
This will DELETE existing projections data. Re-import after running.
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

        print("Dropping existing projections table if it exists...")
        cursor.execute("DROP TABLE IF EXISTS projections")

        print("Creating projections table (new schema)...")
        cursor.execute(
            """
            CREATE TABLE projections (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                week_id INTEGER NOT NULL,
                playerDkId INTEGER NOT NULL,
                position VARCHAR(10) NOT NULL,
                attemps FLOAT,
                comps FLOAT,
                passYards FLOAT,
                passTDs FLOAT,
                ints FLOAT,
                receptions FLOAT,
                recYards FLOAT,
                recTDs FLOAT,
                rushYards FLOAT,
                rushTDs FLOAT,
                fumbles FLOAT,
                rank INTEGER,
                pprProjections FLOAT,
                actuals FLOAT,
                source VARCHAR(100) NOT NULL,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                updated_at DATETIME,
                FOREIGN KEY (week_id) REFERENCES weeks (id),
                FOREIGN KEY (playerDkId) REFERENCES players (playerDkId)
            )
            """
        )

        print("Creating unique index on (week_id, playerDkId, source)...")
        cursor.execute(
            """
            CREATE UNIQUE INDEX IF NOT EXISTS idx_week_player_source
            ON projections (week_id, playerDkId, source)
            """
        )

        conn.commit()
        print("Migration completed successfully.")
        return True
    except sqlite3.Error as e:
        if 'conn' in locals():
            conn.rollback()
        print(f"SQLite error: {e}")
        return False
    except Exception as e:
        if 'conn' in locals():
            conn.rollback()
        print(f"Error: {e}")
        return False
    finally:
        if 'conn' in locals():
            conn.close()


if __name__ == "__main__":
    success = migrate_database()
    if not success:
        raise SystemExit(1)
    raise SystemExit(0)


