
-- 1. CLEANUP (Optional: Remove existing system categories to avoid duplicates if upsert fails)
-- DELETE FROM expense_categories WHERE is_system = true;
-- DELETE FROM income_categories WHERE is_system = true;

-- 2. INSERT EXPENSE CATEGORIES
DO $$
DECLARE
    target_user_id uuid;
    cat_id uuid;
BEGIN
    -- SELECT TARGET USER (First found, or specific ID)
    SELECT id INTO target_user_id FROM profiles LIMIT 1;
    
    IF target_user_id IS NULL THEN
        RAISE NOTICE 'No user found in profiles table.';
        RETURN;
    END IF;

    RAISE NOTICE 'Seeding for user: %', target_user_id;

    -- ALIMENTACION
    INSERT INTO expense_categories (user_id, name, icon, color, is_system, sort_order) 
    VALUES (target_user_id, 'Alimentación', 'utensils', '#ef4444', true, 0)
    ON CONFLICT (user_id, name) DO UPDATE SET icon = EXCLUDED.icon, color = EXCLUDED.color
    RETURNING id INTO cat_id;
    
    INSERT INTO subcategories (expense_category_id, name) VALUES 
    (cat_id, 'Restaurantes'), (cat_id, 'Mercado'), (cat_id, 'Bebidas'), (cat_id, 'Snacks')
    ON CONFLICT DO NOTHING;

    -- TRANSPORTE
    INSERT INTO expense_categories (user_id, name, icon, color, is_system, sort_order) 
    VALUES (target_user_id, 'Transporte', 'car', '#f97316', true, 1)
    ON CONFLICT (user_id, name) DO UPDATE SET icon = EXCLUDED.icon, color = EXCLUDED.color
    RETURNING id INTO cat_id;
    
    INSERT INTO subcategories (expense_category_id, name) VALUES 
    (cat_id, 'Taxi/Uber'), (cat_id, 'Transporte Público'), (cat_id, 'Gasolina'), (cat_id, 'Mantenimiento'), (cat_id, 'Estacionamiento')
    ON CONFLICT DO NOTHING;

    -- VIVIENDA
    INSERT INTO expense_categories (user_id, name, icon, color, is_system, sort_order) 
    VALUES (target_user_id, 'Vivienda', 'home', '#eab308', true, 2)
    ON CONFLICT (user_id, name) DO UPDATE SET icon = EXCLUDED.icon, color = EXCLUDED.color
    RETURNING id INTO cat_id;
    
    INSERT INTO subcategories (expense_category_id, name) VALUES 
    (cat_id, 'Alquiler'), (cat_id, 'Luz'), (cat_id, 'Agua'), (cat_id, 'Internet'), (cat_id, 'Mantenimiento')
    ON CONFLICT DO NOTHING;
    
    -- OCIO
    INSERT INTO expense_categories (user_id, name, icon, color, is_system, sort_order) 
    VALUES (target_user_id, 'Ocio', 'party-popper', '#8b5cf6', true, 3)
    ON CONFLICT (user_id, name) DO UPDATE SET icon = EXCLUDED.icon, color = EXCLUDED.color
    RETURNING id INTO cat_id;
    
    INSERT INTO subcategories (expense_category_id, name) VALUES 
    (cat_id, 'Cine'), (cat_id, 'Salidas'), (cat_id, 'Juegos'), (cat_id, 'Streaming'), (cat_id, 'Hobbies')
    ON CONFLICT DO NOTHING;
    
    -- SALUD
    INSERT INTO expense_categories (user_id, name, icon, color, is_system, sort_order) 
    VALUES (target_user_id, 'Salud', 'heart-pulse', '#ec4899', true, 4)
    ON CONFLICT (user_id, name) DO UPDATE SET icon = EXCLUDED.icon, color = EXCLUDED.color
    RETURNING id INTO cat_id;
    
    INSERT INTO subcategories (expense_category_id, name) VALUES 
    (cat_id, 'Farmacia'), (cat_id, 'Consultas'), (cat_id, 'Seguro'), (cat_id, 'Deporte')
    ON CONFLICT DO NOTHING;

    -- EDUCACION
    INSERT INTO expense_categories (user_id, name, icon, color, is_system, sort_order) 
    VALUES (target_user_id, 'Educación', 'graduation-cap', '#3b82f6', true, 5)
    ON CONFLICT (user_id, name) DO UPDATE SET icon = EXCLUDED.icon, color = EXCLUDED.color
    RETURNING id INTO cat_id;
    
    INSERT INTO subcategories (expense_category_id, name) VALUES 
    (cat_id, 'Cursos'), (cat_id, 'Libros'), (cat_id, 'Matrícula'), (cat_id, 'Materiales')
    ON CONFLICT DO NOTHING;

    -- COMPRAS
    INSERT INTO expense_categories (user_id, name, icon, color, is_system, sort_order) 
    VALUES (target_user_id, 'Compras', 'shopping-bag', '#14b8a6', true, 6)
    ON CONFLICT (user_id, name) DO UPDATE SET icon = EXCLUDED.icon, color = EXCLUDED.color
    RETURNING id INTO cat_id;
    
    INSERT INTO subcategories (expense_category_id, name) VALUES 
    (cat_id, 'Ropa'), (cat_id, 'Tecnología'), (cat_id, 'Hogar'), (cat_id, 'Regalos')
    ON CONFLICT DO NOTHING;
    
    -- OTROS
    INSERT INTO expense_categories (user_id, name, icon, color, is_system, sort_order) 
    VALUES (target_user_id, 'Otros', 'circle-help', '#6b7280', true, 7)
    ON CONFLICT (user_id, name) DO UPDATE SET icon = EXCLUDED.icon, color = EXCLUDED.color
    RETURNING id INTO cat_id;
    
    INSERT INTO subcategories (expense_category_id, name) VALUES 
    (cat_id, 'Varios'), (cat_id, 'Donaciones')
    ON CONFLICT DO NOTHING;

    -- 3. INSERT INCOME CATEGORIES
    
    -- LABORAL
    INSERT INTO income_categories (user_id, name, icon, color, is_system, sort_order) 
    VALUES (target_user_id, 'Laboral', 'briefcase', '#10b981', true, 0)
    ON CONFLICT (user_id, name) DO UPDATE SET icon = EXCLUDED.icon, color = EXCLUDED.color
    RETURNING id INTO cat_id;
    
    INSERT INTO subcategories (income_category_id, name) VALUES 
    (cat_id, 'Salario'), (cat_id, 'Bonos'), (cat_id, 'Horas Extras'), (cat_id, 'Comisiones')
    ON CONFLICT DO NOTHING;
    
    -- INVERSIONES
    INSERT INTO income_categories (user_id, name, icon, color, is_system, sort_order) 
    VALUES (target_user_id, 'Inversiones', 'trending-up', '#0ea5e9', true, 1)
    ON CONFLICT (user_id, name) DO UPDATE SET icon = EXCLUDED.icon, color = EXCLUDED.color
    RETURNING id INTO cat_id;
    
    INSERT INTO subcategories (income_category_id, name) VALUES 
    (cat_id, 'Dividendos'), (cat_id, 'Intereses'), (cat_id, 'Rendimientos')
    ON CONFLICT DO NOTHING;

     -- OTROS INGRESOS
    INSERT INTO income_categories (user_id, name, icon, color, is_system, sort_order) 
    VALUES (target_user_id, 'Otros Ingresos', 'wallet', '#6366f1', true, 2)
    ON CONFLICT (user_id, name) DO UPDATE SET icon = EXCLUDED.icon, color = EXCLUDED.color
    RETURNING id INTO cat_id;
    
    INSERT INTO subcategories (income_category_id, name) VALUES 
    (cat_id, 'Regalos'), (cat_id, 'Venta de Artículos'), (cat_id, 'Reembolsos')
    ON CONFLICT DO NOTHING;
    
END $$;
