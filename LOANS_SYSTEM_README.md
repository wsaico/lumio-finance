# 💼 Sistema Profesional de Cuentas por Cobrar/Pagar

## 📊 **RESUMEN EJECUTIVO**

Este sistema implementa un módulo profesional de gestión de préstamos basado en principios contables GAAP/NIIF, separando correctamente:

- **Cuentas por Cobrar**: Dinero que otros te deben (activos)
- **Cuentas por Pagar**: Dinero que tú debes (pasivos)

### ✅ **Características Principales**

1. **Pagos Parciales Ilimitados**: Soporta múltiples abonos a un préstamo
2. **Estados Automáticos**: PENDING → PARTIAL → COLLECTED/PAID
3. **Detección de Vencimientos**: Marca automáticamente préstamos vencidos
4. **Flujo de Caja Correcto**: No confunde préstamos con ingresos/gastos
5. **Trazabilidad Completa**: Cada pago se registra con su transacción asociada
6. **UI/UX Profesional**: Diseño tipo fintech moderno

---

## 🗄️ **ARQUITECTURA DE BASE DE DATOS**

### **Tablas Creadas**

```sql
accounts_receivable  -- Cuentas por cobrar
accounts_payable     -- Cuentas por pagar
loan_payments        -- Historial de pagos
```

### **Campos Clave**

- `original_amount`: Monto inicial del préstamo
- `outstanding_balance`: Saldo pendiente (se actualiza con cada pago)
- `status`: PENDING | PARTIAL | COLLECTED | PAID | OVERDUE | CANCELLED
- `due_date`: Fecha de vencimiento (opcional)
- `interest_rate`: Tasa de interés (para futura implementación)

---

## 🚀 **INSTALACIÓN**

### **1. Ejecutar Migraciones**

```bash
# Opción A: Desde Supabase Dashboard
# 1. Ve a SQL Editor
# 2. Copia el contenido de: lumio/prisma/migrations/create_accounts_receivable_payable.sql
# 3. Ejecuta el script

# Opción B: Desde CLI (si tienes acceso)
psql -U postgres -d your_database -f lumio/prisma/migrations/create_accounts_receivable_payable.sql
```

### **2. Verificar Instalación**

```sql
-- Verificar que las tablas existan
SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'public'
AND table_name IN ('accounts_receivable', 'accounts_payable', 'loan_payments');

-- Debe retornar 3 filas
```

---

## 📁 **ESTRUCTURA DE ARCHIVOS**

```
lumio/
├── types/
│   └── loans.ts                              # ✅ Tipos TypeScript
├── app/api/
│   ├── accounts-receivable/
│   │   └── route.ts                          # ✅ API Cuentas por Cobrar
│   └── accounts-payable/
│       └── route.ts                          # ✅ API Cuentas por Pagar
├── hooks/
│   ├── use-accounts-receivable.ts            # ✅ React Query hooks
│   └── use-accounts-payable.ts               # ✅ React Query hooks
├── components/loans/                          # ⏳ PENDIENTE
│   ├── loan-card.tsx                         # Card individual de préstamo
│   ├── payment-modal.tsx                     # Modal para registrar pagos
│   └── loans-summary.tsx                     # Resumen estadístico
├── app/(dashboard)/dashboard/loans/           # ⏳ PENDIENTE
│   └── page.tsx                              # Página principal del módulo
└── prisma/migrations/
    └── create_accounts_receivable_payable.sql # ✅ Script de migración
```

---

## 🔄 **FLUJO DE TRABAJO**

### **Escenario 1: Prestar Dinero (Account Receivable)**

```typescript
// Usuario: "Presté S/.1,000 a Juan"

const createReceivable = useCreateAccountReceivable()

createReceivable.mutate({
    contactName: "Juan",
    amount: 1000,
    currencyCode: "PEN",
    dueDate: "2025-01-26",
    accountId: "cuenta-bbva-id", // De donde sale el dinero
})

// ✅ Resultado:
// 1. Se crea transacción EXPENSE oculta (money out)
// 2. Se crea cuenta por cobrar con status PENDING
// 3. Balance de cuenta: -S/.1,000
```

### **Escenario 2: Cobrar Parcialmente**

```typescript
// Usuario: "Juan me pagó S/.400"

const registerPayment = useRegisterPayment()

registerPayment.mutate({
    id: "receivable-id",
    paymentAmount: 400,
    accountId: "cuenta-bbva-id", // Donde entra el dinero
    notes: "Primer abono"
})

// ✅ Resultado:
// 1. Se crea transacción INCOME visible (money in)
// 2. Se registra pago en loan_payments
// 3. outstanding_balance: 1000 - 400 = S/.600
// 4. status: PARTIAL
// 5. Balance de cuenta: +S/.400
```

### **Escenario 3: Cobrar Resto**

```typescript
// Usuario: "Juan me pagó los S/.600 restantes"

registerPayment.mutate({
    id: "receivable-id",
    paymentAmount: 600,
    accountId: "cuenta-bbva-id",
})

// ✅ Resultado:
// 1. Se crea transacción INCOME
// 2. outstanding_balance: 600 - 600 = S/.0
// 3. status: COLLECTED (automático por trigger)
// 4. collected_at: timestamp actual
// 5. Balance total recuperado: S/.1,000
```

---

## 🎨 **UI/UX PROPUESTA**

### **Vista Principal**

```
┌──────────────────────────────────────────────┐
│ 💰 Préstamos y Deudas        [+ Nuevo]      │
├──────────────────────────────────────────────┤
│                                              │
│ 📊 Resumen                                   │
│ ┌────────────┬────────────┬────────────┐    │
│ │ Por Cobrar │ Por Pagar  │  Vencidos  │    │
│ │  S/.3,000  │  S/.1,500  │     2      │    │
│ └────────────┴────────────┴────────────┘    │
│                                              │
│ 🔵 Por Cobrar (3)              [Filtros ▼]  │
│ ┌──────────────────────────────────────┐    │
│ │ 👤 Juan                              │    │
│ │ S/.600 / S/.1,000  ████░░  60%       │    │
│ │ Vence en 30 días • PARCIAL           │    │
│ │ [💰 Cobrar] [📋 Ver Detalles]       │    │
│ └──────────────────────────────────────┘    │
│                                              │
│ 🔴 Por Pagar (2)                            │
│ ┌──────────────────────────────────────┐    │
│ │ 👤 María                             │    │
│ │ S/.1,500 pendiente  ⚠️  VENCIDO     │    │
│ │ Vencido hace 5 días                  │    │
│ │ [💸 Pagar] [📋 Ver Detalles]        │    │
│ └──────────────────────────────────────┘    │
└──────────────────────────────────────────────┘
```

---

## 📊 **PRÓXIMOS PASOS PENDIENTES**

### **Para completar la implementación:**

1. ⏳ Crear componentes UI (loan-card, payment-modal, loans-summary)
2. ⏳ Crear página /dashboard/loans
3. ⏳ Añadir enlace en sidebar
4. ⏳ Filtrar transacciones de préstamos en transaction-list
5. ⏳ Implementar dashboard de estadísticas
6. ⏳ Sistema de notificaciones de vencimientos
7. ⏳ Exportación de reportes
8. ⏳ Calculadora de intereses (opcional)

---

## 🔐 **SEGURIDAD Y VALIDACIONES**

- ✅ Autenticación requerida en todos los endpoints
- ✅ Row Level Security (RLS) por user_id
- ✅ Validación con Zod en backend
- ✅ Triggers automáticos previenen estados inconsistentes
- ✅ Constraints de BD previenen saldos negativos
- ✅ Soft delete (CANCELLED) en lugar de DELETE hard

---

## 📈 **MÉTRICAS Y REPORTES**

El sistema permite calcular:

- Total de dinero prestado vs cobrado
- Total de deudas vs pagado
- Préstamos vencidos
- Tasa de cobro promedio
- Historial de pagos por contacto
- Flujo de caja mensual de préstamos

---

## 🛠️ **TROUBLESHOOTING**

### **Error: "La tabla no existe"**
```bash
# Verificar que corriste las migraciones
SELECT * FROM accounts_receivable LIMIT 1;
```

### **Error: "No autorizado"**
```bash
# Verificar autenticación
# El token debe estar presente en headers
```

### **Error: "El pago excede el saldo"**
```bash
# Verificar outstanding_balance antes de pagar
GET /api/accounts-receivable/:id
```

---

## 📞 **SOPORTE**

Para dudas o problemas:
1. Revisar logs del servidor
2. Verificar consola del navegador
3. Revisar estado de las queries en React Query Devtools

---

**Sistema desarrollado con principios GAAP/NIIF**
**Arquitectura profesional escalable y mantenible**
