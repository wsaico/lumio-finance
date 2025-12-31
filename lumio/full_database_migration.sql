-- ============================================================================
-- SCRIPT DE MIGRACIÓN COMPLETA: LUMIO FINANCE (TODAS LAS FASES)
-- Ejecuta este script en el Editor SQL de Supabase para inicializar la base de datos.
-- ============================================================================

-- 1. TIPOS ENUMERADOS
DO $$ BEGIN
    CREATE TYPE "AccountType" AS ENUM ('CASH', 'BANK', 'DIGITAL', 'CREDIT_CARD', 'INVESTMENT', 'PETTY_CASH');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE "TransactionType" AS ENUM ('INCOME', 'EXPENSE', 'TRANSFER', 'SAVINGS_DEPOSIT', 'SAVINGS_WITHDRAWAL');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE "CategoryType" AS ENUM ('EXPENSE', 'INCOME');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE "LoanType" AS ENUM ('LENT', 'BORROWED');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE "LoanStatus" AS ENUM ('ACTIVE', 'PAID', 'DEFAULTED', 'CANCELLED');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE "PaymentStatus" AS ENUM ('PENDING', 'IN_PROGRESS', 'PAID', 'CANCELLED');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE "Frequency" AS ENUM ('DAILY', 'WEEKLY', 'BIWEEKLY', 'MONTHLY', 'YEARLY');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE "LiquidationStatus" AS ENUM ('DRAFT', 'SUBMITTED', 'APPROVED', 'REIMBURSED');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE "PettyCashDocumentType" AS ENUM ('INVOICE', 'RECEIPT', 'TICKET', 'PROVISIONAL_RECEIPT');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;


-- 2. TABLAS PRINCIPALES

-- Profiles
CREATE TABLE IF NOT EXISTS "profiles" (
    "id" UUID NOT NULL,
    "full_name" TEXT,
    "username" TEXT,
    "profession" TEXT,
    "avatar_url" TEXT,
    "default_currency" TEXT NOT NULL DEFAULT 'USD',
    "auto_update" BOOLEAN NOT NULL DEFAULT true,
    "theme" TEXT NOT NULL DEFAULT 'system',
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "profiles_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "profiles_username_key" ON "profiles"("username");


-- Master Data: Currencies
CREATE TABLE IF NOT EXISTS "currencies" (
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "symbol" TEXT NOT NULL,
    "exchange_rate_to_usd" DECIMAL(10, 6) NOT NULL DEFAULT 1.0,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "currencies_pkey" PRIMARY KEY ("code")
);

-- Master Data: Categories
CREATE TABLE IF NOT EXISTS "expense_categories" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "user_id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "icon" TEXT NOT NULL,
    "color" TEXT NOT NULL,
    "is_system" BOOLEAN NOT NULL DEFAULT false,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "expense_categories_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "expense_categories_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "profiles"("id") ON DELETE CASCADE
);

CREATE UNIQUE INDEX IF NOT EXISTS "expense_categories_user_id_name_key" ON "expense_categories"("user_id", "name");

CREATE TABLE IF NOT EXISTS "income_categories" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "user_id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "icon" TEXT NOT NULL,
    "color" TEXT NOT NULL,
    "is_system" BOOLEAN NOT NULL DEFAULT false,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "income_categories_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "income_categories_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "profiles"("id") ON DELETE CASCADE
);

CREATE UNIQUE INDEX IF NOT EXISTS "income_categories_user_id_name_key" ON "income_categories"("user_id", "name");

CREATE TABLE IF NOT EXISTS "subcategories" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "expense_category_id" UUID,
    "income_category_id" UUID,
    "name" TEXT NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "subcategories_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "subcategories_expense_category_id_fkey" FOREIGN KEY ("expense_category_id") REFERENCES "expense_categories"("id") ON DELETE CASCADE,
    CONSTRAINT "subcategories_income_category_id_fkey" FOREIGN KEY ("income_category_id") REFERENCES "income_categories"("id") ON DELETE CASCADE
);


-- Accounts
CREATE TABLE IF NOT EXISTS "accounts" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "user_id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "account_type" "AccountType" NOT NULL,
    "currency_code" TEXT NOT NULL,
    "initial_balance" DECIMAL(15, 2) NOT NULL DEFAULT 0,
    "current_balance" DECIMAL(15, 2) NOT NULL DEFAULT 0,
    "bank_name" TEXT,
    "account_number" TEXT,
    "fixed_fund_amount" DECIMAL(15, 2),
    "icon" TEXT NOT NULL DEFAULT 'wallet',
    "color" TEXT NOT NULL DEFAULT '#0ea5e9',
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "include_in_total" BOOLEAN NOT NULL DEFAULT true,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "accounts_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "accounts_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "profiles"("id") ON DELETE CASCADE,
    CONSTRAINT "accounts_currency_code_fkey" FOREIGN KEY ("currency_code") REFERENCES "currencies"("code") ON DELETE RESTRICT
);
CREATE INDEX IF NOT EXISTS "accounts_user_id_idx" ON "accounts"("user_id");

-- Liquidations
CREATE TABLE IF NOT EXISTS "liquidations" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "user_id" UUID NOT NULL,
    "account_id" UUID NOT NULL,
    "code" TEXT NOT NULL,
    "total_amount" DECIMAL(15, 2) NOT NULL,
    "status" "LiquidationStatus" NOT NULL DEFAULT 'DRAFT',
    "submission_date" TIMESTAMPTZ,
    "reimbursement_date" TIMESTAMPTZ,
    "notes" TEXT,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "liquidations_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "liquidations_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "profiles"("id") ON DELETE CASCADE,
    CONSTRAINT "liquidations_account_id_fkey" FOREIGN KEY ("account_id") REFERENCES "accounts"("id") ON DELETE RESTRICT
);
CREATE UNIQUE INDEX IF NOT EXISTS "liquidations_user_id_code_key" ON "liquidations"("user_id", "code");


-- Transactions (Dependencies first for relations)
CREATE TABLE IF NOT EXISTS "transactions" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "user_id" UUID NOT NULL,
    "transaction_type" "TransactionType" NOT NULL,
    "account_id" UUID NOT NULL,
    "transfer_to_account_id" UUID,
    "amount" DECIMAL(15, 2) NOT NULL,
    "currency_code" TEXT NOT NULL,
    "exchange_rate" DECIMAL(10, 6) NOT NULL DEFAULT 1.0,
    "expense_category_id" UUID,
    "income_category_id" UUID,
    "subcategory_id" UUID,
    "transaction_date" TIMESTAMPTZ NOT NULL,
    "description" TEXT,
    "notes" TEXT,
    "receipt_url" TEXT,
    "location" TEXT,
    "tags" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "savings_goal_id" UUID,
    "loan_id" UUID,
    "credit_card_purchase_id" UUID,
    "is_recurring" BOOLEAN NOT NULL DEFAULT false,
    "recurring_rule_id" UUID,
    -- Petty Cash
    "document_type" "PettyCashDocumentType",
    "document_number" TEXT,
    "supplier" TEXT,
    "liquidation_id" UUID,
    
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "transactions_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "transactions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "profiles"("id") ON DELETE CASCADE,
    CONSTRAINT "transactions_account_id_fkey" FOREIGN KEY ("account_id") REFERENCES "accounts"("id") ON DELETE RESTRICT,
    CONSTRAINT "transactions_transfer_to_account_id_fkey" FOREIGN KEY ("transfer_to_account_id") REFERENCES "accounts"("id") ON DELETE SET NULL,
    CONSTRAINT "transactions_currency_code_fkey" FOREIGN KEY ("currency_code") REFERENCES "currencies"("code") ON DELETE RESTRICT,
    CONSTRAINT "transactions_expense_category_id_fkey" FOREIGN KEY ("expense_category_id") REFERENCES "expense_categories"("id") ON DELETE SET NULL,
    CONSTRAINT "transactions_income_category_id_fkey" FOREIGN KEY ("income_category_id") REFERENCES "income_categories"("id") ON DELETE SET NULL,
    CONSTRAINT "transactions_subcategory_id_fkey" FOREIGN KEY ("subcategory_id") REFERENCES "subcategories"("id") ON DELETE SET NULL,
    CONSTRAINT "transactions_liquidation_id_fkey" FOREIGN KEY ("liquidation_id") REFERENCES "liquidations"("id") ON DELETE SET NULL
);

-- Budgets
CREATE TABLE IF NOT EXISTS "budgets" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "user_id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "budget_year" INTEGER NOT NULL,
    "budget_month" INTEGER NOT NULL,
    "currency_code" TEXT NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "budgets_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "budgets_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "profiles"("id") ON DELETE CASCADE,
    CONSTRAINT "budgets_currency_code_fkey" FOREIGN KEY ("currency_code") REFERENCES "currencies"("code") ON DELETE RESTRICT
);
CREATE UNIQUE INDEX IF NOT EXISTS "budgets_user_id_year_month_key" ON "budgets"("user_id", "budget_year", "budget_month");

CREATE TABLE IF NOT EXISTS "budget_lines" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "budget_id" UUID NOT NULL,
    "category_id" UUID NOT NULL,
    "category_type" "CategoryType" NOT NULL,
    "budgeted_amount" DECIMAL(15, 2) NOT NULL,
    "actual_amount" DECIMAL(15, 2) NOT NULL DEFAULT 0,
    "notes" TEXT,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "budget_lines_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "budget_lines_budget_id_fkey" FOREIGN KEY ("budget_id") REFERENCES "budgets"("id") ON DELETE CASCADE
);

-- Savings Goals
CREATE TABLE IF NOT EXISTS "savings_goals" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "user_id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "target_amount" DECIMAL(15, 2) NOT NULL,
    "current_amount" DECIMAL(15, 2) NOT NULL DEFAULT 0,
    "currency_code" TEXT NOT NULL,
    "target_date" DATE,
    "description" TEXT,
    "icon" TEXT NOT NULL DEFAULT 'piggy-bank',
    "color" TEXT NOT NULL DEFAULT '#10b981',
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "savings_goals_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "savings_goals_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "profiles"("id") ON DELETE CASCADE,
    CONSTRAINT "savings_goals_currency_code_fkey" FOREIGN KEY ("currency_code") REFERENCES "currencies"("code") ON DELETE RESTRICT
);

-- Loans
CREATE TABLE IF NOT EXISTS "loans" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "user_id" UUID NOT NULL,
    "loan_type" "LoanType" NOT NULL,
    "contact_name" TEXT NOT NULL,
    "account_id" UUID,
    "principal_amount" DECIMAL(15, 2) NOT NULL,
    "interest_rate" DECIMAL(5, 4) NOT NULL,
    "remaining_balance" DECIMAL(15, 2) NOT NULL,
    "currency_code" TEXT NOT NULL,
    "loan_date" DATE NOT NULL,
    "due_date" DATE,
    "status" "LoanStatus" NOT NULL DEFAULT 'ACTIVE',
    "description" TEXT,
    "notes" TEXT,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "loans_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "loans_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "profiles"("id") ON DELETE CASCADE,
    CONSTRAINT "loans_account_id_fkey" FOREIGN KEY ("account_id") REFERENCES "accounts"("id") ON DELETE SET NULL,
    CONSTRAINT "loans_currency_code_fkey" FOREIGN KEY ("currency_code") REFERENCES "currencies"("code") ON DELETE RESTRICT
);

CREATE TABLE IF NOT EXISTS "loan_payments" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "loan_id" UUID NOT NULL,
    "transaction_id" UUID,
    "payment_amount" DECIMAL(15, 2) NOT NULL,
    "interest_amount" DECIMAL(15, 2) NOT NULL DEFAULT 0,
    "principal_amount" DECIMAL(15, 2) NOT NULL,
    "payment_date" DATE NOT NULL,
    "notes" TEXT,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "loan_payments_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "loan_payments_loan_id_fkey" FOREIGN KEY ("loan_id") REFERENCES "loans"("id") ON DELETE CASCADE,
    CONSTRAINT "loan_payments_transaction_id_fkey" FOREIGN KEY ("transaction_id") REFERENCES "transactions"("id") ON DELETE SET NULL
);

-- Credit Cards
CREATE TABLE IF NOT EXISTS "credit_cards" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "user_id" UUID NOT NULL,
    "card_name" TEXT NOT NULL,
    "bank_name" TEXT,
    "card_number_last4" TEXT,
    "credit_limit" DECIMAL(15, 2),
    "available_credit" DECIMAL(15, 2),
    "currency_code" TEXT NOT NULL,
    "billing_day" INTEGER,
    "payment_due_day" INTEGER,
    "interest_rate" DECIMAL(5, 4),
    "annual_fee" DECIMAL(10, 2),
    "icon" TEXT NOT NULL DEFAULT 'credit-card',
    "color" TEXT NOT NULL DEFAULT '#ef4444',
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "credit_cards_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "credit_cards_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "profiles"("id") ON DELETE CASCADE,
    CONSTRAINT "credit_cards_currency_code_fkey" FOREIGN KEY ("currency_code") REFERENCES "currencies"("code") ON DELETE RESTRICT
);

CREATE TABLE IF NOT EXISTS "credit_card_purchases" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "credit_card_id" UUID NOT NULL,
    "transaction_id" UUID,
    "description" TEXT NOT NULL,
    "total_amount" DECIMAL(15, 2) NOT NULL,
    "installments" INTEGER NOT NULL DEFAULT 1,
    "purchase_date" DATE NOT NULL,
    "first_due_date" DATE,
    "status" "PaymentStatus" NOT NULL DEFAULT 'PENDING',
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "credit_card_purchases_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "credit_card_purchases_credit_card_id_fkey" FOREIGN KEY ("credit_card_id") REFERENCES "credit_cards"("id") ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS "installment_schedule" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "purchase_id" UUID NOT NULL,
    "installment_number" INTEGER NOT NULL,
    "due_date" DATE NOT NULL,
    "amount" DECIMAL(15, 2) NOT NULL,
    "is_paid" BOOLEAN NOT NULL DEFAULT false,
    "payment_date" DATE,
    "payment_transaction_id" UUID,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "installment_schedule_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "installment_schedule_purchase_id_fkey" FOREIGN KEY ("purchase_id") REFERENCES "credit_card_purchases"("id") ON DELETE CASCADE
);

-- Recurring Rules
CREATE TABLE IF NOT EXISTS "recurring_rules" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "user_id" UUID NOT NULL,
    "rule_name" TEXT NOT NULL,
    "transaction_type" "TransactionType" NOT NULL,
    "account_id" UUID,
    "amount" DECIMAL(15, 2) NOT NULL,
    "currency_code" TEXT NOT NULL,
    "expense_category_id" UUID,
    "income_category_id" UUID,
    "subcategory_id" UUID,
    "frequency" "Frequency" NOT NULL,
    "interval" INTEGER NOT NULL DEFAULT 1,
    "start_date" DATE NOT NULL,
    "end_date" DATE,
    "next_occurrence" DATE NOT NULL,
    "description" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "last_executed_at" TIMESTAMPTZ,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "recurring_rules_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "recurring_rules_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "profiles"("id") ON DELETE CASCADE,
    CONSTRAINT "recurring_rules_account_id_fkey" FOREIGN KEY ("account_id") REFERENCES "accounts"("id") ON DELETE SET NULL,
    CONSTRAINT "recurring_rules_currency_code_fkey" FOREIGN KEY ("currency_code") REFERENCES "currencies"("code") ON DELETE RESTRICT,
    CONSTRAINT "recurring_rules_expense_category_id_fkey" FOREIGN KEY ("expense_category_id") REFERENCES "expense_categories"("id") ON DELETE SET NULL,
    CONSTRAINT "recurring_rules_income_category_id_fkey" FOREIGN KEY ("income_category_id") REFERENCES "income_categories"("id") ON DELETE SET NULL,
    CONSTRAINT "recurring_rules_subcategory_id_fkey" FOREIGN KEY ("subcategory_id") REFERENCES "subcategories"("id") ON DELETE SET NULL
);

-- 3. INSERTAR DATOS MAESTROS BÁSICOS (MONEDAS)
INSERT INTO "currencies" ("code", "name", "symbol", "exchange_rate_to_usd") VALUES
('USD', 'United States Dollar', '$', 1.0),
('PEN', 'Peruvian Sol', 'S/', 0.27)
ON CONFLICT ("code") DO NOTHING;

-- 4. INSERTAR USUARIO Y PERFIL DE PRUEBA (Para facilitar testing)
-- Nota: Supabase Auth gestiona los usuarios, pero Profiles es nuestra tabla
-- Si creaste el usuario, asegúrate de que exista en auth.users, luego inserta aquí.
-- Este paso es OPIONAL si el trigger de creación de perfil ya existe.

-- Trigger para creación automática de Profile al crear User en Auth
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, avatar_url)
  VALUES (new.id, new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'avatar_url');
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
-- CREATE TRIGGER on_auth_user_created
--   AFTER INSERT ON auth.users
--   FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

