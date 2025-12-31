# 🚀 PLAN DE IMPLEMENTACIÓN COMPLETO - LUMIO FINANCE
## Inspirado en Cashew + Funcionalidades Únicas

---

## 📊 RESUMEN EJECUTIVO

Este documento consolida **TODO** lo necesario para transformar Lumio Finance en una aplicación de finanzas personales de clase mundial, combinando:

1. ✅ **Lo mejor de Cashew** - UX/UI, patrones de interacción, smart features
2. ✅ **Fortalezas únicas de Lumio** - Petty Cash, Tarjetas de Crédito avanzadas, Sistema empresarial
3. ✅ **Innovaciones propias** - Características que ninguna de las dos tiene

**Stack Tecnológico:**
- Framework: Next.js 16 + React 19
- Base de datos: PostgreSQL + Prisma ORM
- Backend: Supabase (Auth + Realtime)
- UI: Radix UI + Tailwind CSS v4
- Animaciones: Framer Motion
- Gráficas: Recharts
- Estado: Zustand + React Query

---

## 🎯 COMPARATIVA: CASHEW vs LUMIO vs LUMIO MEJORADO

| Característica | Cashew (Flutter) | Lumio Actual | Lumio Mejorado |
|----------------|------------------|--------------|----------------|
| **Dashboard Personalizable** | ✅ Drag & Drop widgets | ❌ Fijo | ✅ Implementar |
| **Smart Categorization** | ✅ Auto-aprende | ❌ Manual | ✅ Implementar |
| **Presupuestos Flexibles** | ✅ Custom periods | ⚠️ Solo mensual | ✅ Mejorar |
| **Multi-moneda** | ✅ Con conversión | ❌ No | ✅ Implementar |
| **Gestos (Swipe/Long-press)** | ✅ Completo | ❌ No | ✅ Implementar |
| **Calculator integrado** | ✅ En transacciones | ❌ No | ✅ Implementar |
| **Offline-first** | ✅ SQLite local | ❌ Online only | ✅ Implementar |
| **Petty Cash System** | ❌ No tiene | ✅ **Completo** | ✅ **Mantener** |
| **Credit Cards Avanzadas** | ⚠️ Básico | ✅ **Con statements** | ✅ **Mantener** |
| **Subcategorías** | ❌ No | ✅ Sí | ✅ **Mantener** |
| **50/30/20 Budget** | ❌ No | ✅ Sí | ✅ **Mantener + UI** |
| **Préstamos bidireccionales** | ⚠️ Solo deudas | ✅ Yo presté/Me prestaron | ✅ **Mantener** |
| **Keyboard Shortcuts** | ❌ Mobile only | ❌ No | ✅ Implementar |
| **Heatmap Calendar** | ✅ Sí | ❌ No | ✅ Implementar |
| **Import/Export CSV** | ✅ Completo | ❌ No | ✅ Implementar |
| **Push Notifications** | ✅ Completas | ❌ No | ✅ Implementar |
| **Biometric Lock** | ✅ Fingerprint | ❌ No | ✅ Implementar |

---

## 📋 PLAN DE IMPLEMENTACIÓN POR FASES

### 🔴 **FASE 1: FUNDAMENTOS Y UX CORE** (4-6 semanas)

#### 1.1 Sistema de Diseño y Componentes Base
**Prioridad:** CRÍTICA

**Archivos a crear:**
```
lumio/
├── lib/
│   ├── design-system/
│   │   ├── colors.ts
│   │   ├── typography.ts
│   │   ├── spacing.ts
│   │   └── tokens.ts
├── components/
│   ├── ui/
│   │   ├── animated-number.tsx
│   │   ├── progress-bar.tsx
│   │   ├── skeleton-loader.tsx
│   │   ├── swipeable-item.tsx
│   │   └── amount-input.tsx
```

**Implementación:**

```typescript
// lib/design-system/colors.ts
export const colors = {
  primary: {
    50: '#f0f9ff',
    100: '#e0f2fe',
    500: '#0ea5e9',
    900: '#0c4a6e',
  },
  success: {
    light: '#10b981',
    DEFAULT: '#059669',
    dark: '#047857',
  },
  warning: {
    light: '#fbbf24',
    DEFAULT: '#f59e0b',
    dark: '#d97706',
  },
  error: {
    light: '#f87171',
    DEFAULT: '#ef4444',
    dark: '#dc2626',
  },
  neutral: {
    0: '#ffffff',
    50: '#f9fafb',
    100: '#f3f4f6',
    500: '#6b7280',
    900: '#111827',
    1000: '#000000',
  }
};

// components/ui/animated-number.tsx
import { motion } from 'framer-motion';
import { useEffect, useState } from 'react';

interface AnimatedNumberProps {
  value: number;
  currency?: string;
  decimals?: number;
}

export const AnimatedNumber = ({
  value,
  currency = 'USD',
  decimals = 2
}: AnimatedNumberProps) => {
  const [displayValue, setDisplayValue] = useState(0);

  useEffect(() => {
    let startValue = displayValue;
    const duration = 800;
    const startTime = Date.now();

    const animate = () => {
      const now = Date.now();
      const progress = Math.min((now - startTime) / duration, 1);

      const easeOutQuart = 1 - Math.pow(1 - progress, 4);
      const current = startValue + (value - startValue) * easeOutQuart;

      setDisplayValue(current);

      if (progress < 1) {
        requestAnimationFrame(animate);
      }
    };

    requestAnimationFrame(animate);
  }, [value]);

  return (
    <motion.span
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      className="font-semibold"
    >
      {new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency,
        minimumFractionDigits: decimals,
        maximumFractionDigits: decimals,
      }).format(displayValue)}
    </motion.span>
  );
};

// components/ui/amount-input.tsx
'use client';

import { useState } from 'react';
import { evaluate } from 'mathjs';

interface AmountInputProps {
  value: number;
  onChange: (value: number) => void;
  currency?: string;
}

export const AmountInput = ({
  value,
  onChange,
  currency = '$'
}: AmountInputProps) => {
  const [expression, setExpression] = useState('');
  const [showCalculator, setShowCalculator] = useState(false);

  const calculate = (expr: string) => {
    try {
      const result = evaluate(expr);
      onChange(Number(result));
      setExpression('');
    } catch (error) {
      console.error('Invalid expression:', error);
    }
  };

  const handleButtonClick = (digit: string) => {
    setExpression(prev => prev + digit);
  };

  return (
    <div className="w-full">
      <div className="relative">
        <span className="absolute left-4 top-1/2 -translate-y-1/2 text-2xl text-gray-500">
          {currency}
        </span>
        <input
          type="text"
          value={expression || value}
          onChange={(e) => setExpression(e.target.value)}
          onBlur={() => expression && calculate(expression)}
          onFocus={() => setShowCalculator(true)}
          className="w-full pl-12 pr-4 py-4 text-3xl font-bold text-right border-2 rounded-lg focus:ring-2 focus:ring-primary-500"
        />
      </div>

      {showCalculator && (
        <div className="mt-4 grid grid-cols-4 gap-2">
          {['7', '8', '9', '÷'].map(btn => (
            <button
              key={btn}
              onClick={() => handleButtonClick(btn === '÷' ? '/' : btn)}
              className="p-4 text-xl font-semibold bg-gray-100 rounded-lg hover:bg-gray-200 active:scale-95 transition"
            >
              {btn}
            </button>
          ))}
          {['4', '5', '6', '×'].map(btn => (
            <button
              key={btn}
              onClick={() => handleButtonClick(btn === '×' ? '*' : btn)}
              className="p-4 text-xl font-semibold bg-gray-100 rounded-lg hover:bg-gray-200 active:scale-95 transition"
            >
              {btn}
            </button>
          ))}
          {['1', '2', '3', '-'].map(btn => (
            <button
              key={btn}
              onClick={() => handleButtonClick(btn)}
              className="p-4 text-xl font-semibold bg-gray-100 rounded-lg hover:bg-gray-200 active:scale-95 transition"
            >
              {btn}
            </button>
          ))}
          {['.', '0', '⌫', '+'].map(btn => (
            <button
              key={btn}
              onClick={() => {
                if (btn === '⌫') setExpression(prev => prev.slice(0, -1));
                else handleButtonClick(btn);
              }}
              className="p-4 text-xl font-semibold bg-gray-100 rounded-lg hover:bg-gray-200 active:scale-95 transition"
            >
              {btn}
            </button>
          ))}
          <button
            onClick={() => expression && calculate(expression)}
            className="col-span-4 p-4 text-xl font-semibold bg-primary-500 text-white rounded-lg hover:bg-primary-600 active:scale-95 transition"
          >
            = Calculate
          </button>
        </div>
      )}
    </div>
  );
};
```

**Dependencias a instalar:**
```bash
npm install mathjs @dnd-kit/core @dnd-kit/sortable react-calendar-heatmap
npm install @react-spring/web chart.js react-chartjs-2
```

---

#### 1.2 Smart Categorization System
**Prioridad:** ALTA

**Cambios en el schema de Prisma:**

```prisma
// Agregar a Profile model
model Profile {
  // ... campos existentes
  smartCategories Json? @map("smart_categories") @db.JsonB
  // Estructura: { "starbucks": "category_id", "uber": "transport_id" }
}

// Nueva tabla para machine learning de categorías
model CategoryLearning {
  id            String   @id @default(uuid()) @db.Uuid
  userId        String   @map("user_id") @db.Uuid
  keyword       String   @db.VarChar(200)
  categoryId    String   @map("category_id") @db.Uuid
  confidence    Decimal  @default(1.0) @db.Decimal(3, 2) // 0.00 - 1.00
  timesUsed     Int      @default(1) @map("times_used")
  lastUsedAt    DateTime @default(now()) @map("last_used_at") @db.Timestamptz(6)
  createdAt     DateTime @default(now()) @map("created_at") @db.Timestamptz(6)

  user     Profile         @relation(fields: [userId], references: [id], onDelete: Cascade)
  category ExpenseCategory @relation(fields: [categoryId], references: [id], onDelete: Cascade)

  @@unique([userId, keyword, categoryId])
  @@index([userId])
  @@index([keyword])
  @@map("category_learning")
}

// Agregar relación en Profile
model Profile {
  // ... otros campos
  categoryLearning CategoryLearning[]
}

// Agregar relación en ExpenseCategory
model ExpenseCategory {
  // ... otros campos
  categoryLearning CategoryLearning[]
}
```

**Hook para Smart Suggestions:**

```typescript
// hooks/useSmartCategories.ts
import { useQuery, useMutation } from '@tanstack/react-query';

interface SmartSuggestion {
  categoryId: string;
  confidence: number;
  timesUsed: number;
}

export const useSmartCategories = (description: string) => {
  // Buscar sugerencias basadas en el texto
  const { data: suggestions } = useQuery({
    queryKey: ['smart-categories', description],
    queryFn: async () => {
      const response = await fetch(
        `/api/smart-categories/suggest?q=${encodeURIComponent(description)}`
      );
      return response.json() as Promise<SmartSuggestion[]>;
    },
    enabled: description.length > 2,
  });

  // Guardar nueva asociación
  const learnCategory = useMutation({
    mutationFn: async ({
      keyword,
      categoryId,
    }: {
      keyword: string;
      categoryId: string;
    }) => {
      await fetch('/api/smart-categories/learn', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ keyword, categoryId }),
      });
    },
  });

  return { suggestions, learnCategory };
};

// API Route: app/api/smart-categories/suggest/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { prisma } from '@/lib/prisma';

export async function GET(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const searchParams = request.nextUrl.searchParams;
  const query = searchParams.get('q') || '';

  // Buscar keywords similares usando ILIKE
  const suggestions = await prisma.categoryLearning.findMany({
    where: {
      userId: user.id,
      keyword: {
        contains: query.toLowerCase(),
      },
    },
    orderBy: [
      { confidence: 'desc' },
      { timesUsed: 'desc' },
    ],
    take: 5,
    include: {
      category: true,
    },
  });

  return NextResponse.json(suggestions);
}

// API Route: app/api/smart-categories/learn/route.ts
export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { keyword, categoryId } = await request.json();

  // Upsert: incrementar timesUsed si existe, o crear nuevo
  const learning = await prisma.categoryLearning.upsert({
    where: {
      userId_keyword_categoryId: {
        userId: user.id,
        keyword: keyword.toLowerCase(),
        categoryId,
      },
    },
    update: {
      timesUsed: { increment: 1 },
      lastUsedAt: new Date(),
      confidence: {
        increment: 0.1, // Aumentar confianza
      },
    },
    create: {
      userId: user.id,
      keyword: keyword.toLowerCase(),
      categoryId,
      confidence: 1.0,
      timesUsed: 1,
    },
  });

  return NextResponse.json(learning);
}
```

---

#### 1.3 Swipe Actions y Gestos
**Prioridad:** ALTA

```typescript
// components/transactions/swipeable-transaction.tsx
'use client';

import { motion, PanInfo, useMotionValue, useTransform } from 'framer-motion';
import { Trash2, Edit, Copy } from 'lucide-react';
import { useState } from 'react';

interface SwipeableTransactionProps {
  transaction: Transaction;
  onDelete: () => void;
  onEdit: () => void;
  onDuplicate: () => void;
  children: React.ReactNode;
}

export const SwipeableTransaction = ({
  transaction,
  onDelete,
  onEdit,
  onDuplicate,
  children,
}: SwipeableTransactionProps) => {
  const x = useMotionValue(0);
  const [isDragging, setIsDragging] = useState(false);

  const leftActionOpacity = useTransform(x, [0, 100], [0, 1]);
  const rightActionOpacity = useTransform(x, [-100, 0], [1, 0]);

  const handleDragEnd = (event: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) => {
    setIsDragging(false);

    // Swipe left = Delete (threshold: -120px)
    if (info.offset.x < -120) {
      onDelete();
    }
    // Swipe right = Edit/Duplicate (threshold: 120px)
    else if (info.offset.x > 120) {
      onEdit();
    }
    // Reset position
    else {
      x.set(0);
    }
  };

  return (
    <div className="relative overflow-hidden">
      {/* Background Actions - Left (Edit/Duplicate) */}
      <motion.div
        className="absolute inset-y-0 left-0 flex items-center gap-2 px-4"
        style={{ opacity: leftActionOpacity }}
      >
        <button
          onClick={onEdit}
          className="p-3 bg-blue-500 text-white rounded-full"
        >
          <Edit className="w-5 h-5" />
        </button>
        <button
          onClick={onDuplicate}
          className="p-3 bg-green-500 text-white rounded-full"
        >
          <Copy className="w-5 h-5" />
        </button>
      </motion.div>

      {/* Background Actions - Right (Delete) */}
      <motion.div
        className="absolute inset-y-0 right-0 flex items-center px-4"
        style={{ opacity: rightActionOpacity }}
      >
        <button
          onClick={onDelete}
          className="p-3 bg-red-500 text-white rounded-full"
        >
          <Trash2 className="w-5 h-5" />
        </button>
      </motion.div>

      {/* Draggable Transaction */}
      <motion.div
        drag="x"
        dragConstraints={{ left: -200, right: 200 }}
        dragElastic={0.2}
        onDragStart={() => setIsDragging(true)}
        onDragEnd={handleDragEnd}
        style={{ x }}
        className={`bg-white relative z-10 ${isDragging ? 'cursor-grabbing' : 'cursor-grab'}`}
      >
        {children}
      </motion.div>
    </div>
  );
};

// Uso en lista de transacciones:
// <SwipeableTransaction
//   transaction={tx}
//   onDelete={() => deleteTransaction(tx.id)}
//   onEdit={() => openEditModal(tx)}
//   onDuplicate={() => duplicateTransaction(tx)}
// >
//   <TransactionCard transaction={tx} />
// </SwipeableTransaction>
```

---

#### 1.4 Dashboard Personalizable con Widgets
**Prioridad:** ALTA

**Schema Prisma - Agregar configuración de widgets:**

```prisma
model Profile {
  // ... campos existentes
  dashboardConfig Json? @map("dashboard_config") @db.JsonB
  // Estructura:
  // {
  //   "widgets": [
  //     { "id": "net-worth", "enabled": true, "order": 0, "config": {} },
  //     { "id": "spending-chart", "enabled": true, "order": 1, "config": { "chartType": "line" } },
  //     { "id": "budgets", "enabled": false, "order": 2, "config": {} },
  //     { "id": "recent-transactions", "enabled": true, "order": 3, "config": { "limit": 10 } },
  //     { "id": "goals", "enabled": true, "order": 4, "config": {} },
  //     { "id": "calendar-heatmap", "enabled": false, "order": 5, "config": {} },
  //     { "id": "category-pie", "enabled": true, "order": 6, "config": { "topN": 5 } }
  //   ]
  // }
}
```

**Componentes de Widgets:**

```typescript
// types/widgets.ts
export type WidgetId =
  | 'net-worth'
  | 'spending-chart'
  | 'budgets'
  | 'recent-transactions'
  | 'goals'
  | 'calendar-heatmap'
  | 'category-pie'
  | 'credit-cards'
  | 'petty-cash';

export interface Widget {
  id: WidgetId;
  enabled: boolean;
  order: number;
  config: Record<string, any>;
}

export interface DashboardConfig {
  widgets: Widget[];
}

// components/dashboard/widget-manager.tsx
'use client';

import { DndContext, closestCenter, DragEndEvent } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy, arrayMove } from '@dnd-kit/sortable';
import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';

// Importar widgets individuales
import { NetWorthWidget } from './widgets/net-worth-widget';
import { SpendingChartWidget } from './widgets/spending-chart-widget';
import { BudgetsWidget } from './widgets/budgets-widget';
import { RecentTransactionsWidget } from './widgets/recent-transactions-widget';
import { GoalsWidget } from './widgets/goals-widget';
import { CalendarHeatmapWidget } from './widgets/calendar-heatmap-widget';
import { CategoryPieWidget } from './widgets/category-pie-widget';

const WIDGET_COMPONENTS = {
  'net-worth': NetWorthWidget,
  'spending-chart': SpendingChartWidget,
  'budgets': BudgetsWidget,
  'recent-transactions': RecentTransactionsWidget,
  'goals': GoalsWidget,
  'calendar-heatmap': CalendarHeatmapWidget,
  'category-pie': CategoryPieWidget,
};

interface WidgetManagerProps {
  initialConfig: DashboardConfig;
  editMode?: boolean;
}

export const WidgetManager = ({
  initialConfig,
  editMode = false
}: WidgetManagerProps) => {
  const [widgets, setWidgets] = useState<Widget[]>(initialConfig.widgets);

  const saveConfig = useMutation({
    mutationFn: async (newConfig: DashboardConfig) => {
      await fetch('/api/dashboard/config', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newConfig),
      });
    },
  });

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      setWidgets((items) => {
        const oldIndex = items.findIndex((item) => item.id === active.id);
        const newIndex = items.findIndex((item) => item.id === over.id);

        const newWidgets = arrayMove(items, oldIndex, newIndex).map(
          (widget, index) => ({
            ...widget,
            order: index,
          })
        );

        saveConfig.mutate({ widgets: newWidgets });
        return newWidgets;
      });
    }
  };

  const toggleWidget = (widgetId: WidgetId) => {
    const newWidgets = widgets.map((w) =>
      w.id === widgetId ? { ...w, enabled: !w.enabled } : w
    );
    setWidgets(newWidgets);
    saveConfig.mutate({ widgets: newWidgets });
  };

  const enabledWidgets = widgets.filter((w) => w.enabled);

  if (editMode) {
    return (
      <div className="space-y-4">
        <h2 className="text-2xl font-bold">Customize Dashboard</h2>
        <p className="text-gray-600">Drag to reorder, toggle to show/hide</p>

        <div className="space-y-2">
          {widgets.map((widget) => {
            const WidgetComponent = WIDGET_COMPONENTS[widget.id];
            return (
              <div
                key={widget.id}
                className="flex items-center gap-4 p-4 border rounded-lg"
              >
                <button className="cursor-grab active:cursor-grabbing">
                  ☰
                </button>
                <input
                  type="checkbox"
                  checked={widget.enabled}
                  onChange={() => toggleWidget(widget.id)}
                  className="w-5 h-5"
                />
                <div className="flex-1">
                  <h3 className="font-semibold capitalize">
                    {widget.id.replace(/-/g, ' ')}
                  </h3>
                  <p className="text-sm text-gray-500">
                    {widget.enabled ? 'Visible' : 'Hidden'}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  return (
    <DndContext onDragEnd={handleDragEnd} collisionDetection={closestCenter}>
      <SortableContext items={enabledWidgets} strategy={verticalListSortingStrategy}>
        <div className="space-y-6">
          {enabledWidgets.map((widget) => {
            const WidgetComponent = WIDGET_COMPONENTS[widget.id];
            return (
              <div key={widget.id}>
                <WidgetComponent config={widget.config} />
              </div>
            );
          })}
        </div>
      </SortableContext>
    </DndContext>
  );
};

// components/dashboard/widgets/net-worth-widget.tsx
import { useQuery } from '@tanstack/react-query';
import { AnimatedNumber } from '@/components/ui/animated-number';
import { TrendingUp, TrendingDown } from 'lucide-react';

export const NetWorthWidget = ({ config }: { config: Record<string, any> }) => {
  const { data: netWorth } = useQuery({
    queryKey: ['net-worth'],
    queryFn: async () => {
      const res = await fetch('/api/dashboard/net-worth');
      return res.json();
    },
  });

  if (!netWorth) return <div>Loading...</div>;

  const change = netWorth.current - netWorth.lastMonth;
  const isPositive = change >= 0;

  return (
    <div className="bg-white rounded-xl shadow-lg p-6">
      <div className="flex justify-between items-start mb-4">
        <h2 className="text-lg font-semibold text-gray-700">Net Worth</h2>
        <button className="text-gray-400 hover:text-gray-600">⋮</button>
      </div>

      <div className="mb-4">
        <AnimatedNumber value={netWorth.current} decimals={2} />
        <div className="flex items-center gap-2 mt-2">
          {isPositive ? (
            <TrendingUp className="w-4 h-4 text-green-500" />
          ) : (
            <TrendingDown className="w-4 h-4 text-red-500" />
          )}
          <span className={`text-sm ${isPositive ? 'text-green-600' : 'text-red-600'}`}>
            {isPositive ? '+' : ''}
            {new Intl.NumberFormat('en-US', {
              style: 'currency',
              currency: 'USD',
            }).format(change)}{' '}
            this month
          </span>
        </div>
      </div>

      <div className="space-y-2">
        {netWorth.accounts.map((account: any) => (
          <div key={account.id} className="flex justify-between items-center">
            <div className="flex items-center gap-2">
              <span>{account.icon}</span>
              <span className="text-sm text-gray-600">{account.name}</span>
            </div>
            <span className="font-semibold">
              {new Intl.NumberFormat('en-US', {
                style: 'currency',
                currency: 'USD',
              }).format(account.balance)}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
};
```

---

### 🟡 **FASE 2: CARACTERÍSTICAS AVANZADAS** (6-8 semanas)

#### 2.1 Presupuestos Flexibles
**Actualizar modelo de Budget:**

```prisma
model Budget {
  id         String   @id @default(uuid()) @db.Uuid
  userId     String   @map("user_id") @db.Uuid
  categoryId String?  @map("category_id") @db.Uuid // Opcional para presupuesto total
  name       String   @db.VarChar(200)
  amount     Decimal  @db.Decimal(15, 2)

  // NUEVO: Períodos flexibles
  periodType String   @default("MONTHLY") @map("period_type") @db.VarChar(20)
  // Valores: "WEEKLY", "BIWEEKLY", "MONTHLY", "QUARTERLY", "YEARLY", "CUSTOM"

  startDate  DateTime @map("start_date") @db.Timestamptz(6)
  endDate    DateTime @map("end_date") @db.Timestamptz(6)

  // Campos calculados
  spent      Decimal  @default(0) @db.Decimal(15, 2)

  // NUEVO: Configuración avanzada
  rollover   Boolean  @default(false) // Transferir saldo no usado
  notifyAt   Decimal? @default(80) @map("notify_at") @db.Decimal(5, 2) // Notificar al 80%

  // NUEVO: Límites por categoría dentro del presupuesto
  categoryLimits Json? @map("category_limits") @db.JsonB
  // { "category_id_1": 800, "category_id_2": 300 }

  isActive   Boolean  @default(true) @map("is_active")
  isPinned   Boolean  @default(false) @map("is_pinned")

  createdAt  DateTime @default(now()) @map("created_at") @db.Timestamptz(6)
  updatedAt  DateTime @updatedAt @map("updated_at") @db.Timestamptz(6)

  user     Profile          @relation(fields: [userId], references: [id], onDelete: Cascade)
  category ExpenseCategory? @relation(fields: [categoryId], references: [id], onDelete: Cascade)

  @@index([userId])
  @@index([startDate, endDate])
  @@map("budgets")
}
```

#### 2.2 Multi-moneda con Conversión
**Nuevas tablas:**

```prisma
model Currency {
  id        String   @id @default(uuid()) @db.Uuid
  code      String   @unique @db.VarChar(3) // USD, EUR, etc.
  name      String   @db.VarChar(100)
  symbol    String   @db.VarChar(10)
  isActive  Boolean  @default(true) @map("is_active")
  createdAt DateTime @default(now()) @map("created_at") @db.Timestamptz(6)

  @@map("currencies")
}

model ExchangeRate {
  id           String   @id @default(uuid()) @db.Uuid
  fromCurrency String   @map("from_currency") @db.VarChar(3)
  toCurrency   String   @map("to_currency") @db.VarChar(3)
  rate         Decimal  @db.Decimal(18, 8)
  date         DateTime @db.Timestamptz(6)
  source       String?  @db.VarChar(50) // "API", "MANUAL"
  createdAt    DateTime @default(now()) @map("created_at") @db.Timestamptz(6)

  @@unique([fromCurrency, toCurrency, date])
  @@index([fromCurrency, toCurrency])
  @@index([date])
  @@map("exchange_rates")
}

// Actualizar Transaction para multi-moneda
model Transaction {
  // ... campos existentes

  // NUEVO: Multi-moneda
  originalAmount   Decimal? @map("original_amount") @db.Decimal(15, 2)
  originalCurrency String?  @map("original_currency") @db.VarChar(3)
  exchangeRate     Decimal? @map("exchange_rate") @db.Decimal(18, 8)
  // amount siempre en moneda de la cuenta
}
```

**API para obtener tasas de cambio:**

```typescript
// app/api/exchange-rates/route.ts
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET() {
  // Obtener tasas desde API externa (ej: exchangerate-api.com)
  const response = await fetch(
    `https://api.exchangerate-api.com/v4/latest/USD`
  );
  const data = await response.json();

  // Guardar en DB
  const rates = Object.entries(data.rates).map(([currency, rate]) => ({
    fromCurrency: 'USD',
    toCurrency: currency,
    rate: rate as number,
    date: new Date(data.date),
    source: 'API',
  }));

  await prisma.exchangeRate.createMany({
    data: rates,
    skipDuplicates: true,
  });

  return NextResponse.json({ success: true, count: rates.length });
}

// Hook para conversión de monedas
// hooks/useExchangeRate.ts
export const useExchangeRate = (
  from: string,
  to: string,
  date?: Date
) => {
  return useQuery({
    queryKey: ['exchange-rate', from, to, date],
    queryFn: async () => {
      const params = new URLSearchParams({
        from,
        to,
        date: date?.toISOString() || new Date().toISOString(),
      });
      const res = await fetch(`/api/exchange-rates/convert?${params}`);
      return res.json();
    },
    enabled: from !== to,
  });
};
```

#### 2.3 Heatmap Calendar
```typescript
// components/dashboard/widgets/calendar-heatmap-widget.tsx
'use client';

import { useQuery } from '@tanstack/react-query';
import { format, eachDayOfInterval, startOfMonth, endOfMonth } from 'date-fns';

export const CalendarHeatmapWidget = ({ config }: { config: Record<string, any> }) => {
  const { data: spendingData } = useQuery({
    queryKey: ['spending-calendar'],
    queryFn: async () => {
      const res = await fetch('/api/dashboard/spending-calendar');
      return res.json();
    },
  });

  if (!spendingData) return <div>Loading...</div>;

  const days = eachDayOfInterval({
    start: startOfMonth(new Date()),
    end: endOfMonth(new Date()),
  });

  const getIntensity = (amount: number) => {
    if (amount === 0) return 'bg-gray-100';
    if (amount < 50) return 'bg-green-200';
    if (amount < 150) return 'bg-green-400';
    if (amount < 300) return 'bg-green-600';
    return 'bg-green-800';
  };

  return (
    <div className="bg-white rounded-xl shadow-lg p-6">
      <h2 className="text-lg font-semibold mb-4">Spending Activity</h2>

      <div className="grid grid-cols-7 gap-2">
        {['Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa', 'Su'].map((day) => (
          <div key={day} className="text-xs text-center text-gray-500">
            {day}
          </div>
        ))}

        {days.map((day) => {
          const dateKey = format(day, 'yyyy-MM-dd');
          const amount = spendingData[dateKey] || 0;

          return (
            <div
              key={dateKey}
              className={`aspect-square rounded-sm ${getIntensity(amount)} cursor-pointer hover:ring-2 hover:ring-primary-500 transition`}
              title={`${format(day, 'MMM d')}: $${amount}`}
            />
          );
        })}
      </div>

      <div className="flex items-center justify-between mt-4 text-xs text-gray-500">
        <span>Light: Low spending</span>
        <div className="flex gap-1">
          <div className="w-4 h-4 bg-gray-100 rounded-sm" />
          <div className="w-4 h-4 bg-green-200 rounded-sm" />
          <div className="w-4 h-4 bg-green-400 rounded-sm" />
          <div className="w-4 h-4 bg-green-600 rounded-sm" />
          <div className="w-4 h-4 bg-green-800 rounded-sm" />
        </div>
        <span>Dark: High spending</span>
      </div>
    </div>
  );
};
```

---

### 🟢 **FASE 3: FEATURES PREMIUM** (8-10 semanas)

#### 3.1 Import/Export CSV

```typescript
// app/api/import/csv/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { prisma } from '@/lib/prisma';
import { parse } from 'csv-parse/sync';

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const formData = await request.formData();
  const file = formData.get('file') as File;
  const mapping = JSON.parse(formData.get('mapping') as string);

  const csvContent = await file.text();
  const records = parse(csvContent, {
    columns: true,
    skip_empty_lines: true,
  });

  const transactions = [];

  for (const record of records) {
    const transaction = {
      userId: user.id,
      amount: parseFloat(record[mapping.amount]),
      description: record[mapping.description],
      transactionDate: new Date(record[mapping.date]),
      accountId: mapping.defaultAccount,
      transactionType: parseFloat(record[mapping.amount]) < 0 ? 'EXPENSE' : 'INCOME',
    };

    // Auto-categorizar si hay keyword conocido
    const smartCategory = await prisma.categoryLearning.findFirst({
      where: {
        userId: user.id,
        keyword: {
          contains: transaction.description.toLowerCase(),
        },
      },
      orderBy: {
        confidence: 'desc',
      },
    });

    if (smartCategory) {
      transaction.expenseCategoryId = smartCategory.categoryId;
    }

    transactions.push(transaction);
  }

  // Bulk insert
  await prisma.transaction.createMany({
    data: transactions,
  });

  return NextResponse.json({
    success: true,
    imported: transactions.length
  });
}

// app/api/export/csv/route.ts
export async function GET(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const searchParams = request.nextUrl.searchParams;
  const startDate = searchParams.get('startDate');
  const endDate = searchParams.get('endDate');

  const transactions = await prisma.transaction.findMany({
    where: {
      userId: user.id,
      transactionDate: {
        gte: startDate ? new Date(startDate) : undefined,
        lte: endDate ? new Date(endDate) : undefined,
      },
    },
    include: {
      account: true,
      expenseCategory: true,
      incomeCategory: true,
    },
    orderBy: {
      transactionDate: 'desc',
    },
  });

  // Generar CSV
  const csvRows = [
    ['Date', 'Description', 'Amount', 'Category', 'Account', 'Type'].join(','),
  ];

  transactions.forEach((tx) => {
    csvRows.push(
      [
        format(tx.transactionDate, 'yyyy-MM-dd'),
        `"${tx.description}"`,
        tx.amount.toString(),
        tx.expenseCategory?.name || tx.incomeCategory?.name || '',
        tx.account.name,
        tx.transactionType,
      ].join(',')
    );
  });

  const csv = csvRows.join('\n');

  return new Response(csv, {
    headers: {
      'Content-Type': 'text/csv',
      'Content-Disposition': `attachment; filename="transactions-${format(new Date(), 'yyyy-MM-dd')}.csv"`,
    },
  });
}
```

#### 3.2 Push Notifications

```typescript
// lib/notifications.ts
export const requestNotificationPermission = async () => {
  if ('Notification' in window && 'serviceWorker' in navigator) {
    const permission = await Notification.requestPermission();

    if (permission === 'granted') {
      // Registrar service worker para push notifications
      const registration = await navigator.serviceWorker.register('/sw.js');

      return {
        granted: true,
        registration,
      };
    }
  }

  return { granted: false };
};

export const sendNotification = async (
  title: string,
  body: string,
  data?: any
) => {
  if (Notification.permission === 'granted') {
    const registration = await navigator.serviceWorker.ready;

    await registration.showNotification(title, {
      body,
      icon: '/icon-192x192.png',
      badge: '/badge-72x72.png',
      tag: data?.tag || 'default',
      data,
      requireInteraction: true,
    });
  }
};

// Hook para notificaciones de presupuesto
// hooks/useBudgetNotifications.ts
export const useBudgetNotifications = () => {
  useEffect(() => {
    const checkBudgets = async () => {
      const res = await fetch('/api/budgets/check-alerts');
      const alerts = await res.json();

      alerts.forEach((alert: any) => {
        if (alert.percentage >= 80) {
          sendNotification(
            '⚠️ Budget Alert',
            `${alert.budgetName} is ${alert.percentage}% spent`,
            {
              tag: `budget-${alert.budgetId}`,
              url: `/budgets/${alert.budgetId}`,
            }
          );
        }
      });
    };

    // Check cada 30 minutos
    const interval = setInterval(checkBudgets, 30 * 60 * 1000);
    checkBudgets(); // Check inicial

    return () => clearInterval(interval);
  }, []);
};
```

#### 3.3 Keyboard Shortcuts

```typescript
// hooks/useKeyboardShortcuts.ts
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export const useKeyboardShortcuts = () => {
  const router = useRouter();

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const isCmdOrCtrl = e.metaKey || e.ctrlKey;

      // Cmd+N: Nueva transacción
      if (isCmdOrCtrl && e.key === 'n') {
        e.preventDefault();
        router.push('/transactions/new');
      }

      // Cmd+F: Buscar
      if (isCmdOrCtrl && e.key === 'f') {
        e.preventDefault();
        document.getElementById('search-input')?.focus();
      }

      // Cmd+B: Presupuestos
      if (isCmdOrCtrl && e.key === 'b') {
        e.preventDefault();
        router.push('/budgets');
      }

      // Cmd+G: Metas
      if (isCmdOrCtrl && e.key === 'g') {
        e.preventDefault();
        router.push('/goals');
      }

      // Cmd+A: Cuentas
      if (isCmdOrCtrl && e.key === 'a' && !e.shiftKey) {
        e.preventDefault();
        router.push('/accounts');
      }

      // Cmd+,: Configuración
      if (isCmdOrCtrl && e.key === ',') {
        e.preventDefault();
        router.push('/settings');
      }

      // ESC: Cerrar modal/drawer
      if (e.key === 'Escape') {
        // Emitir evento personalizado
        window.dispatchEvent(new Event('close-modal'));
      }

      // /: Focus search
      if (e.key === '/' && !e.ctrlKey && !e.metaKey) {
        e.preventDefault();
        document.getElementById('search-input')?.focus();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [router]);
};

// Componente para mostrar shortcuts disponibles
// components/keyboard-shortcuts-help.tsx
export const KeyboardShortcutsHelp = () => {
  const shortcuts = [
    { key: 'Cmd+N', action: 'New transaction' },
    { key: 'Cmd+F', action: 'Search' },
    { key: 'Cmd+B', action: 'View budgets' },
    { key: 'Cmd+G', action: 'View goals' },
    { key: 'Cmd+A', action: 'View accounts' },
    { key: 'Cmd+,', action: 'Settings' },
    { key: 'Esc', action: 'Close modal' },
    { key: '/', action: 'Focus search' },
  ];

  return (
    <div className="p-6 bg-white rounded-xl shadow-lg">
      <h2 className="text-xl font-bold mb-4">Keyboard Shortcuts</h2>
      <div className="space-y-2">
        {shortcuts.map(({ key, action }) => (
          <div key={key} className="flex justify-between items-center">
            <span className="font-mono text-sm bg-gray-100 px-3 py-1 rounded">
              {key}
            </span>
            <span className="text-gray-600">{action}</span>
          </div>
        ))}
      </div>
    </div>
  );
};
```

---

## 🎨 MEJORAS UX/UI ESPECÍFICAS DE LUMIO

### 1. Mejorar UI del Sistema de Caja Chica
**Actualmente Lumio tiene un sistema robusto pero necesita mejor UX**

```typescript
// components/petty-cash/fund-card.tsx
import { TrendingDown, AlertCircle, CheckCircle } from 'lucide-react';
import { AnimatedNumber } from '@/components/ui/animated-number';

export const PettyCashFundCard = ({ fund }: { fund: PettyCashFund }) => {
  const usagePercentage = (fund.currentBalance / fund.assignedAmount) * 100;
  const needsSettlement = usagePercentage <= fund.settlementThreshold;

  return (
    <div className="bg-white rounded-xl shadow-lg p-6 border-l-4 border-orange-500">
      <div className="flex justify-between items-start mb-4">
        <div>
          <h3 className="text-lg font-semibold">{fund.fundName}</h3>
          <p className="text-sm text-gray-500">{fund.fundCode}</p>
        </div>
        {needsSettlement && (
          <span className="flex items-center gap-1 text-orange-600 text-sm font-medium">
            <AlertCircle className="w-4 h-4" />
            Needs Settlement
          </span>
        )}
      </div>

      <div className="mb-4">
        <div className="flex items-baseline gap-2">
          <AnimatedNumber value={Number(fund.currentBalance)} />
          <span className="text-sm text-gray-500">
            / {new Intl.NumberFormat('en-US', {
              style: 'currency',
              currency: fund.currencyCode,
            }).format(Number(fund.assignedAmount))}
          </span>
        </div>

        <div className="mt-2 h-2 bg-gray-200 rounded-full overflow-hidden">
          <div
            className={`h-full transition-all duration-500 ${
              usagePercentage > 50 ? 'bg-green-500' : 'bg-orange-500'
            }`}
            style={{ width: `${usagePercentage}%` }}
          />
        </div>

        <p className="text-xs text-gray-500 mt-1">
          {usagePercentage.toFixed(0)}% remaining
        </p>
      </div>

      <div className="flex items-center justify-between text-sm">
        <div>
          <p className="text-gray-500">Responsible</p>
          <p className="font-medium">{fund.responsibleName}</p>
        </div>
        <div className="text-right">
          <p className="text-gray-500">Department</p>
          <p className="font-medium">{fund.department || 'N/A'}</p>
        </div>
      </div>

      <div className="mt-4 flex gap-2">
        <button className="flex-1 px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition">
          Add Expense
        </button>
        <button className="flex-1 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition">
          Settle
        </button>
      </div>
    </div>
  );
};
```

### 2. Mejorar Visualización de Tarjetas de Crédito

```typescript
// components/credit-cards/credit-card-visual.tsx
export const CreditCardVisual = ({ card }: { card: CreditCard }) => {
  const usagePercentage = (Number(card.usedBalance) / Number(card.creditLimit)) * 100;
  const availableCredit = Number(card.creditLimit) - Number(card.usedBalance);

  const getCardGradient = (network: string) => {
    const gradients = {
      VISA: 'from-blue-600 to-blue-800',
      MASTERCARD: 'from-red-600 to-orange-600',
      AMEX: 'from-gray-700 to-gray-900',
      DISCOVER: 'from-orange-500 to-orange-700',
    };
    return gradients[network] || 'from-gray-600 to-gray-800';
  };

  return (
    <div
      className={`relative w-full h-48 rounded-2xl p-6 text-white bg-gradient-to-br ${getCardGradient(
        card.cardNetwork || 'VISA'
      )} shadow-xl`}
    >
      {/* Chip */}
      <div className="absolute top-6 left-6 w-12 h-10 bg-yellow-400 rounded-md opacity-80" />

      {/* Card Number */}
      <div className="absolute top-20 left-6 font-mono text-lg tracking-wider">
        •••• •••• •••• {card.lastFourDigits}
      </div>

      {/* Cardholder & Expiry */}
      <div className="absolute bottom-6 left-6">
        <p className="text-xs opacity-70">CARDHOLDER</p>
        <p className="font-semibold">{card.name}</p>
      </div>

      <div className="absolute bottom-6 right-6 text-right">
        <p className="text-xs opacity-70">EXPIRES</p>
        <p className="font-semibold">
          {card.expiryDate && format(new Date(card.expiryDate), 'MM/yy')}
        </p>
      </div>

      {/* Network Logo */}
      <div className="absolute top-6 right-6">
        <span className="text-2xl font-bold">{card.cardNetwork}</span>
      </div>

      {/* Balance Info */}
      <div className="absolute inset-x-0 -bottom-16 mx-6 p-4 bg-white rounded-xl shadow-lg">
        <div className="flex justify-between items-center mb-2">
          <span className="text-sm text-gray-600">Available Credit</span>
          <span className="text-xl font-bold text-gray-900">
            {new Intl.NumberFormat('en-US', {
              style: 'currency',
              currency: card.currencyCode,
            }).format(availableCredit)}
          </span>
        </div>

        <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
          <div
            className={`h-full transition-all duration-500 ${
              usagePercentage > 80 ? 'bg-red-500' : usagePercentage > 50 ? 'bg-yellow-500' : 'bg-green-500'
            }`}
            style={{ width: `${usagePercentage}%` }}
          />
        </div>

        <p className="text-xs text-gray-500 mt-1">
          {usagePercentage.toFixed(1)}% used of{' '}
          {new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: card.currencyCode,
          }).format(Number(card.creditLimit))}
        </p>
      </div>
    </div>
  );
};
```

---

## 📱 RESPONSIVE & PWA

### Progressive Web App Configuration

```json
// public/manifest.json
{
  "name": "Lumio Finance",
  "short_name": "Lumio",
  "description": "Complete financial management for individuals and businesses",
  "start_url": "/",
  "display": "standalone",
  "background_color": "#ffffff",
  "theme_color": "#0ea5e9",
  "orientation": "portrait-primary",
  "icons": [
    {
      "src": "/icon-72x72.png",
      "sizes": "72x72",
      "type": "image/png"
    },
    {
      "src": "/icon-96x96.png",
      "sizes": "96x96",
      "type": "image/png"
    },
    {
      "src": "/icon-128x128.png",
      "sizes": "128x128",
      "type": "image/png"
    },
    {
      "src": "/icon-144x144.png",
      "sizes": "144x144",
      "type": "image/png"
    },
    {
      "src": "/icon-152x152.png",
      "sizes": "152x152",
      "type": "image/png"
    },
    {
      "src": "/icon-192x192.png",
      "sizes": "192x192",
      "type": "image/png",
      "purpose": "any maskable"
    },
    {
      "src": "/icon-384x384.png",
      "sizes": "384x384",
      "type": "image/png"
    },
    {
      "src": "/icon-512x512.png",
      "sizes": "512x512",
      "type": "image/png"
    }
  ],
  "shortcuts": [
    {
      "name": "New Transaction",
      "url": "/transactions/new",
      "icon": "/shortcuts/new-transaction.png"
    },
    {
      "name": "View Budgets",
      "url": "/budgets",
      "icon": "/shortcuts/budgets.png"
    },
    {
      "name": "Accounts",
      "url": "/accounts",
      "icon": "/shortcuts/accounts.png"
    }
  ]
}
```

```typescript
// public/sw.js - Service Worker
const CACHE_NAME = 'lumio-v1';
const urlsToCache = [
  '/',
  '/offline',
  '/icon-192x192.png',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(urlsToCache);
    })
  );
});

self.addEventListener('fetch', (event) => {
  event.respondWith(
    caches.match(event.request).then((response) => {
      return response || fetch(event.request);
    })
  );
});

// Push notification handler
self.addEventListener('push', (event) => {
  const data = event.data.json();

  const options = {
    body: data.body,
    icon: '/icon-192x192.png',
    badge: '/badge-72x72.png',
    data: data.url,
  };

  event.waitUntil(
    self.registration.showNotification(data.title, options)
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  event.waitUntil(
    clients.openWindow(event.notification.data)
  );
});
```

---

## 🗂️ ESTRUCTURA DE ARCHIVOS FINAL

```
lumio/
├── app/
│   ├── (auth)/
│   │   ├── login/
│   │   └── register/
│   ├── (dashboard)/
│   │   ├── layout.tsx
│   │   ├── page.tsx                    # Dashboard personalizable
│   │   ├── transactions/
│   │   ├── budgets/
│   │   ├── goals/
│   │   ├── accounts/
│   │   ├── credit-cards/
│   │   ├── petty-cash/
│   │   └── settings/
│   ├── api/
│   │   ├── dashboard/
│   │   │   ├── config/route.ts         # Dashboard config
│   │   │   ├── net-worth/route.ts
│   │   │   └── spending-calendar/route.ts
│   │   ├── smart-categories/
│   │   │   ├── suggest/route.ts
│   │   │   └── learn/route.ts
│   │   ├── budgets/
│   │   │   └── check-alerts/route.ts
│   │   ├── exchange-rates/
│   │   │   ├── route.ts
│   │   │   └── convert/route.ts
│   │   ├── import/
│   │   │   └── csv/route.ts
│   │   └── export/
│   │       └── csv/route.ts
│   ├── globals.css
│   └── layout.tsx
├── components/
│   ├── ui/                             # Componentes base reutilizables
│   │   ├── animated-number.tsx
│   │   ├── progress-bar.tsx
│   │   ├── skeleton-loader.tsx
│   │   ├── swipeable-item.tsx
│   │   ├── amount-input.tsx
│   │   └── ...radix components
│   ├── dashboard/
│   │   ├── widget-manager.tsx
│   │   └── widgets/
│   │       ├── net-worth-widget.tsx
│   │       ├── spending-chart-widget.tsx
│   │       ├── budgets-widget.tsx
│   │       ├── recent-transactions-widget.tsx
│   │       ├── goals-widget.tsx
│   │       ├── calendar-heatmap-widget.tsx
│   │       └── category-pie-widget.tsx
│   ├── transactions/
│   │   ├── swipeable-transaction.tsx
│   │   ├── transaction-card.tsx
│   │   ├── transaction-form.tsx
│   │   └── transaction-filters.tsx
│   ├── budgets/
│   │   ├── budget-card.tsx
│   │   ├── budget-form.tsx
│   │   └── category-limits.tsx
│   ├── credit-cards/
│   │   ├── credit-card-visual.tsx
│   │   ├── credit-card-statement.tsx
│   │   └── payment-calendar.tsx
│   ├── petty-cash/
│   │   ├── fund-card.tsx
│   │   ├── expense-form.tsx
│   │   └── settlement-form.tsx
│   ├── layout/
│   │   ├── sidebar.tsx
│   │   ├── bottom-nav.tsx
│   │   └── header.tsx
│   └── keyboard-shortcuts-help.tsx
├── hooks/
│   ├── useSmartCategories.ts
│   ├── useExchangeRate.ts
│   ├── useBudgetNotifications.ts
│   ├── useKeyboardShortcuts.ts
│   ├── useMediaQuery.ts
│   └── useAutoLock.ts
├── lib/
│   ├── design-system/
│   │   ├── colors.ts
│   │   ├── typography.ts
│   │   ├── spacing.ts
│   │   └── tokens.ts
│   ├── notifications.ts
│   ├── prisma.ts
│   └── supabase/
│       ├── client.ts
│       └── server.ts
├── types/
│   ├── widgets.ts
│   ├── transactions.ts
│   ├── budgets.ts
│   └── index.ts
├── prisma/
│   └── schema.prisma                   # Schema actualizado
├── public/
│   ├── manifest.json
│   ├── sw.js
│   ├── icon-*.png
│   └── shortcuts/
├── package.json
└── README.md
```

---

## 📦 DEPENDENCIAS ACTUALIZADAS

```json
{
  "dependencies": {
    "@dnd-kit/core": "^6.1.0",
    "@dnd-kit/sortable": "^8.0.0",
    "@google/generative-ai": "^0.24.1",
    "@hookform/resolvers": "^5.2.2",
    "@prisma/client": "^6.19.1",
    "@radix-ui/react-*": "latest",
    "@react-spring/web": "^9.7.3",
    "@supabase/ssr": "^0.8.0",
    "@supabase/supabase-js": "^2.89.0",
    "@tanstack/react-query": "^5.90.12",
    "chart.js": "^4.4.1",
    "class-variance-authority": "^0.7.1",
    "clsx": "^2.1.1",
    "cmdk": "^1.1.1",
    "csv-parse": "^5.5.3",
    "date-fns": "^4.1.0",
    "framer-motion": "^12.23.26",
    "lucide-react": "^0.562.0",
    "mathjs": "^12.4.0",
    "next": "16.1.1",
    "next-themes": "^0.4.6",
    "pg": "^8.16.3",
    "prisma": "^6.19.1",
    "react": "19.2.3",
    "react-calendar-heatmap": "^1.9.0",
    "react-chartjs-2": "^5.2.0",
    "react-day-picker": "^9.13.0",
    "react-dom": "19.2.3",
    "react-hook-form": "^7.69.0",
    "recharts": "^3.6.0",
    "sonner": "^2.0.7",
    "swr": "^2.3.8",
    "tailwind-merge": "^3.4.0",
    "zod": "^4.2.1",
    "zustand": "^5.0.9"
  }
}
```

---

## ✅ CHECKLIST DE IMPLEMENTACIÓN

### Fase 1 (Semanas 1-6)
- [ ] Instalar todas las dependencias nuevas
- [ ] Crear sistema de diseño (colors, typography, spacing)
- [ ] Implementar componentes UI base
  - [ ] AnimatedNumber
  - [ ] ProgressBar
  - [ ] SkeletonLoader
  - [ ] SwipeableItem
  - [ ] AmountInput con calculator
- [ ] Actualizar schema Prisma (CategoryLearning, Budget flexible)
- [x] Migrar base de datos (tabla category_learning creada en Supabase) ✅
- [x] Implementar Smart Categorization ✅ COMPLETADO
  - [x] API endpoints (suggest, learn)
  - [x] Hook useSmartCategories
  - [x] Integrar en form de transacciones
  - [x] Aprendizaje automático al guardar transacción
- [ ] Implementar Swipe Actions en transacciones
- [ ] Implementar Dashboard Personalizable
  - [ ] Modelo de datos (dashboardConfig en Profile)
  - [ ] WidgetManager con drag & drop
  - [ ] NetWorthWidget
  - [ ] SpendingChartWidget
  - [ ] RecentTransactionsWidget
- [x] Keyboard Shortcuts ✅ COMPLETADO
  - [x] Hook useKeyboardShortcuts
  - [x] KeyboardShortcutsProvider en layout
  - [x] KeyboardShortcutsDialog (Shift+?)

### Fase 2 (Semanas 7-14) - ❌ PENDIENTE
- [ ] Presupuestos Flexibles
  - [ ] Actualizar modelo Budget
  - [ ] UI para períodos custom
  - [ ] Cálculos automáticos
  - [ ] Rollover de saldo
- [ ] Multi-moneda
  - [x] Tablas Currency y ExchangeRate (ya existen en Supabase)
  - [ ] API para obtener tasas automáticas
  - [ ] Hook useExchangeRate
  - [ ] UI para conversión en transacciones
- [ ] Más Widgets
  - [ ] CalendarHeatmapWidget
  - [ ] CategoryPieWidget mejorado
  - [ ] BudgetsWidget
  - [ ] GoalsWidget
- [ ] Mejorar UI de Petty Cash
  - [ ] PettyCashFundCard mejorado
  - [ ] Dashboard de fondos
  - [ ] Flujo de liquidación simplificado
- [ ] Mejorar UI de Tarjetas de Crédito
  - [ ] CreditCardVisual
  - [ ] Statement timeline
  - [ ] Payment calendar

### Fase 3 (Semanas 15-24) - ❌ PENDIENTE
- [ ] Import/Export
  - [ ] CSV Import con mapeo de columnas
  - [ ] CSV Export con filtros
  - [ ] Integración con Google Sheets (opcional)
- [ ] Notificaciones
  - [ ] Push notifications setup
  - [ ] Budget alerts
  - [ ] Goal milestones
  - [ ] Upcoming transactions
  - [ ] Subscription renewals
- [ ] PWA
  - [ ] manifest.json
  - [ ] Service Worker
  - [ ] Offline support básico
  - [ ] Install prompt
- [ ] Biometric Lock (opcional)
  - [ ] WebAuthn integration
  - [ ] Auto-lock
  - [ ] Lock screen UI

---

## 🚀 SIGUIENTES PASOS INMEDIATOS

1. **Instalar dependencias nuevas**
```bash
cd lumio
npm install @dnd-kit/core @dnd-kit/sortable mathjs csv-parse react-calendar-heatmap @react-spring/web chart.js react-chartjs-2
```

2. **Actualizar Prisma Schema**
   - Agregar tabla `CategoryLearning`
   - Actualizar modelo `Budget` con campos flexibles
   - Agregar tablas `Currency` y `ExchangeRate`
   - Actualizar `Profile` con `dashboardConfig`

3. **Migrar base de datos**
```bash
npx prisma migrate dev --name add_smart_features
npx prisma generate
```

4. **Crear estructura de carpetas base**
```bash
mkdir -p lib/design-system
mkdir -p components/ui
mkdir -p components/dashboard/widgets
mkdir -p hooks
```

5. **Implementar primer widget (Net Worth)**
   - Crear componente base
   - Crear API endpoint
   - Testear en dashboard

---

## 📊 MÉTRICAS DE ÉXITO

Al completar este plan, Lumio Finance tendrá:

✅ **100% de las funcionalidades de Cashew** adaptadas a web
✅ **Funcionalidades únicas** que Cashew no tiene (Petty Cash, Credit Cards avanzadas)
✅ **UX superior** con gestos, animaciones y personalización
✅ **Smart features** con IA y aprendizaje automático
✅ **Escalabilidad empresarial** manteniendo simplicidad para usuarios individuales

---

**¡Lumio Finance será la app de finanzas más completa del mercado!** 🚀💰
