# Estrategia de Integración ZBB con Otros Módulos

## Decisión Arquitectónica Principal

### ✅ RECOMENDACIÓN: Sistema Híbrido con Sincronización Unidireccional

```
┌─────────────────────────────────────────────────────────────┐
│                    FLUJO DE DATOS                            │
└─────────────────────────────────────────────────────────────┘

    PLANIFICACIÓN          EJECUCIÓN          SEGUIMIENTO
         ↓                     ↓                   ↓
    ┌─────────┐          ┌─────────┐         ┌─────────┐
    │   ZBB   │ ══════> │ BUDGETS │ <══════ │  TRANS. │
    │Planning │          │ (Límites)│         │ (Reales)│
    └─────────┘          └─────────┘         └─────────┘
         │                     ║                   ║
         │                     ║                   ║
    ┌────┴────┐                ║                   ║
    │         │                ║                   ║
    NO afecta:                 ╠═══════════════════╣
    • Ingresos                 ║                   ║
    • Transacciones      SINCRONIZACIÓN      TRACKING
    • Saldos reales         AUTOMÁTICA         DIARIO
```

---

## 1. RELACIÓN: ZBB ↔ PRESUPUESTOS

### Opción A: Sincronización Total (RECOMENDADA)

**Cuando activas un Plan ZBB → Actualiza automáticamente los Budgets**

```sql
-- Cuando activas el ciclo ZBB
UPDATE budgets 
SET 
  limit_amount_usd = zbb_allocations.allocated_amount_usd,
  limit_amount_pen = zbb_allocations.allocated_amount_pen,
  is_zbb_controlled = TRUE,
  zbb_allocation_id = zbb_allocations.id,
  period_start = zbb_planning_cycles.period_start,
  period_end = zbb_planning_cycles.period_end
FROM zbb_allocations
JOIN zbb_planning_cycles ON zbb_allocations.cycle_id = zbb_planning_cycles.id
WHERE budgets.category_id = zbb_allocations.category_id
  AND zbb_planning_cycles.status = 'active';
```

#### Flujo de Usuario

```
DÍA 1 DEL MES: Usuario hace su Planificación ZBB
├── Define: Vivienda = $800 USD
├── Define: Alimentos = $400 USD
├── Define: Entretenimiento = $100 USD
└── [Activa Plan ZBB]
         ↓
    AUTOMÁTICAMENTE:
         ↓
    Budgets se actualizan:
    ├── budgets.limit_vivienda = $800
    ├── budgets.limit_alimentos = $400
    └── budgets.limit_entretenimiento = $100

DÍA 15 DEL MES: Usuario gasta en el día a día
├── Transacción: -$50 en Alimentos
│   └── budgets.spent_alimentos = $50
│   └── budgets.remaining_alimentos = $350 ✅
│
└── Usuario puede ver:
    ├── En módulo ZBB: "Planificaste $400, has gastado $50"
    └── En módulo Budget: "Límite $400, gastado $50, quedan $350"
```

#### Ventajas
✅ Un solo lugar para planificar (ZBB)
✅ El tracking diario funciona normal (Budgets)
✅ No hay duplicación de esfuerzo
✅ Usuario no necesita ajustar manualmente budgets después del ZBB

#### Desventajas
⚠️ Si usuario edita budget directamente, se pierde sincronización con ZBB
⚠️ Requiere lógica para resolver conflictos

---

### Opción B: Sistemas Independientes (NO RECOMENDADA)

**ZBB y Budgets funcionan por separado**

```
ZBB:      Es solo para PLANIFICAR mensualmente
          └── No afecta nada, solo análisis

Budgets:  Usuario debe copiar manualmente los valores del ZBB
          └── Trabajo duplicado
```

#### Por qué NO recomendarla
❌ Usuario tiene que hacer el trabajo 2 veces
❌ Alto riesgo de inconsistencias
❌ Poco valor agregado del ZBB

---

### Opción C: ZBB Reemplaza Totalmente a Budgets (EXTREMA)

**Eliminas el módulo de Budgets, todo es ZBB**

#### Por qué NO recomendarla
❌ ZBB es mensual/periódico, no continuo
❌ Usuario pierde flexibilidad de ajustes rápidos
❌ Demasiado rígido para uso diario

---

## 2. RELACIÓN: ZBB ↔ INGRESOS

### ✅ RECOMENDACIÓN: ZBB NO Crea Transacciones de Ingreso

**Los ingresos en ZBB son proyecciones, NO transacciones reales**

```
┌─────────────────────────────────────────────────────────┐
│  ZBB Planning Cycles                                    │
│  ├── total_income_usd: $3,000  ← Ingreso PROYECTADO   │
│  └── total_income_pen: S/5,000                         │
│                                                         │
│  Esto NO se registra en tabla "transactions"           │
└─────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────┐
│  Transactions (Ingresos Reales)                         │
│  ├── 01/01: +$1,500 (Salario - Parte 1) ✅             │
│  ├── 15/01: +$1,500 (Salario - Parte 2) ✅             │
│  └── Total real: $3,000 ✅ Coincide con ZBB            │
└─────────────────────────────────────────────────────────┘
```

#### Flujo de Usuario

```
INICIO DEL MES:
1. Usuario abre ZBB
   └── "¿Cuánto dinero tendrás este mes?"
   └── Usuario ingresa: $3,000 USD (ESTIMADO)

2. Sistema guarda en zbb_planning_cycles.total_income_usd
   └── Esto es solo un número de referencia para planificar

DURANTE EL MES:
3. Usuario recibe su salario real
   └── Va a módulo de Transacciones
   └── Registra: +$1,500 (Ingreso) el día 01/01
   └── Registra: +$1,500 (Ingreso) el día 15/01

4. Dashboard puede mostrar comparación:
   ┌────────────────────────────────────┐
   │ 💰 Ingresos de Enero               │
   ├────────────────────────────────────┤
   │ Planificado (ZBB): $3,000          │
   │ Real (a la fecha): $1,500          │
   │ Diferencia: -$1,500 (50%)          │
   │                                    │
   │ ⚠️ Aún faltan ingresos esperados   │
   └────────────────────────────────────┘
```

#### Por qué esta separación

✅ **ZBB es planificación**: "Espero ganar X"
✅ **Transactions es realidad**: "Realmente gané Y"
✅ **Permite análisis**: Comparar proyección vs realidad
✅ **Flexibilidad**: Si ganas más/menos de lo esperado, puedes ajustar ZBB

---

### Caso Especial: Crear Ingreso Automático (Opcional)

Si REALMENTE quieres auto-crear transacciones:

```typescript
// Opción: Al activar ZBB, crear transacciones "esperadas"
async function activateZBBCycle(cycleId: string) {
  const cycle = await getCycle(cycleId);
  
  // Crear transacciones "pendientes" como recordatorios
  if (cycle.total_income_usd > 0) {
    await createTransaction({
      type: 'income',
      category: 'salary',
      amount: cycle.total_income_usd,
      currency: 'USD',
      status: 'expected', // Estado especial
      expected_date: cycle.period_start,
      description: 'Ingreso planificado en ZBB',
    });
  }
}
```

#### Flujo con Transacciones Esperadas

```
AL ACTIVAR ZBB:
Sistema crea transacción:
├── Tipo: Ingreso
├── Monto: $3,000
├── Estado: "Esperado" 🟡
└── Fecha: 01/01/2026

CUANDO LLEGA EL INGRESO REAL:
Usuario marca transacción como "Confirmada":
├── Estado: "Esperado" → "Confirmado" ✅
├── Fecha real: 01/01/2026
└── Sistema valida: Coincide con ZBB
```

**⚠️ Advertencia**: Esto puede complicar el sistema. Solo hazlo si el usuario lo necesita.

---

## 3. SINCRONIZACIÓN DINÁMICA

### Escenario A: Usuario Edita ZBB a Mitad de Mes

```
SITUACIÓN:
Usuario planificó $400 para Alimentos
A mitad de mes, se da cuenta que necesita $500

FLUJO:
1. Usuario va a ZBB → Edita Alimentos: $400 → $500

2. Sistema valida:
   ¿Hay $100 disponibles en el pool?
   
   SI: ✅
   ├── Actualiza zbb_allocations.allocated_amount = $500
   ├── TRIGGER actualiza budgets.limit_amount = $500
   └── Usuario ve el cambio inmediatamente en ambos módulos
   
   NO: ❌
   └── Muestra error: "Debes reasignar desde otra categoría"

3. Transacciones NO se afectan
   └── Los gastos ya hechos siguen igual
   └── Solo el límite futuro cambia
```

### Escenario B: Usuario Edita Budget Directamente

```
SITUACIÓN:
Usuario va directo al módulo de Budgets (sin ZBB)
Cambia límite de Entretenimiento: $100 → $150

OPCIONES DE DISEÑO:

Opción 1: Sincronización Bidireccional (COMPLICADO)
├── Budget actualiza ZBB también
├── Recalcula pool de ZBB
└── Problema: Puede romper la lógica de "todo asignado"

Opción 2: Desincronizar (RECOMENDADO)
├── Budget cambia a $150
├── budgets.is_zbb_controlled = FALSE
├── Sistema muestra advertencia:
│   "⚠️ Este presupuesto ya no está controlado por ZBB"
└── Usuario puede:
    ├── Continuar con cambio manual
    └── O volver a sincronizar con ZBB

Opción 3: Bloquear Edición (RESTRICTIVO)
└── Si budget.is_zbb_controlled = TRUE
    └── Botón "Editar" deshabilitado
    └── Mensaje: "Edita desde tu Plan ZBB"
```

#### Recomendación: Opción 2 con Flag de Desincronización

```typescript
// En el componente de Budget
function BudgetCard({ budget }: { budget: Budget }) {
  if (budget.is_zbb_controlled) {
    return (
      <div className="border-blue-500 border-2">
        <Badge>🔗 Controlado por ZBB</Badge>
        <p>Límite: ${budget.limit_amount}</p>
        
        <button onClick={editInZBB}>
          Editar en ZBB
        </button>
        
        <button onClick={unlinkFromZBB}>
          Desconectar de ZBB (editar aquí)
        </button>
      </div>
    );
  }
  
  return (
    <div>
      <p>Límite: ${budget.limit_amount}</p>
      <button onClick={editDirectly}>
        Editar
      </button>
    </div>
  );
}
```

---

## 4. DASHBOARD INTEGRADO: Visión Completa

### Vista Mensual Consolidada

```
┌─────────────────────────────────────────────────────────────┐
│              RESUMEN FINANCIERO - ENERO 2026                 │
└─────────────────────────────────────────────────────────────┘

┌─ INGRESOS ──────────────────────────────────────────────────┐
│                                                              │
│  PLANIFICADO (ZBB)           REAL (Transacciones)           │
│  ┌────────────────┐          ┌────────────────┐            │
│  │  $3,000 USD    │          │  $3,000 USD ✅ │            │
│  │  S/5,000 PEN   │          │  S/4,800 PEN ⚠️│            │
│  └────────────────┘          └────────────────┘            │
│                                                              │
│  ⚠️ Diferencia PEN: -S/200 (Llegó menos de lo esperado)     │
└──────────────────────────────────────────────────────────────┘

┌─ GASTOS POR CATEGORÍA ──────────────────────────────────────┐
│                                                              │
│  Categoría     │ ZBB Plan │ Budget Límite │ Real Gastado   │
│  ─────────────┼──────────┼───────────────┼────────────────│
│  🏠 Vivienda   │  $800    │  $800 🔗      │  $800 (100%)  │
│  🛒 Alimentos  │  $400    │  $500 ⚠️      │  $450 (90%)   │
│  🎮 Entret.    │  $100    │  $100 🔗      │  $120 (120%)❌│
│                                                              │
│  🔗 = Sincronizado con ZBB                                  │
│  ⚠️ = Modificado manualmente, fuera de sincronización       │
│                                                              │
│  ⚠️ Entretenimiento excedió el presupuesto                  │
│  💡 Alimentos fue ajustado a $500 (no sincronizado con ZBB) │
└──────────────────────────────────────────────────────────────┘

┌─ ANÁLISIS ZBB ──────────────────────────────────────────────┐
│                                                              │
│  ✅ Planificación ZBB completada: 100%                       │
│  ⚠️ 1 categoría desincronizada (Alimentos)                  │
│  ❌ 1 categoría excedió límite (Entretenimiento)            │
│                                                              │
│  Sugerencias para próximo mes:                              │
│  • Aumentar presupuesto de Entretenimiento a $150           │
│  • Considerar reducir Vivienda o buscar alternativas        │
└──────────────────────────────────────────────────────────────┘
```

---

## 5. REGLAS DE NEGOCIO DEFINITIVAS

### Tabla de Decisiones

| Acción | ZBB | Budgets | Transactions | Explicación |
|--------|-----|---------|--------------|-------------|
| Usuario crea Plan ZBB | ✏️ Crea | ➡️ Actualiza | ❌ No afecta | ZBB define límites → Budgets los usa |
| Usuario activa Plan ZBB | ✅ Activa | 🔄 Sincroniza | ❌ No afecta | Budgets toman valores de ZBB |
| Usuario edita ZBB activo | ✏️ Edita | 🔄 Sincroniza | ❌ No afecta | Cambio se propaga a Budgets |
| Usuario edita Budget directamente | ⚠️ Se desvincula | ✏️ Edita | ❌ No afecta | Budget sale de control ZBB |
| Usuario registra gasto | ❌ No afecta | 📊 Descuenta | ✏️ Crea | Transaction → Budget (tracking) |
| Usuario registra ingreso real | 📊 Compara | ❌ No afecta | ✏️ Crea | Solo para análisis ZBB vs Real |
| Fin de mes | 📊 Cierra | ❌ No afecta | ❌ No afecta | ZBB se marca como "completed" |
| Inicio de nuevo mes | ✏️ Crea nuevo | 🔄 Puede copiar | ❌ No afecta | Opción de copiar plan anterior |

---

## 6. FLUJO COMPLETO DEL MES

```
DÍA 28 DEL MES ANTERIOR
┌────────────────────────────────┐
│ Usuario revisa mes que termina │
│ • Gastó $2,800 de $3,000       │
│ • Ahorró $200 ✅                │
└────────────────────────────────┘

DÍA 1 DEL NUEVO MES
┌────────────────────────────────┐
│ 1. Sistema notifica:           │
│    "Es hora de planificar      │
│     Febrero con ZBB"           │
│                                │
│ 2. Usuario abre ZBB            │
│    └─ Opción: Copiar plan      │
│       de Enero como base       │
│                                │
│ 3. Ajusta valores:             │
│    ├─ Vivienda: $800 (igual)  │
│    ├─ Alimentos: $450 (+$50)  │
│    └─ Entret.: $150 (+$50)    │
│                                │
│ 4. [Activa Plan ZBB]           │
│    └─ Budgets se actualizan ✅ │
└────────────────────────────────┘

DÍA 5: Usuario gasta
├─ Transacción: -$100 Alimentos
└─ Budget: $450 - $100 = $350 quedan

DÍA 15: Usuario recibe salario
├─ Transacción: +$1,500 Ingreso
└─ ZBB compara: $1,500 de $3,000 esperados (50%)

DÍA 20: Usuario necesita ajustar
├─ Va a ZBB
├─ Aumenta Alimentos: $450 → $500
├─ Reduce Entretenimiento: $150 → $100
└─ Budgets se actualizan automáticamente ✅

DÍA 28: Fin de mes
├─ Sistema cierra ciclo ZBB
├─ Genera reporte:
│   ├─ Planificado vs Real
│   ├─ Categorías excedidas
│   └─ Sugerencias para próximo mes
└─ Usuario listo para planificar Marzo
```

---

## 7. RECOMENDACIÓN FINAL

### Arquitectura Óptima

```
┌──────────────────────────────────────────────────────────┐
│                    MÓDULO ZBB                             │
│  Propósito: PLANIFICACIÓN mensual desde cero             │
│  Frecuencia: 1 vez al mes                                │
│  Datos: Ingresos proyectados + Gastos planificados       │
└────────────────┬─────────────────────────────────────────┘
                 │
                 │ SINCRONIZACIÓN UNIDIRECCIONAL
                 │ (Solo cuando usuario activa plan)
                 ↓
┌──────────────────────────────────────────────────────────┐
│                  MÓDULO BUDGETS                          │
│  Propósito: LÍMITES de gasto por categoría              │
│  Frecuencia: Continuo (todo el mes)                     │
│  Datos: Límites (de ZBB) + Gastado (de Transactions)    │
└────────────────┬─────────────────────────────────────────┘
                 │
                 │ TRACKING DIARIO
                 │ (Cada vez que hay transacción)
                 ↓
┌──────────────────────────────────────────────────────────┐
│               MÓDULO TRANSACTIONS                        │
│  Propósito: REGISTRO de gastos e ingresos reales        │
│  Frecuencia: Diario (múltiples veces al día)           │
│  Datos: Transacciones reales con fecha/monto/categoría  │
└──────────────────────────────────────────────────────────┘
```

### Reglas de Oro

1. ✅ **ZBB actualiza Budgets automáticamente** cuando activas el plan
2. ✅ **Transactions actualizan Budgets** en tiempo real (gastos)
3. ❌ **Transactions NO crean ingresos** desde ZBB
4. ⚠️ **Budgets pueden desvincularse** de ZBB si usuario edita manualmente
5. 📊 **ZBB muestra comparaciones** entre planificado vs real

---

## 8. CASOS ESPECIALES

### Caso: Usuario Gana Más de lo Planificado

```
ZBB: Planificó $3,000
Real: Ganó $3,500 (+$500)

OPCIONES:
1. Sistema muestra notificación:
   "💰 ¡Ganaste $500 más de lo esperado!"
   
   ¿Qué deseas hacer?
   ○ Asignar a ahorros
   ○ Distribuir en categorías existentes
   ○ Crear nueva categoría
   ○ Dejar sin asignar (por ahora)

2. Usuario elige y ZBB se actualiza
   └─ Budgets se sincronizan con nuevo valor
```

### Caso: Usuario Gana Menos de lo Planificado

```
ZBB: Planificó $3,000
Real: Ganó $2,500 (-$500)

OPCIONES:
1. Sistema muestra alerta:
   "⚠️ Faltan $500 de ingreso esperado"
   
   Recomendaciones:
   • Reduce gastos opcionales
   • Usa fondo de emergencia
   • Ajusta plan ZBB para próximo mes

2. Usuario puede ajustar ZBB a mitad de mes
   └─ Reduce categorías de baja prioridad
```

---

**Conclusión**: El ZBB es una capa de PLANIFICACIÓN que alimenta a Budgets, pero NO reemplaza ni interfiere con el tracking diario de Transactions.