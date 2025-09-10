-- SQL script to delete all records from player_pool_entries where draftGroup = 131103
-- This script will remove all player pool entries associated with draft group 131103

-- First, let's see how many records will be affected
SELECT COUNT(*) as records_to_delete 
FROM player_pool_entries 
WHERE draftGroup = '131103';

-- Delete all records with draftGroup = 131103
DELETE FROM player_pool_entries 
WHERE draftGroup = '131103';

-- Verify the deletion by checking the count again
SELECT COUNT(*) as remaining_records 
FROM player_pool_entries 
WHERE draftGroup = '131103';

-- Show total remaining records in player_pool_entries
SELECT COUNT(*) as total_remaining_records 
FROM player_pool_entries;
