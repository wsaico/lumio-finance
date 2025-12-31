-- Migration: Add credit card fields to accounts table and migrate data from credit_cards

-- Step 1: Add new columns to accounts table
ALTER TABLE accounts
ADD COLUMN IF NOT EXISTS last_four_digits VARCHAR(4),
ADD COLUMN IF NOT EXISTS credit_limit DECIMAL(15, 2),
ADD COLUMN IF NOT EXISTS used_balance DECIMAL(15, 2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS closing_day INTEGER,
ADD COLUMN IF NOT EXISTS payment_due_day INTEGER,
ADD COLUMN IF NOT EXISTS card_network VARCHAR(20),
ADD COLUMN IF NOT EXISTS expiry_date TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS interest_rate_annual DECIMAL(5, 2),
ADD COLUMN IF NOT EXISTS interest_rate_monthly DECIMAL(5, 2),
ADD COLUMN IF NOT EXISTS min_payment_percent DECIMAL(5, 2) DEFAULT 5,
ADD COLUMN IF NOT EXISTS min_payment_absolute DECIMAL(15, 2);

-- Step 2: Migrate data from credit_cards to accounts
INSERT INTO accounts (
  id,
  user_id,
  name,
  account_type,
  currency_code,
  initial_balance,
  current_balance,
  color,
  icon,
  is_active,
  sort_order,
  last_four_digits,
  credit_limit,
  used_balance,
  closing_day,
  payment_due_day,
  card_network,
  expiry_date,
  interest_rate_annual,
  interest_rate_monthly,
  min_payment_percent,
  min_payment_absolute,
  created_at,
  updated_at
)
SELECT
  id,
  user_id,
  name,
  'CREDIT_CARD' as account_type,
  currency_code,
  0 as initial_balance,
  -(used_balance) as current_balance, -- Negative because it's debt
  color,
  icon,
  is_active,
  0 as sort_order, -- Default value since credit_cards doesn't have this field
  last_four_digits,
  credit_limit,
  used_balance,
  closing_day,
  payment_due_day,
  card_network,
  expiry_date,
  interest_rate_annual,
  interest_rate_monthly,
  COALESCE(min_payment_percent, 5),
  min_payment_absolute,
  created_at,
  updated_at
FROM credit_cards
WHERE NOT EXISTS (
  SELECT 1 FROM accounts WHERE accounts.id = credit_cards.id
);

-- Step 3: Update transactions that reference credit_card_id to use account_id instead
UPDATE transactions
SET account_id = credit_card_id,
    metadata = jsonb_set(
      COALESCE(metadata, '{}'::jsonb),
      '{migratedFromCreditCard}',
      'true'::jsonb
    )
WHERE credit_card_id IS NOT NULL
  AND account_id != credit_card_id;

-- Step 4: Drop credit_card_id column from transactions (optional - can be done later)
-- ALTER TABLE transactions DROP COLUMN IF EXISTS credit_card_id;

-- Step 5: Drop credit_cards table (optional - can be done after verification)
-- DROP TABLE IF EXISTS credit_cards CASCADE;

COMMIT;
