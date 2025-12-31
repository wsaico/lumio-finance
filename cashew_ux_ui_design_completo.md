# 🎨 CASHEW - GUÍA COMPLETA DE UX/UI Y DISEÑO PARA LUMIO

## 📋 ÍNDICE EJECUTIVO

Esta guía documenta **TODOS los patrones UX/UI, diseño, interacciones y funcionalidades** de Cashew para implementar en Lumio (React + Next.js + Supabase). Es una referencia completa para otra IA que desarrollará la aplicación.

---

## 🎯 FILOSOFÍA DE DISEÑO

### Principios Core de Cashew

1. **📱 Mobile-First, but Adaptive**
   - Diseñado primero para móvil
   - Se adapta perfectamente a tablet y desktop
   - Mismo UX en todas las plataformas

2. **✨ Material You (Material Design 3)**
   - Colores dinámicos del sistema
   - Elevaciones sutiles con sombras
   - Bordes redondeados consistentes
   - Animaciones fluidas y naturales

3. **🎨 Personalización Extrema**
   - Color de acento customizable
   - Tema claro/oscuro
   - Home screen totalmente personalizable
   - Ordenamiento drag & drop

4. **⚡ Rápido y Eficiente**
   - Mínimos clics para acciones comunes
   - Gestos intuitivos (swipe, long-press)
   - Atajos de teclado en web
   - Shortcuts personalizables

5. **🧠 Inteligente pero Simple**
   - Auto-completado y sugerencias
   - Aprende de patrones del usuario
   - No overwhelm con opciones
   - Progresive disclosure

---

## 🏠 ESTRUCTURA DE NAVEGACIÓN

### Bottom Navigation Bar (Mobile) / Side Navigation (Desktop)

```
┌─────────────────────────────────────┐
│  [Home] [Transactions] [Budgets]    │
│         [+]                          │
│  [Goals] [Accounts]  [More]         │
└─────────────────────────────────────┘
```

#### Tabs Principales:

1. **🏠 Home** - Dashboard personalizable
2. **💸 Transactions** - Lista de transacciones
3. **💰 Budgets** - Gestión de presupuestos
4. **➕ FAB** - Botón flotante para agregar
5. **🎯 Goals** - Metas de ahorro/gasto
6. **💼 Accounts** - Cuentas y balances
7. **⚙️ More** - Configuración y extras

### Personalización de Navegación

**IMPORTANTE**: El usuario puede customizar qué tabs aparecen y en qué orden.

```typescript
// Estructura de configuración
interface NavigationConfig {
  tabs: NavigationTab[];
  defaultPage: TabId;
  fabAction: 'transaction' | 'transfer' | 'custom';
}

interface NavigationTab {
  id: TabId;
  icon: IconName;
  label: string;
  order: number;
  visible: boolean;
  badge?: number; // Para notificaciones
}
```

---

## 🏡 HOME PAGE - DASHBOARD PERSONALIZABLE

### Concepto Principal

El Home es **100% personalizable** - el usuario elige qué widgets mostrar y en qué orden.

### Widgets Disponibles

#### 1. **💵 Net Worth Card**

```
┌─────────────────────────────────────┐
│  Net Worth                    [Edit]│
│                                     │
│         $12,456.78                  │
│         ↑ +$234 this month          │
│                                     │
│  📊 [Mini line chart últimos 30d]  │
│                                     │
│  💳 Main Account    $5,234.00       │
│  💰 Savings         $7,222.78       │
└─────────────────────────────────────┘
```

**Interacciones:**
- Tap en el monto → Ver desglose de cuentas
- Tap en cuenta → Ir a detalles de cuenta
- Long-press → Configurar widget
- Swipe → Cambiar período de comparación

**Configuración:**
- Seleccionar qué cuentas incluir
- Período de comparación (week/month/year)
- Mostrar/ocultar gráfica
- Mostrar/ocultar lista de cuentas

#### 2. **📊 Spending Overview Chart**

```
┌─────────────────────────────────────┐
│  Spending This Month          [...]│
│                                     │
│  $3,456 / $5,000 (69%)              │
│  ████████████░░░░░░░                │
│                                     │
│  [Bar chart por semana]             │
│                                     │
│  🍔 Food        $850                │
│  🚗 Transport   $420                │
│  🎮 Fun         $310                │
└─────────────────────────────────────┘
```

**Tipos de gráficas:**
- Line chart (tendencia temporal)
- Bar chart (comparativa por período)
- Pie chart (proporción por categoría)
- Heatmap calendar (actividad diaria)

**Configuración:**
- Tipo de gráfica
- Período (week/month/year/custom)
- Filtrar por cuenta
- Filtrar por categoría
- Incluir/excluir ingresos

#### 3. **🎯 Budget Progress Cards**

```
┌─────────────────────────────────────┐
│  Monthly Budget             [Pin 📌]│
│                                     │
│  $3,456 / $5,000 spent              │
│  ███████████████░░░░░  69%          │
│  $1,544 left • 12 days remaining    │
│                                     │
│  Top Categories:                    │
│  🍔 Food        $850 / $1,200 ✅    │
│  🚗 Transport   $420 / $500   ✅    │
│  🏠 Rent        $1,500 / $1,500 ⚠️  │
└─────────────────────────────────────┘
```

**Estados visuales:**
- ✅ Verde: Dentro del presupuesto
- ⚠️ Amarillo: 80-100% gastado
- 🔴 Rojo: Sobrepasado

**Interacciones:**
- Tap → Ver detalles del presupuesto
- Tap categoría → Ver transacciones de esa categoría
- Pin icon → Fijar/desfijar en home
- Long-press → Editar presupuesto

#### 4. **📅 Calendar Heatmap**

```
┌─────────────────────────────────────┐
│  Spending Activity            [Dec]│
│                                     │
│  Mo Tu We Th Fr Sa Su               │
│  ▓▓ ░░ ▓▓ ▓▓ ▓▓ ▓▓ ░░              │
│  ▓▓ ▓▓ ░░ ▓▓ ▓▓ ░░ ░░              │
│  ▓▓ ▓▓ ▓▓ ▓▓ ░░ ▓▓ ░░              │
│  ▓▓ ░░ ▓▓ ▓▓ ▓▓ ░░ ░░              │
│                                     │
│  Light: Low spending                │
│  Dark: High spending                │
└─────────────────────────────────────┘
```

**Intensidad de color:**
- Blanco/muy claro: $0
- Claro: $1-50
- Medio: $51-150
- Oscuro: $151-300
- Muy oscuro: $300+

**Interacciones:**
- Tap en día → Ver transacciones de ese día
- Tap mes → Cambiar mes
- Long-press → Ver total exacto del día

#### 5. **🥧 Category Pie Chart**

```
┌─────────────────────────────────────┐
│  Categories - December        [...]│
│                                     │
│      [Pie chart interactivo]        │
│                                     │
│  🍔 Food        35%  $1,200         │
│  🚗 Transport   20%  $680           │
│  🏠 Rent        25%  $850           │
│  🎮 Fun         10%  $340           │
│  📚 Other       10%  $340           │
└─────────────────────────────────────┘
```

**Configuración:**
- Mostrar solo top N categorías
- Agrupar categorías pequeñas en "Other"
- Incluir/excluir ingresos
- Período personalizado

#### 6. **💳 Recent Transactions List**

```
┌─────────────────────────────────────┐
│  Recent Transactions      [View All]│
│                                     │
│  🍔 Lunch                    -$12.50│
│  Today, 12:30 PM                    │
│  ─────────────────────────────────  │
│  ⛽ Gas                      -$45.00│
│  Yesterday, 8:15 AM                 │
│  ─────────────────────────────────  │
│  💰 Salary                +$3,500.00│
│  Dec 27, 9:00 AM                    │
└─────────────────────────────────────┘
```

**Configuración:**
- Número de transacciones (5/10/20)
- Filtrar por cuenta
- Filtrar por tipo (expense/income/all)
- Mostrar/ocultar notas

#### 7. **🎯 Goals Progress**

```
┌─────────────────────────────────────┐
│  Vacation Fund               [Pin]│
│                                     │
│  $2,450 / $5,000                    │
│  ██████████████░░░░░░  49%          │
│  $2,550 to go                       │
│                                     │
│  Est. completion: Jun 2025          │
│  Based on +$500/month avg           │
└─────────────────────────────────────┘
```

**Proyecciones inteligentes:**
- Calcula promedio de contribuciones
- Estima fecha de completación
- Sugiere ajustes para alcanzar meta

### Ordenamiento de Widgets

**Drag & Drop Interface:**

```
┌─────────────────────────────────────┐
│  Edit Home Page                 [✓] │
│                                     │
│  Drag to reorder, toggle to hide    │
│                                     │
│  ☰ ✓ Net Worth                      │
│  ☰ ✓ Spending Chart                 │
│  ☰ ✗ Budget Progress (hidden)       │
│  ☰ ✓ Recent Transactions            │
│  ☰ ✓ Goals                          │
│                                     │
│  [+ Add Widget]                     │
└─────────────────────────────────────┘
```

**Implementación en React:**

```typescript
import { DndContext, closestCenter } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';

const HomeWidgetManager = () => {
  const [widgets, setWidgets] = useState<HomeWidget[]>([
    { id: 'net-worth', enabled: true, order: 0, config: {} },
    { id: 'spending-chart', enabled: true, order: 1, config: {} },
    { id: 'budgets', enabled: false, order: 2, config: {} },
    // ...
  ]);

  const handleDragEnd = (event) => {
    // Reordenar widgets
  };

  return (
    <DndContext onDragEnd={handleDragEnd}>
      <SortableContext items={widgets} strategy={verticalListSortingStrategy}>
        {widgets.filter(w => w.enabled).map(widget => (
          <SortableWidget key={widget.id} widget={widget} />
        ))}
      </SortableContext>
    </DndContext>
  );
};
```

---

## 💸 TRANSACTIONS PAGE

### Vista Principal

```
┌─────────────────────────────────────┐
│ ← Transactions          [🔍] [⋮]    │
│                                     │
│ [All Accounts ▾] [All Time ▾]      │
│                                     │
│ TODAY                               │
│ ─────────────────────────────────── │
│ 🍔 Lunch at Chipotle       -$12.50  │
│    Food • 12:30 PM                  │
│ ☕ Coffee                   -$5.00  │
│    Food • 9:15 AM                   │
│                                     │
│ YESTERDAY                           │
│ ─────────────────────────────────── │
│ ⛽ Gas Station             -$45.00  │
│    Transport • 8:15 AM              │
│ 🎮 PS5 Game               -$59.99  │
│    Fun • Yesterday                  │
│                                     │
│ DEC 27                              │
│ ─────────────────────────────────── │
│ 💰 Monthly Salary      +$3,500.00  │
│    Income • 9:00 AM                 │
│                                     │
│        [Load More...]               │
└─────────────────────────────────────┘
```

### Interacciones de Lista

**Swipe Actions:**

```
┌─────────────────────────────────────┐
│ Swipe Left:                         │
│ [🗑️ Delete] Transaction             │
│                                     │
│ Swipe Right:                        │
│ Transaction [✏️ Edit] [📋 Duplicate]│
└─────────────────────────────────────┘
```

**Long Press:**
- Entra en modo de selección múltiple
- Muestra checkboxes
- Habilita acciones batch:
  - Eliminar múltiples
  - Cambiar categoría
  - Mover a otra cuenta
  - Exportar seleccionadas

**Tap:**
- Abre detalles de transacción (modal o nueva página)

### Filtros Avanzados

```
┌─────────────────────────────────────┐
│ Filters                         [✓] │
│                                     │
│ Date Range                          │
│ ○ All Time                          │
│ ○ This Month                        │
│ ● Custom Range                      │
│   [2024-01-01] to [2024-12-31]      │
│                                     │
│ Accounts                            │
│ ☑ Main Account                      │
│ ☑ Savings                           │
│ ☐ Credit Card                       │
│                                     │
│ Categories                          │
│ ☑ Food                              │
│ ☐ Transport                         │
│ ☑ Entertainment                     │
│ [Select All] [Clear All]            │
│                                     │
│ Type                                │
│ ☑ Expenses                          │
│ ☑ Income                            │
│ ☐ Transfers                         │
│                                     │
│ Amount Range                        │
│ Min: $[0.00]  Max: $[1000.00]       │
│                                     │
│ Search in Title/Note                │
│ [Type to search...]                 │
│                                     │
│ [Clear All]        [Apply Filters]  │
└─────────────────────────────────────┘
```

### Agrupamiento de Transacciones

**Opciones de agrupamiento:**
- Por fecha (día/semana/mes)
- Por categoría
- Por cuenta
- Por tipo (expense/income)
- Sin agrupar (flat list)

```typescript
interface GroupingOptions {
  type: 'date' | 'category' | 'account' | 'type' | 'none';
  sortOrder: 'asc' | 'desc';
  dateFormat?: 'day' | 'week' | 'month' | 'year';
}
```

---

## ✏️ ADD/EDIT TRANSACTION

### Modal de Agregar Transacción

```
┌─────────────────────────────────────┐
│ New Transaction              [✕]    │
│                                     │
│ ┌─────────────────────────────────┐ │
│ │ Expense  │  Income  │ Transfer │ │
│ │   [●]        [ ]        [ ]    │ │
│ └─────────────────────────────────┘ │
│                                     │
│ Amount                              │
│ ┌─────────────────────────────────┐ │
│ │  $ 0.00                    [⌫] │ │
│ └─────────────────────────────────┘ │
│                                     │
│ [Calculator pad numerico]           │
│ ┌────────────────────────────┐      │
│ │  7     8     9      ÷     │      │
│ │  4     5     6      ×     │      │
│ │  1     2     3      -     │      │
│ │  .     0    ⌫      +     │      │
│ └────────────────────────────┘      │
│                                     │
│ Title                               │
│ [Lunch at...]          [⌄ Recent]  │
│                                     │
│ Category                            │
│ [🍔 Food                        ▾]  │
│                                     │
│ Account                             │
│ [💳 Main Account                ▾]  │
│                                     │
│ Date & Time                         │
│ [Today, 2:30 PM                 ▾]  │
│                                     │
│ Note (Optional)                     │
│ [Add note...]                       │
│                                     │
│ [⋮ More Options]                    │
│                                     │
│         [Add Transaction]           │
└─────────────────────────────────────┘
```

### Características UX Importantes

**1. Calculator Integrado:**
- No necesitas calculadora externa
- Soporta operaciones: + - × ÷
- Muestra resultado en tiempo real
- Ejemplo: `50 + 20 × 2 = 90`

**2. Smart Suggestions:**

```
┌─────────────────────────────────────┐
│ Recent Titles:            [Clear]   │
│                                     │
│ 🍔 Lunch         [Tap to fill]      │
│    Last: $12.50, Food, Yesterday    │
│                                     │
│ ⛽ Gas           [Tap to fill]      │
│    Last: $45.00, Transport, 3d ago  │
│                                     │
│ ☕ Coffee        [Tap to fill]      │
│    Last: $5.00, Food, Today         │
└─────────────────────────────────────┘
```

**3. Auto-categorización:**
- Al escribir título, sugiere categoría automáticamente
- Aprende de transacciones previas
- Ejemplo: "Uber" → Auto-selecciona "Transport"

**4. More Options (Expandible):**

```
┌─────────────────────────────────────┐
│ ⋮ More Options                  [^] │
│                                     │
│ Type                                │
│ ○ Default                           │
│ ● Recurring                         │
│ ○ Subscription                      │
│ ○ Upcoming                          │
│                                     │
│ Repeat Every                        │
│ [1] [Week ▾]                        │
│                                     │
│ End Date                            │
│ ○ Never                             │
│ ● On Date: [2024-12-31]             │
│                                     │
│ Exclude from Budgets                │
│ ☐ Monthly Budget                    │
│ ☐ Groceries Budget                  │
│                                     │
│ Add to Goal                         │
│ [Select Goal ▾]                     │
│                                     │
│ Attach Files                        │
│ [📎 Add Receipt/Photo]              │
│                                     │
│ Shared with                         │
│ [👤 Add People]                     │
└─────────────────────────────────────┘
```

### Estados de Transacción

**Visual Indicators:**

```typescript
enum TransactionType {
  DEFAULT = 0,
  RECURRING = 1,
  SUBSCRIPTION = 2,
  UPCOMING = 3,
  DEBT = 4,
  CREDIT = 5
}

interface TransactionBadge {
  type: TransactionType;
  icon: string;
  color: string;
  label: string;
}

const badges = {
  [TransactionType.RECURRING]: {
    icon: '🔄',
    color: 'blue',
    label: 'Repeats'
  },
  [TransactionType.SUBSCRIPTION]: {
    icon: '📱',
    color: 'purple',
    label: 'Subscription'
  },
  [TransactionType.UPCOMING]: {
    icon: '📅',
    color: 'orange',
    label: 'Scheduled'
  },
  // ...
};
```

**Renderizado en lista:**

```
┌─────────────────────────────────────┐
│ 📱 Netflix Subscription    -$15.99  │
│    [Purple badge: Monthly]          │
│    Entertainment • Next: Jan 1      │
│                                     │
│ 📅 Rent Payment         -$1,500.00  │
│    [Orange badge: Upcoming]         │
│    Home • Due: Jan 1                │
└─────────────────────────────────────┘
```

---

## 💰 BUDGETS - GESTIÓN DE PRESUPUESTOS

### Lista de Presupuestos

```
┌─────────────────────────────────────┐
│ Budgets                     [+ Add] │
│                                     │
│ [Filter: All ▾] [Sort: Name ▾]      │
│                                     │
│ ACTIVE                              │
│ ─────────────────────────────────── │
│ 💳 Monthly Budget          📌       │
│ $3,456 / $5,000  (69%)              │
│ ████████████████░░░░░               │
│ 12 days left                        │
│ ─────────────────────────────────── │
│ 🍔 Groceries                        │
│ $523 / $800  (65%)                  │
│ ████████████████░░░░                │
│ Dec 1 - Dec 31                      │
│ ─────────────────────────────────── │
│ ✈️ Vacation Fund                    │
│ $234 / $2,000  (12%)                │
│ ████░░░░░░░░░░░░░░░░                │
│ Custom: Mar 15 - Apr 5              │
│                                     │
│ ARCHIVED                            │
│ ─────────────────────────────────── │
│ 🎄 Christmas Shopping               │
│ $1,234 / $1,200  (103%)  ⚠️         │
│ Ended Dec 24                        │
└─────────────────────────────────────┘
```

### Crear/Editar Presupuesto

```
┌─────────────────────────────────────┐
│ ← New Budget                   [✓]  │
│                                     │
│ Name                                │
│ [Monthly Expenses]                  │
│                                     │
│ Amount                              │
│ $ [5,000.00]                        │
│                                     │
│ Period                              │
│ ● Monthly                           │
│ ○ Weekly                            │
│ ○ Custom Range                      │
│                                     │
│ Start Date                          │
│ [First day of month ▾]              │
│                                     │
│ Account                             │
│ ○ All Accounts                      │
│ ● Specific: [Main Account ▾]        │
│                                     │
│ Categories                          │
│ ○ All Categories                    │
│ ● Selected Categories:              │
│   ☑ Food          [Limit: $800]    │
│   ☑ Transport     [Limit: $300]    │
│   ☑ Entertainment [Limit: $200]    │
│   ☐ Shopping                        │
│   [+ Add Category]                  │
│                                     │
│ Type                                │
│ ● Expense Budget                    │
│ ○ Income Budget                     │
│                                     │
│ Advanced Options                    │
│ ☐ Added Transactions Only           │
│ ☐ Rollover unused amount            │
│ ☑ Send notifications at 80%         │
│                                     │
│         [Create Budget]             │
└─────────────────────────────────────┘
```

### Detalles de Presupuesto

```
┌─────────────────────────────────────┐
│ ← Monthly Budget         [⋮] [Edit] │
│                                     │
│      $3,456 / $5,000                │
│      ████████████████░░░░░  69%     │
│      $1,544 remaining               │
│                                     │
│ ┌─────────────────────────────────┐ │
│ │ [Line chart: Spending Over Time]│ │
│ │                                 │ │
│ │ Shows daily spending trend      │ │
│ └─────────────────────────────────┘ │
│                                     │
│ Insights                            │
│ • On track to stay under budget     │
│ • Spending $115/day average         │
│ • Similar to last month             │
│                                     │
│ Category Breakdown                  │
│ ┌─────────────────────────────────┐ │
│ │ 🍔 Food                         │ │
│ │ $850 / $800  (106%)   ⚠️        │ │
│ │ ████████████████████░  106%     │ │
│ │ 23 transactions                 │ │
│ └─────────────────────────────────┘ │
│ ┌─────────────────────────────────┐ │
│ │ 🚗 Transport                    │ │
│ │ $420 / $500  (84%)     ✅       │ │
│ │ ████████████████░░░░░  84%      │ │
│ │ 12 transactions                 │ │
│ └─────────────────────────────────┘ │
│                                     │
│ Recent Transactions                 │
│ [Show all 156 transactions]         │
│                                     │
│ 🍔 Lunch            -$12.50  Today  │
│ ☕ Coffee           -$5.00   Today  │
│ ⛽ Gas              -$45.00  Yest.  │
│                                     │
│ Budget History                      │
│ [View Past Periods]                 │
│                                     │
│ Dec 2024:  $3,200/$5,000  (64%)  ✅ │
│ Nov 2024:  $4,800/$5,000  (96%)  ✅ │
│ Oct 2024:  $5,234/$5,000  (105%) ⚠️ │
└─────────────────────────────────────┘
```

### Límites por Categoría

**Configuración de límites:**

```
┌─────────────────────────────────────┐
│ Category Limits - Monthly Budget    │
│                                     │
│ Total Budget: $5,000                │
│ Allocated:    $3,200                │
│ Unallocated:  $1,800                │
│                                     │
│ ┌─────────────────────────────────┐ │
│ │ 🍔 Food                         │ │
│ │ Limit: $ [800.00]               │ │
│ │ [━━━━━━━━━━━] 16%               │ │
│ └─────────────────────────────────┘ │
│                                     │
│ ┌─────────────────────────────────┐ │
│ │ 🏠 Rent                         │ │
│ │ Limit: $ [1,500.00]             │ │
│ │ [━━━━━━━━━━━] 30%               │ │
│ └─────────────────────────────────┘ │
│                                     │
│ ┌─────────────────────────────────┐ │
│ │ 🚗 Transport                    │ │
│ │ Limit: $ [300.00]               │ │
│ │ [━━━━━━━━━━━] 6%                │ │
│ └─────────────────────────────────┘ │
│                                     │
│ [+ Add Category Limit]              │
│                                     │
│ ☑ Alert when category exceeds 80%  │
│ ☑ Alert when total exceeds budget   │
│                                     │
│         [Save Limits]               │
└─────────────────────────────────────┘
```

---

## 🎯 GOALS - METAS DE AHORRO/GASTO

### Lista de Metas

```
┌─────────────────────────────────────┐
│ Goals                       [+ Add] │
│                                     │
│ SAVING GOALS                        │
│ ─────────────────────────────────── │
│ ✈️ Vacation Fund           📌       │
│ $2,450 / $5,000  (49%)              │
│ ██████████████░░░░░░░░░░            │
│ Est. completion: Jun 2025           │
│ ─────────────────────────────────── │
│ 💍 Wedding Ring                     │
│ $1,230 / $3,000  (41%)              │
│ ████████████░░░░░░░░░░░░            │
│ +$500/month → Dec 2025              │
│                                     │
│ SPENDING GOALS                      │
│ ─────────────────────────────────── │
│ 🏠 Home Renovation                  │
│ $850 / $2,000  (43%)                │
│ ████████████░░░░░░░░░░░░            │
│ $1,150 left to spend                │
│                                     │
│ COMPLETED                           │
│ ─────────────────────────────────── │
│ 💻 New Laptop                    ✓ │
│ $1,500 / $1,500  (100%)             │
│ Completed Dec 15                    │
└─────────────────────────────────────┘
```

### Crear/Editar Meta

```
┌─────────────────────────────────────┐
│ ← New Goal                     [✓]  │
│                                     │
│ Name                                │
│ [Vacation Fund]                     │
│                                     │
│ Type                                │
│ ● 💰 Saving Goal                    │
│ ○ 💸 Spending Goal                  │
│ ○ 💳 Long-term Loan                 │
│                                     │
│ Target Amount                       │
│ $ [5,000.00]                        │
│                                     │
│ Account                             │
│ [Savings Account            ▾]      │
│                                     │
│ Icon & Color                        │
│ [✈️]  [🎨 Choose color]             │
│                                     │
│ Target Date (Optional)              │
│ [June 1, 2025               ▾]      │
│                                     │
│ Monthly Contribution (Optional)     │
│ $ [500.00]                          │
│ → Goal will be reached in 5 months  │
│                                     │
│         [Create Goal]               │
└─────────────────────────────────────┘
```

### Detalles de Meta

```
┌─────────────────────────────────────┐
│ ← Vacation Fund          [⋮] [Edit] │
│                                     │
│      $2,450 / $5,000                │
│      ██████████████░░░░░░  49%      │
│      $2,550 to go                   │
│                                     │
│ ┌─────────────────────────────────┐ │
│ │ [Progress chart over time]      │ │
│ │                                 │ │
│ │ Shows contributions month/month │ │
│ └─────────────────────────────────┘ │
│                                     │
│ Projections                         │
│ Based on recent activity:           │
│ • Average: +$500/month              │
│ • Estimated completion: Jun 2025    │
│ • To finish by May: +$637/month     │
│                                     │
│ Quick Actions                       │
│ [+ Add Contribution]                │
│ [− Withdraw]                        │
│                                     │
│ Transactions                        │
│ [Filter: All ▾]                     │
│                                     │
│ 💰 Monthly Savings    +$500  Dec 1  │
│ 💰 Bonus              +$200  Dec 15 │
│ 💰 Monthly Savings    +$500  Nov 1  │
│ 💰 Gift from Mom      +$250  Oct 28 │
│ 💰 Monthly Savings    +$500  Oct 1  │
│                                     │
│ [Load More...]                      │
│                                     │
│ Goal History                        │
│ Created: Sep 2024                   │
│ Original target: $5,000             │
│ Contributions: 8                    │
│ Average/month: $500                 │
└─────────────────────────────────────┘
```

### Agregar Transacción a Meta

**Desde Add Transaction:**

```
┌─────────────────────────────────────┐
│ More Options                    [^] │
│                                     │
│ Add to Goal                         │
│ [Select Goal...             ▾]      │
│                                     │
│ Available Goals:                    │
│ ✈️ Vacation Fund  ($2,450/$5,000)   │
│ 💍 Wedding Ring   ($1,230/$3,000)   │
│ 🏠 Renovation     ($850/$2,000)     │
└─────────────────────────────────────┘
```

**Desde Goal Details:**

```
┌─────────────────────────────────────┐
│ Add Contribution                    │
│                                     │
│ This will create a new transaction  │
│ tagged to this goal                 │
│                                     │
│ Amount                              │
│ $ [500.00]                          │
│                                     │
│ Date                                │
│ [Today                      ▾]      │
│                                     │
│ Note (Optional)                     │
│ [Monthly savings...]                │
│                                     │
│     [Add Contribution]              │
└─────────────────────────────────────┘
```

---

## 💼 ACCOUNTS - CUENTAS Y BALANCES

### Lista de Cuentas

```
┌─────────────────────────────────────┐
│ Accounts                    [+ Add] │
│                                     │
│ Total Net Worth                     │
│ $12,456.78                          │
│ ↑ +$234.00 this month               │
│                                     │
│ CASH & CHECKING                     │
│ ─────────────────────────────────── │
│ 💳 Main Account          $5,234.00  │
│    USD • 156 transactions           │
│ ─────────────────────────────────── │
│ 💰 Emergency Fund        $3,000.00  │
│    USD • 24 transactions            │
│                                     │
│ SAVINGS                             │
│ ─────────────────────────────────── │
│ 🏦 High Yield Savings    $7,222.78  │
│    USD • 12 transactions            │
│                                     │
│ CREDIT                              │
│ ─────────────────────────────────── │
│ 💳 Chase Sapphire       -$1,234.56  │
│    USD • 89 transactions            │
│    Due: Jan 15                      │
│                                     │
│ INVESTMENTS                         │
│ ─────────────────────────────────── │
│ 📈 Robinhood            $15,234.56  │
│    USD • Tracking only              │
│                                     │
│ [+ Add Account]                     │
└─────────────────────────────────────┘
```

### Crear/Editar Cuenta

```
┌─────────────────────────────────────┐
│ ← New Account                  [✓]  │
│                                     │
│ Name                                │
│ [Main Checking]                     │
│                                     │
│ Type                                │
│ [Checking              ▾]           │
│ Options: Checking, Savings,         │
│          Credit Card, Investment,   │
│          Cash, Loan, Other          │
│                                     │
│ Currency                            │
│ [USD - US Dollar       ▾]           │
│ Symbol: $                           │
│                                     │
│ Starting Balance                    │
│ $ [1,000.00]                        │
│ As of: [Today          ▾]           │
│                                     │
│ Icon & Color                        │
│ [💳]  [🎨 Choose color]             │
│                                     │
│ Include in Net Worth                │
│ ☑ Yes                               │
│                                     │
│ Notes (Optional)                    │
│ [My primary checking...]            │
│                                     │
│         [Create Account]            │
└─────────────────────────────────────┘
```

### Detalles de Cuenta

```
┌─────────────────────────────────────┐
│ ← Main Account           [⋮] [Edit] │
│                                     │
│         $5,234.00                   │
│         ↑ +$234 this month          │
│                                     │
│ ┌─────────────────────────────────┐ │
│ │ [Balance chart over time]       │ │
│ │                                 │ │
│ │ Shows balance trend             │ │
│ └─────────────────────────────────┘ │
│                                     │
│ Quick Actions                       │
│ [💸 Transfer] [💰 Adjust Balance]   │
│                                     │
│ Account Info                        │
│ Type:     Checking                  │
│ Currency: USD ($)                   │
│ Created:  Jan 2024                  │
│                                     │
│ Transactions                        │
│ [Filter: All Time ▾] [Search 🔍]    │
│                                     │
│ TODAY                               │
│ 🍔 Lunch            -$12.50         │
│ ☕ Coffee           -$5.00          │
│                                     │
│ YESTERDAY                           │
│ ⛽ Gas              -$45.00         │
│ 💰 Paycheck      +$2,500.00         │
│                                     │
│ [Load More...]                      │
│                                     │
│ Statistics                          │
│ Total transactions: 156             │
│ Income this month:  +$3,500         │
│ Expenses this month: -$2,266        │
│ Average daily:      -$75.53         │
└─────────────────────────────────────┘
```

### Transfer Entre Cuentas

```
┌─────────────────────────────────────┐
│ Transfer Funds                  [✕] │
│                                     │
│ From                                │
│ [💳 Main Account        ▾]          │
│ Balance: $5,234.00                  │
│                                     │
│        [⇅ Swap]                     │
│                                     │
│ To                                  │
│ [💰 Savings Account     ▾]          │
│ Balance: $3,000.00                  │
│                                     │
│ Amount                              │
│ $ [500.00]                          │
│                                     │
│ If currencies differ:               │
│ [USD] → [EUR]                       │
│ Rate: 1 USD = 0.92 EUR              │
│ Will transfer: €460.00              │
│                                     │
│ Date                                │
│ [Today                      ▾]      │
│                                     │
│ Note (Optional)                     │
│ [Monthly savings transfer...]       │
│                                     │
│     [Complete Transfer]             │
└─────────────────────────────────────┘
```

### Ajuste de Balance

**Para correcciones o reconciliación:**

```
┌─────────────────────────────────────┐
│ Adjust Balance                  [✕] │
│                                     │
│ Main Account                        │
│ Current Balance: $5,234.00          │
│                                     │
│ New Balance                         │
│ $ [5,500.00]                        │
│                                     │
│ Difference: +$266.00                │
│                                     │
│ This will create a balance          │
│ correction transaction              │
│                                     │
│ Date                                │
│ [Today                      ▾]      │
│                                     │
│ Reason (Optional)                   │
│ [Bank reconciliation...]            │
│                                     │
│      [Adjust Balance]               │
└─────────────────────────────────────┘
```

---

## 🎨 PERSONALIZACIÓN Y SETTINGS

### Configuración Visual

```
┌─────────────────────────────────────┐
│ Appearance                          │
│                                     │
│ Theme                               │
│ ○ Light                             │
│ ○ Dark                              │
│ ● System (Auto)                     │
│                                     │
│ Accent Color                        │
│ ○ System Color                      │
│ ● Custom:                           │
│   [🎨 Color picker]                 │
│   Preview: [████████]               │
│                                     │
│ True Black (OLED)                   │
│ ☑ Use true black in dark mode       │
│                                     │
│ Font Size                           │
│ [━━━━━●━━━━] Medium                 │
│ Small ← → Large                     │
│                                     │
│ Compact Mode                        │
│ ☐ Reduce spacing and padding        │
│                                     │
│ Show Decimals                       │
│ ● Always                            │
│ ○ Only when not .00                 │
│ ○ Never                             │
└─────────────────────────────────────┘
```

### Configuración de Moneda

```
┌─────────────────────────────────────┐
│ Currency Settings                   │
│                                     │
│ Primary Currency                    │
│ [USD - US Dollar       ▾]           │
│ Symbol: $                           │
│ Position: Before amount             │
│                                     │
│ Currency Display                    │
│ ● Symbol Only ($)                   │
│ ○ Code Only (USD)                   │
│ ○ Symbol + Code ($ USD)             │
│                                     │
│ Decimal Separator                   │
│ [. (period)            ▾]           │
│                                     │
│ Thousands Separator                 │
│ [, (comma)             ▾]           │
│                                     │
│ Preview                             │
│ $1,234.56                           │
│                                     │
│ Exchange Rates                      │
│ ☑ Auto-update daily                 │
│ Last update: Dec 28, 2024 9:00 AM   │
│ [Update Now]                        │
│                                     │
│ Custom Exchange Rates               │
│ [Manage Custom Rates]               │
└─────────────────────────────────────┘
```

### Notificaciones

```
┌─────────────────────────────────────┐
│ Notifications                       │
│                                     │
│ Budget Alerts                       │
│ ☑ Alert at 80% of budget            │
│ ☑ Alert when budget exceeded        │
│ ☑ Weekly spending summary           │
│                                     │
│ Upcoming Transactions               │
│ ☑ Day before due                    │
│ ☑ On due date                       │
│ ☐ 3 days before due                 │
│                                     │
│ Goals                               │
│ ☑ Milestone reached (25%, 50%, 75%) │
│ ☑ Goal completed                    │
│ ☐ Monthly progress report           │
│                                     │
│ Subscription Reminders              │
│ ☑ 3 days before renewal             │
│ ☐ On renewal date                   │
│                                     │
│ Sync Status                         │
│ ☑ Sync completed                    │
│ ☑ Sync failed                       │
│                                     │
│ Quiet Hours                         │
│ From: [10:00 PM]  To: [8:00 AM]     │
└─────────────────────────────────────┘
```

---

## 📊 GRÁFICAS Y VISUALIZACIONES

### Tipos de Gráficas Implementadas

#### 1. **Line Chart (Tendencia Temporal)**

```typescript
import { Line } from 'react-chartjs-2';

interface LineChartData {
  labels: string[];  // Fechas
  datasets: {
    label: string;
    data: number[];
    borderColor: string;
    backgroundColor: string;
    tension: number;  // Curvatura de línea
  }[];
}

// Ejemplo de uso:
<Line 
  data={{
    labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'],
    datasets: [{
      label: 'Spending',
      data: [1200, 1900, 1500, 2200, 1800, 2100],
      borderColor: 'rgb(75, 192, 192)',
      tension: 0.4
    }]
  }}
  options={{
    responsive: true,
    plugins: {
      legend: { display: false },
      tooltip: {
        callbacks: {
          label: (context) => `$${context.parsed.y.toFixed(2)}`
        }
      }
    }
  }}
/>
```

**Configuraciones:**
- Período: día/semana/mes/año
- Línea única o comparativa
- Smooth vs. Sharp
- Área bajo curva opcional
- Zoom y pan interactivos

#### 2. **Bar Chart (Comparativa por Período)**

```typescript
import { Bar } from 'react-chartjs-2';

<Bar 
  data={{
    labels: ['Week 1', 'Week 2', 'Week 3', 'Week 4'],
    datasets: [{
      label: 'Expenses',
      data: [450, 680, 520, 780],
      backgroundColor: 'rgba(255, 99, 132, 0.6)',
    }]
  }}
  options={{
    scales: {
      y: {
        beginAtZero: true,
        ticks: {
          callback: (value) => `$${value}`
        }
      }
    }
  }}
/>
```

**Configuraciones:**
- Vertical u horizontal
- Stacked (apilado) para múltiples categorías
- Colores por categoría
- Comparación año vs año

#### 3. **Pie/Doughnut Chart (Proporción)**

```typescript
import { Doughnut } from 'react-chartjs-2';

<Doughnut 
  data={{
    labels: ['Food', 'Transport', 'Entertainment', 'Bills'],
    datasets: [{
      data: [850, 420, 310, 1500],
      backgroundColor: [
        '#FF6384',
        '#36A2EB',
        '#FFCE56',
        '#4BC0C0'
      ]
    }]
  }}
  options={{
    plugins: {
      legend: { position: 'bottom' },
      tooltip: {
        callbacks: {
          label: (context) => {
            const value = context.parsed;
            const total = context.dataset.data.reduce((a, b) => a + b, 0);
            const percentage = ((value / total) * 100).toFixed(1);
            return `$${value} (${percentage}%)`;
          }
        }
      }
    }
  }}
/>
```

**Configuraciones:**
- Pie (completo) o Doughnut (anillo)
- Top N categorías
- Agrupar pequeñas en "Other"
- Mostrar/ocultar leyenda
- Mostrar/ocultar porcentajes

#### 4. **Heatmap Calendar**

```typescript
import CalendarHeatmap from 'react-calendar-heatmap';

<CalendarHeatmap
  startDate={new Date('2024-01-01')}
  endDate={new Date('2024-12-31')}
  values={[
    { date: '2024-01-01', count: 50 },
    { date: '2024-01-02', count: 120 },
    { date: '2024-01-03', count: 0 },
    // ...
  ]}
  classForValue={(value) => {
    if (!value || value.count === 0) return 'color-empty';
    if (value.count < 50) return 'color-scale-1';
    if (value.count < 150) return 'color-scale-2';
    if (value.count < 300) return 'color-scale-3';
    return 'color-scale-4';
  }}
  tooltipDataAttrs={(value) => ({
    'data-tip': value.date 
      ? `${value.date}: $${value.count}` 
      : 'No data'
  })}
/>
```

**Estilos CSS:**

```css
.color-empty { fill: #ebedf0; }
.color-scale-1 { fill: #c6e48b; }
.color-scale-2 { fill: #7bc96f; }
.color-scale-3 { fill: #239a3b; }
.color-scale-4 { fill: #196127; }

/* Dark mode */
.dark .color-empty { fill: #161b22; }
.dark .color-scale-1 { fill: #0e4429; }
.dark .color-scale-2 { fill: #006d32; }
.dark .color-scale-3 { fill: #26a641; }
.dark .color-scale-4 { fill: #39d353; }
```

---

## 🎭 ANIMACIONES Y MICROINTERACCIONES

### Transiciones de Página

```typescript
// Next.js App Router con Framer Motion
import { motion } from 'framer-motion';

const pageVariants = {
  initial: { opacity: 0, x: -20 },
  animate: { opacity: 1, x: 0 },
  exit: { opacity: 0, x: 20 }
};

export default function Page() {
  return (
    <motion.div
      variants={pageVariants}
      initial="initial"
      animate="animate"
      exit="exit"
      transition={{ duration: 0.3 }}
    >
      {/* Contenido */}
    </motion.div>
  );
}
```

### Animación de Números (Counter)

```typescript
import { useSpring, animated } from '@react-spring/web';

const AnimatedNumber = ({ value }: { value: number }) => {
  const { number } = useSpring({
    from: { number: 0 },
    to: { number: value },
    config: { tension: 100, friction: 20 }
  });

  return (
    <animated.span>
      {number.to(n => `$${n.toFixed(2)}`)}
    </animated.span>
  );
};
```

### Progress Bar Animado

```typescript
import { motion } from 'framer-motion';

const ProgressBar = ({ 
  current, 
  total 
}: { 
  current: number; 
  total: number;
}) => {
  const percentage = (current / total) * 100;
  
  return (
    <div className="progress-container">
      <motion.div
        className="progress-fill"
        initial={{ width: 0 }}
        animate={{ width: `${percentage}%` }}
        transition={{ duration: 0.6, ease: 'easeOut' }}
      />
    </div>
  );
};
```

### Swipe Actions

```typescript
import { motion, PanInfo } from 'framer-motion';

const SwipeableItem = ({ 
  children,
  onDelete,
  onEdit 
}: SwipeableItemProps) => {
  const [dragX, setDragX] = useState(0);
  
  const handleDragEnd = (
    event: MouseEvent,
    info: PanInfo
  ) => {
    if (info.offset.x < -100) {
      onDelete();
    } else if (info.offset.x > 100) {
      onEdit();
    }
    setDragX(0);
  };

  return (
    <motion.div
      drag="x"
      dragConstraints={{ left: -150, right: 150 }}
      dragElastic={0.2}
      onDragEnd={handleDragEnd}
      style={{ x: dragX }}
    >
      {/* Background actions */}
      <div className="actions-left">
        <button>✏️ Edit</button>
      </div>
      <div className="actions-right">
        <button>🗑️ Delete</button>
      </div>
      
      {/* Content */}
      {children}
    </motion.div>
  );
};
```

### Skeleton Loading

```typescript
const TransactionSkeleton = () => (
  <div className="transaction-skeleton">
    <div className="skeleton-icon" />
    <div className="skeleton-content">
      <div className="skeleton-title" />
      <div className="skeleton-subtitle" />
    </div>
    <div className="skeleton-amount" />
  </div>
);

// CSS
.skeleton-icon,
.skeleton-title,
.skeleton-subtitle,
.skeleton-amount {
  background: linear-gradient(
    90deg,
    #f0f0f0 25%,
    #e0e0e0 50%,
    #f0f0f0 75%
  );
  background-size: 200% 100%;
  animation: loading 1.5s infinite;
}

@keyframes loading {
  0% { background-position: 200% 0; }
  100% { background-position: -200% 0; }
}
```

---

## 🔔 SISTEMA DE NOTIFICACIONES

### Tipos de Notificaciones

```typescript
enum NotificationType {
  BUDGET_WARNING = 'budget_warning',      // 80% gastado
  BUDGET_EXCEEDED = 'budget_exceeded',    // 100% gastado
  UPCOMING_TRANSACTION = 'upcoming',      // Próxima transacción
  SUBSCRIPTION_RENEWAL = 'subscription',  // Renovación
  GOAL_MILESTONE = 'goal_milestone',      // 25%, 50%, 75%
  GOAL_COMPLETED = 'goal_completed',      // 100%
  SYNC_COMPLETE = 'sync_complete',        // Sync ok
  SYNC_FAILED = 'sync_failed',            // Sync error
}

interface Notification {
  id: string;
  type: NotificationType;
  title: string;
  message: string;
  timestamp: Date;
  read: boolean;
  actionUrl?: string;
  actionLabel?: string;
  data?: Record<string, any>;
}
```

### In-App Notifications

```
┌─────────────────────────────────────┐
│ Notifications               [Clear] │
│                                     │
│ TODAY                               │
│ ─────────────────────────────────── │
│ ⚠️ Budget Warning                   │
│ Monthly Budget is 85% spent         │
│ $4,250 of $5,000 • 2 hours ago      │
│ [View Budget]                       │
│ ─────────────────────────────────── │
│ 📅 Upcoming Payment                 │
│ Rent due tomorrow                   │
│ $1,500 • 3 hours ago                │
│ [Mark as Paid]                      │
│                                     │
│ YESTERDAY                           │
│ ─────────────────────────────────── │
│ 🎉 Goal Milestone                   │
│ Vacation Fund reached 50%!          │
│ $2,500 of $5,000 • Yesterday        │
│ [View Goal]                         │
│                                     │
│ [Load More...]                      │
└─────────────────────────────────────┘
```

### Push Notifications (Web)

```typescript
// Request permission
const requestNotificationPermission = async () => {
  if ('Notification' in window) {
    const permission = await Notification.requestPermission();
    return permission === 'granted';
  }
  return false;
};

// Send notification
const sendNotification = (
  title: string,
  body: string,
  icon?: string,
  data?: any
) => {
  if (Notification.permission === 'granted') {
    const notification = new Notification(title, {
      body,
      icon: icon || '/icon-192x192.png',
      badge: '/badge-72x72.png',
      tag: 'budget-notification',
      requireInteraction: true,
      data
    });

    notification.onclick = () => {
      window.focus();
      if (data?.url) {
        window.location.href = data.url;
      }
      notification.close();
    };
  }
};

// Example usage
sendNotification(
  'Budget Alert',
  'Monthly Budget is 85% spent ($4,250 of $5,000)',
  undefined,
  { url: '/budgets/monthly' }
);
```

---

## 🗂️ IMPORT/EXPORT

### CSV Import

```
┌─────────────────────────────────────┐
│ Import from CSV                 [✕] │
│                                     │
│ Step 1: Upload File                 │
│ ┌─────────────────────────────────┐ │
│ │  Drop CSV file here or          │ │
│ │  [Choose File]                  │ │
│ └─────────────────────────────────┘ │
│                                     │
│ Step 2: Map Columns                 │
│ ┌─────────────────────────────────┐ │
│ │ Date       → [Column A  ▾]      │ │
│ │ Amount     → [Column B  ▾]      │ │
│ │ Category   → [Column C  ▾]      │ │
│ │ Note       → [Column D  ▾]      │ │
│ │ Account    → [Column E  ▾]      │ │
│ └─────────────────────────────────┘ │
│                                     │
│ Preview (first 5 rows):             │
│ ┌─────────────────────────────────┐ │
│ │ Date       Amount    Category   │ │
│ │ 2024-01-01 -$50.00   Food       │ │
│ │ 2024-01-02 -$30.00   Transport  │ │
│ │ 2024-01-03 +$2000.00 Salary     │ │
│ │ ...                             │ │
│ └─────────────────────────────────┘ │
│                                     │
│ Options                             │
│ ☑ Skip first row (header)           │
│ ☑ Auto-detect date format           │
│ ☑ Create missing categories         │
│                                     │
│ [Cancel]          [Import 127 rows] │
└─────────────────────────────────────┘
```

### CSV Export

```
┌─────────────────────────────────────┐
│ Export to CSV                   [✕] │
│                                     │
│ Export Range                        │
│ ● All Time                          │
│ ○ This Month                        │
│ ○ This Year                         │
│ ○ Custom Range:                     │
│   From [         ] To [         ]   │
│                                     │
│ Filters                             │
│ Accounts:  [All Accounts    ▾]      │
│ Categories: [All Categories ▾]      │
│ Type:      [All Types       ▾]      │
│                                     │
│ Columns to Include                  │
│ ☑ Date                              │
│ ☑ Amount                            │
│ ☑ Category                          │
│ ☑ Note                              │
│ ☑ Account                           │
│ ☐ Tags                              │
│ ☐ Created At                        │
│                                     │
│ Format Options                      │
│ Date Format:  [YYYY-MM-DD   ▾]      │
│ Decimal Separator: [. (period) ▾]   │
│                                     │
│ Preview: 1,234 transactions         │
│                                     │
│ [Cancel]            [Export CSV]    │
└─────────────────────────────────────┘
```

### Google Sheets Integration

```typescript
// Conectar con Google Sheets API
const importFromGoogleSheets = async (
  spreadsheetId: string,
  range: string
) => {
  const sheets = await google.sheets({
    version: 'v4',
    auth: googleAuth
  });

  const response = await sheets.spreadsheets.values.get({
    spreadsheetId,
    range
  });

  const rows = response.data.values;
  
  // Procesar filas...
  return processRows(rows);
};
```

---

## 🔐 SEGURIDAD Y PRIVACIDAD

### Biometric Lock

```typescript
// Web Authentication API
const authenticateWithBiometrics = async (): Promise<boolean> => {
  try {
    // Check if WebAuthn is supported
    if (!window.PublicKeyCredential) {
      throw new Error('WebAuthn not supported');
    }

    const credential = await navigator.credentials.get({
      publicKey: {
        challenge: new Uint8Array(32),
        timeout: 60000,
        userVerification: 'required'
      }
    });

    return credential !== null;
  } catch (error) {
    console.error('Biometric auth failed:', error);
    return false;
  }
};

// Lock screen component
const LockScreen = () => {
  const [isUnlocking, setIsUnlocking] = useState(false);

  const handleUnlock = async () => {
    setIsUnlocking(true);
    const success = await authenticateWithBiometrics();
    
    if (success) {
      // Unlock app
      unlockApp();
    } else {
      // Show error
      showError('Authentication failed');
    }
    
    setIsUnlocking(false);
  };

  return (
    <div className="lock-screen">
      <div className="lock-icon">🔒</div>
      <h2>Lumio is Locked</h2>
      <button onClick={handleUnlock}>
        {isUnlocking ? 'Authenticating...' : 'Unlock with Biometrics'}
      </button>
    </div>
  );
};
```

### Auto-Lock

```typescript
// Auto-lock después de inactividad
const useAutoLock = (timeout: number = 5 * 60 * 1000) => {
  const [isLocked, setIsLocked] = useState(false);
  const timerRef = useRef<NodeJS.Timeout>();

  const resetTimer = () => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
    }

    timerRef.current = setTimeout(() => {
      setIsLocked(true);
    }, timeout);
  };

  useEffect(() => {
    const events = ['mousedown', 'keydown', 'touchstart', 'scroll'];
    
    events.forEach(event => {
      window.addEventListener(event, resetTimer);
    });

    resetTimer();

    return () => {
      events.forEach(event => {
        window.removeEventListener(event, resetTimer);
      });
      
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
    };
  }, [timeout]);

  return { isLocked, setIsLocked };
};
```

---

## 📱 RESPONSIVE DESIGN

### Breakpoints

```typescript
const breakpoints = {
  mobile: '320px',
  mobileLg: '480px',
  tablet: '768px',
  desktop: '1024px',
  desktopLg: '1440px',
  desktopXl: '1920px'
};

// Tailwind config
module.exports = {
  theme: {
    screens: {
      'sm': '480px',
      'md': '768px',
      'lg': '1024px',
      'xl': '1440px',
      '2xl': '1920px',
    }
  }
};
```

### Layout Adaptativo

**Mobile (< 768px):**
- Bottom navigation
- Stack layout
- Full-width cards
- Single column

**Tablet (768px - 1024px):**
- Side navigation (drawer)
- 2-column grid
- Responsive cards
- Split views

**Desktop (> 1024px):**
- Persistent side navigation
- 3+ column grid
- Master-detail view
- Keyboard shortcuts

```typescript
// Ejemplo de componente responsive
const DashboardLayout = () => {
  const isMobile = useMediaQuery('(max-width: 768px)');
  const isTablet = useMediaQuery('(min-width: 769px) and (max-width: 1024px)');
  const isDesktop = useMediaQuery('(min-width: 1025px)');

  return (
    <div className={`dashboard ${isMobile ? 'mobile' : isTablet ? 'tablet' : 'desktop'}`}>
      {isDesktop && <Sidebar />}
      
      <main>
        <div className={`grid ${isMobile ? 'grid-cols-1' : isTablet ? 'grid-cols-2' : 'grid-cols-3'}`}>
          {/* Widgets */}
        </div>
      </main>

      {isMobile && <BottomNav />}
    </div>
  );
};
```

---

## 🎯 ATAJOS Y SHORTCUTS

### Keyboard Shortcuts (Desktop)

```typescript
const shortcuts = {
  'cmd+n': 'New transaction',
  'cmd+f': 'Search',
  'cmd+b': 'View budgets',
  'cmd+g': 'View goals',
  'cmd+a': 'View accounts',
  'cmd+,': 'Settings',
  'esc': 'Close modal',
  'tab': 'Next field',
  'shift+tab': 'Previous field',
  '/': 'Focus search'
};

// Implementation
const useKeyboardShortcuts = () => {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const isCmdOrCtrl = e.metaKey || e.ctrlKey;
      
      if (isCmdOrCtrl && e.key === 'n') {
        e.preventDefault();
        openNewTransaction();
      }
      
      if (isCmdOrCtrl && e.key === 'f') {
        e.preventDefault();
        focusSearch();
      }
      
      // ... más shortcuts
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);
};
```

### Quick Actions (Mobile)

**Long-press en FAB:**

```
┌─────────────────────────────────────┐
│     [Quick Actions]                 │
│                                     │
│  💸 Add Expense                     │
│  💰 Add Income                      │
│  🔄 Transfer Funds                  │
│  💳 Add to Budget                   │
│  🎯 Contribute to Goal              │
│                                     │
│     [Cancel]                        │
└─────────────────────────────────────┘
```

---

## 📋 COMPONENTES REUSABLES CLAVE

### 1. **Amount Input con Calculator**

```typescript
const AmountInput = ({ 
  value, 
  onChange,
  currency = 'USD'
}: AmountInputProps) => {
  const [expression, setExpression] = useState('');
  const [showCalculator, setShowCalculator] = useState(false);

  const calculate = (expr: string) => {
    try {
      // Usar biblioteca como mathjs para evaluar
      const result = math.evaluate(expr);
      onChange(result);
      setExpression('');
    } catch (error) {
      // Mostrar error
    }
  };

  return (
    <div className="amount-input">
      <input
        type="text"
        value={expression || value}
        onChange={(e) => setExpression(e.target.value)}
        onBlur={() => calculate(expression)}
      />
      
      {showCalculator && (
        <Calculator 
          onInput={(num) => setExpression(expression + num)}
          onClear={() => setExpression('')}
          onEquals={() => calculate(expression)}
        />
      )}
    </div>
  );
};
```

### 2. **Category Picker con Icons**

```typescript
const CategoryPicker = ({ 
  selected, 
  onSelect,
  type = 'expense'
}: CategoryPickerProps) => {
  const categories = useCategories(type);

  return (
    <div className="category-picker">
      {categories.map(category => (
        <button
          key={category.id}
          onClick={() => onSelect(category)}
          className={selected?.id === category.id ? 'active' : ''}
        >
          <span className="icon">{category.icon}</span>
          <span className="name">{category.name}</span>
        </button>
      ))}
    </div>
  );
};
```

### 3. **Date Picker con Smart Suggestions**

```typescript
const SmartDatePicker = ({ 
  value, 
  onChange 
}: DatePickerProps) => {
  const suggestions = [
    { label: 'Today', value: new Date() },
    { label: 'Yesterday', value: subDays(new Date(), 1) },
    { label: 'Last Week', value: subWeeks(new Date(), 1) },
    { label: 'Start of Month', value: startOfMonth(new Date()) },
  ];

  return (
    <div className="smart-date-picker">
      <div className="quick-actions">
        {suggestions.map(suggestion => (
          <button 
            key={suggestion.label}
            onClick={() => onChange(suggestion.value)}
          >
            {suggestion.label}
          </button>
        ))}
      </div>
      
      <DatePicker
        selected={value}
        onChange={onChange}
        dateFormat="MMM d, yyyy"
      />
    </div>
  );
};
```

---

## 🎨 SISTEMA DE DISEÑO (Design Tokens)

```typescript
// colors.ts
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

// spacing.ts
export const spacing = {
  0: '0',
  1: '0.25rem',  // 4px
  2: '0.5rem',   // 8px
  3: '0.75rem',  // 12px
  4: '1rem',     // 16px
  5: '1.25rem',  // 20px
  6: '1.5rem',   // 24px
  8: '2rem',     // 32px
  10: '2.5rem',  // 40px
  12: '3rem',    // 48px
  16: '4rem',    // 64px
};

// typography.ts
export const typography = {
  fontFamily: {
    sans: ['Inter', 'system-ui', 'sans-serif'],
    mono: ['JetBrains Mono', 'monospace'],
  },
  
  fontSize: {
    xs: ['0.75rem', { lineHeight: '1rem' }],
    sm: ['0.875rem', { lineHeight: '1.25rem' }],
    base: ['1rem', { lineHeight: '1.5rem' }],
    lg: ['1.125rem', { lineHeight: '1.75rem' }],
    xl: ['1.25rem', { lineHeight: '1.75rem' }],
    '2xl': ['1.5rem', { lineHeight: '2rem' }],
    '3xl': ['1.875rem', { lineHeight: '2.25rem' }],
    '4xl': ['2.25rem', { lineHeight: '2.5rem' }],
  },
  
  fontWeight: {
    normal: '400',
    medium: '500',
    semibold: '600',
    bold: '700',
  }
};

// borderRadius.ts
export const borderRadius = {
  none: '0',
  sm: '0.125rem',
  DEFAULT: '0.25rem',
  md: '0.375rem',
  lg: '0.5rem',
  xl: '0.75rem',
  '2xl': '1rem',
  '3xl': '1.5rem',
  full: '9999px',
};
```

---

## 📝 CONCLUSIONES Y RECOMENDACIONES

### ✅ Implementar INMEDIATAMENTE

1. **Home Personalizable**
   - Drag & drop de widgets
   - Toggle show/hide
   - Persistir configuración en Supabase

2. **Smart Suggestions**
   - Auto-categorización
   - Títulos recientes
   - Predicción de montos

3. **Visualizaciones**
   - Line chart (tendencia)
   - Pie chart (categorías)
   - Heatmap calendar
   - Progress bars animados

4. **Gestos y Shortcuts**
   - Swipe actions
   - Long-press menús
   - Keyboard shortcuts (desktop)

5. **Material You / Theming**
   - Color dinámico
   - Dark mode
   - Personalización extrema

### 🔄 Implementar en FASES

**Fase 1 - MVP:**
- CRUD transacciones
- Presupuestos básicos
- Home con widgets fijos
- Gráficas básicas

**Fase 2 - Enhanced:**
- Home personalizable
- Multi-moneda
- Metas/Goals
- Transacciones recurrentes

**Fase 3 - Advanced:**
- Import/Export
- Biometric lock
- Notificaciones push
- Sync en tiempo real

### 💡 Optimizaciones UX

1. **Performance:**
   - Virtual scrolling en listas largas
   - Lazy loading de gráficas
   - Optimistic UI updates
   - Skeleton loaders

2. **Accesibilidad:**
   - ARIA labels completos
   - Navegación por teclado
   - Contraste WCAG AAA
   - Screen reader friendly

3. **Mobile-First:**
   - Touch targets 44x44px mínimo
   - Gestos naturales
   - Offline-first con service workers
   - PWA con install prompt

---

**Este documento es tu biblia de UX/UI para Lumio. Incluye TODOS los patrones, componentes, interacciones y detalles visuales necesarios para recrear (y mejorar) la experiencia de Cashew en React + Next.js.**

**Próximos pasos:**
1. Compartir este doc con la IA de desarrollo
2. Crear sistema de diseño en Figma/código
3. Implementar componentes base
4. Iterar y mejorar

¡Éxito con Lumio! 🚀
