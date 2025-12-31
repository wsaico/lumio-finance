-- ============================================
-- RADIOGRAFÍA DE LA BASE DE DATOS
-- ============================================

-- 1. COLUMNAS DE EXPENSE_CATEGORIES
SELECT 'EXPENSE_CATEGORIES SCHEMA' as info;
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_name = 'expense_categories'
ORDER BY ordinal_position;

-- 2. COLUMNAS DE INCOME_CATEGORIES
SELECT 'INCOME_CATEGORIES SCHEMA' as info;
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_name = 'income_categories'
ORDER BY ordinal_position;

-- 3. COLUMNAS DE TRANSACTIONS (relevantes)
SELECT 'TRANSACTIONS SCHEMA' as info;
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_name = 'transactions'
  AND column_name IN ('id', 'user_id', 'expense_category_id', 'income_category_id', 'transaction_type')
ORDER BY ordinal_position;

-- 4. FOREIGN KEYS DE TRANSACTIONS
SELECT 'FOREIGN KEYS' as info;
SELECT
    tc.constraint_name,
    kcu.column_name,
    ccu.table_name AS foreign_table,
    ccu.column_name AS foreign_column
FROM information_schema.table_constraints AS tc
JOIN information_schema.key_column_usage AS kcu
    ON tc.constraint_name = kcu.constraint_name
JOIN information_schema.constraint_column_usage AS ccu
    ON ccu.constraint_name = tc.constraint_name
WHERE tc.constraint_type = 'FOREIGN KEY'
    AND tc.table_name = 'transactions'
    AND kcu.column_name IN ('expense_category_id', 'income_category_id');

-- 5. CONTEO DE REGISTROS
SELECT 'CONTEO' as info;
SELECT
    (SELECT COUNT(*) FROM expense_categories) as expense_cats,
    (SELECT COUNT(*) FROM income_categories) as income_cats,
    (SELECT COUNT(*) FROM transactions) as transactions;

-- 6. EXPENSE CATEGORIES EXISTENTES
SELECT 'EXPENSE CATEGORIES SAMPLE' as info;
SELECT id, user_id, name, icon, is_active, sort_order
FROM expense_categories
LIMIT 10;

-- 7. INCOME CATEGORIES EXISTENTES
SELECT 'INCOME CATEGORIES SAMPLE' as info;
SELECT id, user_id, name, icon, is_active, sort_order
FROM income_categories
LIMIT 10;

-- 8. ÚLTIMAS TRANSACCIONES
SELECT 'TRANSACTIONS SAMPLE' as info;
SELECT id, user_id, transaction_type, expense_category_id, income_category_id, amount
FROM transactions
ORDER BY created_at DESC
LIMIT 5;
