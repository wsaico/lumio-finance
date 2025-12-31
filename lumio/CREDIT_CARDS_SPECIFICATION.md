# 📊 ESPECIFICACIÓN PROFESIONAL - MÓDULO DE TARJETAS DE CRÉDITO

## 🎯 PARA USUARIOS SIN CONOCIMIENTO FINANCIERO

### ¿Qué es una Tarjeta de Crédito?

Una tarjeta de crédito es como un **préstamo automático del banco**. En lugar de usar tu propio dinero, usas dinero prestado del banco, con estas características:

#### 1. **Límite de Crédito** (Credit Limit)
- Es la **cantidad máxima** que el banco te permite deber
- Ejemplo: Si tu límite es S/. 5,000, no puedes gastar más de eso
- **Analogía**: Es como un "techo" de deuda permitida

#### 2. **Saldo Utilizado** (Used Balance / Debt)
- Es **cuánto has gastado** con la tarjeta
- Ejemplo: Si compraste por S/. 2,000, ese es tu saldo utilizado
- **Importante**: Este dinero lo debes pagar al banco

#### 3. **Crédito Disponible** (Available Credit)
- Es **cuánto puedes seguir gastando**
- Fórmula: `Disponible = Límite - Utilizado`
- Ejemplo: `S/. 5,000 - S/. 2,000 = S/. 3,000 disponibles`

#### 4. **Fecha de Corte** (Closing Day)
- El día del mes en que el banco **cierra tu cuenta** y suma todo lo que gastaste
- Ejemplo: Si la fecha de corte es día 15, el banco suma todos tus gastos del 16 del mes pasado al 15 de este mes
- **Resultado**: Te genera un "estado de cuenta" con el monto total a pagar

#### 5. **Fecha de Pago** (Payment Due Date)
- El **último día** en que debes pagar sin que te cobren intereses
- Ejemplo: Si la fecha de pago es día 5, debes pagar antes de ese día
- **Importante**: Si pagas después, te cobran intereses (dinero extra)

#### 6. **Pago Mínimo** (Minimum Payment)
- Es la **cantidad mínima** que debes pagar para que tu tarjeta no se bloquee
- Generalmente es el 5-10% de tu deuda total
- **Peligro**: Si solo pagas el mínimo, el resto acumula intereses

#### 7. **Intereses** (Interest Rate)
- Es el **costo de no pagar todo**
- Si no pagas el total antes de la fecha de pago, el banco te cobra un porcentaje extra
- Ejemplo: Si debes S/. 2,000 y no pagas, con 50% anual te cobrará ~S/. 83 extra por mes

---

## 💼 PARA EXPERTOS EN FINANZAS

### Modelo Financiero de Tarjetas de Crédito

#### A. Conceptos Fundamentales

**1. Saldo vs Deuda vs Disponible:**
```
Límite de Crédito:     S/. 10,000
(-) Saldo Utilizado:   S/. 3,500  (DEUDA)
(=) Crédito Disponible: S/. 6,500
```

**2. Ciclo de Facturación:**
```
Día 1-15:  Período de compras (Billing Cycle)
Día 16:    Fecha de corte (Closing Day)
Día 16-30: Período de gracia (Grace Period)
Día 5:     Fecha de pago (Payment Due Date - mes siguiente)
```

**3. Cálculo de Intereses:**
```
Tasa Mensual = Tasa Anual / 12
Interés = Saldo Pendiente × Tasa Mensual × Días / 30

Ejemplo:
Deuda: S/. 5,000
TEA: 60% anual
TEM: 60% / 12 = 5% mensual
Interés mensual: S/. 5,000 × 0.05 = S/. 250
```

**4. Pago Mínimo:**
```
Pago Mínimo = max(
    Saldo × 5%,
    S/. 50  // Mínimo absoluto
)
```

**5. Utilización de Crédito (Credit Utilization):**
```
Utilización % = (Saldo Utilizado / Límite de Crédito) × 100%

Ejemplo:
Utilizado: S/. 3,500
Límite:    S/. 10,000
Utilización: 35%

Recomendación: Mantener < 30% para buen score crediticio
```

---

## 🏗️ ARQUITECTURA TÉCNICA PROPUESTA

### 1. Modelo de Datos Corregido

#### A. Tabla `credit_cards` (Principal)

```sql
credit_cards
├── id                    UUID PRIMARY KEY
├── user_id               UUID REFERENCES profiles(id)
├── account_id            UUID REFERENCES accounts(id) -- NUEVO: Vinculación directa
├── card_name             VARCHAR(100) -- "Visa Interbank Platinum"
├── bank_name             VARCHAR(100) -- "Interbank"
├── last_four_digits      VARCHAR(4)
├── expiry_date           DATE -- NUEVO: MM/YYYY
├── card_network          VARCHAR(20) -- "VISA", "MASTERCARD", "AMEX"
│
├── credit_limit          DECIMAL(15,2) -- S/. 10,000
├── used_balance          DECIMAL(15,2) -- S/. 3,500 (DEUDA ACTUAL)
├── available_credit      DECIMAL(15,2) GENERATED AS (credit_limit - used_balance)
│
├── closing_day           INT -- 1-31
├── payment_due_day       INT -- 1-31
├── grace_period_days     INT DEFAULT 20
│
├── interest_rate_annual  DECIMAL(5,2) -- 60.00 (TEA)
├── interest_rate_monthly DECIMAL(5,2) GENERATED AS (interest_rate_annual / 12)
├── min_payment_percent   DECIMAL(5,2) DEFAULT 5.00
├── min_payment_absolute  DECIMAL(15,2) DEFAULT 50.00
│
├── currency_code         VARCHAR(3)
├── color                 VARCHAR(20)
├── icon                  VARCHAR(50)
├── is_active             BOOLEAN DEFAULT TRUE
├── is_blocked            BOOLEAN DEFAULT FALSE
├── created_at            TIMESTAMP
└── updated_at            TIMESTAMP
```

#### B. Tabla `credit_card_statements` (Estados de Cuenta)

```sql
credit_card_statements
├── id                    UUID PRIMARY KEY
├── credit_card_id        UUID REFERENCES credit_cards(id)
├── statement_date        DATE -- Fecha de corte
├── due_date              DATE -- Fecha de pago
│
├── previous_balance      DECIMAL(15,2) -- Saldo anterior
├── purchases             DECIMAL(15,2) -- Compras nuevas
├── payments              DECIMAL(15,2) -- Pagos realizados
├── interest_charged      DECIMAL(15,2) -- Intereses cobrados
├── fees_charged          DECIMAL(15,2) -- Comisiones
│
├── statement_balance     DECIMAL(15,2) -- Total a pagar
├── minimum_payment       DECIMAL(15,2) -- Pago mínimo
├── days_overdue          INT DEFAULT 0
│
├── status                VARCHAR(20) -- "PENDING", "PAID", "PARTIAL", "OVERDUE"
├── created_at            TIMESTAMP
└── updated_at            TIMESTAMP
```

#### C. Tabla `transactions` (MODIFICADA)

```sql
transactions
├── ... (campos existentes)
├── credit_card_id        UUID REFERENCES credit_cards(id) -- NUEVO
├── installments_total    INT -- NUEVO: Total de cuotas
├── installments_current  INT -- NUEVO: Cuota actual
├── parent_transaction_id UUID REFERENCES transactions(id) -- NUEVO: Para cuotas
└── ...
```

#### D. Tabla `credit_card_installments` (Cuotas/Liquidaciones)

```sql
credit_card_installments
├── id                    UUID PRIMARY KEY
├── credit_card_id        UUID REFERENCES credit_cards(id)
├── original_transaction_id UUID REFERENCES transactions(id)
├── total_amount          DECIMAL(15,2) -- S/. 1,200
├── installments_total    INT -- 12 cuotas
├── installment_amount    DECIMAL(15,2) -- S/. 100 por cuota
│
├── amount_paid           DECIMAL(15,2)
├── installments_paid     INT
├── next_due_date         DATE
│
├── status                VARCHAR(20) -- "ACTIVE", "PAID", "CANCELLED"
├── created_at            TIMESTAMP
└── updated_at            TIMESTAMP
```

---

### 2. Lógica de Negocio

#### A. Crear Transacción con Tarjeta de Crédito

```typescript
// Escenario: Compra de S/. 500 con tarjeta

async function createCreditCardPurchase(data: {
    creditCardId: string
    amount: number
    description: string
    categoryId: string
    installments?: number
}) {
    // 1. Validar límite de crédito disponible
    const card = await getCreditCard(data.creditCardId)
    const availableCredit = card.creditLimit - card.usedBalance

    if (data.amount > availableCredit) {
        throw new Error(`Límite excedido. Disponible: ${availableCredit}`)
    }

    // 2. Crear transacción principal
    const transaction = await prisma.transaction.create({
        data: {
            userId: card.userId,
            accountId: card.accountId, // Vinculado a account de tipo CREDIT_CARD
            creditCardId: card.id,
            transactionType: 'EXPENSE',
            amount: data.amount,
            description: data.description,
            expenseCategoryId: data.categoryId,
            metadata: {
                creditCardPurchase: true,
                installmentsTotal: data.installments || 1
            }
        }
    })

    // 3. Actualizar saldo utilizado de tarjeta
    await prisma.creditCard.update({
        where: { id: card.id },
        data: {
            usedBalance: card.usedBalance + data.amount
        }
    })

    // 4. Si hay cuotas, crear plan de liquidación
    if (data.installments && data.installments > 1) {
        await createInstallmentPlan({
            creditCardId: card.id,
            transactionId: transaction.id,
            totalAmount: data.amount,
            installments: data.installments
        })
    }

    // 5. Actualizar account balance (debe aumentar como pasivo)
    await updateAccountBalance(card.accountId, data.amount, 'increase_debt')
}
```

#### B. Registrar Pago de Tarjeta

```typescript
// Escenario: Pago de S/. 1,000 a la tarjeta

async function paymentCreditCard(data: {
    creditCardId: string
    paymentAmount: number
    paymentAccountId: string // Cuenta desde donde se paga
}) {
    const card = await getCreditCard(data.creditCardId)

    // 1. Validar que no se pague más de lo debido
    if (data.paymentAmount > card.usedBalance) {
        throw new Error(`Monto excede la deuda actual: ${card.usedBalance}`)
    }

    // 2. Validar saldo suficiente en cuenta de pago
    const paymentAccount = await getAccount(data.paymentAccountId)
    if (paymentAccount.currentBalance < data.paymentAmount) {
        throw new Error('Saldo insuficiente en cuenta de pago')
    }

    // 3. Crear transacción de pago (EXPENSE desde cuenta normal)
    const paymentTransaction = await prisma.transaction.create({
        data: {
            userId: card.userId,
            accountId: data.paymentAccountId,
            transactionType: 'EXPENSE',
            amount: data.paymentAmount,
            description: `Pago tarjeta ${card.cardName}`,
            metadata: {
                creditCardPayment: true,
                creditCardId: card.id
            }
        }
    })

    // 4. Reducir saldo utilizado de tarjeta
    await prisma.creditCard.update({
        where: { id: card.id },
        data: {
            usedBalance: card.usedBalance - data.paymentAmount
        }
    })

    // 5. Actualizar balance de cuenta de pago (disminuir)
    await updateAccountBalance(data.paymentAccountId, data.paymentAmount, 'decrease')

    // 6. Actualizar balance de account tarjeta (disminuir deuda)
    await updateAccountBalance(card.accountId, data.paymentAmount, 'decrease_debt')

    // 7. Registrar pago en estado de cuenta
    await recordPaymentInStatement(card.id, data.paymentAmount)
}
```

#### C. Generar Estado de Cuenta Mensual

```typescript
// Ejecutar automáticamente en fecha de corte

async function generateMonthlyStatement(creditCardId: string) {
    const card = await getCreditCard(creditCardId)
    const today = new Date()

    // Obtener transacciones desde último corte
    const lastStatement = await getLastStatement(creditCardId)
    const lastClosingDate = lastStatement?.statementDate ||
        new Date(today.getFullYear(), today.getMonth() - 1, card.closingDay)

    const transactions = await getTransactionsSinceDate(creditCardId, lastClosingDate)

    // Calcular totales
    const purchases = sumTransactions(transactions, 'EXPENSE')
    const payments = sumTransactions(transactions, 'INCOME') // Pagos recibidos

    // Calcular intereses si hay saldo pendiente
    let interestCharged = 0
    if (lastStatement && lastStatement.statementBalance > 0) {
        const daysOverdue = Math.max(0,
            daysBetween(lastStatement.dueDate, today))

        if (daysOverdue > 0) {
            interestCharged = calculateInterest({
                balance: lastStatement.statementBalance,
                annualRate: card.interestRateAnnual,
                days: daysOverdue
            })
        }
    }

    // Crear estado de cuenta
    const statementBalance =
        (lastStatement?.statementBalance || 0) +
        purchases -
        payments +
        interestCharged

    const minimumPayment = Math.max(
        statementBalance * (card.minPaymentPercent / 100),
        card.minPaymentAbsolute
    )

    const dueDate = new Date(today)
    dueDate.setDate(card.paymentDueDay)
    if (dueDate < today) {
        dueDate.setMonth(dueDate.getMonth() + 1)
    }

    await prisma.creditCardStatement.create({
        data: {
            creditCardId: card.id,
            statementDate: today,
            dueDate: dueDate,
            previousBalance: lastStatement?.statementBalance || 0,
            purchases: purchases,
            payments: payments,
            interestCharged: interestCharged,
            statementBalance: statementBalance,
            minimumPayment: minimumPayment,
            status: 'PENDING'
        }
    })
}

function calculateInterest(params: {
    balance: number
    annualRate: number
    days: number
}): number {
    // Interés simple diario
    const dailyRate = params.annualRate / 365
    return params.balance * (dailyRate / 100) * params.days
}
```

---

### 3. Flujos de Trabajo (Workflows)

#### Flujo 1: Compra con Tarjeta de Crédito
```
1. Usuario registra gasto de S/. 500
2. Selecciona "Tarjeta Visa Interbank"
3. Sistema valida:
   - ✓ Crédito disponible: S/. 6,500 > S/. 500
   - ✓ Tarjeta no vencida
   - ✓ Tarjeta no bloqueada
4. Crea transacción tipo EXPENSE
5. Incrementa `used_balance` de S/. 3,500 → S/. 4,000
6. Reduce `available_credit` de S/. 6,500 → S/. 6,000
7. Incrementa balance de Account (pasivo)
```

#### Flujo 2: Pago de Tarjeta
```
1. Usuario registra pago de S/. 1,000
2. Selecciona cuenta origen (ej: "Interbank Ahorros")
3. Sistema valida:
   - ✓ Saldo en cuenta: S/. 5,000 > S/. 1,000
   - ✓ Pago ≤ deuda actual: S/. 1,000 ≤ S/. 4,000
4. Crea transacción EXPENSE en cuenta origen
5. Reduce balance cuenta origen: S/. 5,000 → S/. 4,000
6. Reduce `used_balance` tarjeta: S/. 4,000 → S/. 3,000
7. Incrementa `available_credit`: S/. 6,000 → S/. 7,000
8. Reduce balance de Account tarjeta (pasivo)
```

#### Flujo 3: Generación Automática de Estado de Cuenta
```
1. Cron job se ejecuta cada día 15 (closing_day)
2. Para cada tarjeta con closing_day = 15:
   a. Suma compras desde último corte
   b. Suma pagos realizados
   c. Calcula intereses si hay mora
   d. Genera saldo total del estado
   e. Calcula pago mínimo
   f. Define fecha de vencimiento (payment_due_day)
3. Crea registro en `credit_card_statements`
4. Envía notificación al usuario
```

---

### 4. Integraciones con Módulos Existentes

#### A. Con Transacciones
```typescript
// Modificar transaction-form-modal.tsx

// Agregar opción de pago con tarjeta de crédito
<Select>
  <SelectItem value="CASH">Efectivo</SelectItem>
  <SelectItem value="ACCOUNT">Cuenta Bancaria</SelectItem>
  <SelectItem value="CREDIT_CARD">Tarjeta de Crédito</SelectItem> {/* NUEVO */}
</Select>

// Si selecciona CREDIT_CARD, mostrar:
{paymentMethod === 'CREDIT_CARD' && (
  <>
    <CreditCardSelector
      onSelect={(cardId) => setFormData({...formData, creditCardId: cardId})}
    />
    <InstallmentsSelector
      onSelect={(installments) => setFormData({...formData, installments})}
    />
  </>
)}
```

#### B. Con Cuentas
```typescript
// En AccountCard component, mejorar visualización de CREDIT_CARD

{accountType === 'CREDIT_CARD' && (
  <div className="space-y-2">
    {/* Mostrar barra de utilización */}
    <div className="text-xs text-muted-foreground">
      Utilizado: {formatMoney(usedBalance, currency)} de {formatMoney(creditLimit, currency)}
    </div>
    <Progress value={(usedBalance / creditLimit) * 100} />

    {/* Mostrar próximo pago */}
    <div className="text-xs">
      Próximo pago: {formatDate(nextDueDate)} - {formatMoney(minimumPayment, currency)}
    </div>
  </div>
)}
```

#### C. Con Préstamos
```typescript
// Diferencias clave:
// PRÉSTAMO:  Dinero que te prestan UNA VEZ y pagas en cuotas
// TARJETA:   Línea de crédito RENOVABLE, usas y pagas repetidamente

// En dashboard, mostrar sección separada:
// "Deudas" (Préstamos por Pagar + Saldo Tarjetas de Crédito)
```

#### D. Con Ajustes
```typescript
// En Settings, agregar configuración de tarjetas:

interface CreditCardSettings {
  // Alertas
  lowCreditAlert: boolean // Alertar cuando quede < 20% disponible
  paymentReminderDays: number // Recordar X días antes de vencimiento

  // Automatización
  autoPayMinimum: boolean // Pagar mínimo automáticamente
  autoPayFull: boolean // Pagar total automáticamente
  autoPayAccountId: string // Cuenta desde donde auto-pagar
}
```

---

### 5. Validaciones de Balance

#### A. Al Crear Compra con Tarjeta
```typescript
// Similar a validación de saldo en cuentas normales, pero invertido

const validation = useCreditValidation(
    creditCardId,
    purchaseAmount,
    creditCards
)

// Devuelve:
{
  valid: boolean // true si availableCredit >= purchaseAmount
  severity: 'error' | 'warning' | 'success'
  message: string
  details: {
    creditLimit: 10000,
    usedBalance: 3500,
    availableCredit: 6500,
    requestedAmount: 500,
    remainingAfter: 6000,
    utilizationAfter: 0.40 // 40%
  }
}
```

#### B. Al Pagar Tarjeta
```typescript
// Validar DOBLE:
// 1. Saldo suficiente en cuenta de pago
// 2. Pago no excede deuda actual

const paymentValidation = useCreditCardPaymentValidation(
    creditCardId,
    paymentAmount,
    paymentAccountId,
    creditCards,
    accounts
)
```

---

### 6. UI/UX Profesional

#### A. Tarjeta Visual (CreditCardVisual.tsx - Mejorado)
```tsx
<div className="credit-card-container">
  {/* Frente */}
  <div className="card-front">
    <div className="card-network">
      <VisaIcon /> {/* VISA, Mastercard, Amex */}
    </div>
    <div className="card-chip">
      <ChipIcon />
    </div>
    <div className="card-number">
      •••• •••• •••• {lastFourDigits}
    </div>
    <div className="card-holder">{cardName}</div>
    <div className="card-expiry">Vence: {expiryDate}</div>
  </div>

  {/* Indicadores */}
  <div className="card-metrics">
    {/* Barra de utilización */}
    <div className="utilization-bar">
      <span>Utilizado: {utilizationPercent}%</span>
      <Progress
        value={utilizationPercent}
        className={utilizationPercent > 80 ? 'text-red-500' : 'text-green-500'}
      />
    </div>

    {/* Disponible */}
    <div className="available-credit">
      <span className="label">Disponible</span>
      <span className="amount">{formatMoney(availableCredit, currency)}</span>
    </div>

    {/* Próximo pago */}
    <div className="next-payment">
      <span className="label">Próximo pago</span>
      <span className="date">{formatDate(nextDueDate)}</span>
      <span className="amount">{formatMoney(minimumPayment, currency)}</span>
    </div>
  </div>
</div>
```

---

### 7. Roadmap de Implementación

#### Fase 1: Fundación (Semana 1-2)
- [ ] Agregar campos faltantes a `credit_cards`
- [ ] Crear tabla `credit_card_statements`
- [ ] Agregar FK `credit_card_id` a `transactions`
- [ ] Completar API CRUD de credit-cards
- [ ] Completar hook `useCreditCards`

#### Fase 2: Lógica de Negocio (Semana 3-4)
- [ ] Implementar validación de crédito disponible
- [ ] Crear flujo de compra con tarjeta
- [ ] Crear flujo de pago de tarjeta
- [ ] Implementar cálculo de intereses
- [ ] Generar estados de cuenta automáticos

#### Fase 3: UI/UX (Semana 5)
- [ ] Mejorar CreditCardVisual component
- [ ] Agregar selector de tarjetas en TransactionForm
- [ ] Crear modal de pago de tarjeta
- [ ] Agregar dashboard de estados de cuenta
- [ ] Implementar alertas de pagos próximos

#### Fase 4: Integraciones (Semana 6)
- [ ] Integrar con módulo de cuentas
- [ ] Vincular con transacciones
- [ ] Agregar sección de deudas consolidadas
- [ ] Implementar configuración en Settings
- [ ] Testing end-to-end completo

---

Este documento sirve como especificación completa para la implementación profesional del módulo de tarjetas de crédito.

**Próximo paso**: Comenzar Fase 1 con tu aprobación.
