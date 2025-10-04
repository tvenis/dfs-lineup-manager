-- Drop the old team_defense_stats table and its indexes
-- This should only be run after confirming the team_stats table is working correctly

-- First, let's check if the table exists and show its structure
-- SELECT table_name, column_name, data_type 
-- FROM information_schema.columns 
-- WHERE table_name = 'team_defense_stats' 
-- ORDER BY ordinal_position;

-- Drop the indexes first (if they exist)
DROP INDEX IF EXISTS idx_team_defense_stats_week_id;
DROP INDEX IF EXISTS idx_team_defense_stats_team_id;
DROP INDEX IF EXISTS idx_team_defense_stats_opponent_team_id;
DROP INDEX IF EXISTS idx_team_defense_stats_unique;

-- Drop the table
DROP TABLE IF EXISTS team_defense_stats;

-- Verify the table is dropped
-- SELECT table_name FROM information_schema.tables WHERE table_name = 'team_defense_stats';
