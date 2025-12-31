-- EJECUTA CADA QUERY POR SEPARADO EN SUPABASE

-- Query 1: Schema de expense_categories
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_name = 'expense_categories'
ORDER BY ordinal_position;

-- Query 2: Schema de income_categories
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_name = 'income_categories'
ORDER BY ordinal_position;

-- Query 3: Foreign keys
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

-- Query 4: Conteo
SELECT
    (SELECT COUNT(*) FROM expense_categories) as expense_cats,
    (SELECT COUNT(*) FROM income_categories) as income_cats,
    (SELECT COUNT(*) FROM transactions) as transactions;

-- Query 5: Muestra de expense_categories
SELECT id, user_id, name, icon, is_active, sort_order
FROM expense_categories
LIMIT 10;
