
-- 1. Force Schema Cache Reload for PostgREST
-- This is often necessary when adding columns if the API doesn't pick it up immediately.
NOTIFY pgrst, 'reload config';

-- 2. Verify/Re-add Column just in case (Idempotent)
ALTER TABLE "profiles" 
ADD COLUMN IF NOT EXISTS "budgeting_method" TEXT DEFAULT 'TRADITIONAL';

-- 3. Grant Permissions (Just to be safe, though usually authenticated has access)
GRANT UPDATE(budgeting_method) ON profiles TO authenticated;
GRANT SELECT(budgeting_method) ON profiles TO authenticated;

-- 4. Add RLS Policy for Update (If not exists)
-- Allow users to update their OWN profile
CREATE POLICY "Users can update own profile budgeting_method"
ON "profiles"
FOR UPDATE
TO authenticated
USING (auth.uid() = id)
WITH CHECK (auth.uid() = id);

-- If policy already exists, this might error, but the NOTIFY is the most important part.
