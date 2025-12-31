-- ============================================================================
-- SCRIPT DE CORRECCIÓN: ACTIVAR TRIGGER DE USUARIOS
-- Ejecuta esto en Supabase -> SQL Editor para que el registro funcione correctamente.
-- ============================================================================

-- 1. Crear la función que maneja el nuevo usuario (por si acaso no existe)
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, avatar_url)
  VALUES (new.id, new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'avatar_url');
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. Activar el Trigger (Esto es lo que faltaba)
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

-- 3. (Opcional) Limpiar usuarios rotos anteriores para probar de cero
-- Descomenta la siguiente línea solo si quieres borrar todos los usuarios de prueba:
-- DELETE FROM auth.users;
