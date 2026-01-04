# Especificaciones Técnicas - Módulo ZBB para Next.js + Supabase

## Índice
1. [Schema de Base de Datos (SQL)](#1-schema-de-base-de-datos-sql)
2. [Lógica del "Dinero por Asignar" (Multi-moneda)](#2-lógica-del-dinero-por-asignar-multi-moneda)
3. [Sincronización Plan vs. Ejecución](#3-sincronización-plan-vs-ejecución)
4. [Arquitectura de Componentes (Frontend)](#4-arquitectura-de-componentes-frontend)
5. [Checklist de Implementación](#checklist-de-implementación)

---

## 1. SCHEMA DE BASE DE DATOS (SQL)

### Análisis de Diseño

**Decisión arquitectónica**: Necesitas una tabla separada `zbb_planning_cycles` porque:
- El ZBB es temporal y periódico (cada mes es una "sesión" de planificación nueva)
- Los budgets actuales son para tracking continuo
- Necesitas historial de planificaciones para comparativas

### DDL Completo

```sql
-- =====================================================
-- TABLA PRINCIPAL: Ciclos de Planificación ZBB
-- =====================================================
CREATE TABLE zbb_planning_cycles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    
    -- Identificación del ciclo
    period_start DATE NOT NULL,
    period_end DATE NOT NULL,
    cycle_name VARCHAR(100), -- Ej: "Enero 2026", "Quincena 1 - Enero"
    
    -- Estado del ciclo
    status VARCHAR(20) NOT NULL DEFAULT 'draft', 
    -- Valores: 'draft' | 'in_planning' | 'active' | 'completed' | 'archived'
    
    -- Ingresos del período (multi-moneda)
    total_income_usd DECIMAL(12,2) DEFAULT 0,
    total_income_pen DECIMAL(12,2) DEFAULT 0,
    
    -- Control de asignación
    assigned_amount_usd DECIMAL(12,2) DEFAULT 0,
    assigned_amount_pen DECIMAL(12,2) DEFAULT 0,
    unassigned_amount_usd DECIMAL(12,2) GENERATED ALWAYS AS (total_income_usd - assigned_amount_usd) STORED,
    unassigned_amount_pen DECIMAL(12,2) GENERATED ALWAYS AS (total_income_pen - assigned_amount_pen) STORED,
    
    -- Metadatos
    completed_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Constraints
    CONSTRAINT valid_period CHECK (period_end > period_start),
    CONSTRAINT no_negative_income CHECK (total_income_usd >= 0 AND total_income_pen >= 0),
    CONSTRAINT unique_user_period UNIQUE(user_id, period_start, period_end)
);

-- =====================================================
-- TABLA: Asignaciones ZBB por Categoría
-- =====================================================
CREATE TABLE zbb_allocations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    cycle_id UUID NOT NULL REFERENCES zbb_planning_cycles(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    
    -- Referencia a categoría existente (asume que tienes tabla categories)
    category_id UUID NOT NULL REFERENCES categories(id) ON DELETE RESTRICT,
    
    -- Asignación (multi-moneda)
    allocated_amount_usd DECIMAL(10,2) DEFAULT 0,
    allocated_amount_pen DECIMAL(10,2) DEFAULT 0,
    
    -- Datos ZBB específicos
    justification TEXT NOT NULL, -- Campo obligatorio
    priority INTEGER NOT NULL CHECK (priority BETWEEN 1 AND 4),
    -- 1=Esencial, 2=Importante, 3=Deseable, 4=Opcional
    
    priority_order INTEGER, -- Para ordenamiento manual (drag & drop)
    
    -- Comparativa con período anterior
    previous_period_spent_usd DECIMAL(10,2),
    previous_period_spent_pen DECIMAL(10,2),
    variance_percentage DECIMAL(5,2), -- % de cambio vs anterior
    
    -- Estado de la asignación
    is_approved BOOLEAN DEFAULT false,
    approved_at TIMESTAMP WITH TIME ZONE,
    
    -- Tracking de ejecución
    spent_amount_usd DECIMAL(10,2) DEFAULT 0,
    spent_amount_pen DECIMAL(10,2) DEFAULT 0,
    remaining_usd DECIMAL(10,2) GENERATED ALWAYS AS (allocated_amount_usd - spent_amount_usd) STORED,
    remaining_pen DECIMAL(10,2) GENERATED ALWAYS AS (allocated_amount_pen - spent_amount_pen) STORED,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    CONSTRAINT no_negative_allocation CHECK (
        allocated_amount_usd >= 0 AND allocated_amount_pen >= 0
    ),
    CONSTRAINT unique_category_per_cycle UNIQUE(cycle_id, category_id)
);

-- =====================================================
-- MODIFICACIÓN A TABLA BUDGETS EXISTENTE
-- =====================================================
-- Añadir campo opcional para vincular con ZBB
ALTER TABLE budgets 
ADD COLUMN zbb_allocation_id UUID REFERENCES zbb_allocations(id) ON DELETE SET NULL,
ADD COLUMN is_zbb_controlled BOOLEAN DEFAULT false;

-- Si un budget está controlado por ZBB, su límite viene de zbb_allocations
-- Si is_zbb_controlled = true, el sistema debe usar el allocated_amount del ZBB

-- =====================================================
-- TABLA: Historial de Justificaciones (Auditoría)
-- =====================================================
CREATE TABLE zbb_justification_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    allocation_id UUID NOT NULL REFERENCES zbb_allocations(id) ON DELETE CASCADE,
    justification TEXT NOT NULL,
    changed_by UUID NOT NULL REFERENCES auth.users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =====================================================
-- ÍNDICES PARA PERFORMANCE
-- =====================================================
CREATE INDEX idx_zbb_cycles_user_status ON zbb_planning_cycles(user_id, status);
CREATE INDEX idx_zbb_cycles_period ON zbb_planning_cycles(user_id, period_start, period_end);
CREATE INDEX idx_zbb_allocations_cycle ON zbb_allocations(cycle_id);
CREATE INDEX idx_zbb_allocations_category ON zbb_allocations(category_id);
CREATE INDEX idx_budgets_zbb ON budgets(zbb_allocation_id) WHERE zbb_allocation_id IS NOT NULL;

-- =====================================================
-- TRIGGERS PARA ACTUALIZACIÓN AUTOMÁTICA
-- =====================================================

-- Trigger 1: Actualizar assigned_amount en cycle cuando se modifica allocation
CREATE OR REPLACE FUNCTION update_cycle_assigned_amounts()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE zbb_planning_cycles
    SET 
        assigned_amount_usd = (
            SELECT COALESCE(SUM(allocated_amount_usd), 0)
            FROM zbb_allocations
            WHERE cycle_id = NEW.cycle_id
        ),
        assigned_amount_pen = (
            SELECT COALESCE(SUM(allocated_amount_pen), 0)
            FROM zbb_allocations
            WHERE cycle_id = NEW.cycle_id
        ),
        updated_at = NOW()
    WHERE id = NEW.cycle_id;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_cycle_amounts
AFTER INSERT OR UPDATE OR DELETE ON zbb_allocations
FOR EACH ROW
EXECUTE FUNCTION update_cycle_assigned_amounts();

-- Trigger 2: Actualizar spent_amount cuando hay una transacción
CREATE OR REPLACE FUNCTION update_allocation_spent()
RETURNS TRIGGER AS $$
BEGIN
    -- Asume que tienes tabla 'transactions' con campos:
    -- category_id, amount, currency, transaction_date
    
    IF NEW.category_id IS NOT NULL THEN
        UPDATE zbb_allocations
        SET 
            spent_amount_usd = spent_amount_usd + 
                CASE WHEN NEW.currency = 'USD' THEN NEW.amount ELSE 0 END,
            spent_amount_pen = spent_amount_pen + 
                CASE WHEN NEW.currency = 'PEN' THEN NEW.amount ELSE 0 END,
            updated_at = NOW()
        WHERE 
            category_id = NEW.category_id
            AND cycle_id = (
                SELECT id FROM zbb_planning_cycles
                WHERE user_id = NEW.user_id
                AND status = 'active'
                AND NEW.transaction_date BETWEEN period_start AND period_end
                LIMIT 1
            );
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Aplicar a tu tabla de transacciones existente
CREATE TRIGGER trigger_update_spent_on_transaction
AFTER INSERT ON transactions
FOR EACH ROW
EXECUTE FUNCTION update_allocation_spent();

-- =====================================================
-- ROW LEVEL SECURITY (RLS)
-- =====================================================
ALTER TABLE zbb_planning_cycles ENABLE ROW LEVEL SECURITY;
ALTER TABLE zbb_allocations ENABLE ROW LEVEL SECURITY;
ALTER TABLE zbb_justification_history ENABLE ROW LEVEL SECURITY;

-- Políticas para zbb_planning_cycles
CREATE POLICY "Users can view own cycles"
    ON zbb_planning_cycles FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can create own cycles"
    ON zbb_planning_cycles FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own cycles"
    ON zbb_planning_cycles FOR UPDATE
    USING (auth.uid() = user_id);

-- Políticas para zbb_allocations
CREATE POLICY "Users can view own allocations"
    ON zbb_allocations FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can manage own allocations"
    ON zbb_allocations FOR ALL
    USING (auth.uid() = user_id);
```

---

## 2. LÓGICA DEL "DINERO POR ASIGNAR" (MULTI-MONEDA)

### Decisión Arquitectónica

**Mantén dos "bolsas" separadas** (USD y PEN) porque:
- Evitas errores de conversión cambiaria
- El usuario tiene control real sobre cada moneda
- Reflejas la realidad financiera (no siempre se puede gastar dólares donde se necesita soles)

### Algoritmo de Cálculo

```typescript
// types/zbb.ts
export interface MoneyPool {
  usd: {
    total: number;
    assigned: number;
    unassigned: number;
    percentage: number; // % asignado
  };
  pen: {
    total: number;
    assigned: number;
    unassigned: number;
    percentage: number;
  };
}

// utils/zbb-calculator.ts
export class ZBBCalculator {
  /**
   * Calcula el estado actual del dinero por asignar
   */
  static calculateMoneyPool(
    totalIncomeUSD: number,
    totalIncomePEN: number,
    allocations: Array<{ allocated_amount_usd: number; allocated_amount_pen: number }>
  ): MoneyPool {
    const assignedUSD = allocations.reduce((sum, a) => sum + a.allocated_amount_usd, 0);
    const assignedPEN = allocations.reduce((sum, a) => sum + a.allocated_amount_pen, 0);

    return {
      usd: {
        total: totalIncomeUSD,
        assigned: assignedUSD,
        unassigned: totalIncomeUSD - assignedUSD,
        percentage: totalIncomeUSD > 0 ? (assignedUSD / totalIncomeUSD) * 100 : 0,
      },
      pen: {
        total: totalIncomePEN,
        assigned: assignedPEN,
        unassigned: totalIncomePEN - assignedPEN,
        percentage: totalIncomePEN > 0 ? (assignedPEN / totalIncomePEN) * 100 : 0,
      },
    };
  }

  /**
   * Valida si se puede completar la planificación
   */
  static canCompletePlanning(pool: MoneyPool): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    // Regla ZBB: Todo debe estar asignado
    if (pool.usd.unassigned > 0.01) {
      errors.push(`Tienes $${pool.usd.unassigned.toFixed(2)} USD sin asignar`);
    }
    if (pool.pen.unassigned > 0.01) {
      errors.push(`Tienes S/${pool.pen.unassigned.toFixed(2)} PEN sin asignar`);
    }

    // No permitir sobre-asignación
    if (pool.usd.unassigned < -0.01) {
      errors.push(`Has asignado $${Math.abs(pool.usd.unassigned).toFixed(2)} USD de más`);
    }
    if (pool.pen.unassigned < -0.01) {
      errors.push(`Has asignado S/${Math.abs(pool.pen.unassigned).toFixed(2)} PEN de más`);
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }

  /**
   * Para visualización: convertir todo a una moneda de referencia
   * (solo para gráficos, NO para lógica de negocio)
   */
  static convertToReferenceCurrency(
    pool: MoneyPool,
    exchangeRate: number, // PEN a USD
    referenceCurrency: 'USD' | 'PEN' = 'USD'
  ): number {
    if (referenceCurrency === 'USD') {
      const penInUSD = pool.pen.total / exchangeRate;
      return pool.usd.total + penInUSD;
    } else {
      const usdInPEN = pool.usd.total * exchangeRate;
      return pool.pen.total + usdInPEN;
    }
  }

  /**
   * Calcula cuánto puede asignar a una categoría en cada moneda
   */
  static getAvailableForAllocation(
    pool: MoneyPool,
    currentAllocation: { usd: number; pen: number }
  ): { maxUSD: number; maxPEN: number } {
    return {
      maxUSD: pool.usd.unassigned + currentAllocation.usd,
      maxPEN: pool.pen.unassigned + currentAllocation.pen,
    };
  }
}

// Ejemplo de uso:
const pool = ZBBCalculator.calculateMoneyPool(3000, 5000, allocations);
const validation = ZBBCalculator.canCompletePlanning(pool);

if (!validation.valid) {
  console.error('No puedes completar la planificación:', validation.errors);
}
```

### Reglas de Negocio Multi-Moneda

```typescript
// constants/zbb-rules.ts
export const ZBB_RULES = {
  // Tolerancia para cálculos de punto flotante
  TOLERANCE: 0.01,

  // Cada categoría puede tener asignación en ambas monedas
  ALLOW_DUAL_CURRENCY_PER_CATEGORY: true,

  // Si el usuario tiene ingresos solo en USD, puede asignar en PEN si:
  // a) Tiene un tipo de cambio configurado
  // b) Acepta el riesgo cambiario
  ALLOW_CROSS_CURRENCY_ALLOCATION: false, // Mejor mantenerlo simple

  // Validaciones
  REQUIRE_FULL_ALLOCATION: true, // No puedes dejar dinero sin asignar
  ALLOW_OVER_ALLOCATION: false, // No puedes asignar más de lo que tienes
};
```

---

## 3. SINCRONIZACIÓN PLAN vs. EJECUCIÓN

### Arquitectura: Capa Encima

**El ZBB NO reemplaza `budgets`**, es una capa de planificación encima:

```
┌─────────────────────────────────────┐
│   ZBB Planning Layer                │  ← Planificación mensual
│   (zbb_planning_cycles + allocations)│
└──────────────┬──────────────────────┘
               │ vincula mediante
               │ zbb_allocation_id
┌──────────────▼──────────────────────┐
│   Budget Execution Layer            │  ← Tracking diario
│   (budgets + transactions)          │
└─────────────────────────────────────┘
```

### Reglas de Negocio

```typescript
// types/budget-sync.ts
export enum BudgetSyncStrategy {
  /**
   * ZBB_OVERRIDE: El límite del budget viene del ZBB allocation
   * Si el usuario edita el ZBB, el budget se actualiza automáticamente
   */
  ZBB_OVERRIDE = 'zbb_override',

  /**
   * ZBB_REFERENCE: El budget mantiene su valor independiente,
   * pero muestra el ZBB como referencia visual
   */
  ZBB_REFERENCE = 'zbb_reference',

  /**
   * NO_ZBB: Budget tradicional sin vínculo a ZBB
   */
  NO_ZBB = 'no_zbb',
}

// services/budget-sync.service.ts
export class BudgetSyncService {
  /**
   * Cuando se activa un ciclo ZBB, sincroniza con budgets
   */
  static async activateZBBCycle(cycleId: string, supabase: SupabaseClient) {
    // 1. Marcar el ciclo como 'active'
    await supabase
      .from('zbb_planning_cycles')
      .update({ status: 'active', completed_at: new Date().toISOString() })
      .eq('id', cycleId);

    // 2. Obtener todas las allocations del ciclo
    const { data: allocations } = await supabase
      .from('zbb_allocations')
      .select('*')
      .eq('cycle_id', cycleId);

    if (!allocations) return;

    // 3. Para cada allocation, crear o actualizar budget
    for (const allocation of allocations) {
      await this.syncAllocationToBudget(allocation, supabase);
    }
  }

  /**
   * Sincroniza una allocation con su budget correspondiente
   */
  static async syncAllocationToBudget(
    allocation: ZBBAllocation,
    supabase: SupabaseClient
  ) {
    // Buscar budget existente para esta categoría
    const { data: existingBudget } = await supabase
      .from('budgets')
      .select('*')
      .eq('category_id', allocation.category_id)
      .eq('user_id', allocation.user_id)
      .single();

    const budgetData = {
      category_id: allocation.category_id,
      user_id: allocation.user_id,
      limit_amount_usd: allocation.allocated_amount_usd,
      limit_amount_pen: allocation.allocated_amount_pen,
      zbb_allocation_id: allocation.id,
      is_zbb_controlled: true,
      period_start: allocation.cycle.period_start,
      period_end: allocation.cycle.period_end,
    };

    if (existingBudget) {
      // Actualizar budget existente
      await supabase
        .from('budgets')
        .update(budgetData)
        .eq('id', existingBudget.id);
    } else {
      // Crear nuevo budget
      await supabase.from('budgets').insert(budgetData);
    }
  }

  /**
   * REGLA: Si edito ZBB a mitad de mes
   */
  static async handleMidPeriodEdit(
    allocationId: string,
    newAmountUSD: number,
    newAmountPEN: number,
    supabase: SupabaseClient
  ) {
    // 1. Verificar si el ciclo está activo
    const { data: allocation } = await supabase
      .from('zbb_allocations')
      .select('*, cycle:zbb_planning_cycles(*)')
      .eq('id', allocationId)
      .single();

    if (allocation.cycle.status !== 'active') {
      throw new Error('Solo puedes editar ciclos activos');
    }

    // 2. Calcular si hay dinero disponible para el cambio
    const difference = {
      usd: newAmountUSD - allocation.allocated_amount_usd,
      pen: newAmountPEN - allocation.allocated_amount_pen,
    };

    const pool = await this.calculateCurrentPool(allocation.cycle_id, supabase);

    if (difference.usd > pool.usd.unassigned + 0.01) {
      throw new Error(`No tienes suficientes USD disponibles. Necesitas reasignar desde otra categoría.`);
    }

    if (difference.pen > pool.pen.unassigned + 0.01) {
      throw new Error(`No tienes suficientes PEN disponibles. Necesitas reasignar desde otra categoría.`);
    }

    // 3. Actualizar allocation
    await supabase
      .from('zbb_allocations')
      .update({
        allocated_amount_usd: newAmountUSD,
        allocated_amount_pen: newAmountPEN,
        updated_at: new Date().toISOString(),
      })
      .eq('id', allocationId);

    // 4. Sincronizar con budget EN TIEMPO REAL
    await this.syncAllocationToBudget(
      { ...allocation, allocated_amount_usd: newAmountUSD, allocated_amount_pen: newAmountPEN },
      supabase
    );

    // 5. Registrar en historial de cambios (auditoría)
    await supabase.from('zbb_allocation_changes').insert({
      allocation_id: allocationId,
      change_type: 'mid_period_edit',
      old_amount_usd: allocation.allocated_amount_usd,
      old_amount_pen: allocation.allocated_amount_pen,
      new_amount_usd: newAmountUSD,
      new_amount_pen: newAmountPEN,
      reason: 'Manual adjustment during active period',
    });
  }

  /**
   * Calcula el pool actual considerando gastos ya realizados
   */
  private static async calculateCurrentPool(cycleId: string, supabase: SupabaseClient) {
    const { data: cycle } = await supabase
      .from('zbb_planning_cycles')
      .select('*, allocations:zbb_allocations(*)')
      .eq('id', cycleId)
      .single();

    return ZBBCalculator.calculateMoneyPool(
      cycle.total_income_usd,
      cycle.total_income_pen,
      cycle.allocations
    );
  }
}
```

### Diagrama de Flujo: Edición a Mitad de Mes

```
Usuario edita allocation en ZBB activo
         ↓
¿Hay dinero suficiente en el pool?
         ↓ NO → Mostrar error: "Reasigna desde otra categoría"
         ↓ SÍ
Actualizar zbb_allocations
         ↓
Trigger automático actualiza zbb_planning_cycles.assigned_amount
         ↓
BudgetSyncService actualiza budgets.limit_amount
         ↓
Frontend recibe evento real-time de Supabase
         ↓
UI actualiza ambos dashboards (ZBB + Budget Tracker)
```

---

## 4. ARQUITECTURA DE COMPONENTES (FRONTEND)

### Árbol de Componentes

```
app/
└── zbb/
    └── [cycleId]/
        └── page.tsx
            └── <ZBBPlanningDashboard />
                ├── <PlanningHeader />
                │   ├── <PeriodSelector />
                │   └── <CycleStatusBadge />
                │
                ├── <MoneyPoolDisplay />          ← EL "PUZZLE BOARD"
                │   ├── <UnassignedPoolCard />    ← Dinero sin hogar
                │   │   ├── <CurrencyPool currency="USD" />
                │   │   └── <CurrencyPool currency="PEN" />
                │   └── <ProgressRing />          ← Anillo de % asignado
                │
                ├── <AllocationBuilder />         ← Constructor de asignaciones
                │   ├── <AllocationList />
                │   │   └── <AllocationCard />[]  ← Cada categoría
                │   │       ├── <CategoryIcon />
                │   │       ├── <AmountInputs />  ← USD + PEN inputs
                │   │       ├── <JustificationField />
                │   │       ├── <PrioritySelector />
                │   │       └── <ComparisonBadge /> ← vs mes anterior
                │   │
                │   └── <AddCategoryButton />
                │
                ├── <ZBBValidation />             ← Errores/Warnings
                │   ├── <ValidationMessage />[]
                │   └── <ZBBRulesChecklist />
                │
                └── <ActionFooter />
                    ├── <SaveDraftButton />
                    ├── <ResetButton />
                    └── <ActivatePlanButton />    ← Solo si valid
```

### Componente Principal: MoneyPoolDisplay

```typescript
// components/zbb/MoneyPoolDisplay.tsx
import { motion } from 'framer-motion';

interface MoneyPoolDisplayProps {
  pool: MoneyPool;
  onCurrencyClick?: (currency: 'USD' | 'PEN') => void;
}

export function MoneyPoolDisplay({ pool, onCurrencyClick }: MoneyPoolDisplayProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
      {/* Pool USD */}
      <UnassignedPoolCard
        currency="USD"
        symbol="$"
        total={pool.usd.total}
        assigned={pool.usd.assigned}
        unassigned={pool.usd.unassigned}
        percentage={pool.usd.percentage}
        onClick={() => onCurrencyClick?.('USD')}
      />

      {/* Pool PEN */}
      <UnassignedPoolCard
        currency="PEN"
        symbol="S/"
        total={pool.pen.total}
        assigned={pool.pen.assigned}
        unassigned={pool.pen.unassigned}
        percentage={pool.pen.percentage}
        onClick={() => onCurrencyClick?.('PEN')}
      />
    </div>
  );
}
```

### Componente: UnassignedPoolCard

```typescript
// components/zbb/UnassignedPoolCard.tsx
interface UnassignedPoolCardProps {
  currency: 'USD' | 'PEN';
  symbol: string;
  total: number;
  assigned: number;
  unassigned: number;
  percentage: number;
  onClick?: () => void;
}

export function UnassignedPoolCard({
  currency,
  symbol,
  total,
  assigned,
  unassigned,
  percentage,
  onClick,
}: UnassignedPoolCardProps) {
  const isComplete = Math.abs(unassigned) < 0.01;
  const isOverallocated = unassigned < -0.01;

  return (
    <motion.div
      onClick={onClick}
      className={`
        relative p-6 rounded-2xl border-2 cursor-pointer transition-all
        ${isComplete ? 'border-green-500 bg-green-50' : 
          isOverallocated ? 'border-red-500 bg-red-50' : 
          'border-yellow-500 bg-yellow-50'}
      `}
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
    >
      {/* Ring Progress */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <div className="text-sm font-medium text-gray-600">{currency}</div>
          <div className="text-3xl font-bold">
            {symbol}{total.toFixed(2)}
          </div>
        </div>

        <ProgressRing percentage={percentage} size={80} />
      </div>

      {/* Unassigned Amount - EL CORAZÓN DEL ZBB */}
      <div className="mt-4 p-4 bg-white rounded-lg border">
        <div className="text-xs text-gray-500 mb-1">Por Asignar</div>
        <div className={`text-2xl font-bold ${
          isComplete ? 'text-green-600' : 
          isOverallocated ? 'text-red-600' : 
          'text-yellow-600'
        }`}>
          {symbol}{Math.abs(unassigned).toFixed(2)}
          {isComplete && ' ✓'}
          {isOverallocated && ' ⚠️'}
        </div>
      </div>

      {/* Breakdown */}
      <div className="mt-3 text-sm text-gray-600">
        <div className="flex justify-between">
          <span>Asignado:</span>
          <span className="font-medium">{symbol}{assigned.toFixed(2)}</span>
        </div>
        <div className="flex justify-between mt-1">
          <span>Progreso:</span>
          <span className="font-medium">{percentage.toFixed(1)}%</span>
        </div>
      </div>
    </motion.div>
  );
}
```

### Componente: ProgressRing

```typescript
// components/zbb/ProgressRing.tsx
export function ProgressRing({ percentage, size = 100 }: { percentage: number; size?: number }) {
  const radius = (size - 10) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (percentage / 100) * circumference;

  return (
    <svg width={size} height={size} className="transform -rotate-90">
      {/* Background circle */}
      <circle
        cx={size / 2}
        cy={size / 2}
        r={radius}
        fill="none"
        stroke="#e5e7eb"
        strokeWidth="8"
      />
      {/* Progress circle */}
      <motion.circle
        cx={size / 2}
        cy={size / 2}
        r={radius}
        fill="none"
        stroke={percentage >= 100 ? '#10b981' : percentage > 50 ? '#f59e0b' : '#ef4444'}
        strokeWidth="8"
        strokeDasharray={circumference}
        strokeDashoffset={offset}
        strokeLinecap="round"
        initial={{ strokeDashoffset: circumference }}
        animate={{ strokeDashoffset: offset }}
        transition={{ duration: 1, ease: 'easeOut' }}
      />
      {/* Percentage text */}
      <text
        x="50%"
        y="50%"
        textAnchor="middle"
        dy=".3em"
        className="text-lg font-bold fill-current transform rotate-90"
        style={{ transform: 'rotate(90deg)', transformOrigin: 'center' }}
      >
        {percentage.toFixed(0)}%
      </text>
    </svg>
  );
}
```

### Componente: AllocationCard

```typescript
// components/zbb/AllocationCard.tsx
import { useState } from 'react';
import { DragHandleDots2Icon } from '@radix-ui/react-icons';

interface AllocationCardProps {
  allocation: ZBBAllocation;
  pool: MoneyPool;
  onUpdate: (id: string, updates: Partial<ZBBAllocation>) => void;
  onDelete: (id: string) => void;
  isDragging?: boolean;
}

export function AllocationCard({
  allocation,
  pool,
  onUpdate,
  onDelete,
  isDragging,
}: AllocationCardProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  const maxAvailable = ZBBCalculator.getAvailableForAllocation(pool, {
    usd: allocation.allocated_amount_usd,
    pen: allocation.allocated_amount_pen,
  });

  const priorityColors = {
    1: 'bg-red-100 border-red-300 text-red-800',
    2: 'bg-yellow-100 border-yellow-300 text-yellow-800',
    3: 'bg-blue-100 border-blue-300 text-blue-800',
    4: 'bg-gray-100 border-gray-300 text-gray-800',
  };

  return (
    <div
      className={`
        p-4 rounded-lg border-2 bg-white transition-all
        ${isDragging ? 'opacity-50 scale-95' : 'opacity-100'}
        ${priorityColors[allocation.priority]}
      `}
    >
      {/* Header */}
      <div className="flex items-center gap-3 mb-3">
        <DragHandleDots2Icon className="w-5 h-5 cursor-grab" />
        
        <div className="flex-1">
          <div className="font-semibold">{allocation.category.name}</div>
          <div className="text-xs text-gray-500">
            Prioridad {allocation.priority} - {['Esencial', 'Importante', 'Deseable', 'Opcional'][allocation.priority - 1]}
          </div>
        </div>

        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="text-sm text-blue-600"
        >
          {isExpanded ? 'Contraer' : 'Expandir'}
        </button>
      </div>

      {/* Amount Inputs */}
      <div className="grid grid-cols-2 gap-3 mb-3">
        <AmountInput
          label="USD"
          symbol="$"
          value={allocation.allocated_amount_usd}
          max={maxAvailable.maxUSD}
          onChange={(value) => onUpdate(allocation.id, { allocated_amount_usd: value })}
        />
        <AmountInput
          label="PEN"
          symbol="S/"
          value={allocation.allocated_amount_pen}
          max={maxAvailable.maxPEN}
          onChange={(value) => onUpdate(allocation.id, { allocated_amount_pen: value })}
        />
      </div>

      {/* Justification */}
      {isExpanded && (
        <div className="space-y-3">
          <JustificationField
            value={allocation.justification}
            onChange={(value) => onUpdate(allocation.id, { justification: value })}
            required
          />

          {/* Comparison with previous period */}
          {allocation.previous_period_spent_usd > 0 && (
            <ComparisonBadge
              current={allocation.allocated_amount_usd}
              previous={allocation.previous_period_spent_usd}
              currency="USD"
            />
          )}

          <button
            onClick={() => onDelete(allocation.id)}
            className="w-full py-2 text-sm text-red-600 hover:bg-red-50 rounded"
          >
            Eliminar Categoría
          </button>
        </div>
      )}
    </div>
  );
}
```

### Componente: AmountInput

```typescript
// components/zbb/AmountInput.tsx
interface AmountInputProps {
  label: string;
  symbol: string;
  value: number;
  max: number;
  onChange: (value: number) => void;
}

function AmountInput({ label, symbol, value, max, onChange }: AmountInputProps) {
  const [localValue, setLocalValue] = useState(value.toString());

  const handleBlur = () => {
    const parsed = parseFloat(localValue) || 0;
    const clamped = Math.min(Math.max(parsed, 0), max);
    onChange(clamped);
    setLocalValue(clamped.toFixed(2));
  };

  const exceedsMax = parseFloat(localValue) > max;

  return (
    <div>
      <label className="block text-xs font-medium text-gray-700 mb-1">
        {label} (Máx: {symbol}{max.toFixed(2)})
      </label>
      <div className="relative">
        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">
          {symbol}
        </span>
        <input
          type="number"
          step="0.01"
          value={localValue}
          onChange={(e) => setLocalValue(e.target.value)}
          onBlur={handleBlur}
          className={`
            w-full pl-8 pr-3 py-2 border rounded-lg
            ${exceedsMax ? 'border-red-500 bg-red-50' : 'border-gray-300'}
          `}
        />
      </div>
      {exceedsMax && (
        <p className="text-xs text-red-600 mt-1">
          Excede el máximo disponible
        </p>
      )}
    </div>
  );
}
```

### Hook Principal: useZBBPlanning

```typescript
// hooks/useZBBPlanning.ts
import { useEffect, useState } from 'react';
import { useSupabase } from '@/lib/supabase';

export function useZBBPlanning(cycleId: string) {
  const supabase = useSupabase();
  const [cycle, setCycle] = useState<ZBBPlanningCycle | null>(null);
  const [allocations, setAllocations] = useState<ZBBAllocation[]>([]);
  const [pool, setPool] = useState<MoneyPool | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadCycleData();
    
    // Realtime subscription
    const subscription = supabase
      .channel(`zbb_cycle_${cycleId}`)
      .on('postgres_changes', 
        { event: '*', schema: 'public', table: 'zbb_allocations', filter: `cycle_id=eq.${cycleId}` },
        () => loadCycleData()
      )
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, [cycleId]);

  const loadCycleData = async () => {
    const { data: cycleData } = await supabase
      .from('zbb_planning_cycles')
      .select('*, allocations:zbb_allocations(*, category:categories(*))')
      .eq('id', cycleId)
      .single();

    if (cycleData) {
      setCycle(cycleData);
      setAllocations(cycleData.allocations);
      
      const calculatedPool = ZBBCalculator.calculateMoneyPool(
        cycleData.total_income_usd,
        cycleData.total_income_pen,
        cycleData.allocations
      );
      setPool(calculatedPool);
    }
    
    setLoading(false);
  };

  const updateAllocation = async (id: string, updates: Partial<ZBBAllocation>) => {
    await supabase
      .from('zbb_allocations')
      .update(updates)
      .eq('id', id);
    
    // Optimistic update
    setAllocations(prev => 
      prev.map(a => a.id === id ? { ...a, ...updates } : a)
    );
  };

  const activateCycle = async () => {
    const validation = ZBBCalculator.canCompletePlanning(pool!);
    
    if (!validation.valid) {
      throw new Error(validation.errors.join(', '));
    }

    await BudgetSyncService.activateZBBCycle(cycleId, supabase);
  };

  return {
    cycle,
    allocations,
    pool,
    loading,
    updateAllocation,
    activateCycle,
  };
}
```

---

## CHECKLIST DE IMPLEMENTACIÓN

### Base de Datos (30 min)
- [ ] Ejecutar DDL completo en Supabase SQL Editor
- [ ] Verificar triggers con `INSERT` de prueba
- [ ] Configurar RLS policies
- [ ] Crear índices

### Backend Logic (2 horas)
- [ ] Crear `utils/zbb-calculator.ts`
- [ ] Crear `services/budget-sync.service.ts`
- [ ] Agregar tipos en `types/zbb.ts`
- [ ] Crear API routes en `/app/api/zbb/`

### Frontend Components (4 horas)
- [ ] Crear `components/zbb/MoneyPoolDisplay.tsx`
- [ ] Crear `components/zbb/UnassignedPoolCard.tsx`
- [ ] Crear `components/zbb/ProgressRing.tsx`
- [ ] Crear `components/zbb/AllocationCard.tsx`
- [ ] Crear `components/zbb/AmountInput.tsx`
- [ ] Implementar drag & drop con `@dnd-kit/core`
- [ ] Agregar validaciones en tiempo real
- [ ] Implementar `hooks/useZBBPlanning.ts`

### Integración (2 horas)
- [ ] Crear página principal: `app/zbb/[cycleId]/page.tsx`
- [ ] Conectar con tabla `budgets` existente
- [ ] Probar flujo completo: Crear → Planificar → Activar → Editar
- [ ] Verificar realtime updates de Supabase

### Testing (1 hora)
- [ ] Probar escenario: Crear ciclo nuevo
- [ ] Probar: Asignar dinero en ambas monedas
- [ ] Probar: Activar plan y verificar sincronización con budgets
- [ ] Probar: Editar allocation a mitad de período
- [ ] Verificar multi-moneda con casos edge (sobre-asignación)
- [ ] Probar: Validación de "dinero por asignar = $0"

### Extras Opcionales
- [ ] Implementar drag & drop para reordenar prioridades
- [ ] Agregar animaciones con Framer Motion
- [ ] Crear gráficos de comparación mensual
- [ ] Implementar modo "Plantillas ZBB" para reutilizar planificaciones
- [ ] Agregar exportación a PDF/Excel

---

## NOTAS IMPORTANTES

### Multi-Moneda
- **NUNCA mezcles USD y PEN en un mismo cálculo**
- Mantén dos contadores separados siempre
- Solo convierte para visualización (gráficos), no para lógica

### Sincronización
- El ZBB es la "fuente de verdad" cuando está activo
- Los budgets se actualizan automáticamente vía triggers
- Si editas ZBB, el cambio se propaga en tiempo real

### Validación
- No se puede activar un plan con dinero sin asignar
- No se puede sobre-asignar (gastar más de lo que tienes)
- Tolerancia de $0.01 para errores de punto flotante

### Performance
- Usa índices en todas las foreign keys
- Implementa realtime updates de Supabase
- Considera paginación si hay >50 allocations

---

## RECURSOS ADICIONALES

### Dependencias NPM Necesarias
```bash
npm install @supabase/supabase-js
npm install framer-motion
npm install @dnd-kit/core @dnd-kit/sortable
npm install @radix-ui/react-icons
```

### Variables de Entorno
```env
NEXT_PUBLIC_SUPABASE_URL=tu_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=tu_key
```

---

**Fecha de Creación**: Enero 2026  
**Versión**: 1.0  
**Autor**: Especificaciones Técnicas ZBB Module