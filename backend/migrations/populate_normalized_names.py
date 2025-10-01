#!/usr/bin/env python3
"""
Migration: Populate normalized name columns in players table

Populates the normalized name columns using the name normalization utility.
This should be run after adding the normalized columns.

Environment:
- Uses DATABASE_URL (or DATABASE_DATABASE_URL / LOCAL_DATABASE_URL / STORAGE_URL) for Neon Postgres.
"""

import os
import sys
from textwrap import dedent
import psycopg


def normalize_name(name: str) -> str:
    """Normalize a player name for consistent matching."""
    if not name:
        return ""
    
    import re
    import unicodedata
    
    # Convert to lowercase
    normalized = name.lower()
    
    # Unicode normalization and remove accents
    normalized = unicodedata.normalize('NFKD', normalized)
    normalized = ''.join(c for c in normalized if unicodedata.category(c) != 'Mn')
    
    # Remove periods and dashes, replace with spaces
    normalized = re.sub(r'[.\-]', ' ', normalized)
    
    # Collapse multiple spaces to single space
    normalized = re.sub(r'\s+', ' ', normalized)
    
    # Strip leading/trailing whitespace
    normalized = normalized.strip()
    
    return normalized


def strip_suffixes(name: str) -> str:
    """Remove common name suffixes from a name string."""
    if not name:
        return ""
    
    suffixes = {"jr", "sr", "ii", "iii", "iv", "v"}
    
    # Remove periods and commas, then split
    cleaned = name.replace(".", "").replace(",", " ")
    parts = [p for p in cleaned.split() if p.lower() not in suffixes]
    
    return " ".join(parts)


def normalize_for_matching(name: str) -> str:
    """Full normalization pipeline for player matching."""
    if not name:
        return ""
    
    # First strip suffixes, then normalize
    without_suffixes = strip_suffixes(name)
    return normalize_name(without_suffixes)


def main() -> int:
    database_url = (
        os.getenv("DATABASE_URL")
        or os.getenv("DATABASE_DATABASE_URL")
        or os.getenv("LOCAL_DATABASE_URL")
        or os.getenv("STORAGE_URL")
    )
    if not database_url:
        print("ERROR: DATABASE_URL not set.")
        return 1

    print("Connecting to Postgres...")
    with psycopg.connect(database_url) as conn:
        with conn.cursor() as cur:
            # Get all players
            cur.execute("SELECT \"playerDkId\", \"firstName\", \"lastName\", \"displayName\" FROM \"players\"")
            players = cur.fetchall()
            
            print(f"Found {len(players)} players to process...")
            
            updated_count = 0
            for player_id, first_name, last_name, display_name in players:
                # Normalize each name field
                norm_first = normalize_for_matching(first_name or "")
                norm_last = normalize_for_matching(last_name or "")
                norm_display = normalize_for_matching(display_name or "")
                
                # Update the player record
                update_sql = dedent("""
                    UPDATE "players" 
                    SET "normalized_first_name" = %s,
                        "normalized_last_name" = %s,
                        "normalized_display_name" = %s
                    WHERE "playerDkId" = %s
                """).strip()
                
                cur.execute(update_sql, (norm_first, norm_last, norm_display, player_id))
                updated_count += 1
                
                if updated_count % 100 == 0:
                    print(f"Processed {updated_count} players...")
            
            conn.commit()
            print(f"\n✅ Updated {updated_count} players with normalized names.")
            
            # Verify the update
            cur.execute("SELECT COUNT(*) FROM \"players\" WHERE \"normalized_display_name\" IS NOT NULL")
            count = cur.fetchone()[0]
            print(f"✅ {count} players now have normalized_display_name populated.")
            
    return 0


if __name__ == "__main__":
    sys.exit(main())
