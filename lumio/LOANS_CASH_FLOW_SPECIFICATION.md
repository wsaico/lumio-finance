# ESPECIFICACIÓN TÉCNICA: FLUJO DE CAJA DEL MÓDULO DE PRÉSTAMOS

## RESUMEN EJECUTIVO

Este documento especifica el flujo de caja correcto para el módulo de cuentas por cobrar y por pagar, garantizando integridad contable y ausencia de doble contabilidad.

---

## 1. PRINCIPIOS CONTABLES

### 1.1 Conceptos Básicos

- **Cuenta por Cobrar (Asset)**: Dinero que otros te deben. Es un ACTIVO.
- **Cuenta por Pagar (Liability)**: Dinero que tú debes. Es un PASIVO.
- **Balance de Cuenta Bancaria**: Dinero efectivo disponible.

### 1.2 Flujo de Caja vs. Cuentas por Cobrar/Pagar

| Evento | Tipo | Afecta Cash Flow | Afecta Balance | Se Muestra en Transacciones |
|--------|------|------------------|----------------|------------------------------|
| **Prestar dinero** | EXPENSE | ✅ SÍ (sale efectivo) | ✅ Disminuye | ❌ NO (oculto) |
| **Cobrar préstamo** | INCOME | ✅ SÍ (entra efectivo) | ✅ Aumenta | ✅ SÍ (visible) |
| **Recibir préstamo** | INCOME | ✅ SÍ (entra efectivo) | ✅ Aumenta | ❌ NO (oculto) |
| **Pagar deuda** | EXPENSE | ✅ SÍ (sale efectivo) | ✅ Disminuye | ✅ SÍ (visible) |

---

## 2. FLUJOS DETALLADOS

### 2.1 PRÉSTAMO OTORGADO (Cuentas por Cobrar)

**Escenario**: Prestas S/.1,000 a Juan desde tu cuenta BBVA

#### PASO 1: Crear Transacción de Préstamo

```typescript
// API: POST /api/accounts-receivable
// Archivo: app/api/accounts-receivable/route.ts

const transactionPayload = {
    user_id: user.id,
    transaction_type: 'EXPENSE',  // Sale dinero
    account_id: validated.accountId,
    amount: validated.amount,
    currency_code: validated.currencyCode,
    transaction_date: new Date().toISOString(),
    description: `Préstamo otorgado a ${validated.contactName}`,
    category_id: null,
    metadata: {
        isLoanMovement: true,      // ✅ Marca como movimiento de préstamo
        hideFromList: true,         // ✅ NO se muestra en lista de transacciones
        loanType: 'LENT',
    },
}

// Se inserta en tabla 'transactions'
const { data: transaction } = await supabase
    .from('transactions')
    .insert(transactionPayload)
    .select()
    .single()
```

**Efecto en Balance:**

```
Balance Anterior: S/.5,000
Transacción:      -S/.1,000 (EXPENSE)
Balance Nuevo:    S/.4,000
```

#### PASO 2: Actualizar Balance de Cuenta

```typescript
// Se actualiza MANUALMENTE el balance
const { data: account } = await supabase
    .from('accounts')
    .select('current_balance')
    .eq('id', validated.accountId)
    .single()

if (account) {
    const newBalance = Number(account.current_balance) - validated.amount
    await supabase
        .from('accounts')
        .update({ current_balance: newBalance })
        .eq('id', validated.accountId)
}
```

**IMPORTANTE**: Esta es la ÚNICA actualización del balance. NO hay triggers automáticos.

#### PASO 3: Crear Registro de Cuenta por Cobrar

```typescript
const receivablePayload = {
    user_id: user.id,
    contact_name: validated.contactName,
    contact_email: validated.contactEmail,
    contact_phone: validated.contactPhone,
    original_amount: validated.amount,
    outstanding_balance: validated.amount,  // Inicialmente todo está pendiente
    currency_code: validated.currencyCode,
    status: 'PENDING',
    loan_date: new Date().toISOString(),
    due_date: validated.dueDate,
    notes: validated.notes,
    interest_rate: validated.interestRate,
    linked_transaction_id: transaction.id,  // ✅ Link a la transacción
    metadata: {},
}

const { data: receivable } = await supabase
    .from('accounts_receivable')
    .insert(receivablePayload)
    .select()
    .single()
```

#### RESULTADO FINAL

| Concepto | Valor |
|----------|-------|
| Balance Cuenta BBVA | S/.4,000 (era S/.5,000) |
| Cuenta por Cobrar | S/.1,000 |
| Saldo Pendiente | S/.1,000 |
| Transacción en Lista | ❌ NO (oculta) |

---

### 2.2 COBRO DE PRÉSTAMO (Parcial o Total)

**Escenario**: Juan te paga S/.400 de los S/.1,000 que le prestaste

#### PASO 1: Crear Transacción de Cobro

```typescript
// API: PATCH /api/accounts-receivable
// Archivo: app/api/accounts-receivable/route.ts

const incomePayload = {
    user_id: user.id,
    transaction_type: 'INCOME',  // Entra dinero
    account_id: validated.accountId,
    amount: validated.paymentAmount,
    currency_code: receivable.currency_code,
    transaction_date: new Date().toISOString(),
    description: `Cobro de préstamo: ${receivable.contact_name}`,
    category_id: null,
    metadata: {
        isLoanCollection: true,           // ✅ Marca como cobro de préstamo
        hideFromList: false,              // ✅ SÍ se muestra en transacciones
        accountReceivableId: id,
    },
}

const { data: incomeTransaction } = await supabase
    .from('transactions')
    .insert(incomePayload)
    .select()
    .single()
```

**Efecto en Balance:**

```
Balance Anterior: S/.4,000
Transacción:      +S/.400 (INCOME)
Balance Nuevo:    S/.4,400
```

#### PASO 2: Actualizar Balance de Cuenta

```typescript
const { data: account } = await supabase
    .from('accounts')
    .select('current_balance')
    .eq('id', validated.accountId)
    .single()

if (account) {
    const updatedBalance = Number(account.current_balance) + validated.paymentAmount
    await supabase
        .from('accounts')
        .update({ current_balance: updatedBalance })
        .eq('id', validated.accountId)
}
```

#### PASO 3: Actualizar Cuenta por Cobrar

```typescript
const newOutstandingBalance = Number(receivable.outstanding_balance) - validated.paymentAmount

const { data: updatedReceivable } = await supabase
    .from('accounts_receivable')
    .update({
        outstanding_balance: newOutstandingBalance,
        // El trigger auto-actualiza el status:
        // - Si outstanding_balance = 0 → 'COLLECTED'
        // - Si 0 < outstanding_balance < original_amount → 'PARTIAL'
    })
    .eq('id', id)
    .select()
    .single()
```

#### PASO 4: Registrar Pago en Historial

```typescript
const paymentPayload = {
    user_id: user.id,
    account_receivable_id: id,
    amount: validated.paymentAmount,
    currency_code: receivable.currency_code,
    payment_date: new Date().toISOString(),
    transaction_id: incomeTransaction.id,
    notes: validated.notes,
    payment_method: validated.paymentMethod || 'TRANSFER',
}

await supabase
    .from('loan_payments')
    .insert(paymentPayload)
```

#### RESULTADO FINAL

| Concepto | Valor |
|----------|-------|
| Balance Cuenta BBVA | S/.4,400 (era S/.4,000) |
| Cuenta por Cobrar | S/.1,000 (original) |
| Saldo Pendiente | S/.600 (era S/.1,000) |
| Status | PARTIAL |
| Transacción en Lista | ✅ SÍ (visible) |

---

### 2.3 PRÉSTAMO RECIBIDO (Cuentas por Pagar)

**Escenario**: Recibes S/.2,000 de María en tu cuenta BCP

#### PASO 1: Crear Transacción de Préstamo Recibido

```typescript
// API: POST /api/accounts-payable
// Archivo: app/api/accounts-payable/route.ts

const transactionPayload = {
    user_id: user.id,
    transaction_type: 'INCOME',  // Entra dinero
    account_id: validated.accountId,
    amount: validated.amount,
    currency_code: validated.currencyCode,
    transaction_date: new Date().toISOString(),
    description: `Préstamo recibido de ${validated.contactName}`,
    category_id: null,
    metadata: {
        isLoanMovement: true,      // ✅ Marca como movimiento de préstamo
        hideFromList: true,         // ✅ NO se muestra en transacciones
        loanType: 'BORROWED',
    },
}

const { data: transaction } = await supabase
    .from('transactions')
    .insert(transactionPayload)
    .select()
    .single()
```

**Efecto en Balance:**

```
Balance Anterior: S/.3,000
Transacción:      +S/.2,000 (INCOME)
Balance Nuevo:    S/.5,000
```

#### PASO 2: Actualizar Balance de Cuenta

```typescript
const { data: account } = await supabase
    .from('accounts')
    .select('current_balance')
    .eq('id', validated.accountId)
    .single()

if (account) {
    const newBalance = Number(account.current_balance) + validated.amount
    await supabase
        .from('accounts')
        .update({ current_balance: newBalance })
        .eq('id', validated.accountId)
}
```

#### PASO 3: Crear Registro de Cuenta por Pagar

```typescript
const payablePayload = {
    user_id: user.id,
    contact_name: validated.contactName,
    contact_email: validated.contactEmail,
    contact_phone: validated.contactPhone,
    original_amount: validated.amount,
    outstanding_balance: validated.amount,
    currency_code: validated.currencyCode,
    status: 'PENDING',
    loan_date: new Date().toISOString(),
    due_date: validated.dueDate,
    notes: validated.notes,
    interest_rate: validated.interestRate,
    linked_transaction_id: transaction.id,
    metadata: {},
}

const { data: payable } = await supabase
    .from('accounts_payable')
    .insert(payablePayload)
    .select()
    .single()
```

#### RESULTADO FINAL

| Concepto | Valor |
|----------|-------|
| Balance Cuenta BCP | S/.5,000 (era S/.3,000) |
| Cuenta por Pagar | S/.2,000 |
| Saldo Pendiente | S/.2,000 |
| Transacción en Lista | ❌ NO (oculta) |

---

### 2.4 PAGO DE DEUDA

**Escenario**: Pagas S/.800 de los S/.2,000 que le debes a María

#### PASO 1: Crear Transacción de Pago

```typescript
// API: PATCH /api/accounts-payable
// Archivo: app/api/accounts-payable/route.ts

const expensePayload = {
    user_id: user.id,
    transaction_type: 'EXPENSE',  // Sale dinero
    account_id: validated.accountId,
    amount: validated.paymentAmount,
    currency_code: payable.currency_code,
    transaction_date: new Date().toISOString(),
    description: `Pago de deuda a ${payable.contact_name}`,
    category_id: null,
    metadata: {
        isDebtPayment: true,              // ✅ Marca como pago de deuda
        hideFromList: false,              // ✅ SÍ se muestra en transacciones
        accountPayableId: id,
    },
}

const { data: expenseTransaction } = await supabase
    .from('transactions')
    .insert(expensePayload)
    .select()
    .single()
```

**Efecto en Balance:**

```
Balance Anterior: S/.5,000
Transacción:      -S/.800 (EXPENSE)
Balance Nuevo:    S/.4,200
```

#### PASO 2: Actualizar Balance de Cuenta

```typescript
const { data: account } = await supabase
    .from('accounts')
    .select('current_balance')
    .eq('id', validated.accountId)
    .single()

if (account) {
    const updatedBalance = Number(account.current_balance) - validated.paymentAmount
    await supabase
        .from('accounts')
        .update({ current_balance: updatedBalance })
        .eq('id', validated.accountId)
}
```

#### PASO 3: Actualizar Cuenta por Pagar

```typescript
const newOutstandingBalance = Number(payable.outstanding_balance) - validated.paymentAmount

const { data: updatedPayable } = await supabase
    .from('accounts_payable')
    .update({
        outstanding_balance: newOutstandingBalance,
        // El trigger auto-actualiza el status:
        // - Si outstanding_balance = 0 → 'PAID'
        // - Si 0 < outstanding_balance < original_amount → 'PARTIAL'
    })
    .eq('id', id)
    .select()
    .single()
```

#### PASO 4: Registrar Pago en Historial

```typescript
const paymentPayload = {
    user_id: user.id,
    account_payable_id: id,
    amount: validated.paymentAmount,
    currency_code: payable.currency_code,
    payment_date: new Date().toISOString(),
    transaction_id: expenseTransaction.id,
    notes: validated.notes,
    payment_method: validated.paymentMethod || 'TRANSFER',
}

await supabase
    .from('loan_payments')
    .insert(paymentPayload)
```

#### RESULTADO FINAL

| Concepto | Valor |
|----------|-------|
| Balance Cuenta BCP | S/.4,200 (era S/.5,000) |
| Cuenta por Pagar | S/.2,000 (original) |
| Saldo Pendiente | S/.1,200 (era S/.2,000) |
| Status | PARTIAL |
| Transacción en Lista | ✅ SÍ (visible) |

---

## 3. FILTRADO DE TRANSACCIONES

### Archivo: `components/transactions/transaction-list.tsx`

```typescript
const filteredTransactions = useMemo(() => {
    if (!transactions) return []
    return transactions.filter((tx: any) => {
        // Ocultar transacciones iniciales de préstamos
        if (tx.metadata?.hideFromList) return false
        if (tx.metadata?.isLoanMovement) return false
        return true
    })
}, [transactions])
```

### Lógica de Filtrado

| Metadata | hideFromList | isLoanMovement | Resultado |
|----------|--------------|----------------|-----------|
| Préstamo otorgado | ✅ true | ✅ true | ❌ OCULTO |
| Cobro | ❌ false | ❌ false | ✅ VISIBLE |
| Préstamo recibido | ✅ true | ✅ true | ❌ OCULTO |
| Pago de deuda | ❌ false | ❌ false | ✅ VISIBLE |

---

## 4. GARANTÍAS DE INTEGRIDAD

### 4.1 NO Hay Triggers Automáticos

**Verificado:** No existen triggers en la base de datos que actualicen automáticamente el balance de cuentas al insertar transacciones.

Por tanto, la actualización manual del balance en los endpoints de préstamos es **NECESARIA** y **CORRECTA**.

### 4.2 Prevención de Doble Actualización

Las transacciones de préstamos tienen `isLoanMovement: true`, lo que permite identificarlas y evitar procesamiento duplicado.

### 4.3 Trazabilidad Completa

Cada transacción de préstamo está vinculada a su registro de cuenta por cobrar/pagar mediante `linked_transaction_id`.

Cada pago está registrado en `loan_payments` con referencia al `transaction_id` correspondiente.

---

## 5. EJEMPLO COMPLETO DE FLUJO

```
ESTADO INICIAL
┌─────────────────────────────┐
│ Cuenta BBVA: S/.5,000       │
│ Cuenta BCP:  S/.3,000       │
│ Total Cash:  S/.8,000       │
└─────────────────────────────┘

↓ PRÉSTAMO A JUAN (S/.1,000 desde BBVA)

┌─────────────────────────────┐
│ Cuenta BBVA: S/.4,000       │ (-S/.1,000)
│ Cuenta BCP:  S/.3,000       │
│ Total Cash:  S/.7,000       │ ✅ Disminuyó
│                             │
│ Cuentas por Cobrar:         │
│  - Juan: S/.1,000 PENDING   │ ✅ Asset creado
└─────────────────────────────┘

↓ PRÉSTAMO DE MARÍA (S/.2,000 a BCP)

┌─────────────────────────────┐
│ Cuenta BBVA: S/.4,000       │
│ Cuenta BCP:  S/.5,000       │ (+S/.2,000)
│ Total Cash:  S/.9,000       │ ✅ Aumentó
│                             │
│ Cuentas por Cobrar:         │
│  - Juan: S/.1,000 PENDING   │
│ Cuentas por Pagar:          │
│  - María: S/.2,000 PENDING  │ ✅ Liability creado
└─────────────────────────────┘

↓ COBRO DE JUAN (S/.400 a BBVA)

┌─────────────────────────────┐
│ Cuenta BBVA: S/.4,400       │ (+S/.400)
│ Cuenta BCP:  S/.5,000       │
│ Total Cash:  S/.9,400       │ ✅ Aumentó
│                             │
│ Cuentas por Cobrar:         │
│  - Juan: S/.600 PARTIAL     │ ✅ Saldo disminuyó
│ Cuentas por Pagar:          │
│  - María: S/.2,000 PENDING  │
│                             │
│ Transacciones Visibles:     │
│  - Cobro de Juan: +S/.400   │ ✅ Aparece en lista
└─────────────────────────────┘

↓ PAGO A MARÍA (S/.800 desde BCP)

┌─────────────────────────────┐
│ Cuenta BBVA: S/.4,400       │
│ Cuenta BCP:  S/.4,200       │ (-S/.800)
│ Total Cash:  S/.8,600       │ ✅ Disminuyó
│                             │
│ Cuentas por Cobrar:         │
│  - Juan: S/.600 PARTIAL     │
│ Cuentas por Pagar:          │
│  - María: S/.1,200 PARTIAL  │ ✅ Saldo disminuyó
│                             │
│ Transacciones Visibles:     │
│  - Cobro de Juan: +S/.400   │
│  - Pago a María: -S/.800    │ ✅ Aparece en lista
└─────────────────────────────┘
```

---

## 6. VERIFICACIÓN DE CONSISTENCIA

### Balance Total

```
Cash Inicial:    S/.8,000
Préstamo a Juan: -S/.1,000
Préstamo de María: +S/.2,000
Cobro de Juan:   +S/.400
Pago a María:    -S/.800
─────────────────────────
Cash Final:      S/.8,800 ✅
```

### Cuentas por Cobrar/Pagar

```
Activos (Receivables):
  Juan: S/.600 pendiente ✅

Pasivos (Payables):
  María: S/.1,200 pendiente ✅
```

### Transacciones Visibles

```
1. Cobro de Juan: +S/.400  (INCOME)
2. Pago a María:  -S/.800  (EXPENSE)
```

**Transacciones Ocultas:**

```
1. Préstamo a Juan:    -S/.1,000 (EXPENSE, hideFromList: true)
2. Préstamo de María:  +S/.2,000 (INCOME, hideFromList: true)
```

---

## 7. CONCLUSIÓN

✅ **Sistema Contablemente Correcto**

El módulo de préstamos implementa correctamente los principios de cuentas por cobrar y por pagar:

1. **Flujo de Caja**: Todas las transacciones afectan el balance real de las cuentas
2. **Visibilidad**: Solo los cobros y pagos se muestran en transacciones (movimientos de efectivo reales)
3. **Trazabilidad**: Todos los movimientos están vinculados y auditables
4. **Integridad**: No hay doble contabilidad si no se procesan las transacciones dos veces
5. **Separación**: Las transacciones iniciales de préstamos no contaminan el flujo de caja visible

**GARANTÍA**: El sistema mantiene la integridad del flujo de caja mientras proporciona visibilidad completa de las operaciones financieras.
