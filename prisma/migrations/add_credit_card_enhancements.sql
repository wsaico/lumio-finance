-- Migration: Add Credit Card Enhancements
-- Date: 2025-12-26
-- Description: Adds missing fields to credit_cards table, creates credit_card_statements table, and adds credit_card_id FK to transactions

-- Step 1: Add new columns to credit_cards table
ALTER TABLE credit_cards
  ADD COLUMN IF NOT EXISTS account_id UUID REFERENCES accounts(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS card_network VARCHAR(20),
  ADD COLUMN IF NOT EXISTS expiry_date TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS interest_rate_annual DECIMAL(5, 2),
  ADD COLUMN IF NOT EXISTS interest_rate_monthly DECIMAL(5, 2),
  ADD COLUMN IF NOT EXISTS min_payment_percent DECIMAL(5, 2) DEFAULT 5,
  ADD COLUMN IF NOT EXISTS min_payment_absolute DECIMAL(15, 2);

-- Step 2: Rename current_balance to used_balance for semantic clarity
-- IMPORTANT: This will preserve existing data
ALTER TABLE credit_cards
  RENAME COLUMN current_balance TO used_balance;

-- Step 3: Create index on account_id
CREATE INDEX IF NOT EXISTS idx_credit_cards_account_id ON credit_cards(account_id);

-- Step 4: Create credit_card_statements table
CREATE TABLE IF NOT EXISTS credit_card_statements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  credit_card_id UUID NOT NULL REFERENCES credit_cards(id) ON DELETE CASCADE,
  statement_month INT NOT NULL,
  statement_year INT NOT NULL,
  closing_date TIMESTAMPTZ NOT NULL,
  due_date TIMESTAMPTZ NOT NULL,
  opening_balance DECIMAL(15, 2) DEFAULT 0 NOT NULL,
  total_purchases DECIMAL(15, 2) DEFAULT 0 NOT NULL,
  total_payments DECIMAL(15, 2) DEFAULT 0 NOT NULL,
  total_interest DECIMAL(15, 2) DEFAULT 0 NOT NULL,
  closing_balance DECIMAL(15, 2) DEFAULT 0 NOT NULL,
  minimum_payment DECIMAL(15, 2) DEFAULT 0 NOT NULL,
  is_paid BOOLEAN DEFAULT FALSE NOT NULL,
  paid_amount DECIMAL(15, 2) DEFAULT 0 NOT NULL,
  paid_date TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,

  -- Ensure one statement per card per month/year
  CONSTRAINT unique_statement_per_card_month UNIQUE (credit_card_id, statement_month, statement_year)
);

-- Step 5: Create indexes for credit_card_statements
CREATE INDEX IF NOT EXISTS idx_credit_card_statements_user_id ON credit_card_statements(user_id);
CREATE INDEX IF NOT EXISTS idx_credit_card_statements_credit_card_id ON credit_card_statements(credit_card_id);
CREATE INDEX IF NOT EXISTS idx_credit_card_statements_due_date ON credit_card_statements(due_date);

-- Step 6: Add credit_card_id FK to transactions table
ALTER TABLE transactions
  ADD COLUMN IF NOT EXISTS credit_card_id UUID REFERENCES credit_cards(id) ON DELETE SET NULL;

-- Step 7: Create index on credit_card_id in transactions
CREATE INDEX IF NOT EXISTS idx_transactions_credit_card_id ON transactions(credit_card_id);

-- Step 8: Add trigger to update updated_at timestamp for credit_card_statements
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_credit_card_statements_updated_at ON credit_card_statements;
CREATE TRIGGER update_credit_card_statements_updated_at
  BEFORE UPDATE ON credit_card_statements
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Verification queries (commented out - run manually to verify)
-- SELECT column_name, data_type, is_nullable FROM information_schema.columns WHERE table_name = 'credit_cards' ORDER BY ordinal_position;
-- SELECT column_name, data_type, is_nullable FROM information_schema.columns WHERE table_name = 'credit_card_statements' ORDER BY ordinal_position;
-- SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'transactions' AND column_name = 'credit_card_id';
