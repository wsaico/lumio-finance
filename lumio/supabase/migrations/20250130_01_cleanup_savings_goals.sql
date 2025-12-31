-- Migration Part 1: Drop existing tables if they exist and recreate
-- This ensures a clean slate

-- Drop tables in reverse order of dependencies
DROP TABLE IF EXISTS goal_account_links CASCADE;
DROP TABLE IF EXISTS goal_milestones CASCADE;
DROP TABLE IF EXISTS goal_contributions CASCADE;
DROP TABLE IF EXISTS savings_goals CASCADE;

-- Drop functions if they exist
DROP FUNCTION IF EXISTS check_and_award_milestone(UUID);
DROP FUNCTION IF EXISTS calculate_goal_progress(UUID);
DROP FUNCTION IF EXISTS update_savings_goals_updated_at();
