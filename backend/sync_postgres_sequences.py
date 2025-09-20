#!/usr/bin/env python3
"""
PostgreSQL Sequence Synchronization Utility

This script fixes PostgreSQL auto-increment sequences that may be out of sync
after data migration from SQLite or when data is imported with explicit IDs.

Usage:
    python sync_postgres_sequences.py

This is particularly important when migrating from SQLite to PostgreSQL, as
SQLite doesn't use sequences for auto-increment, but PostgreSQL does.
"""

import os
import sys
from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker

def get_database_url():
    """Get database URL from environment variables"""
    database_url = (
        os.getenv('DATABASE_URL') or 
        os.getenv('STORAGE_URL') or 
        os.getenv('LOCAL_DATABASE_URL')
    )
    
    if not database_url:
        raise ValueError(
            "Database connection string not found. Please set one of these environment variables:\n"
            "- DATABASE_URL (for production/Vercel)\n"
            "- STORAGE_URL (from Neon integration)\n"
            "- LOCAL_DATABASE_URL (for local development)\n"
            "Example: LOCAL_DATABASE_URL='postgresql://user:pass@host/db'"
        )
    
    return database_url

def sync_sequence(session, table_name, id_column='id'):
    """
    Synchronize a PostgreSQL sequence with the maximum ID in the table
    
    Args:
        session: SQLAlchemy session
        table_name: Name of the table
        id_column: Name of the ID column (default: 'id')
    """
    try:
        # Get the sequence name (PostgreSQL convention)
        sequence_name = f"{table_name}_{id_column}_seq"
        
        # Check if the sequence exists
        seq_check = session.execute(text(f"""
            SELECT EXISTS (
                SELECT 1 FROM pg_sequences 
                WHERE sequencename = '{sequence_name}'
            )
        """)).fetchone()
        
        if not seq_check[0]:
            print(f"  ⚠️  Sequence {sequence_name} does not exist, skipping")
            return
        
        # Get the maximum ID from the table
        result = session.execute(text(f'SELECT MAX({id_column}) FROM {table_name};')).fetchone()
        max_id = result[0] if result and result[0] else 0
        
        if max_id == 0:
            print(f"  ✅ Table {table_name} is empty, sequence should be fine")
            return
        
        # Get current sequence value
        try:
            current_seq = session.execute(text(f"SELECT currval('{sequence_name}')")).fetchone()[0]
        except Exception:
            # If currval fails, the sequence hasn't been used yet, so it's at 1
            current_seq = 1
        
        # Set the sequence to the correct next value
        next_id = max_id + 1
        session.execute(text(f"SELECT setval('{sequence_name}', {next_id}, false)"))
        session.commit()
        
        print(f"  ✅ {table_name}: max_id={max_id}, set sequence next value to {next_id} (was {current_seq})")
        
    except Exception as e:
        print(f"  ❌ Error syncing {table_name}: {str(e)}")
        session.rollback()

def main():
    """Main function to sync all sequences"""
    print("🔄 Synchronizing PostgreSQL sequences...")
    
    try:
        # Get database connection
        database_url = get_database_url()
        engine = create_engine(database_url)
        Session = sessionmaker(bind=engine)
        session = Session()
        
        # List of tables with auto-increment IDs to sync
        tables_to_sync = [
            'player_pool_entries',
            'recent_activity',
            'weeks',
            'teams',
            'games',
            'contests',
            'draftgroups',
            'player_actuals',
            'player_prop_bets',
            'tips_configuration'
        ]
        
        print(f"📋 Checking {len(tables_to_sync)} tables...")
        
        for table_name in tables_to_sync:
            print(f"🔍 Checking {table_name}...")
            sync_sequence(session, table_name)
        
        session.close()
        print("\n✅ Sequence synchronization complete!")
        
    except Exception as e:
        print(f"\n❌ Error: {str(e)}")
        sys.exit(1)

if __name__ == "__main__":
    main()
