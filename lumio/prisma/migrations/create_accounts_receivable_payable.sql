-- Migration: Create Accounts Receivable and Payable System
-- Professional Loan Management with Partial Payments Support

-- ============================================
-- TABLE: accounts_receivable (Cuentas por Cobrar - Dinero que te deben)
-- ============================================
CREATE TABLE IF NOT EXISTS accounts_receivable (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

    -- Contact Information
    contact_name VARCHAR(255) NOT NULL,
    contact_email VARCHAR(255),
    contact_phone VARCHAR(50),

    -- Financial Details
    original_amount DECIMAL(15,2) NOT NULL CHECK (original_amount > 0),
    outstanding_balance DECIMAL(15,2) NOT NULL CHECK (outstanding_balance >= 0),
    currency_code VARCHAR(3) NOT NULL DEFAULT 'PEN',

    -- Status Management
    status VARCHAR(20) NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'PARTIAL', 'COLLECTED', 'OVERDUE', 'CANCELLED')),

    -- Dates
    loan_date TIMESTAMP NOT NULL DEFAULT NOW(),
    due_date DATE,
    collected_at TIMESTAMP,

    -- Additional Info
    notes TEXT,
    interest_rate DECIMAL(5,2) DEFAULT 0.00, -- For future interest calculations

    -- Linking
    linked_transaction_id UUID REFERENCES transactions(id) ON DELETE SET NULL,

    -- Metadata (JSON for flexibility)
    metadata JSONB DEFAULT '{}',

    -- Timestamps
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- ============================================
-- TABLE: accounts_payable (Cuentas por Pagar - Dinero que debes)
-- ============================================
CREATE TABLE IF NOT EXISTS accounts_payable (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

    -- Contact Information
    contact_name VARCHAR(255) NOT NULL,
    contact_email VARCHAR(255),
    contact_phone VARCHAR(50),

    -- Financial Details
    original_amount DECIMAL(15,2) NOT NULL CHECK (original_amount > 0),
    outstanding_balance DECIMAL(15,2) NOT NULL CHECK (outstanding_balance >= 0),
    currency_code VARCHAR(3) NOT NULL DEFAULT 'PEN',

    -- Status Management
    status VARCHAR(20) NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'PARTIAL', 'PAID', 'OVERDUE', 'CANCELLED')),

    -- Dates
    loan_date TIMESTAMP NOT NULL DEFAULT NOW(),
    due_date DATE,
    paid_at TIMESTAMP,

    -- Additional Info
    notes TEXT,
    interest_rate DECIMAL(5,2) DEFAULT 0.00,

    -- Linking
    linked_transaction_id UUID REFERENCES transactions(id) ON DELETE SET NULL,

    -- Metadata (JSON for flexibility)
    metadata JSONB DEFAULT '{}',

    -- Timestamps
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- ============================================
-- TABLE: loan_payments (Historial de Pagos Parciales)
-- ============================================
CREATE TABLE IF NOT EXISTS loan_payments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

    -- Link to Account (either receivable or payable)
    account_receivable_id UUID REFERENCES accounts_receivable(id) ON DELETE CASCADE,
    account_payable_id UUID REFERENCES accounts_payable(id) ON DELETE CASCADE,

    -- Payment Details
    amount DECIMAL(15,2) NOT NULL CHECK (amount > 0),
    currency_code VARCHAR(3) NOT NULL DEFAULT 'PEN',
    payment_date TIMESTAMP NOT NULL DEFAULT NOW(),

    -- Link to transaction that registered this payment
    transaction_id UUID REFERENCES transactions(id) ON DELETE SET NULL,

    -- Notes
    notes TEXT,
    payment_method VARCHAR(50), -- 'CASH', 'TRANSFER', 'CHECK', etc.

    -- Timestamps
    created_at TIMESTAMP DEFAULT NOW(),

    -- Constraint: Must belong to either receivable OR payable, not both
    CHECK (
        (account_receivable_id IS NOT NULL AND account_payable_id IS NULL) OR
        (account_receivable_id IS NULL AND account_payable_id IS NOT NULL)
    )
);

-- ============================================
-- INDEXES for Performance
-- ============================================
CREATE INDEX IF NOT EXISTS idx_accounts_receivable_user ON accounts_receivable(user_id);
CREATE INDEX IF NOT EXISTS idx_accounts_receivable_status ON accounts_receivable(status);
CREATE INDEX IF NOT EXISTS idx_accounts_receivable_due_date ON accounts_receivable(due_date);

CREATE INDEX IF NOT EXISTS idx_accounts_payable_user ON accounts_payable(user_id);
CREATE INDEX IF NOT EXISTS idx_accounts_payable_status ON accounts_payable(status);
CREATE INDEX IF NOT EXISTS idx_accounts_payable_due_date ON accounts_payable(due_date);

CREATE INDEX IF NOT EXISTS idx_loan_payments_receivable ON loan_payments(account_receivable_id);
CREATE INDEX IF NOT EXISTS idx_loan_payments_payable ON loan_payments(account_payable_id);
CREATE INDEX IF NOT EXISTS idx_loan_payments_user ON loan_payments(user_id);

-- ============================================
-- TRIGGERS for auto-update timestamps
-- ============================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_accounts_receivable_updated_at
    BEFORE UPDATE ON accounts_receivable
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_accounts_payable_updated_at
    BEFORE UPDATE ON accounts_payable
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- FUNCTIONS for automatic status updates
-- ============================================

-- Function to auto-update receivable status based on balance
CREATE OR REPLACE FUNCTION update_receivable_status()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.outstanding_balance = 0 THEN
        NEW.status = 'COLLECTED';
        NEW.collected_at = NOW();
    ELSIF NEW.outstanding_balance < NEW.original_amount AND NEW.outstanding_balance > 0 THEN
        NEW.status = 'PARTIAL';
    ELSIF NEW.due_date IS NOT NULL AND NEW.due_date < CURRENT_DATE AND NEW.outstanding_balance > 0 THEN
        NEW.status = 'OVERDUE';
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER auto_update_receivable_status
    BEFORE INSERT OR UPDATE ON accounts_receivable
    FOR EACH ROW
    EXECUTE FUNCTION update_receivable_status();

-- Function to auto-update payable status based on balance
CREATE OR REPLACE FUNCTION update_payable_status()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.outstanding_balance = 0 THEN
        NEW.status = 'PAID';
        NEW.paid_at = NOW();
    ELSIF NEW.outstanding_balance < NEW.original_amount AND NEW.outstanding_balance > 0 THEN
        NEW.status = 'PARTIAL';
    ELSIF NEW.due_date IS NOT NULL AND NEW.due_date < CURRENT_DATE AND NEW.outstanding_balance > 0 THEN
        NEW.status = 'OVERDUE';
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER auto_update_payable_status
    BEFORE INSERT OR UPDATE ON accounts_payable
    FOR EACH ROW
    EXECUTE FUNCTION update_payable_status();

-- ============================================
-- COMMENTS for documentation
-- ============================================
COMMENT ON TABLE accounts_receivable IS 'Cuentas por cobrar - Dinero que otros te deben';
COMMENT ON TABLE accounts_payable IS 'Cuentas por pagar - Dinero que tú debes a otros';
COMMENT ON TABLE loan_payments IS 'Historial de pagos parciales para préstamos';

COMMENT ON COLUMN accounts_receivable.outstanding_balance IS 'Saldo pendiente por cobrar (se actualiza con cada pago parcial)';
COMMENT ON COLUMN accounts_payable.outstanding_balance IS 'Saldo pendiente por pagar (se actualiza con cada pago parcial)';
