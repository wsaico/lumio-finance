-- ⚠️ WARNING: THIS SCRIPT WILL WIPE ALL TRANSACTIONS AND CATEGORIES AND RESET THEM ⚠️
-- EXECUTE IN SUPABASE SQL EDITOR

-- 1. CLEANUP (Wipe everything to ensure no duplicates)
ALTER TABLE "public"."subcategories" ADD COLUMN IF NOT EXISTS "icon" TEXT;
TRUNCATE TABLE "public"."transactions" CASCADE;
TRUNCATE TABLE "public"."subcategories" CASCADE;
TRUNCATE TABLE "public"."expense_categories" CASCADE;
TRUNCATE TABLE "public"."income_categories" CASCADE;

-- 2. INSERT 10 PARENT EXPENSE CATEGORIES (Active System Defaults)
INSERT INTO "public"."expense_categories" ("id", "user_id", "name", "icon", "color", "is_system", "is_active", "sort_order", "created_at", "budget_rule") VALUES 
('e1000000-0000-4000-a000-000000000001', null, 'Comida y bebidas', 'utensils', '#ef4444', true, true, 100, NOW(), 'NEED'),
('e1000000-0000-4000-a000-000000000002', null, 'Compras', 'shopping-cart', '#06b6d4', true, true, 100, NOW(), 'WANT'),
('e1000000-0000-4000-a000-000000000003', null, 'Vivienda', 'home', '#f59e0b', true, true, 100, NOW(), 'NEED'),
('e1000000-0000-4000-a000-000000000004', null, 'Transporte', 'bus', '#6b7280', true, true, 100, NOW(), 'NEED'),
('e1000000-0000-4000-a000-000000000005', null, 'Vehículo', 'car', '#a855f7', true, true, 100, NOW(), 'NEED'),
('e1000000-0000-4000-a000-000000000006', null, 'Vida y entretenimiento', 'film', '#22c55e', true, true, 100, NOW(), 'WANT'),
('e1000000-0000-4000-a000-000000000007', null, 'Comunicación, PC', 'smartphone', '#3b82f6', true, true, 100, NOW(), 'NEED'),
('e1000000-0000-4000-a000-000000000008', null, 'Gastos financieros', 'dollar-sign', '#14b8a6', true, true, 100, NOW(), 'NEED'),
('e1000000-0000-4000-a000-000000000009', null, 'Inversiones', 'trending-up', '#ec4899', true, true, 100, NOW(), 'SAVINGS'),
('e1000000-0000-4000-a000-000000000010', null, 'Otros', 'more-horizontal', '#9ca3af', true, true, 100, NOW(), 'WANT');

-- 3. INSERT 1 PARENT INCOME CATEGORY (The 11th Category)
INSERT INTO "public"."income_categories" ("id", "user_id", "name", "icon", "color", "is_system", "is_active", "sort_order", "created_at") VALUES 
('b1000000-0000-4000-a000-000000000001', null, 'Ingresos', 'dollar-sign', '#eab308', true, true, 0, NOW());

-- 4. INSERT SUBCATEGORIES (UNIQUE LIST)
-- 4. INSERT SUBCATEGORIES (UNIQUE LIST)
INSERT INTO "public"."subcategories" ("id", "expense_category_id", "income_category_id", "name", "icon", "is_active", "created_at") VALUES 
-- Income Subcategories
('f1000000-0000-4000-a000-000000000001', null, 'b1000000-0000-4000-a000-000000000001', 'Salario', 'briefcase', true, NOW()),
('f1000000-0000-4000-a000-000000000002', null, 'b1000000-0000-4000-a000-000000000001', 'Bonos', 'award', true, NOW()),
('f1000000-0000-4000-a000-000000000003', null, 'b1000000-0000-4000-a000-000000000001', 'Freelance', 'users', true, NOW()),
('f1000000-0000-4000-a000-000000000004', null, 'b1000000-0000-4000-a000-000000000001', 'Inversiones', 'trending-up', true, NOW()),
('f1000000-0000-4000-a000-000000000005', null, 'b1000000-0000-4000-a000-000000000001', 'Otros ingresos', 'dollar-sign', true, NOW()),

-- Expense Subcategories
-- Comida y bebidas
('a1000000-0000-4000-a000-000000000001', 'e1000000-0000-4000-a000-000000000001', null, 'Restaurantes', 'utensils', true, NOW()),
('a1000000-0000-4000-a000-000000000002', 'e1000000-0000-4000-a000-000000000001', null, 'Supermercado', 'shopping-bag', true, NOW()),
('a1000000-0000-4000-a000-000000000003', 'e1000000-0000-4000-a000-000000000001', null, 'Bar/Café', 'coffee', true, NOW()),
('a1000000-0000-4000-a000-000000000004', 'e1000000-0000-4000-a000-000000000001', null, 'Comida rápida', 'pizza', true, NOW()),
('a1000000-0000-4000-a000-000000000005', 'e1000000-0000-4000-a000-000000000001', null, 'Delivery', 'truck', true, NOW()),

-- Compras
('a1000000-0000-4000-a000-000000000006', 'e1000000-0000-4000-a000-000000000002', null, 'Ropa y calzado', 'shirt', true, NOW()),
('a1000000-0000-4000-a000-000000000007', 'e1000000-0000-4000-a000-000000000002', null, 'Electrónica', 'zap', true, NOW()),
('a1000000-0000-4000-a000-000000000008', 'e1000000-0000-4000-a000-000000000002', null, 'Farmacia', 'heart', true, NOW()),
('a1000000-0000-4000-a000-000000000009', 'e1000000-0000-4000-a000-000000000002', null, 'Libros', 'book-open', true, NOW()),
('a1000000-0000-4000-a000-000000000010', 'e1000000-0000-4000-a000-000000000002', null, 'Regalos', 'gift', true, NOW()),
('a1000000-0000-4000-a000-000000000011', 'e1000000-0000-4000-a000-000000000002', null, 'Decoración', 'paintbrush', true, NOW()),

-- Vivienda
('a1000000-0000-4000-a000-000000000012', 'e1000000-0000-4000-a000-000000000003', null, 'Alquiler', 'key', true, NOW()),
('a1000000-0000-4000-a000-000000000013', 'e1000000-0000-4000-a000-000000000003', null, 'Hipoteca', 'home', true, NOW()),
('a1000000-0000-4000-a000-000000000014', 'e1000000-0000-4000-a000-000000000003', null, 'Servicios básicos', 'zap', true, NOW()),
('a1000000-0000-4000-a000-000000000015', 'e1000000-0000-4000-a000-000000000003', null, 'Mantenimiento', 'wrench', true, NOW()),
('a1000000-0000-4000-a000-000000000016', 'e1000000-0000-4000-a000-000000000003', null, 'Seguros de hogar', 'shield', true, NOW()),

-- Transporte
('a1000000-0000-4000-a000-000000000017', 'e1000000-0000-4000-a000-000000000004', null, 'Transporte público', 'bus', true, NOW()),
('a1000000-0000-4000-a000-000000000018', 'e1000000-0000-4000-a000-000000000004', null, 'Taxi/Uber', 'car', true, NOW()),
('a1000000-0000-4000-a000-000000000019', 'e1000000-0000-4000-a000-000000000004', null, 'Combustible', 'fuel', true, NOW()),
('a1000000-0000-4000-a000-000000000020', 'e1000000-0000-4000-a000-000000000004', null, 'Estacionamiento', 'circle-parking', true, NOW()),
('a1000000-0000-4000-a000-000000000021', 'e1000000-0000-4000-a000-000000000004', null, 'Peajes', 'circle-dollar-sign', true, NOW()),

-- Vehiculo
('a1000000-0000-4000-a000-000000000022', 'e1000000-0000-4000-a000-000000000005', null, 'Cuota del vehículo', 'credit-card', true, NOW()),
('a1000000-0000-4000-a000-000000000023', 'e1000000-0000-4000-a000-000000000005', null, 'Seguro del vehículo', 'shield', true, NOW()),
('a1000000-0000-4000-a000-000000000024', 'e1000000-0000-4000-a000-000000000005', null, 'Mantenimiento', 'wrench', true, NOW()),
('a1000000-0000-4000-a000-000000000025', 'e1000000-0000-4000-a000-000000000005', null, 'Reparaciones', 'wrench', true, NOW()),
('a1000000-0000-4000-a000-000000000026', 'e1000000-0000-4000-a000-000000000005', null, 'Impuestos vehiculares', 'file-text', true, NOW()),

-- Vida y ent.
('a1000000-0000-4000-a000-000000000027', 'e1000000-0000-4000-a000-000000000006', null, 'Lotería, juegos de azar', 'ticket', true, NOW()),
('a1000000-0000-4000-a000-000000000028', 'e1000000-0000-4000-a000-000000000006', null, 'Alcohol, tabaco', 'coffee', true, NOW()),
('a1000000-0000-4000-a000-000000000029', 'e1000000-0000-4000-a000-000000000006', null, 'Caridad, regalos', 'gift', true, NOW()),
('a1000000-0000-4000-a000-000000000030', 'e1000000-0000-4000-a000-000000000006', null, 'Vacaciones, viajes, hoteles', 'plane', true, NOW()),
('a1000000-0000-4000-a000-000000000031', 'e1000000-0000-4000-a000-000000000006', null, 'TV, Streaming', 'tv', true, NOW()),
('a1000000-0000-4000-a000-000000000032', 'e1000000-0000-4000-a000-000000000006', null, 'Libros, audio, suscripciones', 'book-open', true, NOW()),
('a1000000-0000-4000-a000-000000000033', 'e1000000-0000-4000-a000-000000000006', null, 'Deportes', 'dumbbell', true, NOW()),
('a1000000-0000-4000-a000-000000000034', 'e1000000-0000-4000-a000-000000000006', null, 'Cine y teatro', 'ticket', true, NOW()),
('a1000000-0000-4000-a000-000000000035', 'e1000000-0000-4000-a000-000000000006', null, 'Hobbies', 'camera', true, NOW()),
('a1000000-0000-4000-a000-000000000036', 'e1000000-0000-4000-a000-000000000006', null, 'Eventos', 'music', true, NOW()),

-- COMUNICACION PC
('a1000000-0000-4000-a000-000000000037', 'e1000000-0000-4000-a000-000000000007', null, 'Internet', 'wifi', true, NOW()),
('a1000000-0000-4000-a000-000000000038', 'e1000000-0000-4000-a000-000000000007', null, 'Teléfono móvil', 'phone', true, NOW()),
('a1000000-0000-4000-a000-000000000039', 'e1000000-0000-4000-a000-000000000007', null, 'TV por cable', 'tv', true, NOW()),
('a1000000-0000-4000-a000-000000000040', 'e1000000-0000-4000-a000-000000000007', null, 'Software', 'monitor', true, NOW()),
('a1000000-0000-4000-a000-000000000041', 'e1000000-0000-4000-a000-000000000007', null, 'Hardware', 'hard-drive', true, NOW()),

-- GASTOS FINANCIEROS
('a1000000-0000-4000-a000-000000000042', 'e1000000-0000-4000-a000-000000000008', null, 'Comisiones bancarias', 'percent', true, NOW()),
('a1000000-0000-4000-a000-000000000043', 'e1000000-0000-4000-a000-000000000008', null, 'Intereses', 'trending-down', true, NOW()),
('a1000000-0000-4000-a000-000000000044', 'e1000000-0000-4000-a000-000000000008', null, 'Tarjetas de crédito', 'credit-card', true, NOW()),
('a1000000-0000-4000-a000-000000000045', 'e1000000-0000-4000-a000-000000000008', null, 'Préstamos', 'landmark', true, NOW()),
('a1000000-0000-4000-a000-000000000046', 'e1000000-0000-4000-a000-000000000008', null, 'Impuestos', 'file-text', true, NOW()),

-- INVERSIONES
('a1000000-0000-4000-a000-000000000047', 'e1000000-0000-4000-a000-000000000009', null, 'Ahorros', 'piggy-bank', true, NOW()),
('a1000000-0000-4000-a000-000000000048', 'e1000000-0000-4000-a000-000000000009', null, 'Acciones', 'trending-up', true, NOW()),
('a1000000-0000-4000-a000-000000000049', 'e1000000-0000-4000-a000-000000000009', null, 'Fondos de inversión', 'wallet', true, NOW()),
('a1000000-0000-4000-a000-000000000050', 'e1000000-0000-4000-a000-000000000009', null, 'Criptomonedas', 'bitcoin', true, NOW()),
('a1000000-0000-4000-a000-000000000051', 'e1000000-0000-4000-a000-000000000009', null, 'Bienes raíces', 'building', true, NOW()),

-- OTROS
('a1000000-0000-4000-a000-000000000052', 'e1000000-0000-4000-a000-000000000010', null, 'Educación', 'graduation-cap', true, NOW()),
('a1000000-0000-4000-a000-000000000053', 'e1000000-0000-4000-a000-000000000010', null, 'Salud', 'heart', true, NOW()),
('a1000000-0000-4000-a000-000000000054', 'e1000000-0000-4000-a000-000000000010', null, 'Mascotas', 'dog', true, NOW()),
('a1000000-0000-4000-a000-000000000055', 'e1000000-0000-4000-a000-000000000010', null, 'Donaciones', 'hand-heart', true, NOW()),
('a1000000-0000-4000-a000-000000000056', 'e1000000-0000-4000-a000-000000000010', null, 'Varios', 'more-vertical', true, NOW());
