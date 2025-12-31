-- ============================================================================
-- SCRIPT DE MIGRACIÓN MANUAL: CAJA CHICA (FASE 5)
-- Ejecuta este script en el Editor SQL de Supabase para activar el módulo.
-- ============================================================================

-- 1. Actualizar Enum AccountType (Si falla, ignora o corre la línea ALTER TYPE)
-- Postgres no soporta "IF NOT EXISTS" en ADD VALUE fácilmente en versiones antiguas,
-- pero en Supabase debería funcionar.
ALTER TYPE "AccountType" ADD VALUE IF NOT EXISTS 'PETTY_CASH';

-- 2. Crear nuevos Enums
CREATE TYPE "LiquidationStatus" AS ENUM ('DRAFT', 'SUBMITTED', 'APPROVED', 'REIMBURSED');
CREATE TYPE "PettyCashDocumentType" AS ENUM ('INVOICE', 'RECEIPT', 'TICKET', 'PROVISIONAL_RECEIPT');

-- 3. Actualizar Tabla Accounts
ALTER TABLE "accounts" ADD COLUMN IF NOT EXISTS "fixed_fund_amount" DECIMAL(15, 2);

-- 4. Crear Tabla Liquidations
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

-- Indices para Liquidations
CREATE UNIQUE INDEX IF NOT EXISTS "liquidations_user_id_code_key" ON "liquidations"("user_id", "code");

-- 5. Actualizar Tabla Transactions
ALTER TABLE "transactions" ADD COLUMN IF NOT EXISTS "document_type" "PettyCashDocumentType";
ALTER TABLE "transactions" ADD COLUMN IF NOT EXISTS "document_number" TEXT;
ALTER TABLE "transactions" ADD COLUMN IF NOT EXISTS "supplier" TEXT;
ALTER TABLE "transactions" ADD COLUMN IF NOT EXISTS "liquidation_id" UUID;

-- FK para Transactions -> Liquidations
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_liquidation_id_fkey" 
    FOREIGN KEY ("liquidation_id") REFERENCES "liquidations"("id") ON DELETE SET NULL;

-- ============================================================================
-- FIN DEL SCRIPT
-- ============================================================================
