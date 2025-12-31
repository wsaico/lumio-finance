-- Function to seed GLOBAL default categories (user_id = NULL)
CREATE OR REPLACE FUNCTION seed_global_categories()
RETURNS void AS $$
BEGIN
    -- EXPENSE CATEGORIES
    INSERT INTO expense_categories (id, user_id, name, icon, color, is_system)
    VALUES ('e1000000-0000-4000-a000-000000000001', NULL, 'Alimentación y Bebidas', 'utensils', '#ef4444', true)
    ON CONFLICT (id) DO UPDATE SET user_id = NULL, is_system = true;
    
    INSERT INTO subcategories (id, expense_category_id, name) VALUES
    ('a1000000-0000-4000-a000-000000000001', 'e1000000-0000-4000-a000-000000000001', 'Supermercado'),
    ('a1000000-0000-4000-a000-000000000002', 'e1000000-0000-4000-a000-000000000001', 'Mercado/Feria'),
    ('a1000000-0000-4000-a000-000000000003', 'e1000000-0000-4000-a000-000000000001', 'Bodega'),
    ('a1000000-0000-4000-a000-000000000004', 'e1000000-0000-4000-a000-000000000001', 'Panadería'),
    ('a1000000-0000-4000-a000-000000000005', 'e1000000-0000-4000-a000-000000000001', 'Carnicería/Pollería'),
    ('a1000000-0000-4000-a000-000000000006', 'e1000000-0000-4000-a000-000000000001', 'Restaurant'),
    ('a1000000-0000-4000-a000-000000000007', 'e1000000-0000-4000-a000-000000000001', 'Fast Food'),
    ('a1000000-0000-4000-a000-000000000008', 'e1000000-0000-4000-a000-000000000001', 'Café/Cafetería'),
    ('a1000000-0000-4000-a000-000000000009', 'e1000000-0000-4000-a000-000000000001', 'Bar/Discoteca'),
    ('a1000000-0000-4000-a000-000000000010', 'e1000000-0000-4000-a000-000000000001', 'Delivery de comida'),
    ('a1000000-0000-4000-a000-000000000011', 'e1000000-0000-4000-a000-000000000001', 'Snacks/Golosinas'),
    ('a1000000-0000-4000-a000-000000000012', 'e1000000-0000-4000-a000-000000000001', 'Agua embotellada')
    ON CONFLICT (id) DO NOTHING;

    INSERT INTO expense_categories (id, user_id, name, icon, color, is_system)
    VALUES ('e1000000-0000-4000-a000-000000000002', NULL, 'Vivienda', 'home', '#f59e0b', true)
    ON CONFLICT (id) DO UPDATE SET user_id = NULL, is_system = true;

    INSERT INTO subcategories (id, expense_category_id, name) VALUES
    ('a1000000-0000-4000-a000-000000000101', 'e1000000-0000-4000-a000-000000000002', 'Alquiler/Renta'),
    ('a1000000-0000-4000-a000-000000000102', 'e1000000-0000-4000-a000-000000000002', 'Cuota hipotecaria'),
    ('a1000000-0000-4000-a000-000000000103', 'e1000000-0000-4000-a000-000000000002', 'Mantenimiento'),
    ('a1000000-0000-4000-a000-000000000104', 'e1000000-0000-4000-a000-000000000002', 'Luz/Electricidad'),
    ('a1000000-0000-4000-a000-000000000105', 'e1000000-0000-4000-a000-000000000002', 'Agua'),
    ('a1000000-0000-4000-a000-000000000106', 'e1000000-0000-4000-a000-000000000002', 'Gas'),
    ('a1000000-0000-4000-a000-000000000107', 'e1000000-0000-4000-a000-000000000002', 'Internet'),
    ('a1000000-0000-4000-a000-000000000108', 'e1000000-0000-4000-a000-000000000002', 'Movil/Fijo'),
    ('a1000000-0000-4000-a000-000000000109', 'e1000000-0000-4000-a000-000000000002', 'Limpieza/Aseo'),
    ('a1000000-0000-4000-a000-000000000110', 'e1000000-0000-4000-a000-000000000002', 'Seguridad'),
    ('a1000000-0000-4000-a000-000000000111', 'e1000000-0000-4000-a000-000000000002', 'Reparaciones')
    ON CONFLICT (id) DO NOTHING;

    INSERT INTO expense_categories (id, user_id, name, icon, color, is_system)
    VALUES ('e1000000-0000-4000-a000-000000000003', NULL, 'Transporte', 'car', '#3b82f6', true)
    ON CONFLICT (id) DO UPDATE SET user_id = NULL, is_system = true;

    INSERT INTO subcategories (id, expense_category_id, name) VALUES
    ('a1000000-0000-4000-a000-000000000201', 'e1000000-0000-4000-a000-000000000003', 'Combustible'),
    ('a1000000-0000-4000-a000-000000000202', 'e1000000-0000-4000-a000-000000000003', 'Taxi/Apps'),
    ('a1000000-0000-4000-a000-000000000203', 'e1000000-0000-4000-a000-000000000003', 'Transporte Público'),
    ('a1000000-0000-4000-a000-000000000204', 'e1000000-0000-4000-a000-000000000003', 'Peaje/Estacionamiento'),
    ('a1000000-0000-4000-a000-000000000205', 'e1000000-0000-4000-a000-000000000003', 'Mantenimiento/Reparación'),
    ('a1000000-0000-4000-a000-000000000206', 'e1000000-0000-4000-a000-000000000003', 'Seguro/SOAT')
    ON CONFLICT (id) DO NOTHING;

    INSERT INTO expense_categories (id, user_id, name, icon, color, is_system)
    VALUES ('e1000000-0000-4000-a000-000000000004', NULL, 'Salud y Medicina', 'heart-pulse', '#ec4899', true)
    ON CONFLICT (id) DO UPDATE SET user_id = NULL, is_system = true;
    
    INSERT INTO subcategories (id, expense_category_id, name) VALUES
    ('a1000000-0000-4000-a000-000000000301', 'e1000000-0000-4000-a000-000000000004', 'Consulta Médica'),
    ('a1000000-0000-4000-a000-000000000302', 'e1000000-0000-4000-a000-000000000004', 'Farmacia/Medicamentos'),
    ('a1000000-0000-4000-a000-000000000303', 'e1000000-0000-4000-a000-000000000004', 'Odontología'),
    ('a1000000-0000-4000-a000-000000000304', 'e1000000-0000-4000-a000-000000000004', 'Exámenes/Análisis'),
    ('a1000000-0000-4000-a000-000000000305', 'e1000000-0000-4000-a000-000000000004', 'Seguro Médico')
    ON CONFLICT (id) DO NOTHING;

    INSERT INTO expense_categories (id, user_id, name, icon, color, is_system)
    VALUES ('e1000000-0000-4000-a000-000000000005', NULL, 'Educación', 'graduation-cap', '#8b5cf6', true)
    ON CONFLICT (id) DO UPDATE SET user_id = NULL, is_system = true;

    INSERT INTO subcategories (id, expense_category_id, name) VALUES
    ('a1000000-0000-4000-a000-000000000401', 'e1000000-0000-4000-a000-000000000005', 'Colegio/Universidad'),
    ('a1000000-0000-4000-a000-000000000402', 'e1000000-0000-4000-a000-000000000005', 'Cursos/Idiomas'),
    ('a1000000-0000-4000-a000-000000000403', 'e1000000-0000-4000-a000-000000000005', 'Útiles/Libros')
    ON CONFLICT (id) DO NOTHING;

    INSERT INTO expense_categories (id, user_id, name, icon, color, is_system)
    VALUES ('e1000000-0000-4000-a000-000000000006', NULL, 'Ropa y Calzado', 'shirt', '#14b8a6', true)
    ON CONFLICT (id) DO UPDATE SET user_id = NULL, is_system = true;
    
    INSERT INTO subcategories (id, expense_category_id, name) VALUES
    ('a1000000-0000-4000-a000-000000000501', 'e1000000-0000-4000-a000-000000000006', 'Ropa'),
    ('a1000000-0000-4000-a000-000000000502', 'e1000000-0000-4000-a000-000000000006', 'Calzado'),
    ('a1000000-0000-4000-a000-000000000503', 'e1000000-0000-4000-a000-000000000006', 'Accesorios'),
    ('a1000000-0000-4000-a000-000000000504', 'e1000000-0000-4000-a000-000000000006', 'Lavandería')
    ON CONFLICT (id) DO NOTHING;
    
    INSERT INTO expense_categories (id, user_id, name, icon, color, is_system)
    VALUES ('e1000000-0000-4000-a000-000000000007', NULL, 'Cuidado Personal', 'scissors', '#f472b6', true)
    ON CONFLICT (id) DO UPDATE SET user_id = NULL, is_system = true;

    INSERT INTO subcategories (id, expense_category_id, name) VALUES
    ('a1000000-0000-4000-a000-000000000601', 'e1000000-0000-4000-a000-000000000007', 'Peluquería/Barbería'),
    ('a1000000-0000-4000-a000-000000000602', 'e1000000-0000-4000-a000-000000000007', 'Cosméticos/Higiene'),
    ('a1000000-0000-4000-a000-000000000603', 'e1000000-0000-4000-a000-000000000007', 'Spa/Tratamientos')
    ON CONFLICT (id) DO NOTHING;

    INSERT INTO expense_categories (id, user_id, name, icon, color, is_system)
    VALUES ('e1000000-0000-4000-a000-000000000008', NULL, 'Entretenimiento', 'gamepad-2', '#f97316', true)
    ON CONFLICT (id) DO UPDATE SET user_id = NULL, is_system = true;

    INSERT INTO subcategories (id, expense_category_id, name) VALUES
    ('a1000000-0000-4000-a000-000000000701', 'e1000000-0000-4000-a000-000000000008', 'Cine/Teatro/Eventos'),
    ('a1000000-0000-4000-a000-000000000702', 'e1000000-0000-4000-a000-000000000008', 'Streaming (Netflix/Spotify)'),
    ('a1000000-0000-4000-a000-000000000703', 'e1000000-0000-4000-a000-000000000008', 'Juegos/Videojuegos'),
    ('a1000000-0000-4000-a000-000000000704', 'e1000000-0000-4000-a000-000000000008', 'Hobbies')
    ON CONFLICT (id) DO NOTHING;

    INSERT INTO expense_categories (id, user_id, name, icon, color, is_system)
    VALUES ('e1000000-0000-4000-a000-000000000009', NULL, 'Tecnología', 'smartphone', '#6366f1', true)
    ON CONFLICT (id) DO UPDATE SET user_id = NULL, is_system = true;

    INSERT INTO subcategories (id, expense_category_id, name) VALUES
    ('a1000000-0000-4000-a000-000000000801', 'e1000000-0000-4000-a000-000000000009', 'Celular/Smartphone'),
    ('a1000000-0000-4000-a000-000000000802', 'e1000000-0000-4000-a000-000000000009', 'Computadora/Laptop'),
    ('a1000000-0000-4000-a000-000000000803', 'e1000000-0000-4000-a000-000000000009', 'Accesorios/Software'),
    ('a1000000-0000-4000-a000-000000000804', 'e1000000-0000-4000-a000-000000000009', 'Reparaciones')
    ON CONFLICT (id) DO NOTHING;

    INSERT INTO expense_categories (id, user_id, name, icon, color, is_system)
    VALUES ('e1000000-0000-4000-a000-000000000010', NULL, 'Servicios Financieros', 'landmark', '#64748b', true)
    ON CONFLICT (id) DO UPDATE SET user_id = NULL, is_system = true;

    INSERT INTO subcategories (id, expense_category_id, name) VALUES
    ('a1000000-0000-4000-a000-000000000901', 'e1000000-0000-4000-a000-000000000010', 'Comisiones/Gastos'),
    ('a1000000-0000-4000-a000-000000000902', 'e1000000-0000-4000-a000-000000000010', 'Intereses'),
    ('a1000000-0000-4000-a000-000000000903', 'e1000000-0000-4000-a000-000000000010', 'Seguros')
    ON CONFLICT (id) DO NOTHING;

    INSERT INTO expense_categories (id, user_id, name, icon, color, is_system)
    VALUES ('e1000000-0000-4000-a000-000000000011', NULL, 'Mascotas', 'dog', '#a8a29e', true)
    ON CONFLICT (id) DO UPDATE SET user_id = NULL, is_system = true;
    
    INSERT INTO subcategories (id, expense_category_id, name) VALUES
    ('a1000000-0000-4000-a000-000000001001', 'e1000000-0000-4000-a000-000000000011', 'Comida'),
    ('a1000000-0000-4000-a000-000000001002', 'e1000000-0000-4000-a000-000000000011', 'Veterinario'),
    ('a1000000-0000-4000-a000-000000001003', 'e1000000-0000-4000-a000-000000000011', 'Accesorios/Juguetes')
    ON CONFLICT (id) DO NOTHING;

    INSERT INTO expense_categories (id, user_id, name, icon, color, is_system)
    VALUES ('e1000000-0000-4000-a000-000000000012', NULL, 'Regalos', 'gift', '#f43f5e', true)
    ON CONFLICT (id) DO UPDATE SET user_id = NULL, is_system = true;

    INSERT INTO subcategories (id, expense_category_id, name) VALUES
    ('a1000000-0000-4000-a000-000000001101', 'e1000000-0000-4000-a000-000000000012', 'Obsequios'),
    ('a1000000-0000-4000-a000-000000001102', 'e1000000-0000-4000-a000-000000000012', 'Donaciones')
    ON CONFLICT (id) DO NOTHING;

    INSERT INTO expense_categories (id, user_id, name, icon, color, is_system)
    VALUES ('e1000000-0000-4000-a000-000000000013', NULL, 'Viajes', 'plane', '#0ea5e9', true)
    ON CONFLICT (id) DO UPDATE SET user_id = NULL, is_system = true;

    INSERT INTO subcategories (id, expense_category_id, name) VALUES
    ('a1000000-0000-4000-a000-000000001201', 'e1000000-0000-4000-a000-000000000013', 'Pasajes'),
    ('a1000000-0000-4000-a000-000000001202', 'e1000000-0000-4000-a000-000000000013', 'Hospedaje'),
    ('a1000000-0000-4000-a000-000000001203', 'e1000000-0000-4000-a000-000000000013', 'Tours/Actividades')
    ON CONFLICT (id) DO NOTHING;

    INSERT INTO expense_categories (id, user_id, name, icon, color, is_system)
    VALUES ('e1000000-0000-4000-a000-000000000014', NULL, 'Impuestos/Multas', 'alert-triangle', '#ef4444', true)
    ON CONFLICT (id) DO UPDATE SET user_id = NULL, is_system = true;

    INSERT INTO subcategories (id, expense_category_id, name) VALUES
    ('a1000000-0000-4000-a000-000000001301', 'e1000000-0000-4000-a000-000000000014', 'Impuestos'),
    ('a1000000-0000-4000-a000-000000001302', 'e1000000-0000-4000-a000-000000000014', 'Multas/Papeletas')
    ON CONFLICT (id) DO NOTHING;

    INSERT INTO expense_categories (id, user_id, name, icon, color, is_system)
    VALUES ('e1000000-0000-4000-a000-000000000015', NULL, 'Deudas', 'credit-card', '#dc2626', true),
    ('e1000000-0000-4000-a000-000000000090', NULL, 'Inversiones', 'trending-up', '#8b5cf6', true),
    ('e1000000-0000-4000-a000-000000000091', NULL, 'Ahorro', 'piggy-bank', '#10b981', true)
    ON CONFLICT (id) DO UPDATE SET user_id = NULL, is_system = true;

    INSERT INTO subcategories (id, expense_category_id, name) VALUES
    ('a1000000-0000-4000-a000-000000001401', 'e1000000-0000-4000-a000-000000000015', 'Préstamos'),
    ('a1000000-0000-4000-a000-000000001402', 'e1000000-0000-4000-a000-000000000015', 'Tarjetas de crédito'),
    ('a1000000-0000-4000-a000-000000001601', 'e1000000-0000-4000-a000-000000000090', 'Fondos Mutuos'),
    ('a1000000-0000-4000-a000-000000001602', 'e1000000-0000-4000-a000-000000000090', 'Acciones'),
    ('a1000000-0000-4000-a000-000000001603', 'e1000000-0000-4000-a000-000000000090', 'Bienes Raíces'),
    ('a1000000-0000-4000-a000-000000001701', 'e1000000-0000-4000-a000-000000000091', 'Fondo de Emergencia'),
    ('a1000000-0000-4000-a000-000000001702', 'e1000000-0000-4000-a000-000000000091', 'Ahorro para Metas')
    ON CONFLICT (id) DO NOTHING;

    INSERT INTO expense_categories (id, user_id, name, icon, color, is_system)
    VALUES ('e1000000-0000-4000-a000-000000000016', NULL, 'Otros', 'more-horizontal', '#94a3b8', true)
    ON CONFLICT (id) DO UPDATE SET user_id = NULL, is_system = true;

    INSERT INTO subcategories (id, expense_category_id, name) VALUES
    ('a1000000-0000-4000-a000-000000001501', 'e1000000-0000-4000-a000-000000000016', 'Varios'),
    ('a1000000-0000-4000-a000-000000001502', 'e1000000-0000-4000-a000-000000000016', 'Imprevistos')
    ON CONFLICT (id) DO NOTHING;

    -- INCOME CATEGORIES
    INSERT INTO income_categories (id, user_id, name, icon, color, is_system)
    VALUES ('b1000000-0000-4000-a000-000000000001', NULL, 'Salario', 'banknote', '#10b981', true)
    ON CONFLICT (id) DO UPDATE SET user_id = NULL, is_system = true;

    INSERT INTO subcategories (id, income_category_id, name) VALUES
    ('f1000000-0000-4000-a000-000000000001', 'b1000000-0000-4000-a000-000000000001', 'Sueldo Mensual'),
    ('f1000000-0000-4000-a000-000000000002', 'b1000000-0000-4000-a000-000000000001', 'Gratificación/Aguinaldo'),
    ('f1000000-0000-4000-a000-000000000003', 'b1000000-0000-4000-a000-000000000001', 'Bonos')
    ON CONFLICT (id) DO NOTHING;
    
    INSERT INTO income_categories (id, user_id, name, icon, color, is_system)
    VALUES ('b1000000-0000-4000-a000-000000000002', NULL, 'Trabajo Independiente', 'briefcase', '#059669', true)
    ON CONFLICT (id) DO UPDATE SET user_id = NULL, is_system = true;

    INSERT INTO subcategories (id, income_category_id, name) VALUES
    ('f1000000-0000-4000-a000-000000000101', 'b1000000-0000-4000-a000-000000000002', 'Freelance'),
    ('f1000000-0000-4000-a000-000000000102', 'b1000000-0000-4000-a000-000000000002', 'Servicios')
    ON CONFLICT (id) DO NOTHING;
    
    INSERT INTO income_categories (id, user_id, name, icon, color, is_system)
    VALUES ('b1000000-0000-4000-a000-000000000003', NULL, 'Negocio Propio', 'store', '#22c55e', true)
    ON CONFLICT (id) DO UPDATE SET user_id = NULL, is_system = true;

    INSERT INTO subcategories (id, income_category_id, name) VALUES
    ('f1000000-0000-4000-a000-000000000201', 'b1000000-0000-4000-a000-000000000003', 'Ventas'),
    ('f1000000-0000-4000-a000-000000000202', 'b1000000-0000-4000-a000-000000000003', 'Ganancias')
    ON CONFLICT (id) DO NOTHING;
    
    INSERT INTO income_categories (id, user_id, name, icon, color, is_system)
    VALUES ('b1000000-0000-4000-a000-000000000004', NULL, 'Rentas', 'key', '#16a34a', true)
    ON CONFLICT (id) DO UPDATE SET user_id = NULL, is_system = true;

    INSERT INTO subcategories (id, income_category_id, name) VALUES
    ('f1000000-0000-4000-a000-000000000301', 'b1000000-0000-4000-a000-000000000004', 'Alquileres'),
    ('f1000000-0000-4000-a000-000000000302', 'b1000000-0000-4000-a000-000000000004', 'Airbnb')
    ON CONFLICT (id) DO NOTHING;
    
    INSERT INTO income_categories (id, user_id, name, icon, color, is_system)
    VALUES ('b1000000-0000-4000-a000-000000000005', NULL, 'Inversiones', 'line-chart', '#16a34a', true)
    ON CONFLICT (id) DO UPDATE SET user_id = NULL, is_system = true;

    INSERT INTO subcategories (id, income_category_id, name) VALUES
    ('f1000000-0000-4000-a000-000000000401', 'b1000000-0000-4000-a000-000000000005', 'Intereses'),
    ('f1000000-0000-4000-a000-000000000402', 'b1000000-0000-4000-a000-000000000005', 'Dividendos')
    ON CONFLICT (id) DO NOTHING;

    INSERT INTO income_categories (id, user_id, name, icon, color, is_system)
    VALUES ('b1000000-0000-4000-a000-000000000006', NULL, 'Otros', 'wallet', '#6366f1', true)
    ON CONFLICT (id) DO UPDATE SET user_id = NULL, is_system = true;

    INSERT INTO subcategories (id, income_category_id, name) VALUES
    ('f1000000-0000-4000-a000-000000000501', 'b1000000-0000-4000-a000-000000000006', 'Regalos'),
    ('f1000000-0000-4000-a000-000000000502', 'b1000000-0000-4000-a000-000000000006', 'Ventas de Activos'),
    ('f1000000-0000-4000-a000-000000000503', 'b1000000-0000-4000-a000-000000000006', 'Devoluciones'),
    ('f1000000-0000-4000-a000-000000000504', 'b1000000-0000-4000-a000-000000000006', 'Préstamos Recibidos')
    ON CONFLICT (id) DO NOTHING;

END;
$$ LANGUAGE plpgsql;

-- Execute Global Seed
SELECT seed_global_categories();
