# Instrucciones de Migración: Credit Cards → Accounts

## MIGRACIÓN COMPLETADA ✅

Se ha unificado el módulo de tarjetas de crédito dentro del módulo de cuentas.

## Cambios Realizados

### 1. Schema de Base de Datos
- ✅ Agregados campos de tarjeta de crédito a la tabla `accounts`
- ✅ Script SQL de migración creado en `prisma/migrations/migrate_credit_cards_to_accounts.sql`

### 2. Frontend
- ✅ `account-form-modal.tsx` - Agregados campos para CREDIT_CARD
- ✅ `account-card.tsx` - Vista de tarjeta con número, disponible, cierre/pago
- ✅ `account-form-modal.tsx` - Tipo CREDIT_CARD en selector
- ✅ `transaction-form-modal.tsx` - Eliminadas referencias a credit cards separados
- ✅ `app-sidebar.tsx` - Eliminada ruta de "Tarjetas de Crédito"

### 3. Backend
- ✅ `app/api/accounts/route.ts` - Soporte para campos de credit card
- ✅ `app/api/accounts/[id]/route.ts` - Mapeo de credit card fields
- ⚠️ `app/api/transactions/route.ts` - REQUIERE ACTUALIZACIÓN

### 4. Prisma Schema
- ✅ Campos agregados al modelo `Account`

## Pasos Pendientes para Completar

### 1. Ejecutar Migración SQL en Supabase

```sql
-- Conectarse a Supabase y ejecutar el script:
-- prisma/migrations/migrate_credit_cards_to_accounts.sql
```

Este script:
1. Agrega las columnas necesarias a la tabla `accounts`
2. Migra los datos existentes de `credit_cards` a `accounts`
3. Actualiza las transacciones para usar `account_id`

### 2. Actualizar API de Transacciones

El archivo `app/api/transactions/route.ts` tiene lógica para `creditCardId` que debe actualizarse:

**ANTES:**
```typescript
if (isCreditCardPurchase) {
    // Valida credit_card_id
    // Actualiza used_balance en credit_cards
}
```

**DESPUÉS:**
```typescript
// Verificar si el account es CREDIT_CARD
const { data: account } = await supabase
    .from('accounts')
    .select('account_type, credit_limit, used_balance')
    .eq('id', validData.accountId)
    .single()

if (account?.account_type === 'CREDIT_CARD') {
    // Validar límite de crédito
    const availableCredit = Number(account.credit_limit) - Number(account.used_balance)
    if (validData.amount > availableCredit) {
        return new NextResponse('Límite de crédito excedido', { status: 400 })
    }
}

// En la actualización de balances:
if (account?.account_type === 'CREDIT_CARD') {
    // Para EXPENSE: aumentar used_balance
    // Para INCOME (pago): disminuir used_balance
    newUsedBalance = validData.type === 'EXPENSE'
        ? Number(account.used_balance) + validData.amount
        : Number(account.used_balance) - validData.amount

    await supabase
        .from('accounts')
        .update({ used_balance: newUsedBalance })
        .eq('id', validData.accountId)
} else {
    // Lógica normal de current_balance
}
```

### 3. Eliminar Módulo de Credit Cards

Una vez que la migración esté completa y probada:

```bash
# Eliminar carpetas y archivos
rm -rf components/credit-cards/
rm -rf hooks/use-credit-cards.ts
rm -rf app/(dashboard)/dashboard/credit-cards/
rm -rf app/api/credit-cards/

# Eliminar tabla de base de datos (DESPUÉS de verificar)
# DROP TABLE credit_cards CASCADE;
```

### 4. Testing

Probar los siguientes flujos:

1. **Crear Tarjeta de Crédito**
   - Ir a Cuentas → Nueva Cuenta
   - Seleccionar tipo "Tarjeta de Crédito"
   - Llenar todos los campos
   - Verificar que se cree correctamente

2. **Ver Tarjeta**
   - Verificar que muestre: número (**** **** **** 1234), crédito disponible, cierre/pago

3. **Compra con Tarjeta**
   - Crear EXPENSE seleccionando una tarjeta de crédito
   - Verificar que aumente `used_balance`
   - Verificar que disminuya `availableCredit`

4. **Pago de Tarjeta**
   - Crear INCOME hacia la tarjeta de crédito
   - Verificar que disminuya `used_balance`
   - Verificar que aumente `availableCredit`

5. **Validación de Límite**
   - Intentar compra mayor al crédito disponible
   - Debe mostrar error

## Arquitectura Final

```
accounts (tabla única)
├── Cuentas regulares (CASH, BANK, DIGITAL, INVESTMENT, PETTY_CASH)
│   └── usa: current_balance
└── Tarjetas de crédito (CREDIT_CARD)
    ├── usa: credit_limit, used_balance
    └── campos adicionales: last_four_digits, closing_day, payment_due_day, etc.
```

## Beneficios de la Migración

✅ **Un solo módulo** - Toda la gestión de "dinero" en un lugar
✅ **Código más limpio** - Sin duplicación entre accounts y credit_cards
✅ **UX mejorada** - Todo en la misma vista de cuentas
✅ **Mantenimiento simplificado** - Un solo lugar para actualizaciones
✅ **Reportes unificados** - Fácil incluir tarjetas en reportes financieros

## Rollback (si es necesario)

Si algo sale mal, los datos originales están en la tabla `credit_cards`.
La migración NO elimina datos, solo los copia.

Para revertir:
1. Eliminar registros tipo CREDIT_CARD de accounts
2. Restaurar rutas y componentes del commit anterior
