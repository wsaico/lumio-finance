-- Ensure 'Inversiones' and 'Ahorro' exist as SYSTEM categories
-- We use specific IDs to ensure consistency if run multiple times (on conflict do nothing)

INSERT INTO "public"."expense_categories" 
("id", "user_id", "name", "icon", "color", "is_system", "is_active", "sort_order", "budget_rule") 
VALUES 
('e1000000-0000-4000-a000-000000000090', NULL, 'Inversiones', 'trending-up', '#8b5cf6', true, true, 100, 'SAVINGS'),
('e1000000-0000-4000-a000-000000000091', NULL, 'Ahorro', 'piggy-bank', '#10b981', true, true, 101, 'SAVINGS')
ON CONFLICT ("id") DO UPDATE 
SET budget_rule = 'SAVINGS', is_active = true;

-- Also fix 'Deudas' to be SAVINGS
UPDATE "public"."expense_categories"
SET budget_rule = 'SAVINGS'
WHERE name = 'Deudas';

-- Create Subcategories for them if they don't exist
INSERT INTO "public"."subcategories" ("id", "expense_category_id", "name", "is_active")
VALUES
('s1000000-0000-4000-a000-000000000090', 'e1000000-0000-4000-a000-000000000090', 'Bolsa/Acciones', true),
('s1000000-0000-4000-a000-000000000091', 'e1000000-0000-4000-a000-000000000090', 'Fondos Mutuos', true),
('s1000000-0000-4000-a000-000000000092', 'e1000000-0000-4000-a000-000000000090', 'Cripto', true),
('s1000000-0000-4000-a000-000000000095', 'e1000000-0000-4000-a000-000000000091', 'Fondo de Emergencia', true),
('s1000000-0000-4000-a000-000000000096', 'e1000000-0000-4000-a000-000000000091', 'Ahorro General', true)
ON CONFLICT DO NOTHING;
