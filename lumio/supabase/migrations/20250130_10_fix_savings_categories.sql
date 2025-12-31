-- Add 'budget_rule' column to expense_categories if it doesn't exist (safety check, though it likely does)
DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'expense_categories' AND column_name = 'budget_rule') THEN
        ALTER TABLE expense_categories ADD COLUMN budget_rule VARCHAR(20) DEFAULT 'WANT';
    END IF;
END $$;

-- 1. Insert 'Inversiones' as an Expense Category (System)
INSERT INTO expense_categories (id, user_id, name, icon, color, is_system, budget_rule)
VALUES ('e1000000-0000-4000-a000-000000000090', NULL, 'Inversiones', 'trending-up', '#059669', true, 'SAVINGS')
ON CONFLICT (id) DO UPDATE SET budget_rule = 'SAVINGS';

-- 2. Insert 'Ahorro' as an Expense Category (System)
INSERT INTO expense_categories (id, user_id, name, icon, color, is_system, budget_rule)
VALUES ('e1000000-0000-4000-a000-000000000091', NULL, 'Ahorro', 'piggy-bank', '#10b981', true, 'SAVINGS')
ON CONFLICT (id) DO UPDATE SET budget_rule = 'SAVINGS';

-- 3. Update 'Deudas' to be considered part of the Savings/Debt bucket (20%)
UPDATE expense_categories 
SET budget_rule = 'SAVINGS' 
WHERE name = 'Deudas' OR id = 'e1000000-0000-4000-a000-000000000015';

-- 4. Update 'Servicios Financieros' to NEED (usually fees/insurance are needs)
UPDATE expense_categories 
SET budget_rule = 'NEED' 
WHERE name = 'Servicios Financieros';

-- 5. Ensure core NEEDS are marked as such
UPDATE expense_categories SET budget_rule = 'NEED' WHERE name IN ('Vivienda', 'Alimentación y Bebidas', 'Salud y Medicina', 'Transporte', 'Educación', 'Impuestos/Multas');

-- 6. Ensure core WANTS are marked as such
UPDATE expense_categories SET budget_rule = 'WANT' WHERE name IN ('Entretenimiento', 'Viajes', 'Ropa y Calzado', 'Cuidado Personal', 'Tecnología', 'Mascotas', 'Regalos', 'Otros');
