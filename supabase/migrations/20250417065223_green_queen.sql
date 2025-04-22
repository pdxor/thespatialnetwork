/*
  # Add foreign key relationship between badge_quests and profiles

  1. Changes
    - Add foreign key constraint from badge_quests.created_by to profiles.user_id
    - This enables proper joins between badge_quests and profiles tables
    - Allows fetching creator profile data when querying badge_quests

  2. Technical Details
    - Uses DO block to safely check for existing constraint
    - Maintains data integrity by linking to profiles.user_id
*/

DO $$ 
BEGIN
  -- Add foreign key constraint if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 
    FROM information_schema.table_constraints 
    WHERE constraint_name = 'badge_quests_created_by_profiles_fkey'
  ) THEN
    ALTER TABLE badge_quests
    ADD CONSTRAINT badge_quests_created_by_profiles_fkey
    FOREIGN KEY (created_by) REFERENCES profiles(user_id);
  END IF;
END $$;