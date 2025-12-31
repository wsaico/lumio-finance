# 💰 Solución Profesional: Prevención de Saldo Negativo

## Problema Identificado

**CRÍTICO**: El sistema permite crear transacciones (gastos, transferencias, préstamos) que resultan en saldos negativos sin ninguna validación o advertencia.

### Escenarios Problemáticos:

```
Cuenta Bancaria: $100
Usuario crea GASTO: $200
Resultado: Balance = -$100 ❌ SIN ADVERTENCIA

Cuenta Bancaria: $50
Usuario crea PRÉSTAMO: $500 (prestar a alguien)
Resultado: Balance = -$450 ❌ SIN ADVERTENCIA
```

---

## Análisis: Cómo lo Haría un Experto en Finanzas

### 1. **Principios Financieros**

#### Tipos de Cuenta y Sobregiro:

Un experto en finanzas distingue entre:

**A) Cuentas de Ahorro/Débito** (Cash Accounts):
- ❌ NO permiten saldo negativo
- Operan solo con dinero disponible
- Ejemplos: Efectivo, cuenta de ahorros, billetera

**B) Cuentas de Crédito** (Credit Accounts):
- ✅ Permiten saldo negativo hasta límite de crédito
- Ejemplos: Tarjeta de crédito, línea de crédito

**C) Cuentas con Sobregiro Autorizado** (Overdraft):
- ✅ Permiten saldo negativo hasta límite configurado
- Se cobran comisiones
- Ejemplo: Cuenta corriente con sobregiro

### 2. **Validación por Niveles**

#### Nivel 1: BLOQUEANTE (Hard Stop)
```
Cuenta SIN sobregiro + Operación > Saldo
→ ❌ RECHAZAR transacción
→ Mostrar error claro
→ No permitir continuar
```

#### Nivel 2: ADVERTENCIA (Soft Warning)
```
Cuenta CON sobregiro + Operación > Saldo pero < Límite
→ ⚠️ ADVERTIR al usuario
→ Mostrar comisión por sobregiro
→ Requiere confirmación explícita
```

#### Nivel 3: INFORMACIÓN (Proactive Alert)
```
Saldo bajo (< 20% del promedio histórico)
→ ℹ️ ALERTAR preventivamente
→ "Tu saldo está bajo. Considera revisar gastos próximos."
```

---

## Análisis: Cómo lo Haría un Experto en UX/UI

### 1. **Feedback Inmediato (Real-time)**

```
┌─────────────────────────────────────────┐
│  Registrar Gasto                         │
├─────────────────────────────────────────┤
│  Cuenta: Banco BCP                       │
│  Saldo actual: S/. 500.00                │
│                                          │
│  Monto: S/. 700.00  ⚠️                   │
│  ┌─────────────────────────────────┐    │
│  │ ⚠️ Saldo insuficiente            │    │
│  │ Necesitas S/. 200.00 adicionales │    │
│  │                                   │    │
│  │ Saldo después: S/. -200.00       │    │
│  └─────────────────────────────────┘    │
│                                          │
│  [Cancelar]  [Continuar de todos modos] │
└─────────────────────────────────────────┘
```

### 2. **Prevención Visual**

```typescript
// Indicadores visuales en tiempo real:

Saldo: $500
Monto ingresado: $300
→ Input: borde verde ✅
→ Mensaje: "Saldo después: $200" (verde)

Monto ingresado: $600
→ Input: borde rojo 🔴
→ Mensaje: "⚠️ Excede saldo disponible"
→ Badge: "Sobregiro: -$100"
```

### 3. **Progresividad (Progressive Disclosure)**

**Paso 1**: Advertencia sutil
```
💡 Sugerencia: Este gasto dejará tu cuenta con saldo bajo
```

**Paso 2**: Advertencia clara
```
⚠️ Advertencia: No tienes fondos suficientes
   Faltan: $100
```

**Paso 3**: Bloqueo total
```
❌ No se puede completar la operación
   Saldo insuficiente. Considera:
   • Transferir desde otra cuenta
   • Reducir el monto
   • Activar sobregiro
```

### 4. **Contexto y Alternativas**

```
┌─────────────────────────────────────────┐
│  ❌ Saldo insuficiente                   │
├─────────────────────────────────────────┤
│  Intentas gastar: S/. 700               │
│  Saldo disponible: S/. 500              │
│  Faltante: S/. 200                      │
│                                          │
│  💡 Opciones:                            │
│  → Reducir monto a S/. 500              │
│  → Transferir S/. 200 desde otra cuenta │
│  → Programar pago para más tarde        │
│                                          │
│  [Cancelar]  [Ver alternativas]         │
└─────────────────────────────────────────┘
```

---

## Solución Recomendada: Enfoque Híbrido

### **Fase 1: Validación Básica (MVP)** ✅ IMPLEMENTAR YA

#### A. Validación en Frontend (UX Inmediata)

```typescript
// En CreateLoanModal, TransactionFormModal, PaymentModal

const validateBalance = (accountId: string, amount: number) => {
  const account = accounts?.find(a => a.id === accountId)
  if (!account) return { valid: false, error: 'Cuenta no encontrada' }

  const balanceAfter = account.balance - amount

  // HARD STOP: Saldo negativo no permitido
  if (balanceAfter < 0) {
    return {
      valid: false,
      error: `Saldo insuficiente. Disponible: ${formatMoney(account.balance)}`,
      shortage: Math.abs(balanceAfter),
      balanceAfter
    }
  }

  // WARNING: Saldo bajo (< 10% del balance)
  if (balanceAfter < account.balance * 0.1 && balanceAfter > 0) {
    return {
      valid: true,
      warning: `⚠️ Esta operación dejará tu saldo muy bajo: ${formatMoney(balanceAfter)}`,
      balanceAfter
    }
  }

  return { valid: true, balanceAfter }
}
```

#### B. Feedback Visual Real-time

```typescript
// Watch del monto ingresado
const watchAmount = form.watch("amount")
const watchAccountId = form.watch("accountId")

const balanceValidation = useMemo(() => {
  if (!watchAmount || !watchAccountId) return null
  return validateBalance(watchAccountId, Number(watchAmount))
}, [watchAmount, watchAccountId, accounts])

// En UI:
{balanceValidation?.error && (
  <Alert variant="destructive">
    <AlertCircle className="h-4 w-4" />
    <AlertTitle>Saldo insuficiente</AlertTitle>
    <AlertDescription>
      {balanceValidation.error}
      <div className="mt-2 text-sm">
        Faltante: {formatMoney(balanceValidation.shortage)}
      </div>
    </AlertDescription>
  </Alert>
)}

{balanceValidation?.warning && (
  <Alert variant="warning">
    <AlertTriangle className="h-4 w-4" />
    <AlertDescription>{balanceValidation.warning}</AlertDescription>
  </Alert>
)}
```

#### C. Deshabilitar Botón Submit

```typescript
<Button
  type="submit"
  disabled={!balanceValidation?.valid || isLoading}
>
  {balanceValidation?.error ? 'Saldo insuficiente' : 'Registrar'}
</Button>
```

#### D. Vista Previa del Saldo

```typescript
{watchAmount > 0 && watchAccountId && (
  <div className="p-4 rounded-lg border bg-muted/30">
    <div className="flex justify-between text-sm">
      <span className="text-muted-foreground">Saldo actual:</span>
      <span className="font-medium">
        {formatMoney(selectedAccount.balance)}
      </span>
    </div>
    <div className="flex justify-between text-sm mt-1">
      <span className="text-muted-foreground">Monto:</span>
      <span className="font-medium text-red-600">
        -{formatMoney(watchAmount)}
      </span>
    </div>
    <div className="h-px bg-border my-2" />
    <div className="flex justify-between">
      <span className="font-semibold">Saldo después:</span>
      <span className={cn(
        "font-bold",
        balanceValidation?.balanceAfter < 0 ? "text-red-600" : "text-green-600"
      )}>
        {formatMoney(balanceValidation?.balanceAfter || 0)}
      </span>
    </div>
  </div>
)}
```

---

### **Fase 2: Validación en Backend (Seguridad)** ✅ IMPLEMENTAR DESPUÉS

```typescript
// En /api/accounts-receivable, /api/accounts-payable, /api/transactions

// Antes de crear transacción:
const { data: account } = await supabase
  .from('accounts')
  .select('current_balance, allow_overdraft, overdraft_limit')
  .eq('id', accountId)
  .single()

const balanceAfter = Number(account.current_balance) - amount

// Validación estricta
if (!account.allow_overdraft && balanceAfter < 0) {
  return new NextResponse(
    JSON.stringify({
      error: 'Saldo insuficiente',
      details: {
        available: account.current_balance,
        required: amount,
        shortage: Math.abs(balanceAfter)
      }
    }),
    { status: 400 }
  )
}

// Con sobregiro permitido
if (account.allow_overdraft && balanceAfter < -account.overdraft_limit) {
  return new NextResponse(
    JSON.stringify({
      error: 'Excede límite de sobregiro',
      details: {
        limit: account.overdraft_limit,
        wouldBe: balanceAfter
      }
    }),
    { status: 400 }
  )
}
```

---

### **Fase 3: Configuración Avanzada de Cuentas** 🔮 FUTURO

```typescript
// Agregar campos a tabla 'accounts':
interface Account {
  id: string
  name: string
  current_balance: number
  account_type: 'CASH' | 'CREDIT' | 'CHECKING'
  allow_overdraft: boolean
  overdraft_limit: number
  overdraft_fee: number
  minimum_balance: number
  alert_threshold: number // Porcentaje para alertas
}
```

#### UI de Configuración:

```
┌──────────────────────────────────────┐
│  Configuración de Cuenta: Banco BCP  │
├──────────────────────────────────────┤
│  Tipo de cuenta:                     │
│  ○ Efectivo (no permite negativo)    │
│  ● Cuenta corriente                  │
│  ○ Tarjeta de crédito               │
│                                      │
│  ☑ Permitir sobregiro                │
│  Límite: S/. 500.00                  │
│  Comisión: S/. 10.00 por uso         │
│                                      │
│  Saldo mínimo: S/. 100.00            │
│  Alertar cuando quede menos de: 20%  │
└──────────────────────────────────────┘
```

---

## Matriz de Decisión: ¿Permitir o Bloquear?

| Tipo de Cuenta | Sobregiro Config. | Saldo Después | Acción |
|----------------|-------------------|---------------|---------|
| CASH | No | Negativo | ❌ BLOQUEAR |
| CASH | No | Positivo bajo | ⚠️ ADVERTIR |
| CHECKING | Sí, límite $500 | -$300 | ⚠️ ADVERTIR + confirmar |
| CHECKING | Sí, límite $500 | -$600 | ❌ BLOQUEAR |
| CREDIT | N/A | Dentro límite | ✅ PERMITIR |
| CREDIT | N/A | Excede límite | ❌ BLOQUEAR |

---

## Implementación Prioritaria

### 🔴 CRÍTICO - Implementar HOY:

1. **Validación básica de saldo en frontend**
   - Función `validateBalance()`
   - Alert de error visible
   - Deshabilitar submit si insuficiente

2. **Feedback visual en tiempo real**
   - Vista previa "Saldo después"
   - Color rojo si negativo
   - Mensaje claro de faltante

3. **Aplicar en 3 lugares**:
   - ✅ CreateLoanModal (crear préstamo)
   - ✅ PaymentModal (pagar deuda)
   - ✅ TransactionFormModal (gastos/transferencias)

### 🟡 IMPORTANTE - Esta semana:

4. **Validación en backend**
   - Rechazar transacciones con saldo insuficiente
   - Error HTTP 400 con detalles

5. **Tests de casos edge**
   - Múltiples transacciones simultáneas
   - Race conditions
   - Validación con conversión de moneda

### 🟢 MEJORA - Próximo sprint:

6. **Configuración de cuentas**
   - Campo `allow_overdraft`
   - Campo `overdraft_limit`
   - UI de configuración

7. **Alertas proactivas**
   - Notificación cuando saldo < 20%
   - Dashboard con cuentas en riesgo

---

## Código de Ejemplo: Implementación Completa

### 1. Hook Reutilizable

```typescript
// hooks/use-balance-validation.ts
export function useBalanceValidation(
  accountId: string | undefined,
  amount: number,
  accounts: Account[]
) {
  return useMemo(() => {
    if (!accountId || !amount) return null

    const account = accounts?.find(a => a.id === accountId)
    if (!account) return { valid: false, error: 'Cuenta no encontrada' }

    const balanceAfter = Number(account.current_balance) - amount

    // Hard stop: No negative balance
    if (balanceAfter < 0) {
      return {
        valid: false,
        severity: 'error' as const,
        message: 'Saldo insuficiente',
        details: {
          available: account.current_balance,
          required: amount,
          shortage: Math.abs(balanceAfter),
          balanceAfter
        }
      }
    }

    // Warning: Low balance (< 10%)
    const threshold = account.current_balance * 0.1
    if (balanceAfter < threshold && balanceAfter > 0) {
      return {
        valid: true,
        severity: 'warning' as const,
        message: 'Esta operación dejará tu saldo muy bajo',
        details: { balanceAfter, threshold }
      }
    }

    return {
      valid: true,
      severity: 'success' as const,
      details: { balanceAfter }
    }
  }, [accountId, amount, accounts])
}
```

### 2. Componente de Alert

```typescript
// components/ui/balance-alert.tsx
export function BalanceAlert({ validation }: { validation: ValidationResult }) {
  if (!validation) return null

  const { severity, message, details } = validation

  if (severity === 'error') {
    return (
      <Alert variant="destructive" className="border-red-500 bg-red-50">
        <XCircle className="h-5 w-5" />
        <AlertTitle className="font-bold">❌ {message}</AlertTitle>
        <AlertDescription className="mt-2 space-y-2">
          <div className="grid grid-cols-2 gap-2 text-sm">
            <div>Disponible:</div>
            <div className="font-semibold">{formatMoney(details.available)}</div>
            <div>Necesitas:</div>
            <div className="font-semibold">{formatMoney(details.required)}</div>
            <div className="text-red-700">Faltante:</div>
            <div className="font-bold text-red-700">{formatMoney(details.shortage)}</div>
          </div>

          <div className="mt-3 pt-3 border-t border-red-200">
            <p className="text-xs font-medium">💡 Opciones:</p>
            <ul className="text-xs mt-1 space-y-1">
              <li>• Reduce el monto a {formatMoney(details.available)}</li>
              <li>• Transfiere fondos desde otra cuenta</li>
              <li>• Programa la operación para más tarde</li>
            </ul>
          </div>
        </AlertDescription>
      </Alert>
    )
  }

  if (severity === 'warning') {
    return (
      <Alert variant="default" className="border-yellow-500 bg-yellow-50">
        <AlertTriangle className="h-5 w-5 text-yellow-600" />
        <AlertTitle className="text-yellow-900">⚠️ {message}</AlertTitle>
        <AlertDescription className="text-yellow-800">
          Saldo después: <span className="font-bold">{formatMoney(details.balanceAfter)}</span>
        </AlertDescription>
      </Alert>
    )
  }

  return null
}
```

### 3. Uso en Modal

```typescript
// En CreateLoanModal.tsx
const balanceValidation = useBalanceValidation(
  formData.accountId,
  formData.amount,
  accounts
)

return (
  <form onSubmit={handleSubmit}>
    {/* ... campos del formulario ... */}

    {/* Balance preview */}
    {formData.amount > 0 && formData.accountId && (
      <div className="space-y-3">
        <BalancePreview
          currentBalance={selectedAccount.balance}
          amount={formData.amount}
          balanceAfter={balanceValidation?.details.balanceAfter}
          currencyCode={formData.currencyCode}
        />

        <BalanceAlert validation={balanceValidation} />
      </div>
    )}

    {/* Submit button */}
    <Button
      type="submit"
      disabled={!balanceValidation?.valid || isLoading}
    >
      {isLoading ? 'Procesando...' :
       !balanceValidation?.valid ? 'Saldo insuficiente' :
       'Crear Préstamo'}
    </Button>
  </form>
)
```

---

## Resumen Ejecutivo

### ✅ Lo que DEBE implementarse:

1. **Validación de saldo en tiempo real** (frontend)
2. **Feedback visual claro** (rojo = error, amarillo = advertencia)
3. **Bloqueo de submit** cuando saldo insuficiente
4. **Vista previa "Saldo después"** en todos los formularios
5. **Validación en backend** como capa de seguridad

### ❌ Lo que NO se debe hacer:

1. Permitir saldos negativos sin advertencia
2. Validar solo en backend (UX mala)
3. Mostrar error genérico sin detalles
4. Permitir continuar sin confirmación explícita

### 🎯 Beneficios:

- **Previene errores costosos**: Usuario no puede gastar más de lo que tiene
- **UX transparente**: Siempre sabe cuánto le quedará
- **Confianza**: Sistema que cuida las finanzas del usuario
- **Profesional**: Comportamiento esperado en apps financieras serias

---

## Decisión Final Recomendada

**Implementar Fase 1 (MVP) de inmediato:**
- Validación frontend con feedback visual
- Bloqueo de operaciones con saldo insuficiente
- Sin configuración de sobregiro (se asume CASH account)

**Ventajas:**
- ✅ Rápido de implementar (2-3 horas)
- ✅ Resuelve el 95% de casos de uso
- ✅ UX profesional
- ✅ Previene errores financieros

**Próximos pasos:**
- Semana 2: Validación backend
- Sprint 2: Configuración de cuentas con sobregiro
