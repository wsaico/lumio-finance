
-- !!! EJECUTAR ESTO EN SUPABASE SQL EDITOR !!!
-- Esta es la ÚNICA forma de arreglar el error: "duplicate key value violates unique constraint"

-- 1. Eliminar la restricción que impide crear más de 1 presupuesto por mes
ALTER TABLE "public"."budgets" DROP CONSTRAINT IF EXISTS "budgets_user_id_year_month_key";

-- 2. Eliminar el índice único asociado (si existe con el mismo nombre)
DROP INDEX IF EXISTS "public"."budgets_user_id_year_month_key";

-- 3. Eliminar otro posible índice con nombre similar
DROP INDEX IF EXISTS "public"."budgets_user_id_year_month_idx";

-- VERIFICACIÓN (Opcional)
-- Si esto corre sin error, ya no tendrás el bloqueo.
