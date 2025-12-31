-- Migration to add Advanced Budgeting columns to 'budgets' table
-- Run this in your Supabase SQL Editor to enable advanced filters.

ALTER TABLE budgets 
ADD COLUMN IF NOT EXISTS type VARCHAR(20) DEFAULT 'EXPENSE',
ADD COLUMN IF NOT EXISTS period VARCHAR(20) DEFAULT 'MONTHLY',
ADD COLUMN IF NOT EXISTS color VARCHAR(20) DEFAULT '#3b82f6',
ADD COLUMN IF NOT EXISTS currency_code VARCHAR(3) DEFAULT 'USD',
ADD COLUMN IF NOT EXISTS account_ids UUID[] DEFAULT '{}',
ADD COLUMN IF NOT EXISTS include_categories TEXT[] DEFAULT '{}', -- Using TEXT as IDs might be system IDs (e100...) or UUIDs
ADD COLUMN IF NOT EXISTS exclude_categories TEXT[] DEFAULT '{}',
ADD COLUMN IF NOT EXISTS include_tags TEXT[] DEFAULT '{}',
ADD COLUMN IF NOT EXISTS transaction_filter_mode VARCHAR(50) DEFAULT 'DEFAULT',
ADD COLUMN IF NOT EXISTS budget_scope VARCHAR(50) DEFAULT 'ALL_TRANSACTIONS',
ADD COLUMN IF NOT EXISTS include_loaned BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS include_goal_transactions BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS include_balance_corrections BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS include_from_other_budgets BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS excluded_budget_ids UUID[] DEFAULT '{}',
ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true;

-- Note: 'startDate' and 'endDate' are derived from month/year in code, so we don't strictly need them
-- unless you want to support arbitrary date ranges.
-- If you do, uncomment below:
-- ALTER TABLE budgets ADD COLUMN IF NOT EXISTS start_date TIMESTAMPTZ;
-- ALTER TABLE budgets ADD COLUMN IF NOT EXISTS end_date TIMESTAMPTZ;
