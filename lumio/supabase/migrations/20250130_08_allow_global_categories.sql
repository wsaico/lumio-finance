-- Migration Part 8: Allow Global Categories (Nullable user_id)

-- 1. Modify Tables to allow NULL user_id (Global System Categories)
ALTER TABLE public.expense_categories ALTER COLUMN user_id DROP NOT NULL;
ALTER TABLE public.income_categories ALTER COLUMN user_id DROP NOT NULL;

-- 2. Update RLS Policies for Expense Categories
DROP POLICY IF EXISTS "Users can view global expense categories" ON public.expense_categories;
CREATE POLICY "Users can view global expense categories"
    ON public.expense_categories FOR SELECT
    USING (user_id IS NULL OR user_id = auth.uid());

-- 3. Update RLS Policies for Income Categories
DROP POLICY IF EXISTS "Users can view global income categories" ON public.income_categories;
CREATE POLICY "Users can view global income categories"
    ON public.income_categories FOR SELECT
    USING (user_id IS NULL OR user_id = auth.uid());

-- 4. Update RLS Policies for Subcategories
DROP POLICY IF EXISTS "Users can view global subcategories" ON public.subcategories;
CREATE POLICY "Users can view global subcategories"
    ON public.subcategories FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.expense_categories ec
            WHERE ec.id = subcategories.expense_category_id
            AND (ec.user_id IS NULL OR ec.user_id = auth.uid())
        )
        OR
        EXISTS (
            SELECT 1 FROM public.income_categories ic
            WHERE ic.id = subcategories.income_category_id
            AND (ic.user_id IS NULL OR ic.user_id = auth.uid())
        )
    );

-- 5. Helper function to check category ownership or global status
CREATE OR REPLACE FUNCTION is_valid_category_for_user(category_id UUID, user_auth_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM expense_categories WHERE id = category_id AND (user_id = user_auth_id OR user_id IS NULL)
        UNION ALL
        SELECT 1 FROM income_categories WHERE id = category_id AND (user_id = user_auth_id OR user_id IS NULL)
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
