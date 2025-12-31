-- ============================================
-- LUMIO FINANCE - MIGRATION SQL (FINAL)
-- Ejecutar en Supabase SQL Editor
-- ============================================

-- 1. CREAR TABLA CategoryLearning (Smart Categorization)
CREATE TABLE IF NOT EXISTS category_learning (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    keyword VARCHAR(200) NOT NULL,
    category_id UUID NOT NULL REFERENCES expense_categories(id) ON DELETE CASCADE,
    confidence DECIMAL(3, 2) DEFAULT 1.0 CHECK (confidence >= 0 AND confidence <= 1),
    times_used INTEGER DEFAULT 1,
    last_used_at TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),

    UNIQUE(user_id, keyword, category_id)
);

-- Índices para CategoryLearning
CREATE INDEX IF NOT EXISTS idx_category_learning_user_keyword
ON category_learning(user_id, keyword);

CREATE INDEX IF NOT EXISTS idx_category_learning_confidence
ON category_learning(confidence DESC);

-- 2. CREAR TABLA currencies (Multi-Currency Support)
CREATE TABLE IF NOT EXISTS currencies (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code VARCHAR(3) UNIQUE NOT NULL,
    name VARCHAR(100) NOT NULL,
    symbol VARCHAR(10) NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Insertar monedas comunes
INSERT INTO currencies (code, name, symbol) VALUES
    ('USD', 'US Dollar', '$'),
    ('EUR', 'Euro', '€'),
    ('GBP', 'British Pound', '£'),
    ('JPY', 'Japanese Yen', '¥'),
    ('CAD', 'Canadian Dollar', 'C$'),
    ('AUD', 'Australian Dollar', 'A$'),
    ('CHF', 'Swiss Franc', 'CHF'),
    ('CNY', 'Chinese Yuan', '¥'),
    ('MXN', 'Mexican Peso', 'MX$'),
    ('BRL', 'Brazilian Real', 'R$'),
    ('ARS', 'Argentine Peso', 'AR$'),
    ('COP', 'Colombian Peso', 'COL$'),
    ('CLP', 'Chilean Peso', 'CLP$'),
    ('PEN', 'Peruvian Sol', 'S/')
ON CONFLICT (code) DO NOTHING;

-- 3. CREAR TABLA exchange_rates (Tasas de Cambio)
CREATE TABLE IF NOT EXISTS exchange_rates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    from_currency VARCHAR(3) NOT NULL,
    to_currency VARCHAR(3) NOT NULL,
    rate DECIMAL(18, 8) NOT NULL,
    exchange_date TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),

    UNIQUE(from_currency, to_currency, exchange_date)
);

-- Índices para exchange_rates
CREATE INDEX IF NOT EXISTS idx_exchange_rates_currencies
ON exchange_rates(from_currency, to_currency);

CREATE INDEX IF NOT EXISTS idx_exchange_rates_exchange_date
ON exchange_rates(exchange_date DESC);

-- 4. HABILITAR RLS (Row Level Security) para nuevas tablas
ALTER TABLE category_learning ENABLE ROW LEVEL SECURITY;
ALTER TABLE currencies ENABLE ROW LEVEL SECURITY;
ALTER TABLE exchange_rates ENABLE ROW LEVEL SECURITY;

-- 5. Políticas RLS para category_learning
DROP POLICY IF EXISTS "Users can view their own category learning" ON category_learning;
CREATE POLICY "Users can view their own category learning"
ON category_learning FOR SELECT
USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert their own category learning" ON category_learning;
CREATE POLICY "Users can insert their own category learning"
ON category_learning FOR INSERT
WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update their own category learning" ON category_learning;
CREATE POLICY "Users can update their own category learning"
ON category_learning FOR UPDATE
USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete their own category learning" ON category_learning;
CREATE POLICY "Users can delete their own category learning"
ON category_learning FOR DELETE
USING (auth.uid() = user_id);

-- 6. Políticas RLS para currencies (público)
DROP POLICY IF EXISTS "Anyone can view currencies" ON currencies;
CREATE POLICY "Anyone can view currencies"
ON currencies FOR SELECT
TO authenticated
USING (true);

-- 7. Políticas RLS para exchange_rates (público)
DROP POLICY IF EXISTS "Anyone can view exchange rates" ON exchange_rates;
CREATE POLICY "Anyone can view exchange rates"
ON exchange_rates FOR SELECT
TO authenticated
USING (true);

DROP POLICY IF EXISTS "Authenticated users can insert exchange rates" ON exchange_rates;
CREATE POLICY "Authenticated users can insert exchange rates"
ON exchange_rates FOR INSERT
TO authenticated
WITH CHECK (true);

-- 8. FUNCIÓN para limpiar category_learning antiguos (opcional)
CREATE OR REPLACE FUNCTION cleanup_old_category_learning()
RETURNS INTEGER AS $$
DECLARE
    deleted_count INTEGER;
BEGIN
    DELETE FROM category_learning
    WHERE confidence < 0.3
        AND times_used < 3
        AND last_used_at < NOW() - INTERVAL '180 days';

    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

-- 9. FUNCIÓN trigger para actualizar updated_at automáticamente
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Aplicar triggers
DROP TRIGGER IF EXISTS update_category_learning_updated_at ON category_learning;
CREATE TRIGGER update_category_learning_updated_at
    BEFORE UPDATE ON category_learning
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_currencies_updated_at ON currencies;
CREATE TRIGGER update_currencies_updated_at
    BEFORE UPDATE ON currencies
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_exchange_rates_updated_at ON exchange_rates;
CREATE TRIGGER update_exchange_rates_updated_at
    BEFORE UPDATE ON exchange_rates
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- VERIFICACIÓN
-- ============================================

-- Ver tablas creadas
SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'public'
    AND table_name IN ('category_learning', 'currencies', 'exchange_rates')
ORDER BY table_name;

-- Contar monedas
SELECT COUNT(*) as total_currencies FROM currencies;

-- Ver monedas insertadas
SELECT code, name, symbol FROM currencies ORDER BY code;
