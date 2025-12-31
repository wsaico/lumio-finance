-- Add subcategory_id to petty_cash_expenses
ALTER TABLE IF EXISTS "public"."petty_cash_expenses" 
ADD COLUMN IF NOT EXISTS "subcategory_id" UUID REFERENCES "public"."subcategories"("id") ON DELETE SET NULL;

-- Create index for performance
CREATE INDEX IF NOT EXISTS "idx_petty_cash_expenses_subcategory" ON "public"."petty_cash_expenses"("subcategory_id");

-- Comment for documentation
COMMENT ON COLUMN "public"."petty_cash_expenses"."subcategory_id" IS 'Optional subcategory for more granular expense tracking, matching the global system.';
