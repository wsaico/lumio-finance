-- Count transactions for User Deudas
SELECT count(*) as user_deudas_count 
FROM transactions 
WHERE category_id = 'fe143875-91af-4f60-85c1-e3ded605a4a2';

-- Count transactions for System Deudas
SELECT count(*) as system_deudas_count 
FROM transactions 
WHERE category_id = 'e1000000-0000-0000-0000-000000000015';
