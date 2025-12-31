-- Forcefully insert missing SAVINGS categories
INSERT INTO "public"."expense_categories" 
("id", "user_id", "name", "icon", "color", "is_system", "is_active", "sort_order", "budget_rule") 
VALUES 
('e1000000-0000-4000-a000-000000000090', NULL, 'Inversiones', 'trending-up', '#8b5cf6', true, true, 100, 'SAVINGS'),
('e1000000-0000-4000-a000-000000000091', NULL, 'Ahorro', 'piggy-bank', '#10b981', true, true, 101, 'SAVINGS')
ON CONFLICT ("id") DO UPDATE 
SET budget_rule = 'SAVINGS', is_active = true;

-- Ensure Deudas stays in NEED if that is what the user wants, OR revert it.
-- Based on user context "ahora no se muestra nada en 20%", they seem surprised it's empty.
-- But standard methodology puts Debt in Needs/Obligations usually, OR Savings if paying down.
-- Let's NOT touch Deudas for now to avoid yo-yoing, unless user explicitly asks.
-- The key is ensuring the OTHER two exist so the tab isn't empty.
