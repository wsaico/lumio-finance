
-- FIX ROW LEVEL SECURITY (RLS) POLICIES
-- If RLS is enabled but no policies exist, inserts will fail.

-- 1. Ensure RLS is enabled
ALTER TABLE budgets ENABLE ROW LEVEL SECURITY;

-- 2. Create INSERT Policy
DROP POLICY IF EXISTS "Enable insert for users based on user_id" ON budgets;
CREATE POLICY "Enable insert for users based on user_id" ON budgets
FOR INSERT WITH CHECK (
  auth.uid() = user_id
);

-- 3. Create SELECT Policy
DROP POLICY IF EXISTS "Enable read for users based on user_id" ON budgets;
CREATE POLICY "Enable read for users based on user_id" ON budgets
FOR SELECT USING (
  auth.uid() = user_id
);

-- 4. Create UPDATE Policy
DROP POLICY IF EXISTS "Enable update for users based on user_id" ON budgets;
CREATE POLICY "Enable update for users based on user_id" ON budgets
FOR UPDATE USING (
  auth.uid() = user_id
) WITH CHECK (
  auth.uid() = user_id
);

-- 5. Create DELETE Policy
DROP POLICY IF EXISTS "Enable delete for users based on user_id" ON budgets;
CREATE POLICY "Enable delete for users based on user_id" ON budgets
FOR DELETE USING (
  auth.uid() = user_id
);

-- 6. REMOVE DUPLICATE CONSTRAINT (If not done yet)
-- This blocks creating multiple budgets per month
ALTER TABLE budgets DROP CONSTRAINT IF EXISTS budgets_user_id_year_month_key;
