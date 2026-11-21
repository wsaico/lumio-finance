-- ============================================================================
-- LUMIO FINANCE — SAAS COMMERCIAL FOUNDATION, MULTI-TENANT RLS & PLANS
-- Migration: 20261121_saas_commercial_foundation.sql
-- Idempotent: Safe to run multiple times in Supabase SQL Editor.
-- ============================================================================

-- 1. EXTEND PROFILES FOR COMMERCIAL SAAS + REGIONAL COHERENCE + TRIAL
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS role text NOT NULL DEFAULT 'USER',
  ADD COLUMN IF NOT EXISTS country_code text NOT NULL DEFAULT 'PE',
  ADD COLUMN IF NOT EXISTS timezone text NOT NULL DEFAULT 'America/Lima',
  ADD COLUMN IF NOT EXISTS onboarding_completed boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS demo_mode_active boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS plan_tier text NOT NULL DEFAULT 'FREE',
  ADD COLUMN IF NOT EXISTS trial_started_at timestamptz DEFAULT now(),
  ADD COLUMN IF NOT EXISTS trial_ends_at timestamptz DEFAULT (now() + interval '15 days');

-- Add check constraints safely if they don't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'profiles_role_check'
  ) THEN
    ALTER TABLE public.profiles
      ADD CONSTRAINT profiles_role_check CHECK (role IN ('USER', 'ADMIN'));
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'profiles_plan_tier_check'
  ) THEN
    ALTER TABLE public.profiles
      ADD CONSTRAINT profiles_plan_tier_check CHECK (plan_tier IN ('FREE', 'PREMIUM'));
  END IF;
END $$;

-- Backfill missing public.profiles rows for any existing auth.users (required by accounts_user_id_fkey)
INSERT INTO public.profiles (
  id,
  full_name,
  avatar_url,
  default_currency,
  base_currency,
  country_code,
  timezone,
  role,
  plan_tier,
  trial_started_at,
  trial_ends_at
)
SELECT
  u.id,
  COALESCE(u.raw_user_meta_data->>'full_name', u.raw_user_meta_data->>'name', split_part(u.email, '@', 1)),
  u.raw_user_meta_data->>'avatar_url',
  COALESCE(u.raw_user_meta_data->>'currency', 'PEN'),
  COALESCE(u.raw_user_meta_data->>'currency', 'PEN'),
  COALESCE(u.raw_user_meta_data->>'country_code', 'PE'),
  COALESCE(u.raw_user_meta_data->>'timezone', 'America/Lima'),
  CASE WHEN lower(u.email) = 'willysaico@gmail.com' THEN 'ADMIN' ELSE 'USER' END,
  CASE WHEN lower(u.email) = 'willysaico@gmail.com' THEN 'PREMIUM' ELSE 'FREE' END,
  COALESCE(u.created_at, now()),
  COALESCE(u.created_at, now()) + interval '15 days'
FROM auth.users u
ON CONFLICT (id) DO NOTHING;

-- Backfill trial window for existing profiles missing trial dates
UPDATE public.profiles
SET
  trial_started_at = COALESCE(trial_started_at, created_at, now()),
  trial_ends_at = COALESCE(trial_ends_at, COALESCE(created_at, now()) + interval '15 days')
WHERE trial_started_at IS NULL OR trial_ends_at IS NULL;

-- Promote primary owner/admin account (willysaico@gmail.com)
UPDATE public.profiles p
SET
  role = 'ADMIN',
  plan_tier = 'PREMIUM',
  updated_at = now()
FROM auth.users u
WHERE p.id = u.id
  AND lower(u.email) = 'willysaico@gmail.com';

-- Trigger: auto-initialize profiles cleanly for new signups with 15-day trial
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_role text := 'USER';
  v_plan text := 'FREE';
  v_trial_days int := 15;
BEGIN
  IF lower(NEW.email) = 'willysaico@gmail.com' THEN
    v_role := 'ADMIN';
    v_plan := 'PREMIUM';
  END IF;

  SELECT COALESCE(trial_days, 15) INTO v_trial_days
  FROM public.system_settings
  WHERE id = 'global'
  LIMIT 1;

  INSERT INTO public.profiles (
    id,
    full_name,
    avatar_url,
    default_currency,
    base_currency,
    country_code,
    timezone,
    role,
    plan_tier,
    trial_started_at,
    trial_ends_at,
    onboarding_completed,
    demo_mode_active
  )
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1)),
    NEW.raw_user_meta_data->>'avatar_url',
    COALESCE(NEW.raw_user_meta_data->>'currency', 'PEN'),
    COALESCE(NEW.raw_user_meta_data->>'currency', 'PEN'),
    COALESCE(NEW.raw_user_meta_data->>'country_code', 'PE'),
    COALESCE(NEW.raw_user_meta_data->>'timezone', 'America/Lima'),
    v_role,
    v_plan,
    now(),
    now() + make_interval(days => COALESCE(v_trial_days, 15)),
    false,
    false
  )
  ON CONFLICT (id) DO NOTHING;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 2. DEMO ISOLATION FLAG (is_demo) ON ALL FINANCIAL TABLES
ALTER TABLE public.accounts ADD COLUMN IF NOT EXISTS is_demo boolean NOT NULL DEFAULT false;
ALTER TABLE public.transactions ADD COLUMN IF NOT EXISTS is_demo boolean NOT NULL DEFAULT false;
ALTER TABLE public.budgets ADD COLUMN IF NOT EXISTS is_demo boolean NOT NULL DEFAULT false;
ALTER TABLE public.savings_goals ADD COLUMN IF NOT EXISTS is_demo boolean NOT NULL DEFAULT false;
ALTER TABLE public.accounts_receivable ADD COLUMN IF NOT EXISTS is_demo boolean NOT NULL DEFAULT false;
ALTER TABLE public.accounts_payable ADD COLUMN IF NOT EXISTS is_demo boolean NOT NULL DEFAULT false;
ALTER TABLE public.recurring_rules ADD COLUMN IF NOT EXISTS is_demo boolean NOT NULL DEFAULT false;
ALTER TABLE public.expense_categories ADD COLUMN IF NOT EXISTS is_demo boolean NOT NULL DEFAULT false;
ALTER TABLE public.income_categories ADD COLUMN IF NOT EXISTS is_demo boolean NOT NULL DEFAULT false;

CREATE INDEX IF NOT EXISTS idx_accounts_user_demo ON public.accounts (user_id, is_demo);
CREATE INDEX IF NOT EXISTS idx_transactions_user_demo ON public.transactions (user_id, is_demo);
CREATE INDEX IF NOT EXISTS idx_budgets_user_demo ON public.budgets (user_id, is_demo);
CREATE INDEX IF NOT EXISTS idx_goals_user_demo ON public.savings_goals (user_id, is_demo);

-- 3. CREATABLE USER TAGS
CREATE TABLE IF NOT EXISTS public.user_tags (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name text NOT NULL,
  color text NOT NULL DEFAULT '#7C3AED',
  is_demo boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_user_tags_unique_name
  ON public.user_tags (user_id, lower(name));

-- 4. GLOBAL SYSTEM SETTINGS (ADMIN CONTROLLED BRANDING & PAYMENTS)
CREATE TABLE IF NOT EXISTS public.system_settings (
  id text PRIMARY KEY DEFAULT 'global',
  app_name text NOT NULL DEFAULT 'Lumio Finance',
  tagline text NOT NULL DEFAULT 'Claridad financiera para tu día a día',
  logo_light_url text DEFAULT '/icons/icon-light.png',
  logo_dark_url text DEFAULT '/icons/icon-dark.png',
  logo_white_url text DEFAULT '/icons/icon-white.png',
  primary_color text NOT NULL DEFAULT '#7C3AED',
  default_currency text NOT NULL DEFAULT 'PEN',
  trial_days int4 NOT NULL DEFAULT 15,
  payment_config jsonb NOT NULL DEFAULT '{
    "yape": { "enabled": true, "number": "", "holder": "Wilber Saico", "qrUrl": "" },
    "plin": { "enabled": true, "number": "", "holder": "Wilber Saico", "qrUrl": "" },
    "card": { "enabled": true, "provider": "CULQI" },
    "paypal": { "enabled": true, "paypalMe": "" }
  }'::jsonb,
  updated_at timestamptz NOT NULL DEFAULT now()
);

INSERT INTO public.system_settings (id, app_name, primary_color, default_currency, trial_days)
VALUES ('global', 'Lumio Finance', '#7C3AED', 'PEN', 15)
ON CONFLICT (id) DO NOTHING;

-- 5. SUBSCRIPTION PLANS (CONFIGURABLE FROM /admin)
CREATE TABLE IF NOT EXISTS public.subscription_plans (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text UNIQUE NOT NULL,
  name text NOT NULL,
  billing_cycle text NOT NULL, -- 'FREE' | 'MONTHLY' | 'SEMIANNUAL' | 'ANNUAL' | 'LIFETIME'
  duration_days int4, -- NULL for FREE or LIFETIME
  price_pen numeric NOT NULL DEFAULT 0,
  price_usd numeric NOT NULL DEFAULT 0,
  badge text,
  description text,
  features jsonb NOT NULL DEFAULT '[]'::jsonb,
  is_active boolean NOT NULL DEFAULT true,
  sort_order int4 NOT NULL DEFAULT 0,
  updated_at timestamptz NOT NULL DEFAULT now()
);

INSERT INTO public.subscription_plans (code, name, billing_cycle, duration_days, price_pen, price_usd, badge, description, features, is_active, sort_order)
VALUES
  (
    'FREE',
    'Plan Básico',
    'FREE',
    NULL,
    0,
    0,
    'Gratis de por vida',
    'Lo esencial para registrar tus movimientos diarios sin pagar nada.',
    '["1 cuenta activa","Movimientos ilimitados","Categorías y etiquetas personalizadas","Vista previa modo lector en módulos avanzados"]'::jsonb,
    true,
    1
  ),
  (
    'PREMIUM_MONTHLY',
    'Mensual',
    'MONTHLY',
    30,
    10,
    3,
    NULL,
    'Flexibilidad total mes a mes con acceso completo.',
    '["Cuentas y tarjetas ilimitadas","Presupuestos y regla 50/30/20","Préstamos y cronogramas","Metas de ahorro y suscripciones","Reportes Excel, PDF, CSV y respaldos"]'::jsonb,
    true,
    2
  ),
  (
    'PREMIUM_SEMIANNUAL',
    '6 Meses',
    'SEMIANNUAL',
    180,
    50,
    14,
    '1 mes gratis',
    'Medio año completo ahorrando sobre la tarifa mensual.',
    '["Todo lo del plan Mensual","Ahorras S/. 10 frente al pago mensual","Soporte prioritario"]'::jsonb,
    true,
    3
  ),
  (
    'PREMIUM_ANNUAL',
    'Anual',
    'ANNUAL',
    365,
    79,
    22,
    'Más popular · Ahorra 34%',
    'El equilibrio perfecto para mantener todo tu año en orden.',
    '["Todo el sistema desbloqueado 12 meses","Ahorras S/. 41 al año","Escáner de comprobantes y respaldo Drive"]'::jsonb,
    true,
    4
  ),
  (
    'PREMIUM_LIFETIME',
    'De por vida',
    'LIFETIME',
    NULL,
    169,
    47,
    'Pago único',
    'Pagas una sola vez y es tuyo para siempre, sin renovaciones.',
    '["Acceso ilimitado de por vida","Todas las futuras actualizaciones incluidas","Cero cuotas recurrentes"]'::jsonb,
    true,
    5
  )
ON CONFLICT (code) DO UPDATE SET
  name = EXCLUDED.name,
  billing_cycle = EXCLUDED.billing_cycle,
  duration_days = EXCLUDED.duration_days,
  price_pen = EXCLUDED.price_pen,
  price_usd = EXCLUDED.price_usd,
  badge = EXCLUDED.badge,
  description = EXCLUDED.description,
  features = EXCLUDED.features,
  sort_order = EXCLUDED.sort_order;

-- 6. USER SUBSCRIPTIONS
CREATE TABLE IF NOT EXISTS public.user_subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  plan_code text NOT NULL DEFAULT 'FREE',
  status text NOT NULL DEFAULT 'ACTIVE', -- 'ACTIVE' | 'EXPIRED' | 'CANCELLED'
  started_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz, -- NULL for LIFETIME or FREE
  payment_order_id uuid,
  updated_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id)
);

-- 7. PAYMENT ORDERS (YAPE, PLIN, CULQI/VISA, PAYPAL)
CREATE TABLE IF NOT EXISTS public.payment_orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_code text UNIQUE NOT NULL,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  user_email text,
  plan_code text NOT NULL,
  payment_method text NOT NULL, -- 'YAPE' | 'PLIN' | 'CARD' | 'PAYPAL'
  amount numeric NOT NULL,
  currency_code text NOT NULL DEFAULT 'PEN',
  operation_number text,
  proof_url text,
  status text NOT NULL DEFAULT 'PENDING_VERIFICATION', -- 'PENDING_VERIFICATION' | 'APPROVED' | 'REJECTED'
  rejection_reason text,
  reviewed_by uuid,
  reviewed_at timestamptz,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_payment_orders_user ON public.payment_orders (user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_payment_orders_status ON public.payment_orders (status, created_at DESC);

-- 8. HELPER FUNCTION FOR STRICT ADMIN CHECK IN RLS
CREATE OR REPLACE FUNCTION public.is_lumio_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND role = 'ADMIN'
  );
$$;

-- 9. ENABLE STRICT ROW LEVEL SECURITY ACROSS ALL USER TABLES
DO $$
DECLARE
  t text;
  has_user_id boolean;
  user_tables text[] := ARRAY[
    'accounts',
    'transactions',
    'budgets',
    'savings_goals',
    'goal_contributions',
    'goal_milestones',
    'accounts_receivable',
    'accounts_payable',
    'loan_payments',
    'loans',
    'recurring_rules',
    'notifications',
    'google_tokens',
    'user_tags',
    'account_balance_adjustments',
    'credit_cards',
    'credit_card_statements',
    'petty_cash_funds',
    'petty_cash_expenses',
    'zbb_planning_cycles',
    'zbb_allocations'
  ];
BEGIN
  FOREACH t IN ARRAY user_tables LOOP
    IF to_regclass('public.' || t) IS NOT NULL THEN
      EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', t);
      EXECUTE format('DROP POLICY IF EXISTS "lumio_isolation_all" ON public.%I', t);

      -- Validar si la tabla tiene columna directa user_id
      SELECT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public' AND table_name = t AND column_name = 'user_id'
      ) INTO has_user_id;

      IF has_user_id THEN
        EXECUTE format(
          'CREATE POLICY "lumio_isolation_all" ON public.%I FOR ALL USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid())',
          t
        );
      ELSIF t IN ('goal_milestones', 'goal_contributions') AND EXISTS (
        SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = t AND column_name = 'goal_id'
      ) THEN
        EXECUTE format(
          'CREATE POLICY "lumio_isolation_all" ON public.%I FOR ALL USING (EXISTS (SELECT 1 FROM public.savings_goals g WHERE g.id = %I.goal_id AND g.user_id = auth.uid())) WITH CHECK (EXISTS (SELECT 1 FROM public.savings_goals g WHERE g.id = %I.goal_id AND g.user_id = auth.uid()))',
          t, t, t
        );
      ELSIF t = 'loan_payments' AND EXISTS (
        SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = t AND column_name = 'loan_id'
      ) THEN
        EXECUTE format(
          'CREATE POLICY "lumio_isolation_all" ON public.%I FOR ALL USING (EXISTS (SELECT 1 FROM public.loans l WHERE l.id = %I.loan_id AND l.user_id = auth.uid())) WITH CHECK (EXISTS (SELECT 1 FROM public.loans l WHERE l.id = %I.loan_id AND l.user_id = auth.uid()))',
          t, t, t
        );
      END IF;
    END IF;
  END LOOP;
END $$;

-- Profiles RLS
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "profiles_select_own_or_admin" ON public.profiles;
CREATE POLICY "profiles_select_own_or_admin" ON public.profiles
  FOR SELECT USING (id = auth.uid() OR public.is_lumio_admin());

DROP POLICY IF EXISTS "profiles_update_own_or_admin" ON public.profiles;
CREATE POLICY "profiles_update_own_or_admin" ON public.profiles
  FOR UPDATE USING (id = auth.uid() OR public.is_lumio_admin())
  WITH CHECK (id = auth.uid() OR public.is_lumio_admin());

DROP POLICY IF EXISTS "profiles_insert_own" ON public.profiles;
CREATE POLICY "profiles_insert_own" ON public.profiles
  FOR INSERT WITH CHECK (id = auth.uid());

-- Categories RLS (system user_id IS NULL visible to all, mutations strictly own user_id)
ALTER TABLE public.expense_categories ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "exp_cat_select" ON public.expense_categories;
CREATE POLICY "exp_cat_select" ON public.expense_categories
  FOR SELECT USING (user_id IS NULL OR user_id = auth.uid());
DROP POLICY IF EXISTS "exp_cat_write" ON public.expense_categories;
CREATE POLICY "exp_cat_write" ON public.expense_categories
  FOR ALL USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

ALTER TABLE public.income_categories ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "inc_cat_select" ON public.income_categories;
CREATE POLICY "inc_cat_select" ON public.income_categories
  FOR SELECT USING (user_id IS NULL OR user_id = auth.uid());
DROP POLICY IF EXISTS "inc_cat_write" ON public.income_categories;
CREATE POLICY "inc_cat_write" ON public.income_categories
  FOR ALL USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

-- System settings & subscription plans RLS (public read, admin write)
ALTER TABLE public.system_settings ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "system_settings_read" ON public.system_settings;
CREATE POLICY "system_settings_read" ON public.system_settings FOR SELECT USING (true);
DROP POLICY IF EXISTS "system_settings_admin_write" ON public.system_settings;
CREATE POLICY "system_settings_admin_write" ON public.system_settings
  FOR ALL USING (public.is_lumio_admin()) WITH CHECK (public.is_lumio_admin());

ALTER TABLE public.subscription_plans ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "subscription_plans_read" ON public.subscription_plans;
CREATE POLICY "subscription_plans_read" ON public.subscription_plans FOR SELECT USING (true);
DROP POLICY IF EXISTS "subscription_plans_admin_write" ON public.subscription_plans;
CREATE POLICY "subscription_plans_admin_write" ON public.subscription_plans
  FOR ALL USING (public.is_lumio_admin()) WITH CHECK (public.is_lumio_admin());

-- User subscriptions & payment orders RLS
ALTER TABLE public.user_subscriptions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "user_subs_read" ON public.user_subscriptions;
CREATE POLICY "user_subs_read" ON public.user_subscriptions
  FOR SELECT USING (user_id = auth.uid() OR public.is_lumio_admin());
DROP POLICY IF EXISTS "user_subs_admin_write" ON public.user_subscriptions;
CREATE POLICY "user_subs_admin_write" ON public.user_subscriptions
  FOR ALL USING (public.is_lumio_admin()) WITH CHECK (public.is_lumio_admin());

ALTER TABLE public.payment_orders ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "payment_orders_read" ON public.payment_orders;
CREATE POLICY "payment_orders_read" ON public.payment_orders
  FOR SELECT USING (user_id = auth.uid() OR public.is_lumio_admin());
DROP POLICY IF EXISTS "payment_orders_insert_own" ON public.payment_orders;
CREATE POLICY "payment_orders_insert_own" ON public.payment_orders
  FOR INSERT WITH CHECK (user_id = auth.uid());
DROP POLICY IF EXISTS "payment_orders_admin_update" ON public.payment_orders;
CREATE POLICY "payment_orders_admin_update" ON public.payment_orders
  FOR UPDATE USING (public.is_lumio_admin()) WITH CHECK (public.is_lumio_admin());

-- 10. OPTIONAL STORAGE BUCKETS (SAFE TO IGNORE IF STORAGE SCHEMA DIFFERS)
INSERT INTO storage.buckets (id, name, public)
VALUES ('branding', 'branding', true)
ON CONFLICT (id) DO NOTHING;

INSERT INTO storage.buckets (id, name, public)
VALUES ('payment-proofs', 'payment-proofs', false)
ON CONFLICT (id) DO NOTHING;
