import os
import sys
from textwrap import dedent
import psycopg

def main() -> int:
    database_url = os.getenv("DATABASE_URL") or os.getenv("DATABASE_DATABASE_URL") or os.getenv("LOCAL_DATABASE_URL") or os.getenv("STORAGE_URL")
    if not database_url:
        print("ERROR: DATABASE_URL not set.")
        return 1

    print("Connecting to Postgres...")
    with psycopg.connect(database_url) as conn:
        conn.execute("SET statement_timeout TO '5min'")
        with conn.cursor() as cur:
            # Create player_name_aliases table
            sql = dedent(
                """
                CREATE TABLE IF NOT EXISTS "player_name_aliases" (
                    "id" SERIAL PRIMARY KEY,
                    "playerDkId" INTEGER NOT NULL REFERENCES "players"("playerDkId") ON DELETE CASCADE,
                    "alias_name" VARCHAR(100) NOT NULL,
                    "created_at" TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
                    "updated_at" TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
                    UNIQUE("playerDkId", "alias_name")
                );
                """
            ).strip()
            print(f"Applying: {sql}")
            cur.execute(sql)
            
            # Create index for fast alias lookups
            index_sql = dedent(
                """
                CREATE INDEX IF NOT EXISTS "idx_player_name_aliases_alias_name" 
                ON "player_name_aliases" ("alias_name");
                """
            ).strip()
            print(f"Applying: {index_sql}")
            cur.execute(index_sql)
            
            # Create index for player lookups
            index_sql2 = dedent(
                """
                CREATE INDEX IF NOT EXISTS "idx_player_name_aliases_playerDkId" 
                ON "player_name_aliases" ("playerDkId");
                """
            ).strip()
            print(f"Applying: {index_sql2}")
            cur.execute(index_sql2)
            
        conn.commit()
    print("\n✅ Migration complete.")
    return 0

if __name__ == "__main__":
    sys.exit(main())
