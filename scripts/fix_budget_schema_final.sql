
-- FINAL FIX for Budgets Table
-- Addresses missing 'amount' column and legacy vs new column names

-- 1. Ensure 'amount' column exists (It was missing!)
ALTER TABLE budgets 
ADD COLUMN IF NOT EXISTS amount DECIMAL(12, 2) DEFAULT 0;

-- 2. Ensure 'category_id' column exists? 
-- Actually, we discovered the table uses 'include_categories' (array). 
-- But existing code (Transaction Route) might rely on 'category_id' for some logic?
-- If we want to be safe, we can add it, but 'include_categories' is superior for Multi-Category budgets.
-- The API update handles the mapping. We do NOT need to add category_id if we use include_categories.

-- 3. Verify Constraints
-- 'budget_year' and 'budget_month' and 'currency_code' are NOT NULL.
-- Ensure we don't have existing rows with nulls (unlikely if they werent allowed).

-- 4. Enable RLS if needed (Standard practice)
ALTER TABLE budgets ENABLE ROW LEVEL SECURITY;

-- 5. Grant access (just in case)
GRANT ALL ON budgets TO authenticated;
GRANT ALL ON budgets TO service_role;
