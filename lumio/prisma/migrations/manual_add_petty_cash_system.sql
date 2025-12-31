-- ==========================================
-- SISTEMA DE CONTROL DE CAJA CHICA CON FONDO FIJO
-- Manual Migration Script
-- ==========================================

-- 1. PETTY CASH FUNDS (Fondos Fijos de Caja Chica)
CREATE TABLE IF NOT EXISTS petty_cash_funds (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    account_id UUID NOT NULL REFERENCES accounts(id) ON DELETE RESTRICT,
    fund_code VARCHAR(50) UNIQUE NOT NULL,
    fund_name VARCHAR(200) NOT NULL,
    assigned_amount DECIMAL(15, 2) NOT NULL,
    current_balance DECIMAL(15, 2) NOT NULL,
    currency_code VARCHAR(3) NOT NULL,
    responsible_name VARCHAR(200) NOT NULL,
    responsible_id VARCHAR(50),
    department VARCHAR(100),
    description TEXT,
    status VARCHAR(20) DEFAULT 'ACTIVE' NOT NULL,
    settlement_threshold DECIMAL(5, 2) DEFAULT 70 NOT NULL,
    created_at TIMESTAMPTZ(6) DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ(6) DEFAULT NOW() NOT NULL,
    closed_at TIMESTAMPTZ(6)
);

CREATE INDEX IF NOT EXISTS idx_petty_cash_funds_user_id ON petty_cash_funds(user_id);
CREATE INDEX IF NOT EXISTS idx_petty_cash_funds_account_id ON petty_cash_funds(account_id);
CREATE INDEX IF NOT EXISTS idx_petty_cash_funds_status ON petty_cash_funds(status);

-- 2. PETTY CASH SETTLEMENTS (Liquidaciones de Caja Chica)
CREATE TABLE IF NOT EXISTS petty_cash_settlements (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    fund_id UUID NOT NULL REFERENCES petty_cash_funds(id) ON DELETE CASCADE,
    settlement_code VARCHAR(50) UNIQUE NOT NULL,
    settlement_date TIMESTAMPTZ(6) NOT NULL,
    total_amount DECIMAL(15, 2) NOT NULL,
    expense_count INTEGER NOT NULL,
    responsible_name VARCHAR(200) NOT NULL,
    received_by VARCHAR(200),
    notes TEXT,
    status VARCHAR(20) DEFAULT 'PENDING' NOT NULL,
    approved_by VARCHAR(200),
    approved_at TIMESTAMPTZ(6),
    accounted_by VARCHAR(200),
    accounted_at TIMESTAMPTZ(6),
    accounting_code VARCHAR(50),
    created_at TIMESTAMPTZ(6) DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ(6) DEFAULT NOW() NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_petty_cash_settlements_user_id ON petty_cash_settlements(user_id);
CREATE INDEX IF NOT EXISTS idx_petty_cash_settlements_fund_id ON petty_cash_settlements(fund_id);
CREATE INDEX IF NOT EXISTS idx_petty_cash_settlements_settlement_date ON petty_cash_settlements(settlement_date);
CREATE INDEX IF NOT EXISTS idx_petty_cash_settlements_status ON petty_cash_settlements(status);

-- 3. PETTY CASH EXPENSES (Gastos de Caja Chica)
CREATE TABLE IF NOT EXISTS petty_cash_expenses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    fund_id UUID NOT NULL REFERENCES petty_cash_funds(id) ON DELETE CASCADE,
    settlement_id UUID REFERENCES petty_cash_settlements(id) ON DELETE SET NULL,
    expense_code VARCHAR(50) UNIQUE NOT NULL,
    expense_date TIMESTAMPTZ(6) NOT NULL,
    amount DECIMAL(15, 2) NOT NULL,
    category_id UUID REFERENCES expense_categories(id) ON DELETE SET NULL,
    description VARCHAR(500) NOT NULL,
    vendor VARCHAR(200),
    receipt_number VARCHAR(100),
    receipt_type VARCHAR(50),
    taxable_amount DECIMAL(15, 2),
    tax_amount DECIMAL(15, 2),
    attachment_url TEXT,
    justification TEXT,
    status VARCHAR(20) DEFAULT 'PENDING' NOT NULL,
    approved_by VARCHAR(200),
    approved_at TIMESTAMPTZ(6),
    created_at TIMESTAMPTZ(6) DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ(6) DEFAULT NOW() NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_petty_cash_expenses_user_id ON petty_cash_expenses(user_id);
CREATE INDEX IF NOT EXISTS idx_petty_cash_expenses_fund_id ON petty_cash_expenses(fund_id);
CREATE INDEX IF NOT EXISTS idx_petty_cash_expenses_settlement_id ON petty_cash_expenses(settlement_id);
CREATE INDEX IF NOT EXISTS idx_petty_cash_expenses_expense_date ON petty_cash_expenses(expense_date);

-- 4. PETTY CASH REPLENISHMENTS (Reposiciones de Fondo Fijo)
CREATE TABLE IF NOT EXISTS petty_cash_replenishments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    fund_id UUID NOT NULL REFERENCES petty_cash_funds(id) ON DELETE CASCADE,
    settlement_id UUID UNIQUE NOT NULL REFERENCES petty_cash_settlements(id) ON DELETE CASCADE,
    replenishment_code VARCHAR(50) UNIQUE NOT NULL,
    replenishment_date TIMESTAMPTZ(6) NOT NULL,
    amount DECIMAL(15, 2) NOT NULL,
    payment_method VARCHAR(50) NOT NULL,
    reference_number VARCHAR(100),
    approved_by VARCHAR(200) NOT NULL,
    delivered_by VARCHAR(200),
    received_by VARCHAR(200) NOT NULL,
    notes TEXT,
    status VARCHAR(20) DEFAULT 'PENDING' NOT NULL,
    delivered_at TIMESTAMPTZ(6),
    confirmed_at TIMESTAMPTZ(6),
    created_at TIMESTAMPTZ(6) DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ(6) DEFAULT NOW() NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_petty_cash_replenishments_user_id ON petty_cash_replenishments(user_id);
CREATE INDEX IF NOT EXISTS idx_petty_cash_replenishments_fund_id ON petty_cash_replenishments(fund_id);
CREATE INDEX IF NOT EXISTS idx_petty_cash_replenishments_settlement_id ON petty_cash_replenishments(settlement_id);
CREATE INDEX IF NOT EXISTS idx_petty_cash_replenishments_replenishment_date ON petty_cash_replenishments(replenishment_date);

-- 5. PETTY CASH AUDITS (Arqueos de Caja Chica)
CREATE TABLE IF NOT EXISTS petty_cash_audits (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    fund_id UUID NOT NULL REFERENCES petty_cash_funds(id) ON DELETE CASCADE,
    audit_code VARCHAR(50) UNIQUE NOT NULL,
    audit_date TIMESTAMPTZ(6) NOT NULL,
    audit_type VARCHAR(50) NOT NULL,
    expected_cash DECIMAL(15, 2) NOT NULL,
    actual_cash DECIMAL(15, 2) NOT NULL,
    variance DECIMAL(15, 2) NOT NULL,
    pending_expenses DECIMAL(15, 2) NOT NULL,
    audited_by VARCHAR(200) NOT NULL,
    responsible_present BOOLEAN NOT NULL,
    findings TEXT,
    recommendations TEXT,
    attachment_url TEXT,
    status VARCHAR(20) DEFAULT 'COMPLETED' NOT NULL,
    created_at TIMESTAMPTZ(6) DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ(6) DEFAULT NOW() NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_petty_cash_audits_user_id ON petty_cash_audits(user_id);
CREATE INDEX IF NOT EXISTS idx_petty_cash_audits_fund_id ON petty_cash_audits(fund_id);
CREATE INDEX IF NOT EXISTS idx_petty_cash_audits_audit_date ON petty_cash_audits(audit_date);

-- 6. PETTY CASH TRANSFERS (Transferencias Provisionales de Fondo)
CREATE TABLE IF NOT EXISTS petty_cash_transfers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    from_fund_id UUID NOT NULL REFERENCES petty_cash_funds(id) ON DELETE CASCADE,
    to_responsible_name VARCHAR(200) NOT NULL,
    to_responsible_id VARCHAR(50),
    transfer_code VARCHAR(50) UNIQUE NOT NULL,
    transfer_date TIMESTAMPTZ(6) NOT NULL,
    amount DECIMAL(15, 2) NOT NULL,
    transfer_type VARCHAR(50) NOT NULL,
    reason TEXT NOT NULL,
    receipt_number VARCHAR(100),
    return_date TIMESTAMPTZ(6),
    status VARCHAR(20) DEFAULT 'PENDING' NOT NULL,
    delivered_by VARCHAR(200),
    received_by VARCHAR(200),
    returned_at TIMESTAMPTZ(6),
    notes TEXT,
    created_at TIMESTAMPTZ(6) DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ(6) DEFAULT NOW() NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_petty_cash_transfers_user_id ON petty_cash_transfers(user_id);
CREATE INDEX IF NOT EXISTS idx_petty_cash_transfers_from_fund_id ON petty_cash_transfers(from_fund_id);
CREATE INDEX IF NOT EXISTS idx_petty_cash_transfers_transfer_date ON petty_cash_transfers(transfer_date);
CREATE INDEX IF NOT EXISTS idx_petty_cash_transfers_status ON petty_cash_transfers(status);

-- 7. CREATE SEQUENCE FOR AUTO-GENERATED CODES
CREATE SEQUENCE IF NOT EXISTS petty_cash_fund_seq START 1;
CREATE SEQUENCE IF NOT EXISTS petty_cash_expense_seq START 1;
CREATE SEQUENCE IF NOT EXISTS petty_cash_settlement_seq START 1;
CREATE SEQUENCE IF NOT EXISTS petty_cash_replenishment_seq START 1;
CREATE SEQUENCE IF NOT EXISTS petty_cash_audit_seq START 1;
CREATE SEQUENCE IF NOT EXISTS petty_cash_transfer_seq START 1;

-- 8. CREATE TRIGGER FUNCTIONS FOR AUTO-GENERATING CODES
CREATE OR REPLACE FUNCTION generate_fund_code()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.fund_code IS NULL OR NEW.fund_code = '' THEN
        NEW.fund_code := 'FF-' || TO_CHAR(CURRENT_DATE, 'YYYY') || '-' || LPAD(nextval('petty_cash_fund_seq')::TEXT, 3, '0');
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION generate_expense_code()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.expense_code IS NULL OR NEW.expense_code = '' THEN
        NEW.expense_code := 'EXP-' || TO_CHAR(CURRENT_DATE, 'YYYY') || '-' || LPAD(nextval('petty_cash_expense_seq')::TEXT, 5, '0');
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION generate_settlement_code()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.settlement_code IS NULL OR NEW.settlement_code = '' THEN
        NEW.settlement_code := 'LIQ-' || TO_CHAR(CURRENT_DATE, 'YYYY') || '-' || LPAD(nextval('petty_cash_settlement_seq')::TEXT, 6, '0');
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION generate_replenishment_code()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.replenishment_code IS NULL OR NEW.replenishment_code = '' THEN
        NEW.replenishment_code := 'FF-' || TO_CHAR(CURRENT_DATE, 'YYYY') || LPAD(nextval('petty_cash_replenishment_seq')::TEXT, 3, '0');
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION generate_audit_code()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.audit_code IS NULL OR NEW.audit_code = '' THEN
        NEW.audit_code := 'ARQ-' || TO_CHAR(CURRENT_DATE, 'YYYY') || '-' || LPAD(nextval('petty_cash_audit_seq')::TEXT, 3, '0');
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION generate_transfer_code()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.transfer_code IS NULL OR NEW.transfer_code = '' THEN
        NEW.transfer_code := 'TRF-' || TO_CHAR(CURRENT_DATE, 'YYYY') || '-' || LPAD(nextval('petty_cash_transfer_seq')::TEXT, 3, '0');
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 9. CREATE TRIGGERS
DROP TRIGGER IF EXISTS trigger_generate_fund_code ON petty_cash_funds;
CREATE TRIGGER trigger_generate_fund_code
    BEFORE INSERT ON petty_cash_funds
    FOR EACH ROW
    EXECUTE FUNCTION generate_fund_code();

DROP TRIGGER IF EXISTS trigger_generate_expense_code ON petty_cash_expenses;
CREATE TRIGGER trigger_generate_expense_code
    BEFORE INSERT ON petty_cash_expenses
    FOR EACH ROW
    EXECUTE FUNCTION generate_expense_code();

DROP TRIGGER IF EXISTS trigger_generate_settlement_code ON petty_cash_settlements;
CREATE TRIGGER trigger_generate_settlement_code
    BEFORE INSERT ON petty_cash_settlements
    FOR EACH ROW
    EXECUTE FUNCTION generate_settlement_code();

DROP TRIGGER IF EXISTS trigger_generate_replenishment_code ON petty_cash_replenishments;
CREATE TRIGGER trigger_generate_replenishment_code
    BEFORE INSERT ON petty_cash_replenishments
    FOR EACH ROW
    EXECUTE FUNCTION generate_replenishment_code();

DROP TRIGGER IF EXISTS trigger_generate_audit_code ON petty_cash_audits;
CREATE TRIGGER trigger_generate_audit_code
    BEFORE INSERT ON petty_cash_audits
    FOR EACH ROW
    EXECUTE FUNCTION generate_audit_code();

DROP TRIGGER IF EXISTS trigger_generate_transfer_code ON petty_cash_transfers;
CREATE TRIGGER trigger_generate_transfer_code
    BEFORE INSERT ON petty_cash_transfers
    FOR EACH ROW
    EXECUTE FUNCTION generate_transfer_code();

-- 10. CREATE FUNCTION TO UPDATE FUND BALANCE AFTER EXPENSE
CREATE OR REPLACE FUNCTION update_fund_balance_on_expense()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        -- Decrease fund balance when expense is created
        UPDATE petty_cash_funds
        SET current_balance = current_balance - NEW.amount,
            updated_at = NOW()
        WHERE id = NEW.fund_id;
    ELSIF TG_OP = 'UPDATE' THEN
        -- Adjust balance if amount changed
        UPDATE petty_cash_funds
        SET current_balance = current_balance + OLD.amount - NEW.amount,
            updated_at = NOW()
        WHERE id = NEW.fund_id;
    ELSIF TG_OP = 'DELETE' THEN
        -- Restore balance when expense is deleted
        UPDATE petty_cash_funds
        SET current_balance = current_balance + OLD.amount,
            updated_at = NOW()
        WHERE id = OLD.fund_id;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_fund_balance_on_expense ON petty_cash_expenses;
CREATE TRIGGER trigger_update_fund_balance_on_expense
    AFTER INSERT OR UPDATE OR DELETE ON petty_cash_expenses
    FOR EACH ROW
    EXECUTE FUNCTION update_fund_balance_on_expense();

-- 11. CREATE FUNCTION TO UPDATE FUND BALANCE AFTER REPLENISHMENT
CREATE OR REPLACE FUNCTION update_fund_balance_on_replenishment()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' AND NEW.status = 'CONFIRMED' THEN
        -- Increase fund balance when replenishment is confirmed
        UPDATE petty_cash_funds
        SET current_balance = current_balance + NEW.amount,
            updated_at = NOW()
        WHERE id = NEW.fund_id;
    ELSIF TG_OP = 'UPDATE' AND NEW.status = 'CONFIRMED' AND OLD.status != 'CONFIRMED' THEN
        -- Increase balance when status changes to CONFIRMED
        UPDATE petty_cash_funds
        SET current_balance = current_balance + NEW.amount,
            updated_at = NOW()
        WHERE id = NEW.fund_id;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_fund_balance_on_replenishment ON petty_cash_replenishments;
CREATE TRIGGER trigger_update_fund_balance_on_replenishment
    AFTER INSERT OR UPDATE ON petty_cash_replenishments
    FOR EACH ROW
    EXECUTE FUNCTION update_fund_balance_on_replenishment();

-- 12. GRANT PERMISSIONS (Adjust based on your Supabase RLS policies)
-- These are examples - adjust for your security model
-- ALTER TABLE petty_cash_funds ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE petty_cash_expenses ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE petty_cash_settlements ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE petty_cash_replenishments ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE petty_cash_audits ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE petty_cash_transfers ENABLE ROW LEVEL SECURITY;

COMMENT ON TABLE petty_cash_funds IS 'Fondos Fijos de Caja Chica - Monto asignado constante que se repone';
COMMENT ON TABLE petty_cash_expenses IS 'Gastos individuales de Caja Chica con comprobantes';
COMMENT ON TABLE petty_cash_settlements IS 'Liquidaciones de gastos para rendición de cuentas';
COMMENT ON TABLE petty_cash_replenishments IS 'Reposiciones del fondo fijo después de liquidación';
COMMENT ON TABLE petty_cash_audits IS 'Arqueos de verificación del efectivo físico';
COMMENT ON TABLE petty_cash_transfers IS 'Transferencias provisionales entre responsables';
