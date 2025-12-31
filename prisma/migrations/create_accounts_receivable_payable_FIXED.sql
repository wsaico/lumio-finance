-- Migration: Create Accounts Receivable and Payable System
-- Professional Loan Management with Partial Payments Support
-- VERSIÓN CORREGIDA - SIN ERRORES

-- ============================================
-- DROP EXISTING TABLES (if any)
-- ============================================
DROP TABLE IF EXISTS loan_payments CASCADE;
DROP TABLE IF EXISTS accounts_receivable CASCADE;
DROP TABLE IF EXISTS accounts_payable CASCADE;

-- ============================================
-- TABLE: accounts_receivable
-- ============================================
CREATE TABLE accounts_receivable (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    contact_name VARCHAR(255) NOT NULL,
    contact_email VARCHAR(255),
    contact_phone VARCHAR(50),
    original_amount DECIMAL(15,2) NOT NULL CHECK (original_amount > 0),
    outstanding_balance DECIMAL(15,2) NOT NULL CHECK (outstanding_balance >= 0),
    currency_code VARCHAR(3) NOT NULL DEFAULT 'PEN',
    status VARCHAR(20) NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'PARTIAL', 'COLLECTED', 'OVERDUE', 'CANCELLED')),
    loan_date TIMESTAMP NOT NULL DEFAULT NOW(),
    due_date DATE,
    collected_at TIMESTAMP,
    notes TEXT,
    interest_rate DECIMAL(5,2) DEFAULT 0.00,
    linked_transaction_id UUID,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- ============================================
-- TABLE: accounts_payable
-- ============================================
CREATE TABLE accounts_payable (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    contact_name VARCHAR(255) NOT NULL,
    contact_email VARCHAR(255),
    contact_phone VARCHAR(50),
    original_amount DECIMAL(15,2) NOT NULL CHECK (original_amount > 0),
    outstanding_balance DECIMAL(15,2) NOT NULL CHECK (outstanding_balance >= 0),
    currency_code VARCHAR(3) NOT NULL DEFAULT 'PEN',
    status VARCHAR(20) NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'PARTIAL', 'PAID', 'OVERDUE', 'CANCELLED')),
    loan_date TIMESTAMP NOT NULL DEFAULT NOW(),
    due_date DATE,
    paid_at TIMESTAMP,
    notes TEXT,
    interest_rate DECIMAL(5,2) DEFAULT 0.00,
    linked_transaction_id UUID,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- ============================================
-- TABLE: loan_payments
-- ============================================
CREATE TABLE loan_payments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    account_receivable_id UUID,
    account_payable_id UUID,
    amount DECIMAL(15,2) NOT NULL CHECK (amount > 0),
    currency_code VARCHAR(3) NOT NULL DEFAULT 'PEN',
    payment_date TIMESTAMP NOT NULL DEFAULT NOW(),
    transaction_id UUID,
    notes TEXT,
    payment_method VARCHAR(50),
    created_at TIMESTAMP DEFAULT NOW(),
    CHECK (
        (account_receivable_id IS NOT NULL AND account_payable_id IS NULL) OR
        (account_receivable_id IS NULL AND account_payable_id IS NOT NULL)
    )
);

-- ============================================
-- ADD FOREIGN KEYS (después de crear todas las tablas)
-- ============================================
ALTER TABLE accounts_receivable ADD CONSTRAINT fk_receivable_user FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
ALTER TABLE accounts_receivable ADD CONSTRAINT fk_receivable_transaction FOREIGN KEY (linked_transaction_id) REFERENCES transactions(id) ON DELETE SET NULL;

ALTER TABLE accounts_payable ADD CONSTRAINT fk_payable_user FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
ALTER TABLE accounts_payable ADD CONSTRAINT fk_payable_transaction FOREIGN KEY (linked_transaction_id) REFERENCES transactions(id) ON DELETE SET NULL;

ALTER TABLE loan_payments ADD CONSTRAINT fk_payment_user FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
ALTER TABLE loan_payments ADD CONSTRAINT fk_payment_receivable FOREIGN KEY (account_receivable_id) REFERENCES accounts_receivable(id) ON DELETE CASCADE;
ALTER TABLE loan_payments ADD CONSTRAINT fk_payment_payable FOREIGN KEY (account_payable_id) REFERENCES accounts_payable(id) ON DELETE CASCADE;
ALTER TABLE loan_payments ADD CONSTRAINT fk_payment_transaction FOREIGN KEY (transaction_id) REFERENCES transactions(id) ON DELETE SET NULL;

-- ============================================
-- INDEXES
-- ============================================
CREATE INDEX idx_accounts_receivable_user ON accounts_receivable(user_id);
CREATE INDEX idx_accounts_receivable_status ON accounts_receivable(status);
CREATE INDEX idx_accounts_receivable_due_date ON accounts_receivable(due_date);

CREATE INDEX idx_accounts_payable_user ON accounts_payable(user_id);
CREATE INDEX idx_accounts_payable_status ON accounts_payable(status);
CREATE INDEX idx_accounts_payable_due_date ON accounts_payable(due_date);

CREATE INDEX idx_loan_payments_receivable ON loan_payments(account_receivable_id);
CREATE INDEX idx_loan_payments_payable ON loan_payments(account_payable_id);
CREATE INDEX idx_loan_payments_user ON loan_payments(user_id);

-- ============================================
-- FUNCTION: Update timestamp
-- ============================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- TRIGGERS: Auto-update timestamps
-- ============================================
CREATE TRIGGER trg_accounts_receivable_updated_at
    BEFORE UPDATE ON accounts_receivable
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trg_accounts_payable_updated_at
    BEFORE UPDATE ON accounts_payable
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- FUNCTION: Auto-update receivable status
-- ============================================
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

-- ============================================
-- FUNCTION: Auto-update payable status
-- ============================================
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

-- ============================================
-- TRIGGERS: Auto-update status
-- ============================================
CREATE TRIGGER trg_receivable_status
    BEFORE INSERT OR UPDATE ON accounts_receivable
    FOR EACH ROW
    EXECUTE FUNCTION update_receivable_status();

CREATE TRIGGER trg_payable_status
    BEFORE INSERT OR UPDATE ON accounts_payable
    FOR EACH ROW
    EXECUTE FUNCTION update_payable_status();

-- ============================================
-- COMMENTS
-- ============================================
COMMENT ON TABLE accounts_receivable IS 'Cuentas por cobrar - Dinero que otros te deben';
COMMENT ON TABLE accounts_payable IS 'Cuentas por pagar - Dinero que tú debes';
COMMENT ON TABLE loan_payments IS 'Historial de pagos parciales';
