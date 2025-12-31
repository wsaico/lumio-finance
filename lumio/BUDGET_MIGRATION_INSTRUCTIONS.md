# Migración de Base de Datos - Budget Advanced Filters

## ⚠️ IMPORTANTE: Ejecutar esta migración SQL manualmente

Debido a que el proyecto usa Prisma 7, necesitas ejecutar esta migración SQL directamente en tu base de datos PostgreSQL.

## Pasos para aplicar la migración:

### Opción 1: Usando pgAdmin o herramienta SQL

1. Abre tu herramienta de gestión de PostgreSQL (pgAdmin, TablePlus, etc.)
2. Conéctate a tu base de datos
3. Ejecuta el siguiente SQL:

```sql
-- Add advanced filtering capabilities to budgets table
ALTER TABLE budgets
ADD COLUMN IF NOT EXISTS transaction_filter_mode VARCHAR(50) DEFAULT 'DEFAULT',
ADD COLUMN IF NOT EXISTS budget_scope VARCHAR(50) DEFAULT 'ALL_TRANSACTIONS',
ADD COLUMN IF NOT EXISTS include_loaned BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS include_goal_transactions BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS include_balance_corrections BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS include_from_other_budgets BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS excluded_budget_ids TEXT[] DEFAULT '{}';

-- Add comments for clarity
COMMENT ON COLUMN budgets.transaction_filter_mode IS 'DEFAULT | EXPENSE | INCOME | LOANED | ADDED_TO_BUDGETS | ADDED_TO_GOAL | BALANCE_CORRECTION';
COMMENT ON COLUMN budgets.budget_scope IS 'ALL_TRANSACTIONS | ADDED_ONLY - Controls if all transactions or only manually added ones are included';
COMMENT ON COLUMN budgets.include_loaned IS 'Include loan transactions (LENT/BORROWED)';
COMMENT ON COLUMN budgets.include_goal_transactions IS 'Include transactions linked to savings goals';
COMMENT ON COLUMN budgets.include_balance_corrections IS 'Include balance correction/adjustment transactions';
COMMENT ON COLUMN budgets.include_from_other_budgets IS 'Include transactions that are already in other budgets';
COMMENT ON COLUMN budgets.excluded_budget_ids IS 'Array of budget IDs to exclude transactions from';
```

### Opción 2: Usando Supabase Dashboard

1. Ve a tu proyecto en Supabase
2. Navega a **SQL Editor**
3. Crea una nueva query
4. Pega el SQL de arriba
5. Ejecuta la query

### Opción 3: Usando psql (CLI)

```bash
psql -h <tu-host> -U <tu-usuario> -d <tu-database> -f prisma/migrations/20251225_budget_advanced_filters/migration.sql
```

## Verificación

Después de ejecutar la migración, verifica que las columnas se crearon correctamente:

```sql
SELECT column_name, data_type, column_default
FROM information_schema.columns
WHERE table_name = 'budgets'
  AND column_name IN (
    'transaction_filter_mode',
    'budget_scope',
    'include_loaned',
    'include_goal_transactions',
    'include_balance_corrections',
    'include_from_other_budgets',
    'excluded_budget_ids'
  );
```

Deberías ver 7 filas con las nuevas columnas.

## ¿Qué hace esta migración?

Esta migración agrega campos avanzados a la tabla `budgets` que permiten:

1. **transaction_filter_mode**: Filtrar por tipo de transacción (gastos, ingresos, préstamos, etc.)
2. **budget_scope**: Controlar si se incluyen todas las transacciones o solo las agregadas manualmente
3. **include_loaned**: Incluir transacciones de préstamos
4. **include_goal_transactions**: Incluir transacciones vinculadas a metas de ahorro
5. **include_balance_corrections**: Incluir correcciones de saldo
6. **include_from_other_budgets**: Incluir transacciones que ya están en otros presupuestos
7. **excluded_budget_ids**: Array de IDs de presupuestos a excluir

## Después de la migración

Una vez completada la migración:

1. Reinicia tu servidor de desarrollo
2. El nuevo wizard de presupuestos avanzado estará disponible con todas las funcionalidades
3. Los presupuestos existentes seguirán funcionando con valores predeterminados
