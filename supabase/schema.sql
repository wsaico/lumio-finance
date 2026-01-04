-- Schema generated from Supabase
-- Timestamp: 2026-01-03

CREATE TABLE public.account_balance_adjustments (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  account_id uuid NOT NULL,
  user_id uuid NOT NULL,
  previous_initial_balance numeric NOT NULL,
  new_initial_balance numeric NOT NULL,
  adjustment_amount numeric NOT NULL,
  reason text,
  adjusted_at timestamptz DEFAULT now(),
  adjusted_by_user_id uuid NOT NULL
);

CREATE TABLE public.accounts (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  name text NOT NULL,
  account_type AccountType NOT NULL,
  currency_code text NOT NULL,
  initial_balance numeric NOT NULL DEFAULT 0,
  current_balance numeric NOT NULL DEFAULT 0,
  bank_name text,
  account_number text,
  fixed_fund_amount numeric,
  icon text NOT NULL DEFAULT 'wallet'::text,
  color text NOT NULL DEFAULT '#0ea5e9'::text,
  is_active bool NOT NULL DEFAULT true,
  include_in_total bool NOT NULL DEFAULT true,
  sort_order int4 NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
  last_four_digits varchar,
  credit_limit numeric,
  used_balance numeric DEFAULT 0,
  closing_day int4,
  payment_due_day int4,
  card_network varchar,
  expiry_date timestamptz,
  interest_rate_annual numeric,
  interest_rate_monthly numeric,
  min_payment_percent numeric DEFAULT 5,
  min_payment_absolute numeric,
  exclude_from_stats bool DEFAULT false,
  archived bool DEFAULT false,
  custom_bank_name text
);

CREATE TABLE public.accounts_payable (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  contact_name varchar NOT NULL,
  contact_email varchar,
  contact_phone varchar,
  original_amount numeric NOT NULL,
  outstanding_balance numeric NOT NULL,
  currency_code varchar NOT NULL DEFAULT 'PEN'::character varying,
  status varchar NOT NULL DEFAULT 'PENDING'::character varying,
  loan_date timestamp NOT NULL DEFAULT now(),
  due_date date,
  paid_at timestamp,
  notes text,
  interest_rate numeric DEFAULT 0.00,
  linked_transaction_id uuid,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamp DEFAULT now(),
  updated_at timestamp DEFAULT now(),
  interest_type varchar DEFAULT 'SIMPLE'::character varying,
  payment_frequency varchar DEFAULT 'MONTHLY'::character varying,
  total_installments int4 DEFAULT 1,
  start_date date DEFAULT CURRENT_DATE
);

CREATE TABLE public.accounts_receivable (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  contact_name varchar NOT NULL,
  contact_email varchar,
  contact_phone varchar,
  original_amount numeric NOT NULL,
  outstanding_balance numeric NOT NULL,
  currency_code varchar NOT NULL DEFAULT 'PEN'::character varying,
  status varchar NOT NULL DEFAULT 'PENDING'::character varying,
  loan_date timestamp NOT NULL DEFAULT now(),
  due_date date,
  collected_at timestamp,
  notes text,
  interest_rate numeric DEFAULT 0.00,
  linked_transaction_id uuid,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamp DEFAULT now(),
  updated_at timestamp DEFAULT now(),
  interest_type varchar DEFAULT 'SIMPLE'::character varying,
  payment_frequency varchar DEFAULT 'MONTHLY'::character varying,
  total_installments int4 DEFAULT 1,
  start_date date DEFAULT CURRENT_DATE
);

CREATE TABLE public.budget_lines (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  budget_id uuid NOT NULL,
  category_id uuid NOT NULL,
  category_type CategoryType NOT NULL,
  budgeted_amount numeric NOT NULL,
  actual_amount numeric NOT NULL DEFAULT 0,
  notes text,
  created_at timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE public.budgets (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  name text NOT NULL,
  budget_year int4 NOT NULL,
  budget_month int4 NOT NULL,
  currency_code text NOT NULL,
  is_active bool NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
  type varchar DEFAULT 'EXPENSE'::character varying,
  period varchar DEFAULT 'MONTHLY'::character varying,
  color varchar DEFAULT '#3b82f6'::character varying,
  account_ids _uuid DEFAULT '{}'::uuid[],
  include_categories _text DEFAULT '{}'::text[],
  exclude_categories _text DEFAULT '{}'::text[],
  include_tags _text DEFAULT '{}'::text[],
  transaction_filter_mode varchar DEFAULT 'DEFAULT'::character varying,
  budget_scope varchar DEFAULT 'ALL_TRANSACTIONS'::character varying,
  include_loaned bool DEFAULT false,
  include_goal_transactions bool DEFAULT false,
  include_balance_corrections bool DEFAULT false,
  include_from_other_budgets bool DEFAULT false,
  excluded_budget_ids _uuid DEFAULT '{}'::uuid[],
  amount numeric DEFAULT 0,
  zbb_allocation_id uuid,
  is_zbb_controlled bool DEFAULT false
);

CREATE TABLE public.category_learning (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  keyword varchar NOT NULL,
  category_id uuid NOT NULL,
  confidence numeric DEFAULT 1.0,
  times_used int4 DEFAULT 1,
  last_used_at timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now(),
  subcategory_id uuid
);

CREATE TABLE public.credit_card_purchases (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  credit_card_id uuid NOT NULL,
  transaction_id uuid,
  description text NOT NULL,
  total_amount numeric NOT NULL,
  installments int4 NOT NULL DEFAULT 1,
  purchase_date date NOT NULL,
  first_due_date date,
  status PaymentStatus NOT NULL DEFAULT 'PENDING'::"PaymentStatus",
  created_at timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE public.credit_card_statements (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  credit_card_id uuid NOT NULL,
  statement_month int4 NOT NULL,
  statement_year int4 NOT NULL,
  closing_date timestamptz NOT NULL,
  due_date timestamptz NOT NULL,
  opening_balance numeric NOT NULL DEFAULT 0,
  total_purchases numeric NOT NULL DEFAULT 0,
  total_payments numeric NOT NULL DEFAULT 0,
  total_interest numeric NOT NULL DEFAULT 0,
  closing_balance numeric NOT NULL DEFAULT 0,
  minimum_payment numeric NOT NULL DEFAULT 0,
  is_paid bool NOT NULL DEFAULT false,
  paid_amount numeric NOT NULL DEFAULT 0,
  paid_date timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.credit_cards (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  name text NOT NULL,
  last_four_digits text,
  credit_limit numeric,
  currency_code text NOT NULL,
  closing_day int4,
  payment_due_day int4,
  icon text NOT NULL DEFAULT 'credit-card'::text,
  color text NOT NULL DEFAULT '#ef4444'::text,
  is_active bool NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
  account_id uuid,
  used_balance numeric NOT NULL DEFAULT 0,
  card_network varchar,
  expiry_date timestamptz,
  interest_rate_annual numeric,
  interest_rate_monthly numeric,
  min_payment_percent numeric DEFAULT 5,
  min_payment_absolute numeric
);

CREATE TABLE public.currencies (
  code text NOT NULL,
  name text NOT NULL,
  symbol text NOT NULL,
  exchange_rate_to_usd numeric NOT NULL DEFAULT 1.0,
  is_active bool NOT NULL DEFAULT true,
  updated_at timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE public.exchange_rates (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  from_currency varchar NOT NULL,
  to_currency varchar NOT NULL,
  rate numeric NOT NULL,
  source varchar DEFAULT 'MANUAL'::character varying,
  effective_date timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.expense_categories (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid,
  name text NOT NULL,
  icon text NOT NULL,
  color text NOT NULL,
  is_system bool NOT NULL DEFAULT false,
  is_active bool NOT NULL DEFAULT true,
  sort_order int4 NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
  budget_rule BudgetRuleType DEFAULT 'WANT'::"BudgetRuleType"
);

CREATE TABLE public.goal_account_links (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  goal_id uuid NOT NULL,
  account_id uuid NOT NULL,
  allocation_percentage numeric,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE public.goal_contributions (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  goal_id uuid NOT NULL,
  user_id uuid NOT NULL,
  amount numeric NOT NULL,
  contribution_date date NOT NULL DEFAULT CURRENT_DATE,
  notes text,
  transaction_id uuid,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE public.goal_milestones (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  goal_id uuid NOT NULL,
  milestone_type varchar NOT NULL,
  achieved_date timestamptz DEFAULT now(),
  amount_at_achievement numeric,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE public.google_tokens (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  access_token text NOT NULL,
  refresh_token text,
  expiry_date timestamptz NOT NULL,
  created_at timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE public.income_categories (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid,
  name text NOT NULL,
  icon text NOT NULL,
  color text NOT NULL,
  is_system bool NOT NULL DEFAULT false,
  is_active bool NOT NULL DEFAULT true,
  sort_order int4 NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE public.installment_schedule (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  purchase_id uuid NOT NULL,
  installment_number int4 NOT NULL,
  due_date date NOT NULL,
  amount numeric NOT NULL,
  is_paid bool NOT NULL DEFAULT false,
  payment_date date,
  payment_transaction_id uuid,
  created_at timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE public.liquidations (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  account_id uuid NOT NULL,
  code text NOT NULL,
  total_amount numeric NOT NULL,
  status LiquidationStatus NOT NULL DEFAULT 'DRAFT'::"LiquidationStatus",
  submission_date timestamptz,
  reimbursement_date timestamptz,
  notes text,
  created_at timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE public.loan_installments (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  loan_id uuid,
  installment_number int4 NOT NULL,
  due_date date NOT NULL,
  principal_amount numeric NOT NULL,
  interest_amount numeric NOT NULL,
  total_amount numeric,
  status varchar DEFAULT 'PENDING'::character varying,
  paid_at timestamptz,
  created_at timestamptz DEFAULT now(),
  account_receivable_id uuid,
  account_payable_id uuid
);

CREATE TABLE public.loan_payments (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  account_receivable_id uuid,
  account_payable_id uuid,
  amount numeric NOT NULL,
  currency_code varchar NOT NULL DEFAULT 'PEN'::character varying,
  payment_date timestamp NOT NULL DEFAULT now(),
  transaction_id uuid,
  notes text,
  payment_method varchar,
  created_at timestamp DEFAULT now(),
  principal_amount numeric DEFAULT 0,
  interest_amount numeric DEFAULT 0,
  metadata jsonb DEFAULT '{}'::jsonb
);

CREATE TABLE public.loans (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  loan_type LoanType NOT NULL,
  contact_name text NOT NULL,
  account_id uuid,
  principal_amount numeric NOT NULL,
  interest_rate numeric NOT NULL,
  remaining_balance numeric NOT NULL,
  currency_code text NOT NULL,
  loan_date date NOT NULL,
  due_date date,
  status LoanStatus NOT NULL DEFAULT 'ACTIVE'::"LoanStatus",
  description text,
  notes text,
  created_at timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE public.notifications (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  type varchar NOT NULL,
  title varchar NOT NULL,
  message text NOT NULL,
  data jsonb DEFAULT '{}'::jsonb,
  is_read bool DEFAULT false,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE public.petty_cash_audits (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  fund_id uuid NOT NULL,
  audit_code varchar NOT NULL,
  audit_date timestamptz NOT NULL,
  audit_type varchar NOT NULL,
  expected_cash numeric NOT NULL,
  actual_cash numeric NOT NULL,
  variance numeric NOT NULL,
  pending_expenses numeric NOT NULL,
  audited_by varchar NOT NULL,
  responsible_present bool NOT NULL,
  findings text,
  recommendations text,
  attachment_url text,
  status varchar NOT NULL DEFAULT 'COMPLETED'::character varying,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.petty_cash_expenses (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  fund_id uuid NOT NULL,
  settlement_id uuid,
  expense_code varchar NOT NULL,
  expense_date timestamptz NOT NULL,
  amount numeric NOT NULL,
  category_id uuid,
  description varchar NOT NULL,
  vendor varchar,
  receipt_number varchar,
  receipt_type varchar,
  taxable_amount numeric,
  tax_amount numeric,
  attachment_url text,
  justification text,
  status varchar NOT NULL DEFAULT 'PENDING'::character varying,
  approved_by varchar,
  approved_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  subcategory_id uuid
);

CREATE TABLE public.petty_cash_funds (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  account_id uuid NOT NULL,
  fund_code varchar NOT NULL,
  fund_name varchar NOT NULL,
  assigned_amount numeric NOT NULL,
  current_balance numeric NOT NULL,
  currency_code varchar NOT NULL,
  responsible_name varchar NOT NULL,
  responsible_id varchar,
  department varchar,
  description text,
  status varchar NOT NULL DEFAULT 'ACTIVE'::character varying,
  settlement_threshold numeric NOT NULL DEFAULT 70,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  closed_at timestamptz
);

CREATE TABLE public.petty_cash_replenishments (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  fund_id uuid NOT NULL,
  settlement_id uuid NOT NULL,
  replenishment_code varchar NOT NULL,
  replenishment_date timestamptz NOT NULL,
  amount numeric NOT NULL,
  payment_method varchar NOT NULL,
  reference_number varchar,
  approved_by varchar NOT NULL,
  delivered_by varchar,
  received_by varchar NOT NULL,
  notes text,
  status varchar NOT NULL DEFAULT 'PENDING'::character varying,
  delivered_at timestamptz,
  confirmed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.petty_cash_settlements (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  fund_id uuid NOT NULL,
  settlement_code varchar NOT NULL,
  settlement_date timestamptz NOT NULL,
  total_amount numeric NOT NULL,
  expense_count int4 NOT NULL,
  responsible_name varchar NOT NULL,
  received_by varchar,
  notes text,
  status varchar NOT NULL DEFAULT 'PENDING'::character varying,
  approved_by varchar,
  approved_at timestamptz,
  accounted_by varchar,
  accounted_at timestamptz,
  accounting_code varchar,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.petty_cash_transfers (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  from_fund_id uuid NOT NULL,
  to_responsible_name varchar NOT NULL,
  to_responsible_id varchar,
  transfer_code varchar NOT NULL,
  transfer_date timestamptz NOT NULL,
  amount numeric NOT NULL,
  transfer_type varchar NOT NULL,
  reason text NOT NULL,
  receipt_number varchar,
  return_date timestamptz,
  status varchar NOT NULL DEFAULT 'PENDING'::character varying,
  delivered_by varchar,
  received_by varchar,
  returned_at timestamptz,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.profiles (
  id uuid NOT NULL,
  full_name text,
  username text,
  profession text,
  avatar_url text,
  default_currency text NOT NULL DEFAULT 'USD'::text,
  auto_update bool NOT NULL DEFAULT true,
  theme text NOT NULL DEFAULT 'system'::text,
  created_at timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
  budgeting_method text DEFAULT 'TRADITIONAL'::text,
  base_currency varchar DEFAULT 'PEN'::character varying
);

CREATE TABLE public.recurring_rules (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  rule_name text NOT NULL,
  transaction_type TransactionType NOT NULL,
  account_id uuid,
  amount numeric NOT NULL,
  currency_code text NOT NULL,
  expense_category_id uuid,
  income_category_id uuid,
  subcategory_id uuid,
  frequency Frequency NOT NULL,
  interval int4 NOT NULL DEFAULT 1,
  start_date date NOT NULL,
  end_date date,
  next_occurrence date NOT NULL,
  description text,
  is_active bool NOT NULL DEFAULT true,
  last_executed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
  execution_method varchar DEFAULT 'AUTO'::character varying
);

CREATE TABLE public.savings_goals (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  user_id uuid NOT NULL,
  name varchar NOT NULL,
  description text,
  goal_type varchar NOT NULL,
  priority varchar DEFAULT 'MEDIUM'::character varying,
  target_amount numeric NOT NULL,
  current_amount numeric DEFAULT 0,
  currency varchar DEFAULT 'PEN'::character varying,
  primary_account_id uuid,
  start_date date NOT NULL DEFAULT CURRENT_DATE,
  target_date date NOT NULL,
  completed_date date,
  icon varchar DEFAULT 'target'::character varying,
  color varchar DEFAULT '#f97316'::character varying,
  status varchar DEFAULT 'ACTIVE'::character varying,
  streak_count int4 DEFAULT 0,
  total_contributions int4 DEFAULT 0,
  badges jsonb DEFAULT '[]'::jsonb,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE public.subcategories (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  expense_category_id uuid,
  income_category_id uuid,
  name text NOT NULL,
  is_active bool NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
  icon text
);

CREATE TABLE public.transactions (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  transaction_type TransactionType NOT NULL,
  account_id uuid NOT NULL,
  transfer_to_account_id uuid,
  amount numeric NOT NULL,
  currency_code text NOT NULL,
  exchange_rate numeric NOT NULL DEFAULT 1.0,
  expense_category_id uuid,
  income_category_id uuid,
  subcategory_id uuid,
  transaction_date timestamptz NOT NULL,
  description text,
  notes text,
  receipt_url text,
  location text,
  tags _text DEFAULT ARRAY[]::text[],
  savings_goal_id uuid,
  loan_id uuid,
  credit_card_purchase_id uuid,
  is_recurring bool NOT NULL DEFAULT false,
  recurring_rule_id uuid,
  document_type PettyCashDocumentType,
  document_number text,
  supplier text,
  liquidation_id uuid,
  created_at timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
  metadata jsonb,
  credit_card_id uuid,
  attachment_url text
);

CREATE TABLE public.zbb_allocations (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  cycle_id uuid NOT NULL,
  user_id uuid NOT NULL,
  category_id uuid,
  allocated_amount_usd numeric DEFAULT 0,
  allocated_amount_pen numeric DEFAULT 0,
  justification text NOT NULL,
  priority int4 NOT NULL,
  priority_order int4,
  previous_period_spent_usd numeric,
  previous_period_spent_pen numeric,
  spent_amount_usd numeric DEFAULT 0,
  spent_amount_pen numeric DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  subcategory_id uuid,
  goal_id uuid
);

CREATE TABLE public.zbb_planning_cycles (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  period_start date NOT NULL,
  period_end date NOT NULL,
  cycle_name varchar,
  status varchar NOT NULL DEFAULT 'draft'::character varying,
  total_income_usd numeric DEFAULT 0,
  total_income_pen numeric DEFAULT 0,
  assigned_amount_usd numeric DEFAULT 0,
  assigned_amount_pen numeric DEFAULT 0,
  completed_at timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  income_breakdown jsonb DEFAULT '[]'::jsonb
);
