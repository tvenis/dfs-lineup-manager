-- SQL script to rename team_defense_stats table to team_stats
-- Run this script in your PostgreSQL database

-- Step 1: Rename the table
ALTER TABLE team_defense_stats RENAME TO team_stats;

-- Step 2: Rename all indexes
ALTER INDEX idx_team_defense_stats_week_id RENAME TO idx_team_stats_week_id;
ALTER INDEX idx_team_defense_stats_team_id RENAME TO idx_team_stats_team_id;
ALTER INDEX idx_team_defense_stats_opponent_team_id RENAME TO idx_team_stats_opponent_team_id;
ALTER INDEX idx_team_defense_stats_unique RENAME TO idx_team_stats_unique;

-- Verify the changes
SELECT 'Table renamed successfully' as status;
SELECT indexname FROM pg_indexes WHERE tablename = 'team_stats';
SELECT COUNT(*) as record_count FROM team_stats;
