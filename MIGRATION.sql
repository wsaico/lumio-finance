-- ============================================
-- LUMIO FINANCE - MIGRATION SQL
-- Ejecutar en Supabase SQL Editor
-- ============================================

-- 1. AGREGAR CAMPO dashboardConfig A profiles
ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS dashboard_config JSONB DEFAULT NULL;

-- 2. CREAR TABLA CategoryLearning (Smart Categorization)
CREATE TABLE IF NOT EXISTS category_learning (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
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

-- 3. ACTUALIZAR TABLA budgets (Flexible Budgets)
ALTER TABLE budgets
ADD COLUMN IF NOT EXISTS period_type VARCHAR(20) DEFAULT 'MONTHLY'
    CHECK (period_type IN ('DAILY', 'WEEKLY', 'MONTHLY', 'QUARTERLY', 'YEARLY', 'CUSTOM'));

ALTER TABLE budgets
ADD COLUMN IF NOT EXISTS start_date TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP;

ALTER TABLE budgets
ADD COLUMN IF NOT EXISTS end_date TIMESTAMPTZ DEFAULT (CURRENT_TIMESTAMP + INTERVAL '1 month');

ALTER TABLE budgets
ADD COLUMN IF NOT EXISTS rollover BOOLEAN DEFAULT FALSE;

ALTER TABLE budgets
ADD COLUMN IF NOT EXISTS notify_at DECIMAL(5, 2) DEFAULT 80.0
    CHECK (notify_at >= 0 AND notify_at <= 100);

ALTER TABLE budgets
ADD COLUMN IF NOT EXISTS category_limits JSONB DEFAULT NULL;

ALTER TABLE budgets
ADD COLUMN IF NOT EXISTS is_pinned BOOLEAN DEFAULT FALSE;

ALTER TABLE budgets
ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT TRUE;

-- 4. CREAR TABLA currencies (Multi-Currency Support)
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

-- 5. CREAR TABLA exchange_rates (Tasas de Cambio)
CREATE TABLE IF NOT EXISTS exchange_rates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    from_currency VARCHAR(3) NOT NULL,
    to_currency VARCHAR(3) NOT NULL,
    rate DECIMAL(18, 8) NOT NULL,
    date TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),

    UNIQUE(from_currency, to_currency, date)
);

-- Índices para exchange_rates
CREATE INDEX IF NOT EXISTS idx_exchange_rates_currencies
ON exchange_rates(from_currency, to_currency);

CREATE INDEX IF NOT EXISTS idx_exchange_rates_date
ON exchange_rates(date DESC);

-- 6. AGREGAR CAMPOS DE MULTI-CURRENCY A transactions
ALTER TABLE transactions
ADD COLUMN IF NOT EXISTS original_amount DECIMAL(15, 2) DEFAULT NULL;

ALTER TABLE transactions
ADD COLUMN IF NOT EXISTS original_currency VARCHAR(3) DEFAULT NULL;

ALTER TABLE transactions
ADD COLUMN IF NOT EXISTS exchange_rate DECIMAL(18, 8) DEFAULT NULL;

-- 7. HABILITAR RLS (Row Level Security) para nuevas tablas
ALTER TABLE category_learning ENABLE ROW LEVEL SECURITY;
ALTER TABLE currencies ENABLE ROW LEVEL SECURITY;
ALTER TABLE exchange_rates ENABLE ROW LEVEL SECURITY;

-- Políticas RLS para category_learning
CREATE POLICY "Users can view their own category learning"
ON category_learning FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own category learning"
ON category_learning FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own category learning"
ON category_learning FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own category learning"
ON category_learning FOR DELETE
USING (auth.uid() = user_id);

-- Políticas RLS para currencies (público)
CREATE POLICY "Anyone can view currencies"
ON currencies FOR SELECT
TO authenticated
USING (true);

-- Políticas RLS para exchange_rates (público)
CREATE POLICY "Anyone can view exchange rates"
ON exchange_rates FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Authenticated users can insert exchange rates"
ON exchange_rates FOR INSERT
TO authenticated
WITH CHECK (true);

-- 8. FUNCIÓN para limpiar category_learning antiguos (opcional - ejecutar periódicamente)
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

-- Aplicar trigger a las nuevas tablas
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
-- VERIFICACIÓN - Ejecuta esto para confirmar
-- ============================================

-- Ver todas las tablas creadas
SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'public'
    AND table_name IN ('category_learning', 'currencies', 'exchange_rates')
ORDER BY table_name;

-- Ver columnas agregadas a budgets
SELECT column_name, data_type, column_default
FROM information_schema.columns
WHERE table_name = 'budgets'
    AND column_name IN ('period_type', 'start_date', 'end_date', 'rollover', 'notify_at', 'category_limits', 'is_pinned', 'is_active')
ORDER BY column_name;

-- Ver columnas agregadas a transactions
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'transactions'
    AND column_name IN ('original_amount', 'original_currency', 'exchange_rate')
ORDER BY column_name;

-- Ver columna agregada a profiles
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'profiles'
    AND column_name = 'dashboard_config';

-- Contar monedas insertadas
SELECT COUNT(*) as currency_count FROM currencies;

-- ============================================
-- NOTAS IMPORTANTES
-- ============================================
-- 1. Ejecuta todo este SQL en el SQL Editor de Supabase
-- 2. Si alguna tabla/columna ya existe, el IF NOT EXISTS evitará errores
-- 3. Las políticas RLS garantizan seguridad a nivel de fila
-- 4. Los índices mejoran el performance de las consultas
-- 5. Los triggers mantienen updated_at actualizado automáticamente
