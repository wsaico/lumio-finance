-- Add exchange_rates table
CREATE TABLE IF NOT EXISTS exchange_rates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    from_currency VARCHAR(3) NOT NULL,
    to_currency VARCHAR(3) NOT NULL,
    rate DECIMAL(10, 6) NOT NULL CHECK (rate > 0),
    source VARCHAR(50) DEFAULT 'MANUAL',
    effective_date TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(from_currency, to_currency, effective_date)
);

CREATE INDEX IF NOT EXISTS idx_exchange_rates_effective_date ON exchange_rates(effective_date DESC);
CREATE INDEX IF NOT EXISTS idx_exchange_rates_currencies ON exchange_rates(from_currency, to_currency);

-- Add base_currency to profiles
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS base_currency VARCHAR(3) DEFAULT 'PEN';

-- Insert default exchange rates (user can update these)
INSERT INTO exchange_rates (from_currency, to_currency, rate, source, effective_date)
VALUES 
    ('USD', 'PEN', 3.750000, 'MANUAL', NOW()),
    ('EUR', 'PEN', 4.100000, 'MANUAL', NOW()),
    ('MXN', 'PEN', 0.210000, 'MANUAL', NOW()),
    ('COP', 'PEN', 0.000950, 'MANUAL', NOW()),
    ('ARS', 'PEN', 0.003800, 'MANUAL', NOW()),
    ('CLP', 'PEN', 0.004200, 'MANUAL', NOW()),
    ('BRL', 'PEN', 0.750000, 'MANUAL', NOW())
ON CONFLICT (from_currency, to_currency, effective_date) DO NOTHING;

-- Add trigger to update updated_at
CREATE OR REPLACE FUNCTION update_exchange_rates_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER exchange_rates_updated_at
    BEFORE UPDATE ON exchange_rates
    FOR EACH ROW
    EXECUTE FUNCTION update_exchange_rates_updated_at();

COMMENT ON TABLE exchange_rates IS 'Exchange rates for multi-currency conversion';
COMMENT ON COLUMN exchange_rates.rate IS 'Conversion rate: 1 from_currency = rate * to_currency';
COMMENT ON COLUMN exchange_rates.source IS 'Source of rate: MANUAL, SUNAT, API';
