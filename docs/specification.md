# LUMIO - PERSONAL FINANCE WEBAPP
## COMPLETE AI DEVELOPMENT SPECIFICATION

---

## PROJECT IDENTITY

```yaml
application_name: "Lumio"
tagline: "by wsaico personal finance"
company: "wsaico"
website: "https://wsaico.com"
support_email: "soporte@wsaico.com"
version: "1.0.0"
target_platforms:
  - Web Application (Progressive Web App)
  - Mobile Responsive
  - Desktop
```

---

## ARCHITECTURE OVERVIEW

### Technology Stack

```yaml
frontend:
  framework: "Next.js 14 (App Router)"
  language: "TypeScript 5.3+"
  ui_library: "React 18+"
  styling: "Tailwind CSS 3.4+"
  component_library: "shadcn/ui"
  state_management:
    - "Zustand (client state)"
    - "TanStack Query v5 (server state)"
  forms: "React Hook Form + Zod"
  charts: 
    - "Recharts (primary)"
    - "Chart.js (fallback)"
  tables: "TanStack Table v8"
  dates: "date-fns"
  icons: "Lucide React"
  animations: "Framer Motion"

backend:
  database: "Supabase (PostgreSQL)"
  auth: "Supabase Auth"
  storage: "Supabase Storage"
  realtime: "Supabase Realtime"
  edge_functions: "Supabase Edge Functions"
  orm: "Prisma (type-safe queries)"

deployment:
  platform: "Vercel"
  edge_network: "Vercel Edge Network"
  ci_cd: "Vercel Git Integration"

monitoring:
  errors: "Sentry"
  analytics: "Vercel Analytics"
  performance: "Vercel Speed Insights"
```

### Design System Specifications

```yaml
design_principles:
  - "Premium modern aesthetic"
  - "No emojis - professional icons only"
  - "Rounded corners everywhere (no sharp edges)"
  - "Smooth animations and transitions"
  - "Fully configurable themes"
  - "Accessible (WCAG 2.1 AA)"

color_palette:
  light_mode:
    primary:
      50: "#f0f9ff"
      100: "#e0f2fe"
      200: "#bae6fd"
      300: "#7dd3fc"
      400: "#38bdf8"
      500: "#0ea5e9"  # Main brand color
      600: "#0284c7"
      700: "#0369a1"
      800: "#075985"
      900: "#0c4a6e"
    
    success:
      50: "#f0fdf4"
      500: "#10b981"
      600: "#059669"
    
    warning:
      50: "#fffbeb"
      500: "#f59e0b"
      600: "#d97706"
    
    error:
      50: "#fef2f2"
      500: "#ef4444"
      600: "#dc2626"
    
    neutral:
      50: "#fafafa"
      100: "#f5f5f5"
      200: "#e5e5e5"
      300: "#d4d4d4"
      400: "#a3a3a3"
      500: "#737373"
      600: "#525252"
      700: "#404040"
      800: "#262626"
      900: "#171717"
      950: "#0a0a0a"

  dark_mode:
    primary:
      50: "#0c4a6e"
      100: "#075985"
      200: "#0369a1"
      300: "#0284c7"
      400: "#0ea5e9"
      500: "#38bdf8"  # Main brand color in dark
      600: "#7dd3fc"
      700: "#bae6fd"
      800: "#e0f2fe"
      900: "#f0f9ff"
    
    background:
      primary: "#0a0a0a"
      secondary: "#171717"
      tertiary: "#262626"
    
    surface:
      primary: "#171717"
      secondary: "#262626"
      tertiary: "#404040"

border_radius:
  sm: "0.375rem"    # 6px - small elements
  md: "0.5rem"      # 8px - cards, inputs
  lg: "0.75rem"     # 12px - modals, large cards
  xl: "1rem"        # 16px - large containers
  full: "9999px"    # fully rounded (pills, avatars)

spacing_scale:
  base: "0.25rem"   # 4px
  # All spacing follows 4px grid

typography:
  font_family: "Inter, system-ui, sans-serif"
  font_weights:
    regular: 400
    medium: 500
    semibold: 600
    bold: 700
  
  scale:
    xs: "0.75rem"     # 12px
    sm: "0.875rem"    # 14px
    base: "1rem"      # 16px
    lg: "1.125rem"    # 18px
    xl: "1.25rem"     # 20px
    "2xl": "1.5rem"   # 24px
    "3xl": "1.875rem" # 30px
    "4xl": "2.25rem"  # 36px

shadows:
  sm: "0 1px 2px 0 rgb(0 0 0 / 0.05)"
  md: "0 4px 6px -1px rgb(0 0 0 / 0.1)"
  lg: "0 10px 15px -3px rgb(0 0 0 / 0.1)"
  xl: "0 20px 25px -5px rgb(0 0 0 / 0.1)"

animations:
  duration:
    fast: "150ms"
    normal: "200ms"
    slow: "300ms"
  
  easing:
    ease_in_out: "cubic-bezier(0.4, 0, 0.2, 1)"
    ease_out: "cubic-bezier(0, 0, 0.2, 1)"
    ease_in: "cubic-bezier(0.4, 0, 1, 1)"
```

---

## DATABASE ARCHITECTURE

### Supabase Schema (PostgreSQL)

```sql
-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- =====================================================
-- USERS AND AUTHENTICATION (Managed by Supabase Auth)
-- =====================================================
-- auth.users table is managed by Supabase
-- We only create the profile extension

CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT,
  username TEXT UNIQUE,
  profession TEXT,
  avatar_url TEXT,
  default_currency TEXT DEFAULT 'USD' NOT NULL,
  auto_update BOOLEAN DEFAULT true,
  theme TEXT DEFAULT 'system', -- 'light', 'dark', 'system'
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable Row Level Security
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view own profile"
  ON public.profiles FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Users can update own profile"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = id);

-- =====================================================
-- MASTER DATA TABLES
-- =====================================================

-- Currencies
CREATE TABLE public.currencies (
  code TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  symbol TEXT NOT NULL,
  exchange_rate_to_usd DECIMAL(10, 6) DEFAULT 1.0 NOT NULL,
  is_active BOOLEAN DEFAULT true,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Insert default currencies
INSERT INTO public.currencies (code, name, symbol, exchange_rate_to_usd) VALUES
('USD', 'US Dollar', '$', 1.0),
('PEN', 'Peruvian Sol', 'S/', 3.75),
('EUR', 'Euro', '€', 0.92),
('GBP', 'British Pound', '£', 0.79),
('COP', 'Colombian Peso', '$', 4200.0),
('MXN', 'Mexican Peso', '$', 17.5),
('CLP', 'Chilean Peso', '$', 900.0),
('ARS', 'Argentine Peso', '$', 350.0);

-- No RLS needed (public read)

-- Expense Categories
CREATE TABLE public.expense_categories (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  icon TEXT NOT NULL,
  color TEXT NOT NULL,
  is_system BOOLEAN DEFAULT false,
  is_active BOOLEAN DEFAULT true,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, name)
);

ALTER TABLE public.expense_categories ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own categories"
  ON public.expense_categories FOR SELECT
  USING (auth.uid() = user_id OR is_system = true);

CREATE POLICY "Users can manage own categories"
  ON public.expense_categories FOR ALL
  USING (auth.uid() = user_id AND is_system = false);

-- Income Categories
CREATE TABLE public.income_categories (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  icon TEXT NOT NULL,
  color TEXT NOT NULL,
  is_system BOOLEAN DEFAULT false,
  is_active BOOLEAN DEFAULT true,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, name)
);

ALTER TABLE public.income_categories ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own income categories"
  ON public.income_categories FOR SELECT
  USING (auth.uid() = user_id OR is_system = true);

CREATE POLICY "Users can manage own income categories"
  ON public.income_categories FOR ALL
  USING (auth.uid() = user_id AND is_system = false);

-- Subcategories
CREATE TABLE public.subcategories (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  expense_category_id UUID REFERENCES public.expense_categories(id) ON DELETE CASCADE,
  income_category_id UUID REFERENCES public.income_categories(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT check_one_category CHECK (
    (expense_category_id IS NOT NULL AND income_category_id IS NULL) OR
    (expense_category_id IS NULL AND income_category_id IS NOT NULL)
  )
);

ALTER TABLE public.subcategories ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own subcategories"
  ON public.subcategories FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.expense_categories 
      WHERE id = subcategories.expense_category_id 
      AND user_id = auth.uid()
    ) OR
    EXISTS (
      SELECT 1 FROM public.income_categories 
      WHERE id = subcategories.income_category_id 
      AND user_id = auth.uid()
    )
  );

-- Accounts
CREATE TABLE public.accounts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  account_type TEXT NOT NULL CHECK (account_type IN ('CASH', 'BANK', 'DIGITAL', 'CREDIT_CARD', 'INVESTMENT')),
  currency_code TEXT REFERENCES public.currencies(code) NOT NULL,
  initial_balance DECIMAL(15, 2) DEFAULT 0 NOT NULL,
  current_balance DECIMAL(15, 2) DEFAULT 0 NOT NULL,
  bank_name TEXT,
  account_number TEXT,
  icon TEXT NOT NULL DEFAULT 'wallet',
  color TEXT NOT NULL DEFAULT '#0ea5e9',
  is_active BOOLEAN DEFAULT true,
  include_in_total BOOLEAN DEFAULT true,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_accounts_user_id ON public.accounts(user_id);

ALTER TABLE public.accounts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own accounts"
  ON public.accounts FOR ALL
  USING (auth.uid() = user_id);

-- =====================================================
-- TRANSACTIONAL TABLES
-- =====================================================

-- Transactions (Main table)
CREATE TABLE public.transactions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  transaction_type TEXT NOT NULL CHECK (
    transaction_type IN ('INCOME', 'EXPENSE', 'TRANSFER', 'SAVINGS_DEPOSIT', 'SAVINGS_WITHDRAWAL')
  ),
  
  -- Account information
  account_id UUID REFERENCES public.accounts(id) NOT NULL,
  transfer_to_account_id UUID REFERENCES public.accounts(id),
  
  -- Amount information
  amount DECIMAL(15, 2) NOT NULL CHECK (amount > 0),
  currency_code TEXT REFERENCES public.currencies(code) NOT NULL,
  exchange_rate DECIMAL(10, 6) DEFAULT 1.0 NOT NULL,
  amount_in_default_currency DECIMAL(15, 2) GENERATED ALWAYS AS (amount * exchange_rate) STORED,
  
  -- Categorization
  expense_category_id UUID REFERENCES public.expense_categories(id),
  income_category_id UUID REFERENCES public.income_categories(id),
  subcategory_id UUID REFERENCES public.subcategories(id),
  
  -- Date information
  transaction_date TIMESTAMPTZ NOT NULL,
  transaction_year INTEGER GENERATED ALWAYS AS (EXTRACT(YEAR FROM transaction_date)) STORED,
  transaction_month INTEGER GENERATED ALWAYS AS (EXTRACT(MONTH FROM transaction_date)) STORED,
  transaction_day INTEGER GENERATED ALWAYS AS (EXTRACT(DAY FROM transaction_date)) STORED,
  
  -- Additional information
  description TEXT,
  notes TEXT,
  receipt_url TEXT,
  location TEXT,
  tags TEXT[] DEFAULT '{}',
  
  -- Special relationships
  savings_goal_id UUID,
  loan_id UUID,
  credit_card_purchase_id UUID,
  
  -- Recurring information
  is_recurring BOOLEAN DEFAULT false,
  recurring_rule_id UUID,
  
  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Constraints
  CONSTRAINT check_categorization CHECK (
    (transaction_type = 'EXPENSE' AND expense_category_id IS NOT NULL) OR
    (transaction_type = 'INCOME' AND income_category_id IS NOT NULL) OR
    (transaction_type = 'TRANSFER' AND transfer_to_account_id IS NOT NULL) OR
    (transaction_type IN ('SAVINGS_DEPOSIT', 'SAVINGS_WITHDRAWAL'))
  )
);

-- Performance indexes
CREATE INDEX idx_transactions_user_date ON public.transactions(user_id, transaction_date DESC);
CREATE INDEX idx_transactions_type ON public.transactions(transaction_type);
CREATE INDEX idx_transactions_account ON public.transactions(account_id);
CREATE INDEX idx_transactions_year_month ON public.transactions(user_id, transaction_year, transaction_month);
CREATE INDEX idx_transactions_categories ON public.transactions(expense_category_id, income_category_id);

ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own transactions"
  ON public.transactions FOR ALL
  USING (auth.uid() = user_id);

-- =====================================================
-- BUDGETS MODULE
-- =====================================================

CREATE TABLE public.budgets (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  budget_year INTEGER NOT NULL,
  budget_month INTEGER NOT NULL CHECK (budget_month BETWEEN 1 AND 12),
  currency_code TEXT REFERENCES public.currencies(code) NOT NULL,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, budget_year, budget_month)
);

CREATE INDEX idx_budgets_period ON public.budgets(user_id, budget_year, budget_month);

ALTER TABLE public.budgets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own budgets"
  ON public.budgets FOR ALL
  USING (auth.uid() = user_id);

-- Budget Lines
CREATE TABLE public.budget_lines (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  budget_id UUID REFERENCES public.budgets(id) ON DELETE CASCADE NOT NULL,
  category_id UUID NOT NULL, -- Can reference either expense or income category
  category_type TEXT NOT NULL CHECK (category_type IN ('EXPENSE', 'INCOME')),
  budgeted_amount DECIMAL(15, 2) NOT NULL CHECK (budgeted_amount >= 0),
  actual_amount DECIMAL(15, 2) DEFAULT 0 NOT NULL,
  variance DECIMAL(15, 2) GENERATED ALWAYS AS (budgeted_amount - actual_amount) STORED,
  percentage_used DECIMAL(5, 2) GENERATED ALWAYS AS (
    CASE 
      WHEN budgeted_amount > 0 THEN (actual_amount / budgeted_amount * 100)
      ELSE 0 
    END
  ) STORED,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_budget_lines_budget ON public.budget_lines(budget_id);

ALTER TABLE public.budget_lines ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own budget lines"
  ON public.budget_lines FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.budgets 
      WHERE id = budget_lines.budget_id 
      AND user_id = auth.uid()
    )
  );

-- =====================================================
-- SAVINGS GOALS MODULE
-- =====================================================

CREATE TABLE public.savings_goals (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  target_amount DECIMAL(15, 2) NOT NULL CHECK (target_amount > 0),
  current_amount DECIMAL(15, 2) DEFAULT 0 NOT NULL CHECK (current_amount >= 0),
  currency_code TEXT REFERENCES public.currencies(code) NOT NULL,
  target_date DATE,
  description TEXT,
  icon TEXT NOT NULL DEFAULT 'piggy-bank',
  color TEXT NOT NULL DEFAULT '#10b981',
  progress_percentage DECIMAL(5, 2) GENERATED ALWAYS AS (
    CASE 
      WHEN target_amount > 0 THEN (current_amount / target_amount * 100)
      ELSE 0 
    END
  ) STORED,
  is_completed BOOLEAN GENERATED ALWAYS AS (current_amount >= target_amount) STORED,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_savings_goals_user ON public.savings_goals(user_id);

ALTER TABLE public.savings_goals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own savings goals"
  ON public.savings_goals FOR ALL
  USING (auth.uid() = user_id);

-- =====================================================
-- LOANS MODULE
-- =====================================================

CREATE TABLE public.loans (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  loan_type TEXT NOT NULL CHECK (loan_type IN ('LENT', 'BORROWED')),
  contact_name TEXT NOT NULL,
  account_id UUID REFERENCES public.accounts(id),
  principal_amount DECIMAL(15, 2) NOT NULL CHECK (principal_amount > 0),
  interest_rate DECIMAL(5, 4) NOT NULL CHECK (interest_rate >= 0),
  total_amount DECIMAL(15, 2) GENERATED ALWAYS AS (
    principal_amount * (1 + interest_rate)
  ) STORED,
  remaining_balance DECIMAL(15, 2) NOT NULL,
  currency_code TEXT REFERENCES public.currencies(code) NOT NULL,
  loan_date DATE NOT NULL,
  due_date DATE,
  status TEXT DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'PAID', 'DEFAULTED', 'CANCELLED')),
  description TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_loans_user ON public.loans(user_id);
CREATE INDEX idx_loans_status ON public.loans(user_id, status);

ALTER TABLE public.loans ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own loans"
  ON public.loans FOR ALL
  USING (auth.uid() = user_id);

-- Loan Payments
CREATE TABLE public.loan_payments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  loan_id UUID REFERENCES public.loans(id) ON DELETE CASCADE NOT NULL,
  transaction_id UUID REFERENCES public.transactions(id),
  payment_amount DECIMAL(15, 2) NOT NULL CHECK (payment_amount > 0),
  interest_amount DECIMAL(15, 2) DEFAULT 0 NOT NULL,
  principal_amount DECIMAL(15, 2) NOT NULL,
  payment_date DATE NOT NULL,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_loan_payments_loan ON public.loan_payments(loan_id);

ALTER TABLE public.loan_payments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own loan payments"
  ON public.loan_payments FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.loans 
      WHERE id = loan_payments.loan_id 
      AND user_id = auth.uid()
    )
  );

-- =====================================================
-- CREDIT CARDS MODULE
-- =====================================================

CREATE TABLE public.credit_cards (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  card_name TEXT NOT NULL,
  bank_name TEXT,
  card_number_last4 TEXT CHECK (LENGTH(card_number_last4) = 4),
  credit_limit DECIMAL(15, 2),
  available_credit DECIMAL(15, 2),
  currency_code TEXT REFERENCES public.currencies(code) NOT NULL,
  billing_day INTEGER CHECK (billing_day BETWEEN 1 AND 31),
  payment_due_day INTEGER CHECK (payment_due_day BETWEEN 1 AND 31),
  interest_rate DECIMAL(5, 4),
  annual_fee DECIMAL(10, 2),
  icon TEXT NOT NULL DEFAULT 'credit-card',
  color TEXT NOT NULL DEFAULT '#ef4444',
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_credit_cards_user ON public.credit_cards(user_id);

ALTER TABLE public.credit_cards ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own credit cards"
  ON public.credit_cards FOR ALL
  USING (auth.uid() = user_id);

-- Credit Card Purchases
CREATE TABLE public.credit_card_purchases (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  credit_card_id UUID REFERENCES public.credit_cards(id) ON DELETE CASCADE NOT NULL,
  transaction_id UUID REFERENCES public.transactions(id),
  description TEXT NOT NULL,
  total_amount DECIMAL(15, 2) NOT NULL CHECK (total_amount > 0),
  installments INTEGER DEFAULT 1 CHECK (installments > 0),
  installment_amount DECIMAL(15, 2) GENERATED ALWAYS AS (total_amount / installments) STORED,
  purchase_date DATE NOT NULL,
  first_due_date DATE,
  status TEXT DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'IN_PROGRESS', 'PAID', 'CANCELLED')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_credit_card_purchases_card ON public.credit_card_purchases(credit_card_id);

ALTER TABLE public.credit_card_purchases ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own credit card purchases"
  ON public.credit_card_purchases FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.credit_cards 
      WHERE id = credit_card_purchases.credit_card_id 
      AND user_id = auth.uid()
    )
  );

-- Installment Schedule
CREATE TABLE public.installment_schedule (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  purchase_id UUID REFERENCES public.credit_card_purchases(id) ON DELETE CASCADE NOT NULL,
  installment_number INTEGER NOT NULL,
  due_date DATE NOT NULL,
  amount DECIMAL(15, 2) NOT NULL,
  is_paid BOOLEAN DEFAULT false,
  payment_date DATE,
  payment_transaction_id UUID REFERENCES public.transactions(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_installment_schedule_purchase ON public.installment_schedule(purchase_id);
CREATE INDEX idx_installment_schedule_unpaid ON public.installment_schedule(purchase_id, is_paid) WHERE is_paid = false;

ALTER TABLE public.installment_schedule ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own installments"
  ON public.installment_schedule FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.credit_card_purchases ccp
      JOIN public.credit_cards cc ON ccp.credit_card_id = cc.id
      WHERE ccp.id = installment_schedule.purchase_id 
      AND cc.user_id = auth.uid()
    )
  );

-- =====================================================
-- RECURRING TRANSACTIONS MODULE
-- =====================================================

CREATE TABLE public.recurring_rules (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  rule_name TEXT NOT NULL,
  transaction_type TEXT NOT NULL CHECK (
    transaction_type IN ('INCOME', 'EXPENSE', 'SAVINGS_DEPOSIT', 'TRANSFER')
  ),
  account_id UUID REFERENCES public.accounts(id),
  amount DECIMAL(15, 2) NOT NULL CHECK (amount > 0),
  currency_code TEXT REFERENCES public.currencies(code) NOT NULL,
  expense_category_id UUID REFERENCES public.expense_categories(id),
  income_category_id UUID REFERENCES public.income_categories(id),
  subcategory_id UUID REFERENCES public.subcategories(id),
  frequency TEXT NOT NULL CHECK (frequency IN ('DAILY', 'WEEKLY', 'BIWEEKLY', 'MONTHLY', 'YEARLY')),
  interval INTEGER DEFAULT 1 CHECK (interval > 0),
  start_date DATE NOT NULL,
  end_date DATE,
  next_occurrence DATE NOT NULL,
  description TEXT,
  is_active BOOLEAN DEFAULT true,
  last_executed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_recurring_rules_user ON public.recurring_rules(user_id);
CREATE INDEX idx_recurring_rules_next ON public.recurring_rules(user_id, next_occurrence) WHERE is_active = true;

ALTER TABLE public.recurring_rules ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own recurring rules"
  ON public.recurring_rules FOR ALL
  USING (auth.uid() = user_id);

-- =====================================================
-- TRIGGERS FOR AUTOMATIC UPDATES
-- =====================================================

-- Update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply to relevant tables
CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_accounts_updated_at BEFORE UPDATE ON public.accounts
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_transactions_updated_at BEFORE UPDATE ON public.transactions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_budgets_updated_at BEFORE UPDATE ON public.budgets
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_savings_goals_updated_at BEFORE UPDATE ON public.savings_goals
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_loans_updated_at BEFORE UPDATE ON public.loans
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_credit_cards_updated_at BEFORE UPDATE ON public.credit_cards
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_recurring_rules_updated_at BEFORE UPDATE ON public.recurring_rules
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- FUNCTION: Update account balance on transaction
-- =====================================================

CREATE OR REPLACE FUNCTION update_account_balance()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    -- Update account balance for new transaction
    IF NEW.transaction_type = 'INCOME' OR NEW.transaction_type = 'SAVINGS_WITHDRAWAL' THEN
      UPDATE public.accounts 
      SET current_balance = current_balance + NEW.amount
      WHERE id = NEW.account_id;
    ELSIF NEW.transaction_type = 'EXPENSE' OR NEW.transaction_type = 'SAVINGS_DEPOSIT' THEN
      UPDATE public.accounts 
      SET current_balance = current_balance - NEW.amount
      WHERE id = NEW.account_id;
    ELSIF NEW.transaction_type = 'TRANSFER' THEN
      -- Deduct from source account
      UPDATE public.accounts 
      SET current_balance = current_balance - NEW.amount
      WHERE id = NEW.account_id;
      -- Add to destination account
      UPDATE public.accounts 
      SET current_balance = current_balance + NEW.amount
      WHERE id = NEW.transfer_to_account_id;
    END IF;
    RETURN NEW;
    
  ELSIF TG_OP = 'UPDATE' THEN
    -- Revert old transaction
    IF OLD.transaction_type = 'INCOME' OR OLD.transaction_type = 'SAVINGS_WITHDRAWAL' THEN
      UPDATE public.accounts 
      SET current_balance = current_balance - OLD.amount
      WHERE id = OLD.account_id;
    ELSIF OLD.transaction_type = 'EXPENSE' OR OLD.transaction_type = 'SAVINGS_DEPOSIT' THEN
      UPDATE public.accounts 
      SET current_balance = current_balance + OLD.amount
      WHERE id = OLD.account_id;
    ELSIF OLD.transaction_type = 'TRANSFER' THEN
      UPDATE public.accounts 
      SET current_balance = current_balance + OLD.amount
      WHERE id = OLD.account_id;
      UPDATE public.accounts 
      SET current_balance = current_balance - OLD.amount
      WHERE id = OLD.transfer_to_account_id;
    END IF;
    
    -- Apply new transaction
    IF NEW.transaction_type = 'INCOME' OR NEW.transaction_type = 'SAVINGS_WITHDRAWAL' THEN
      UPDATE public.accounts 
      SET current_balance = current_balance + NEW.amount
      WHERE id = NEW.account_id;
    ELSIF NEW.transaction_type = 'EXPENSE' OR NEW.transaction_type = 'SAVINGS_DEPOSIT' THEN
      UPDATE public.accounts 
      SET current_balance = current_balance - NEW.amount
      WHERE id = NEW.account_id;
    ELSIF NEW.transaction_type = 'TRANSFER' THEN
      UPDATE public.accounts 
      SET current_balance = current_balance - NEW.amount
      WHERE id = NEW.account_id;
      UPDATE public.accounts 
      SET current_balance = current_balance + NEW.amount
      WHERE id = NEW.transfer_to_account_id;
    END IF;
    RETURN NEW;
    
  ELSIF TG_OP = 'DELETE' THEN
    -- Revert transaction on delete
    IF OLD.transaction_type = 'INCOME' OR OLD.transaction_type = 'SAVINGS_WITHDRAWAL' THEN
      UPDATE public.accounts 
      SET current_balance = current_balance - OLD.amount
      WHERE id = OLD.account_id;
    ELSIF OLD.transaction_type = 'EXPENSE' OR OLD.transaction_type = 'SAVINGS_DEPOSIT' THEN
      UPDATE public.accounts 
      SET current_balance = current_balance + OLD.amount
      WHERE id = OLD.account_id;
    ELSIF OLD.transaction_type = 'TRANSFER' THEN
      UPDATE public.accounts 
      SET current_balance = current_balance + OLD.amount
      WHERE id = OLD.account_id;
      UPDATE public.accounts 
      SET current_balance = current_balance - OLD.amount
      WHERE id = OLD.transfer_to_account_id;
    END IF;
    RETURN OLD;
  END IF;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_account_balance
  AFTER INSERT OR UPDATE OR DELETE ON public.transactions
  FOR EACH ROW EXECUTE FUNCTION update_account_balance();

-- =====================================================
-- FUNCTION: Update savings goal amount
-- =====================================================

CREATE OR REPLACE FUNCTION update_savings_goal_amount()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    IF NEW.transaction_type = 'SAVINGS_DEPOSIT' AND NEW.savings_goal_id IS NOT NULL THEN
      UPDATE public.savings_goals 
      SET current_amount = current_amount + NEW.amount
      WHERE id = NEW.savings_goal_id;
    ELSIF NEW.transaction_type = 'SAVINGS_WITHDRAWAL' AND NEW.savings_goal_id IS NOT NULL THEN
      UPDATE public.savings_goals 
      SET current_amount = current_amount - NEW.amount
      WHERE id = NEW.savings_goal_id;
    END IF;
    RETURN NEW;
    
  ELSIF TG_OP = 'UPDATE' THEN
    -- Revert old
    IF OLD.transaction_type = 'SAVINGS_DEPOSIT' AND OLD.savings_goal_id IS NOT NULL THEN
      UPDATE public.savings_goals 
      SET current_amount = current_amount - OLD.amount
      WHERE id = OLD.savings_goal_id;
    ELSIF OLD.transaction_type = 'SAVINGS_WITHDRAWAL' AND OLD.savings_goal_id IS NOT NULL THEN
      UPDATE public.savings_goals 
      SET current_amount = current_amount + OLD.amount
      WHERE id = OLD.savings_goal_id;
    END IF;
    
    -- Apply new
    IF NEW.transaction_type = 'SAVINGS_DEPOSIT' AND NEW.savings_goal_id IS NOT NULL THEN
      UPDATE public.savings_goals 
      SET current_amount = current_amount + NEW.amount
      WHERE id = NEW.savings_goal_id;
    ELSIF NEW.transaction_type = 'SAVINGS_WITHDRAWAL' AND NEW.savings_goal_id IS NOT NULL THEN
      UPDATE public.savings_goals 
      SET current_amount = current_amount - NEW.amount
      WHERE id = NEW.savings_goal_id;
    END IF;
    RETURN NEW;
    
  ELSIF TG_OP = 'DELETE' THEN
    IF OLD.transaction_type = 'SAVINGS_DEPOSIT' AND OLD.savings_goal_id IS NOT NULL THEN
      UPDATE public.savings_goals 
      SET current_amount = current_amount - OLD.amount
      WHERE id = OLD.savings_goal_id;
    ELSIF OLD.transaction_type = 'SAVINGS_WITHDRAWAL' AND OLD.savings_goal_id IS NOT NULL THEN
      UPDATE public.savings_goals 
      SET current_amount = current_amount + OLD.amount
      WHERE id = OLD.savings_goal_id;
    END IF;
    RETURN OLD;
  END IF;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_savings_goal_amount
  AFTER INSERT OR UPDATE OR DELETE ON public.transactions
  FOR EACH ROW EXECUTE FUNCTION update_savings_goal_amount();

-- =====================================================
-- INDEXES FOR PERFORMANCE
-- =====================================================

-- Additional indexes for common queries
CREATE INDEX idx_transactions_savings_goal ON public.transactions(savings_goal_id) WHERE savings_goal_id IS NOT NULL;
CREATE INDEX idx_transactions_loan ON public.transactions(loan_id) WHERE loan_id IS NOT NULL;
CREATE INDEX idx_transactions_tags ON public.transactions USING GIN(tags);
CREATE INDEX idx_accounts_active ON public.accounts(user_id, is_active) WHERE is_active = true;
CREATE INDEX idx_savings_goals_active ON public.savings_goals(user_id, is_active) WHERE is_active = true;
```

---

## COMPONENT ARCHITECTURE

### Component Organization (No Duplicates)

```yaml
app/
  # Authentication pages (public)
  (auth)/
    login/
      page.tsx                    # Login form
    register/
      page.tsx                    # Registration form
    forgot-password/
      page.tsx                    # Password reset request
    reset-password/
      page.tsx                    # Password reset form
  
  # Main application (protected)
  (dashboard)/
    layout.tsx                    # Main layout with sidebar
    page.tsx                      # Dashboard home
    
    transactions/
      page.tsx                    # Transaction list
      [id]/
        page.tsx                  # Transaction details
    
    accounts/
      page.tsx                    # Accounts overview
      [id]/
        page.tsx                  # Account details
    
    categories/
      page.tsx                    # Category management
    
    budgets/
      page.tsx                    # Budget overview
      [id]/
        page.tsx                  # Budget details
    
    savings/
      page.tsx                    # Savings goals
      [id]/
        page.tsx                  # Goal details
    
    loans/
      page.tsx                    # Loans management
      [id]/
        page.tsx                  # Loan details
    
    credit-cards/
      page.tsx                    # Credit cards
      [id]/
        page.tsx                  # Card details
    
    reports/
      page.tsx                    # Reports hub
      income-expense/
        page.tsx                  # Income vs Expense
      cash-flow/
        page.tsx                  # Cash flow analysis
      trends/
        page.tsx                  # Trends analysis
      custom/
        page.tsx                  # Custom report builder
    
    settings/
      page.tsx                    # Settings hub
      profile/
        page.tsx                  # Profile settings
      preferences/
        page.tsx                  # App preferences
      security/
        page.tsx                  # Security settings
      data/
        page.tsx                  # Data import/export
  
  # API Routes
  api/
    auth/
      [...nextauth]/
        route.ts                  # NextAuth handler
    
    transactions/
      route.ts                    # GET, POST
      [id]/
        route.ts                  # GET, PUT, DELETE
      bulk/
        route.ts                  # Bulk operations
      export/
        route.ts                  # Export data
    
    accounts/
      route.ts
      [id]/
        route.ts
      transfer/
        route.ts                  # Transfer between accounts
    
    budgets/
      route.ts
      [id]/
        route.ts
      [id]/
        analysis/
          route.ts                # Budget analysis
    
    # Similar structure for other modules
    savings/
    loans/
    credit-cards/
    reports/
    recurring/

components/
  # UI Components (shadcn/ui based - SINGLE SOURCE)
  ui/
    button.tsx
    card.tsx
    dialog.tsx
    dropdown-menu.tsx
    form.tsx
    input.tsx
    label.tsx
    select.tsx
    table.tsx
    tabs.tsx
    toast.tsx
    # ... all shadcn components
  
  # Feature Components (NO DUPLICATION)
  dashboard/
    dashboard-header.tsx          # Period selector, filters
    kpi-card.tsx                  # Reusable KPI card
    quick-actions.tsx             # Quick action buttons
    alerts-widget.tsx             # Alerts display
    recent-transactions.tsx       # Recent transactions list
  
  transactions/
    transaction-form-modal.tsx    # SINGLE form for create/edit
    transaction-list.tsx          # Transaction table
    transaction-filters.tsx       # Filter component
    transaction-item.tsx          # Single transaction display
  
  accounts/
    account-card.tsx              # Account display card
    account-form-modal.tsx        # SINGLE form for create/edit
    account-balance-chart.tsx     # Balance history chart
  
  categories/
    category-manager.tsx          # Category CRUD interface
    category-icon-picker.tsx      # Icon selection
    color-picker.tsx              # Color selection
  
  budgets/
    budget-form-modal.tsx         # SINGLE form
    budget-progress.tsx           # Progress bars
    budget-comparison-chart.tsx   # Budget vs Actual chart
  
  savings/
    savings-goal-card.tsx         # Goal display card
    savings-goal-form-modal.tsx   # SINGLE form
    progress-ring.tsx             # Circular progress
  
  loans/
    loan-card.tsx
    loan-form-modal.tsx           # SINGLE form
    payment-schedule.tsx
  
  credit-cards/
    credit-card-visual.tsx        # Card visual representation
    credit-card-form-modal.tsx    # SINGLE form
    utilization-gauge.tsx         # Credit utilization gauge
  
  charts/
    income-expense-chart.tsx      # SINGLE reusable chart
    category-pie-chart.tsx        # SINGLE pie chart
    balance-trend-chart.tsx       # SINGLE trend chart
    cash-flow-chart.tsx           # SINGLE cash flow chart
    # Each chart component is created ONCE and reused
  
  layout/
    app-sidebar.tsx               # Main sidebar
    app-header.tsx                # Top header
    mobile-nav.tsx                # Mobile navigation
    user-menu.tsx                 # User dropdown menu
  
  common/
    loading-spinner.tsx           # Loading state
    empty-state.tsx               # Empty state display
    error-boundary.tsx            # Error handling
    currency-display.tsx          # Currency formatter
    date-picker.tsx               # Date selection
    amount-input.tsx              # Amount input with currency
    icon-picker.tsx               # Icon selection
    theme-toggle.tsx              # Light/Dark toggle

lib/
  supabase/
    client.ts                     # Supabase client
    server.ts                     # Server-side client
    middleware.ts                 # Auth middleware
  
  utils/
    currency.ts                   # SINGLE currency utilities
    date.ts                       # SINGLE date utilities
    formatting.ts                 # SINGLE formatting utilities
    calculations.ts               # SINGLE calculation utilities
    validations.ts                # SINGLE validation schemas
    constants.ts                  # SINGLE constants file
  
  hooks/
    use-transactions.ts           # SINGLE transactions hook
    use-accounts.ts               # SINGLE accounts hook
    use-budgets.ts                # SINGLE budgets hook
    use-savings.ts                # SINGLE savings hook
    use-theme.ts                  # SINGLE theme hook
    use-currency.ts               # SINGLE currency hook
    # Each hook created ONCE

stores/
  user-store.ts                   # SINGLE user state
  ui-store.ts                     # SINGLE UI state
  settings-store.ts               # SINGLE settings state
```

### Key Anti-Duplication Rules

```yaml
rules:
  - "Each form component exists ONCE and handles both create and edit via props"
  - "Each chart component exists ONCE and receives data via props"
  - "Each utility function exists ONCE in appropriate utils file"
  - "Each hook exists ONCE and is imported where needed"
  - "No copy-paste between components - extract shared logic"
  - "Use composition over duplication"
  - "Reusable components in /components, specific logic in pages"
```

---

## CONFIGURATION FILES

### Project Setup

```json
// package.json
{
  "name": "lumio",
  "version": "1.0.0",
  "private": true,
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start",
    "lint": "next lint",
    "type-check": "tsc --noEmit",
    "db:generate": "prisma generate",
    "db:push": "prisma db push",
    "db:studio": "prisma studio"
  },
  "dependencies": {
    "next": "14.2.0",
    "react": "18.3.0",
    "react-dom": "18.3.0",
    "typescript": "5.4.0",
    "@supabase/supabase-js": "^2.43.0",
    "@supabase/ssr": "^0.3.0",
    "@prisma/client": "^5.14.0",
    "@tanstack/react-query": "^5.40.0",
    "zustand": "^4.5.2",
    "react-hook-form": "^7.51.0",
    "zod": "^3.23.0",
    "@hookform/resolvers": "^3.3.4",
    "tailwindcss": "^3.4.3",
    "@radix-ui/react-dialog": "^1.0.5",
    "@radix-ui/react-dropdown-menu": "^2.0.6",
    "@radix-ui/react-select": "^2.0.0",
    "@radix-ui/react-tabs": "^1.0.4",
    "@radix-ui/react-toast": "^1.1.5",
    "@radix-ui/react-tooltip": "^1.0.7",
    "@radix-ui/react-switch": "^1.0.3",
    "@radix-ui/react-slider": "^1.1.2",
    "@radix-ui/react-popover": "^1.0.7",
    "lucide-react": "^0.379.0",
    "framer-motion": "^11.2.0",
    "recharts": "^2.12.0",
    "date-fns": "^3.6.0",
    "class-variance-authority": "^0.7.0",
    "clsx": "^2.1.1",
    "tailwind-merge": "^2.3.0",
    "decimal.js": "^10.4.3",
    "currency.js": "^2.0.4",
    "react-hot-toast": "^2.4.1",
    "@tanstack/react-table": "^8.17.0"
  },
  "devDependencies": {
    "@types/node": "^20.12.0",
    "@types/react": "^18.3.0",
    "@types/react-dom": "^18.3.0",
    "eslint": "^8.57.0",
    "eslint-config-next": "14.2.0",
    "prettier": "^3.2.5",
    "prettier-plugin-tailwindcss": "^0.5.14",
    "prisma": "^5.14.0"
  }
}
```

```typescript
// tsconfig.json
{
  "compilerOptions": {
    "target": "ES2017",
    "lib": ["dom", "dom.iterable", "esnext"],
    "allowJs": true,
    "skipLibCheck": true,
    "strict": true,
    "noEmit": true,
    "esModuleInterop": true,
    "module": "esnext",
    "moduleResolution": "bundler",
    "resolveJsonModule": true,
    "isolatedModules": true,
    "jsx": "preserve",
    "incremental": true,
    "plugins": [
      {
        "name": "next"
      }
    ],
    "paths": {
      "@/*": ["./*"]
    }
  },
  "include": ["next-env.d.ts", "**/*.ts", "**/*.tsx", ".next/types/**/*.ts"],
  "exclude": ["node_modules"]
}
```

```javascript
// tailwind.config.js
const { fontFamily } = require("tailwindcss/defaultTheme")

/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: ["class"],
  content: [
    "./pages/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./app/**/*.{ts,tsx}",
  ],
  theme: {
    container: {
      center: true,
      padding: "2rem",
      screens: {
        "2xl": "1400px",
      },
    },
    extend: {
      colors: {
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
          50: "#f0f9ff",
          100: "#e0f2fe",
          200: "#bae6fd",
          300: "#7dd3fc",
          400: "#38bdf8",
          500: "#0ea5e9",
          600: "#0284c7",
          700: "#0369a1",
          800: "#075985",
          900: "#0c4a6e",
        },
        success: {
          DEFAULT: "hsl(var(--success))",
          foreground: "hsl(var(--success-foreground))",
          50: "#f0fdf4",
          500: "#10b981",
          600: "#059669",
        },
        warning: {
          DEFAULT: "hsl(var(--warning))",
          foreground: "hsl(var(--warning-foreground))",
          50: "#fffbeb",
          500: "#f59e0b",
          600: "#d97706",
        },
        error: {
          DEFAULT: "hsl(var(--error))",
          foreground: "hsl(var(--error-foreground))",
          50: "#fef2f2",
          500: "#ef4444",
          600: "#dc2626",
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
        },
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
      },
      fontFamily: {
        sans: ["var(--font-inter)", ...fontFamily.sans],
      },
      keyframes: {
        "accordion-down": {
          from: { height: 0 },
          to: { height: "var(--radix-accordion-content-height)" },
        },
        "accordion-up": {
          from: { height: "var(--radix-accordion-content-height)" },
          to: { height: 0 },
        },
        "fade-in": {
          from: { opacity: 0 },
          to: { opacity: 1 },
        },
        "slide-in": {
          from: { transform: "translateY(-10px)", opacity: 0 },
          to: { transform: "translateY(0)", opacity: 1 },
        },
      },
      animation: {
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up": "accordion-up 0.2s ease-out",
        "fade-in": "fade-in 0.2s ease-out",
        "slide-in": "slide-in 0.2s ease-out",
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
}
```

```css
/* app/globals.css */
@tailwind base;
@tailwind components;
@tailwind utilities;

@layer base {
  :root {
    --background: 0 0% 100%;
    --foreground: 240 10% 3.9%;
    --card: 0 0% 100%;
    --card-foreground: 240 10% 3.9%;
    --popover: 0 0% 100%;
    --popover-foreground: 240 10% 3.9%;
    --primary: 199 89% 48%;
    --primary-foreground: 0 0% 100%;
    --secondary: 240 4.8% 95.9%;
    --secondary-foreground: 240 5.9% 10%;
    --muted: 240 4.8% 95.9%;
    --muted-foreground: 240 3.8% 46.1%;
    --accent: 240 4.8% 95.9%;
    --accent-foreground: 240 5.9% 10%;
    --success: 142 71% 45%;
    --success-foreground: 0 0% 100%;
    --warning: 38 92% 50%;
    --warning-foreground: 0 0% 100%;
    --error: 0 84% 60%;
    --error-foreground: 0 0% 100%;
    --border: 240 5.9% 90%;
    --input: 240 5.9% 90%;
    --ring: 199 89% 48%;
    --radius: 0.5rem;
  }

  .dark {
    --background: 0 0% 4%;
    --foreground: 0 0% 98%;
    --card: 0 0% 9%;
    --card-foreground: 0 0% 98%;
    --popover: 0 0% 9%;
    --popover-foreground: 0 0% 98%;
    --primary: 199 89% 58%;
    --primary-foreground: 240 10% 3.9%;
    --secondary: 240 3.7% 15.9%;
    --secondary-foreground: 0 0% 98%;
    --muted: 240 3.7% 15.9%;
    --muted-foreground: 240 5% 64.9%;
    --accent: 240 3.7% 15.9%;
    --accent-foreground: 0 0% 98%;
    --success: 142 71% 45%;
    --success-foreground: 0 0% 100%;
    --warning: 38 92% 50%;
    --warning-foreground: 0 0% 100%;
    --error: 0 84% 60%;
    --error-foreground: 0 0% 100%;
    --border: 240 3.7% 15.9%;
    --input: 240 3.7% 15.9%;
    --ring: 199 89% 58%;
  }
}

@layer base {
  * {
    @apply border-border;
  }
  body {
    @apply bg-background text-foreground;
    font-feature-settings: "rlig" 1, "calt" 1;
  }
  
  /* Smooth scrolling */
  html {
    scroll-behavior: smooth;
  }
  
  /* Custom scrollbar */
  ::-webkit-scrollbar {
    width: 10px;
  }
  
  ::-webkit-scrollbar-track {
    @apply bg-secondary;
  }
  
  ::-webkit-scrollbar-thumb {
    @apply bg-muted-foreground rounded-lg;
  }
  
  ::-webkit-scrollbar-thumb:hover {
    @apply bg-foreground;
  }
}

@layer utilities {
  /* Smooth transitions */
  .transition-smooth {
    @apply transition-all duration-200 ease-out;
  }
  
  /* Glass morphism effect */
  .glass {
    @apply bg-background/80 backdrop-blur-md;
  }
  
  /* Animated gradient */
  .animated-gradient {
    background: linear-gradient(
      -45deg,
      theme('colors.primary.500'),
      theme('colors.primary.600'),
      theme('colors.primary.700'),
      theme('colors.primary.600')
    );
    background-size: 400% 400%;
    animation: gradient 15s ease infinite;
  }
  
  @keyframes gradient {
    0%, 100% { background-position: 0% 50%; }
    50% { background-position: 100% 50%; }
  }
}
```

---

## IMPLEMENTATION STRATEGY

### Phase 1: Foundation (Week 1-2)

```yaml
week_1:
  setup:
    - Initialize Next.js 14 project
    - Configure Supabase project
    - Setup Prisma with Supabase
    - Configure Vercel project
    - Setup environment variables
    - Configure ESLint + Prettier
    - Setup Git workflow
  
  authentication:
    - Implement Supabase Auth
    - Create login page
    - Create registration page
    - Setup password reset flow
    - Configure middleware for protected routes
    - Create profile table and RLS policies

week_2:
  database:
    - Run all schema migrations
    - Create RLS policies for all tables
    - Setup database triggers
    - Seed initial data (currencies, system categories)
    - Test database functions
  
  ui_foundation:
    - Install and configure shadcn/ui
    - Create theme provider
    - Implement light/dark mode toggle
    - Create layout components (sidebar, header)
    - Setup global styles
    - Create reusable UI components
```

### Phase 2: Core Features (Week 3-6)

```yaml
week_3:
  transactions_module:
    - Create transactions API routes
    - Implement transaction form modal (SINGLE component)
    - Create transaction list with filters
    - Add transaction details view
    - Implement delete with confirmation
    - Setup React Query hooks for transactions

week_4:
  accounts_module:
    - Create accounts API routes
    - Implement account form modal (SINGLE component)
    - Create accounts overview page
    - Add account details with history
    - Implement transfer functionality
    - Setup React Query hooks for accounts

week_5:
  dashboard:
    - Create dashboard API routes for KPIs
    - Implement KPI cards (reusable component)
    - Create income vs expense chart (SINGLE chart component)
    - Add category pie chart (SINGLE chart component)
    - Create recent transactions widget
    - Add alerts widget

week_6:
  categories_budgets:
    - Create categories management page
    - Implement category CRUD operations
    - Create budgets module
    - Implement budget form and analysis
    - Add budget vs actual comparison
    - Create alert system for overspending
```

### Phase 3: Advanced Features (Week 7-10)

```yaml
week_7:
  savings_module:
    - Create savings goals API
    - Implement savings goal form (SINGLE component)
    - Create progress visualization
    - Add deposit/withdrawal functionality
    - Implement goal completion celebration

week_8:
  loans_credit_cards:
    - Create loans API
    - Implement loan form and payment tracking
    - Create credit cards API
    - Implement credit card form
    - Add installment schedule
    - Create payment reminders

week_9:
  recurring_reports:
    - Create recurring rules API
    - Implement recurring transaction form
    - Create reports API
    - Implement report builder
    - Add export functionality (PDF, Excel)

week_10:
  optimization:
    - Performance optimization
    - Code splitting
    - Image optimization
    - Bundle size reduction
    - Database query optimization
    - Implement caching strategies
```

### Phase 4: Polish & Deploy (Week 11-12)

```yaml
week_11:
  testing_refinement:
    - Unit testing critical functions
    - Integration testing
    - User acceptance testing
    - Bug fixes
    - UI/UX refinements
    - Accessibility improvements

week_12:
  deployment:
    - Production build
    - Environment variable configuration
    - Database migration to production
    - Deploy to Vercel
    - Setup custom domain
    - Configure monitoring and alerts
    - Documentation
    - Launch
```

---

## CRITICAL DEVELOPMENT RULES

### Code Quality Rules

```yaml
no_duplication:
  - "Every component created ONCE"
  - "Every utility function created ONCE"
  - "Every API route created ONCE"
  - "Reuse through composition, not copy-paste"

type_safety:
  - "All functions must have TypeScript types"
  - "No 'any' types except edge cases"
  - "Use Zod for runtime validation"
  - "Prisma types for database"

performance:
  - "Use React.memo for expensive renders"
  - "Implement virtual scrolling for long lists"
  - "Lazy load heavy components"
  - "Optimize database queries (indexes, proper JOINs)"
  - "Use Supabase realtime only when necessary"

security:
  - "All API routes check authentication"
  - "RLS policies on ALL tables"
  - "Validate ALL inputs server-side"
  - "Sanitize user inputs"
  - "Use HTTPS only"
  - "Implement rate limiting"

accessibility:
  - "All interactive elements keyboard accessible"
  - "Proper ARIA labels"
  - "Color contrast WCAG AA minimum"
  - "Screen reader friendly"
  - "Focus indicators visible"

naming_conventions:
  components: "PascalCase (TransactionForm.tsx)"
  functions: "camelCase (calculateBalance)"
  constants: "UPPER_SNAKE_CASE (MAX_TRANSACTIONS)"
  files: "kebab-case (transaction-form.tsx)"
  database: "snake_case (transaction_type)"
```

### Form Handling Pattern (SINGLE FORM COMPONENT)

```typescript
// components/transactions/transaction-form-modal.tsx
interface TransactionFormModalProps {
  isOpen: boolean
  onClose: () => void
  mode: 'create' | 'edit'
  transactionId?: string
  initialData?: TransactionFormData
}

export function TransactionFormModal({
  isOpen,
  onClose,
  mode,
  transactionId,
  initialData
}: TransactionFormModalProps) {
  const { data: transaction } = useQuery({
    queryKey: ['transaction', transactionId],
    queryFn: () => fetchTransaction(transactionId),
    enabled: mode === 'edit' && !!transactionId
  })

  const form = useForm<TransactionFormData>({
    resolver: zodResolver(transactionSchema),
    defaultValues: initialData || transaction || defaultValues
  })

  const createMutation = useMutation({
    mutationFn: createTransaction,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['transactions'] })
      onClose()
    }
  })

  const updateMutation = useMutation({
    mutationFn: (data) => updateTransaction(transactionId!, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['transactions'] })
      queryClient.invalidateQueries({ queryKey: ['transaction', transactionId] })
      onClose()
    }
  })

  const onSubmit = (data: TransactionFormData) => {
    if (mode === 'create') {
      createMutation.mutate(data)
    } else {
      updateMutation.mutate(data)
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {mode === 'create' ? 'New Transaction' : 'Edit Transaction'}
          </DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)}>
            {/* Form fields */}
            <Button type="submit" disabled={createMutation.isPending || updateMutation.isPending}>
              {mode === 'create' ? 'Create' : 'Update'}
            </Button>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}

// Usage in pages
function TransactionsPage() {
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingId, setEditingId] = useState<string>()

  return (
    <>
      <Button onClick={() => setIsModalOpen(true)}>New Transaction</Button>
      
      <TransactionList
        onEdit={(id) => {
          setEditingId(id)
          setIsModalOpen(true)
        }}
      />

      <TransactionFormModal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false)
          setEditingId(undefined)
        }}
        mode={editingId ? 'edit' : 'create'}
        transactionId={editingId}
      />
    </>
  )
}
```

### API Route Pattern (SINGLE ENDPOINT)

```typescript
// app/api/transactions/route.ts
import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'

const transactionSchema = z.object({
  transaction_type: z.enum(['INCOME', 'EXPENSE', 'TRANSFER']),
  account_id: z.string().uuid(),
  amount: z.number().positive(),
  // ... other fields
})

// GET - List transactions
export async function GET(request: NextRequest) {
  try {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const type = searchParams.get('type')
    const year = searchParams.get('year')
    const month = searchParams.get('month')

    let query = supabase
      .from('transactions')
      .select('*')
      .eq('user_id', user.id)
      .order('transaction_date', { ascending: false })

    if (type) query = query.eq('transaction_type', type)
    if (year) query = query.eq('transaction_year', parseInt(year))
    if (month) query = query.eq('transaction_month', parseInt(month))

    const { data, error } = await query

    if (error) throw error

    return NextResponse.json(data)
  } catch (error) {
    console.error('Error fetching transactions:', error)
    return NextResponse.json(
      { error: 'Failed to fetch transactions' },
      { status: 500 }
    )
  }
}

// POST - Create transaction
export async function POST(request: NextRequest) {
  try {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const validatedData = transactionSchema.parse(body)

    const { data, error } = await supabase
      .from('transactions')
      .insert({
        ...validatedData,
        user_id: user.id,
        transaction_date: new Date(validatedData.transaction_date).toISOString()
      })
      .select()
      .single()

    if (error) throw error

    return NextResponse.json(data, { status: 201 })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation failed', details: error.errors },
        { status: 400 }
      )
    }
    console.error('Error creating transaction:', error)
    return NextResponse.json(
      { error: 'Failed to create transaction' },
      { status: 500 }
    )
  }
}
```

---

## OPTIMIZATION STRATEGIES

### Database Optimization

```yaml
query_optimization:
  - "Always use proper indexes"
  - "Avoid N+1 queries - use JOINs or batch fetching"
  - "Use generated columns for computed values"
  - "Implement pagination for large datasets"
  - "Use database functions for complex calculations"

caching_strategy:
  - "Cache static data (currencies, system categories)"
  - "Use stale-while-revalidate pattern"
  - "Implement optimistic updates"
  - "Cache dashboard KPIs with short TTL"

rls_performance:
  - "Keep RLS policies simple"
  - "Use indexes on foreign keys used in policies"
  - "Test policy performance with EXPLAIN ANALYZE"
```

### Frontend Optimization

```yaml
code_splitting:
  - "Use dynamic imports for heavy components"
  - "Lazy load routes"
  - "Split vendor bundles"

image_optimization:
  - "Use Next.js Image component"
  - "Implement lazy loading"
  - "Use appropriate image formats (WebP)"

bundle_optimization:
  - "Tree-shake unused code"
  - "Minimize dependencies"
  - "Use route-based code splitting"

rendering_optimization:
  - "Use React Server Components where possible"
  - "Implement proper memoization"
  - "Avoid unnecessary re-renders"
  - "Use virtual scrolling for long lists"
```

---

## TESTING STRATEGY

```yaml
unit_tests:
  - "Test utility functions (lib/utils/)"
  - "Test calculation functions"
  - "Test validation schemas"

integration_tests:
  - "Test API routes"
  - "Test database operations"
  - "Test authentication flows"

e2e_tests:
  - "Test critical user flows"
  - "Test transaction creation"
  - "Test budget management"

manual_testing:
  - "Cross-browser testing"
  - "Mobile responsiveness"
  - "Accessibility audit"
  - "Performance testing"
```

---

## DEPLOYMENT CHECKLIST

```yaml
pre_deployment:
  - "All tests passing"
  - "No console errors"
  - "No TypeScript errors"
  - "Performance audit completed"
  - "Security audit completed"
  - "Accessibility audit completed"

environment_setup:
  - "Supabase production project created"
  - "Database migrated to production"
  - "Environment variables configured"
  - "Custom domain configured"
  - "SSL certificates installed"

vercel_configuration:
  - "Project connected to Git"
  - "Build settings configured"
  - "Environment variables set"
  - "Custom domain configured"
  - "Analytics enabled"

post_deployment:
  - "Smoke testing"
  - "Monitor error tracking"
  - "Monitor performance"
  - "Setup backup strategy"
  - "Document deployment process"
```

---

## MONITORING & MAINTENANCE

```yaml
error_tracking:
  tool: "Sentry"
  setup:
    - "Configure Sentry project"
    - "Install Sentry SDK"
    - "Setup error boundaries"
    - "Configure source maps"

analytics:
  tool: "Vercel Analytics"
  metrics:
    - "Page views"
    - "User sessions"
    - "Core Web Vitals"
    - "Custom events"

performance_monitoring:
  tool: "Vercel Speed Insights"
  metrics:
    - "Time to First Byte"
    - "First Contentful Paint"
    - "Largest Contentful Paint"
    - "Cumulative Layout Shift"

database_monitoring:
  tool: "Supabase Dashboard"
  metrics:
    - "Query performance"
    - "Connection pooling"
    - "Storage usage"
    - "API usage"

maintenance:
  daily:
    - "Check error logs"
    - "Monitor performance"
  weekly:
    - "Review user feedback"
    - "Update dependencies"
    - "Database backup verification"
  monthly:
    - "Security audit"
    - "Performance optimization"
    - "Feature planning"
```

---

## DOCUMENTATION REQUIREMENTS

```yaml
code_documentation:
  - "All complex functions commented"
  - "All components have prop types"
  - "All API routes documented"
  - "Database schema documented"

user_documentation:
  - "User guide"
  - "FAQ section"
  - "Tutorial videos"
  - "Feature explanations"

developer_documentation:
  - "Setup guide"
  - "Architecture overview"
  - "API documentation"
  - "Deployment guide"
  - "Troubleshooting guide"
```

---

## SUCCESS METRICS

```yaml
performance_targets:
  - "Lighthouse score: 90+ (all categories)"
  - "First Contentful Paint: < 1.5s"
  - "Time to Interactive: < 3s"
  - "Page load time: < 2s"

user_experience_targets:
  - "Zero layout shifts"
  - "Smooth 60fps animations"
  - "< 100ms response to user input"
  - "Offline functionality"

business_targets:
  - "User registration completion rate: > 80%"
  - "Daily active users retention: > 70%"
  - "Average session duration: > 10 minutes"
  - "Feature adoption rate: > 60%"
```

---

## FINAL NOTES FOR AI IMPLEMENTATION

```yaml
development_approach:
  - "Build incrementally - test each feature before moving to next"
  - "Follow DRY principle strictly - NO DUPLICATION"
  - "Use TypeScript strict mode - catch errors early"
  - "Write clean, self-documenting code"
  - "Prioritize user experience over feature count"
  - "Optimize for performance from the start"

code_review_checklist:
  - "Is there any duplicated code?"
  - "Are all types properly defined?"
  - "Are there proper error handlers?"
  - "Is the component properly memoized?"
  - "Are database queries optimized?"
  - "Is RLS policy correct?"
  - "Is the UI accessible?"
  - "Are animations smooth?"

remember:
  - "Lumio is a PREMIUM product - quality over speed"
  - "Every component is reusable"
  - "Every API call is optimized"
  - "Every page is accessible"
  - "Every animation is smooth"
  - "No emojis - only professional icons"
  - "Rounded corners everywhere"
  - "Light and dark modes fully supported"
```

---

**END OF SPECIFICATION**

This document provides complete, AI-readable instructions for building Lumio with NO duplication, professional design, optimal performance, and complete scalability using Supabase and Vercel.
