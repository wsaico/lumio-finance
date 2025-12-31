-- Simple migration - Execute this in Supabase SQL Editor

-- Add new columns
ALTER TABLE public.accounts ADD COLUMN IF NOT EXISTS exclude_from_stats BOOLEAN DEFAULT false;
ALTER TABLE public.accounts ADD COLUMN IF NOT EXISTS archived BOOLEAN DEFAULT false;
ALTER TABLE public.accounts ADD COLUMN IF NOT EXISTS custom_bank_name TEXT;

-- Create audit table
CREATE TABLE IF NOT EXISTS public.account_balance_adjustments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  account_id UUID REFERENCES public.accounts(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  previous_initial_balance DECIMAL(15, 2) NOT NULL,
  new_initial_balance DECIMAL(15, 2) NOT NULL,
  adjustment_amount DECIMAL(15, 2) NOT NULL,
  reason TEXT,
  adjusted_at TIMESTAMPTZ DEFAULT NOW(),
  adjusted_by_user_id UUID REFERENCES auth.users(id) NOT NULL
);

-- Add indexes
CREATE INDEX IF NOT EXISTS idx_balance_adjustments_account ON public.account_balance_adjustments(account_id);
CREATE INDEX IF NOT EXISTS idx_accounts_exclude_from_stats ON public.accounts(exclude_from_stats) WHERE exclude_from_stats = true;
CREATE INDEX IF NOT EXISTS idx_accounts_archived ON public.accounts(archived) WHERE archived = true;

-- Enable RLS
ALTER TABLE public.account_balance_adjustments ENABLE ROW LEVEL SECURITY;

-- Create policies
DROP POLICY IF EXISTS "Users can view own balance adjustments" ON public.account_balance_adjustments;
CREATE POLICY "Users can view own balance adjustments"
  ON public.account_balance_adjustments FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can create own balance adjustments" ON public.account_balance_adjustments;
CREATE POLICY "Users can create own balance adjustments"
  ON public.account_balance_adjustments FOR INSERT
  WITH CHECK (auth.uid() = user_id AND auth.uid() = adjusted_by_user_id);
