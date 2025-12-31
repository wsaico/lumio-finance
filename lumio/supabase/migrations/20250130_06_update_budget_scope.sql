-- Add check constraint for budget_scope to allow 'GLOBAL' and 'ACCOUNT'
ALTER TABLE budgets DROP CONSTRAINT IF EXISTS valid_budget_scope;

-- We need to update existing rows before adding constraint to avoid violation if any
UPDATE budgets SET budget_scope = 'GLOBAL' WHERE budget_scope = 'ALL_TRANSACTIONS' OR budget_scope = 'ADDED_ONLY';

ALTER TABLE budgets 
ADD CONSTRAINT valid_budget_scope 
CHECK (budget_scope IN ('GLOBAL', 'ACCOUNT'));
