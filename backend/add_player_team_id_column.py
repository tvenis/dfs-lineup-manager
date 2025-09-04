#!/usr/bin/env python3
"""
Migration script to add players.team_id column and backfill it from teams.abbreviation

Steps:
- Add nullable INTEGER column team_id to players
- Create index on players.team_id (optional for lookups)
- Backfill players.team_id by joining players.team (abbrev) to teams.abbreviation
- Leave original players.team (abbrev) column in place for now for backwards compatibility

Run this script once to update existing databases.
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

        # Check existing columns
        cursor.execute("PRAGMA table_info(players)")
        columns = [row[1] for row in cursor.fetchall()]

        if 'team_id' in columns:
            print("players.team_id already exists; proceeding to backfill if needed...")
        else:
            print("Adding team_id column to players table...")
            cursor.execute(
                """
                ALTER TABLE players
                ADD COLUMN team_id INTEGER
                """
            )
            print("Added players.team_id (nullable)")

        # Optional: create index for faster lookups
        print("Ensuring index on players.team_id...")
        cursor.execute(
            """
            CREATE INDEX IF NOT EXISTS idx_players_team_id ON players(team_id)
            """
        )

        # Backfill team_id using teams.abbreviation
        print("Backfilling players.team_id from teams.abbreviation...")

        # Use a single UPDATE with a join via correlated subquery (SQLite-friendly)
        cursor.execute(
            """
            UPDATE players
            SET team_id = (
                SELECT t.id FROM teams t WHERE t.abbreviation = players.team
            )
            WHERE team_id IS NULL
            """
        )

        updated_rows = conn.total_changes
        conn.commit()
        print(f"Backfill complete. Rows affected: {updated_rows}")

        # Verify
        cursor.execute(
            "SELECT COUNT(1) FROM players WHERE team_id IS NULL AND team IS NOT NULL"
        )
        remaining = cursor.fetchone()[0]
        if remaining == 0:
            print("✓ All existing players with a team abbreviation have team_id set")
        else:
            print(f"⚠ {remaining} players still missing team_id; check for mismatched abbreviations")

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
    print("Starting migration to add and backfill players.team_id...")
    success = migrate_database()
    if success:
        print("\n✅ Migration completed successfully!")
    else:
        print("\n❌ Migration failed!")
        raise SystemExit(1)


