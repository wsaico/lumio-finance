-- =====================================================
-- ACCOUNTS IMPROVEMENTS MIGRATION
-- Adds: exclude_from_stats, archived, custom_bank_name
-- Adds function for initial_balance adjustments with audit trail
-- =====================================================

-- Step 1: Add new columns to accounts table
ALTER TABLE public.accounts
ADD COLUMN IF NOT EXISTS exclude_from_stats BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS archived BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS custom_bank_name TEXT;

-- Step 2: Create audit table for balance adjustments
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

CREATE INDEX idx_balance_adjustments_account ON public.account_balance_adjustments(account_id);
CREATE INDEX idx_balance_adjustments_user ON public.account_balance_adjustments(user_id);

ALTER TABLE public.account_balance_adjustments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own balance adjustments"
  ON public.account_balance_adjustments FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create own balance adjustments"
  ON public.account_balance_adjustments FOR INSERT
  WITH CHECK (auth.uid() = user_id AND auth.uid() = adjusted_by_user_id);

-- Step 3: Create function to adjust initial balance with audit trail
CREATE OR REPLACE FUNCTION adjust_account_initial_balance(
  p_account_id UUID,
  p_new_initial_balance DECIMAL(15, 2),
  p_reason TEXT DEFAULT NULL
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_account RECORD;
  v_old_initial_balance DECIMAL(15, 2);
  v_current_balance DECIMAL(15, 2);
  v_adjustment DECIMAL(15, 2);
  v_new_current_balance DECIMAL(15, 2);
  v_user_id UUID;
BEGIN
  -- Get current user
  v_user_id := auth.uid();

  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'No authenticated user';
  END IF;

  -- Get current account data
  SELECT * INTO v_account
  FROM public.accounts
  WHERE id = p_account_id AND user_id = v_user_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Account not found or access denied';
  END IF;

  -- Store old values
  v_old_initial_balance := v_account.initial_balance;
  v_current_balance := v_account.current_balance;

  -- Calculate adjustment (difference between new and old initial balance)
  v_adjustment := p_new_initial_balance - v_old_initial_balance;

  -- Calculate new current balance (apply same adjustment)
  v_new_current_balance := v_current_balance + v_adjustment;

  -- Update account with new balances
  UPDATE public.accounts
  SET
    initial_balance = p_new_initial_balance,
    current_balance = v_new_current_balance,
    updated_at = NOW()
  WHERE id = p_account_id;

  -- Create audit record
  INSERT INTO public.account_balance_adjustments (
    account_id,
    user_id,
    previous_initial_balance,
    new_initial_balance,
    adjustment_amount,
    reason,
    adjusted_by_user_id
  ) VALUES (
    p_account_id,
    v_user_id,
    v_old_initial_balance,
    p_new_initial_balance,
    v_adjustment,
    p_reason,
    v_user_id
  );

  -- Return summary
  RETURN json_build_object(
    'success', true,
    'account_id', p_account_id,
    'old_initial_balance', v_old_initial_balance,
    'new_initial_balance', p_new_initial_balance,
    'adjustment', v_adjustment,
    'old_current_balance', v_current_balance,
    'new_current_balance', v_new_current_balance
  );
END;
$$;

-- Step 4: Add comments for documentation
COMMENT ON COLUMN public.accounts.exclude_from_stats IS 'When true, excludes this account from charts and statistics but keeps it visible';
COMMENT ON COLUMN public.accounts.archived IS 'When true, hides account from all pages but keeps data in statistics';
COMMENT ON COLUMN public.accounts.custom_bank_name IS 'Custom bank name when user selects "Personalizado" option';
COMMENT ON TABLE public.account_balance_adjustments IS 'Audit trail for all initial balance adjustments to maintain financial integrity';
COMMENT ON FUNCTION adjust_account_initial_balance IS 'Safely adjusts initial balance and proportionally adjusts current balance with full audit trail';

-- Step 5: Create helper view for active accounts (not archived)
CREATE OR REPLACE VIEW public.active_accounts AS
SELECT *
FROM public.accounts
WHERE archived = false;

-- Grant permissions
GRANT SELECT ON public.active_accounts TO authenticated;

-- Step 6: Add indexes for new columns
CREATE INDEX idx_accounts_exclude_from_stats ON public.accounts(exclude_from_stats) WHERE exclude_from_stats = true;
CREATE INDEX idx_accounts_archived ON public.accounts(archived) WHERE archived = true;

-- Verification query
-- SELECT
--   'Migration completed successfully' as status,
--   COUNT(*) as total_accounts,
--   COUNT(*) FILTER (WHERE exclude_from_stats = true) as excluded_from_stats,
--   COUNT(*) FILTER (WHERE archived = true) as archived_accounts
-- FROM public.accounts;
