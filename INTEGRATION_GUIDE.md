# Guía de Integración - Paso a Paso

## PASO 1: Migración de Base de Datos ✅

1. Abre Supabase Dashboard
2. Ve a **SQL Editor**
3. Copia TODO el contenido de `MIGRATION.sql`
4. Presiona **Run**
5. Verifica que se crearon las tablas ejecutando la sección de VERIFICACIÓN al final del archivo

---

## PASO 2: Agregar Smart Categorization al Formulario de Transacciones

### 2.1 Agregar el import

En [components/transactions/transaction-form-modal.tsx](components/transactions/transaction-form-modal.tsx), línea 67, agregar:

```typescript
import { SmartCategorySelector } from "./SmartCategorySelector"
```

### 2.2 Agregar el componente

Busca la sección donde está el campo de "Descripción" (línea ~584-620), y DESPUÉS del campo de descripción, ANTES del cierre del `<div className="space-y-3">`, agrega:

```typescript
{/* Smart Category Suggestions - AI Powered */}
{activeTab !== 'TRANSFER' && form.watch('description') && (
    <div className="mt-2">
        <SmartCategorySelector
            description={form.watch('description') || ''}
            selectedCategoryId={form.watch('categoryId') || ''}
            onSelectCategory={(categoryId) => {
                form.setValue('categoryId', categoryId)
            }}
        />
    </div>
)}
```

**Ubicación exacta**: Después de la línea donde cierra el FormItem de "description", aproximadamente línea 620.

---

## PASO 3: Agregar Filtros Avanzados a la Página de Transacciones

### 3.1 Abrir el archivo

Archivo: [app/(dashboard)/dashboard/transactions/page.tsx](app/(dashboard)/dashboard/transactions/page.tsx)

### 3.2 Reemplazar el contenido actual con:

```typescript
"use client"

import { TransactionFormModal } from "@/components/transactions/transaction-form-modal"
import { TransactionList } from "@/components/transactions/transaction-list"
import { TransactionFilters } from "@/components/transactions/TransactionFilters"
import { useState } from "react"

export default function TransactionsPage() {
    const [filters, setFilters] = useState({})

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-3xl font-bold tracking-tight">Transacciones</h2>
                    <p className="text-muted-foreground">
                        Historial de movimientos e ingresos.
                    </p>
                </div>
                <div className="flex gap-2">
                    <TransactionFormModal />
                </div>
            </div>

            {/* Filtros Avanzados */}
            <TransactionFilters onFiltersChange={setFilters} />

            <div className="rounded-xl border bg-background/50 backdrop-blur-sm p-4">
                <TransactionList filters={filters} />
            </div>
        </div>
    )
}
```

---

## PASO 4: Integrar Keyboard Shortcuts Globalmente

### 4.1 Modificar el layout

Archivo: [app/(dashboard)/layout.tsx](app/(dashboard)/layout.tsx)

Envolver el contenido del return con el KeyboardShortcutsProvider:

```typescript
import { KeyboardShortcutsProvider } from '@/components/providers/keyboard-shortcuts-provider'

export default async function DashboardLayout({
    children,
}: {
    children: React.ReactNode
}) {
    // ... código existente ...

    return (
        <KeyboardShortcutsProvider>
            <div className="min-h-screen bg-muted/20">
                {/* ... resto del código ... */}
            </div>
        </KeyboardShortcutsProvider>
    )
}
```

**Atajos de teclado disponibles**:
- `h` - Ir al Dashboard
- `t` - Ir a Transacciones
- `b` - Ir a Presupuestos
- `n` - Nueva Transacción
- `Ctrl+K` o `/` - Buscar
- `Shift+?` - Mostrar todos los atajos

---

## PASO 5: Actualizar el Dashboard (OPCIONAL - MÁS AVANZADO)

Si quieres el dashboard completamente personalizable con drag & drop:

### 5.1 Crear respaldo

Primero haz una copia de seguridad:
```bash
cp app/(dashboard)/dashboard/page.tsx app/(dashboard)/dashboard/page.backup.tsx
```

### 5.2 Reemplazar con el nuevo dashboard

```typescript
"use client"

import { motion } from "framer-motion"
import { DashboardGrid } from "@/components/dashboard/DashboardGrid"
import { useDashboard } from "@/hooks/useDashboard"
import { Settings, LayoutGrid, Maximize2 } from "lucide-react"
import { useState } from "react"

export default function DashboardPage() {
    const { config, toggleLayout, toggleCompactMode, resetToDefault } = useDashboard()
    const [showSettings, setShowSettings] = useState(false)

    return (
        <div className="space-y-6 pb-20 md:pb-6">
            <motion.div
                className="flex flex-col md:flex-row md:items-center md:justify-between gap-4"
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
            >
                <div>
                    <h1 className="text-3xl font-bold">Dashboard</h1>
                    <p className="text-muted-foreground">
                        Tu panorama financiero completo
                    </p>
                </div>

                <div className="flex items-center gap-2">
                    <button
                        onClick={toggleLayout}
                        className="flex items-center gap-2 px-3 py-2 rounded-lg border hover:bg-accent text-sm"
                    >
                        <LayoutGrid className="w-4 h-4" />
                        {config.layout === 'grid' ? 'Grid' : 'Masonry'}
                    </button>

                    <button
                        onClick={toggleCompactMode}
                        className="flex items-center gap-2 px-3 py-2 rounded-lg border hover:bg-accent text-sm"
                    >
                        <Maximize2 className="w-4 h-4" />
                        {config.compactMode ? 'Compact' : 'Normal'}
                    </button>

                    <button
                        onClick={() => setShowSettings(!showSettings)}
                        className="flex items-center gap-2 px-3 py-2 rounded-lg border hover:bg-accent text-sm"
                    >
                        <Settings className="w-4 h-4" />
                        Customize
                    </button>
                </div>
            </motion.div>

            {showSettings && (
                <div className="p-4 bg-muted rounded-lg border">
                    <div className="flex items-center justify-between mb-4">
                        <h3 className="font-semibold">Dashboard Settings</h3>
                        <button
                            onClick={resetToDefault}
                            className="text-sm text-primary hover:underline"
                        >
                            Reset to Default
                        </button>
                    </div>
                    <p className="text-sm text-muted-foreground">
                        Arrastra los widgets para reorganizarlos. Haz clic en el botón de ocultar en cada widget para quitarlo de la vista.
                    </p>
                </div>
            )}

            <DashboardGrid />
        </div>
    )
}
```

---

## VERIFICACIÓN

Después de cada paso, verifica:

### Paso 1 (SQL):
```sql
-- En Supabase SQL Editor:
SELECT COUNT(*) FROM category_learning; -- Debe existir
SELECT COUNT(*) FROM currencies; -- Debe tener ~14 monedas
SELECT COUNT(*) FROM exchange_rates; -- Puede estar vacío
```

### Paso 2 (Smart Categorization):
1. Abre el formulario de nueva transacción
2. Escribe en la descripción: "uber"
3. Deberías ver sugerencias de categorías debajo (la primera vez estará vacío, usa categorías manualmente)
4. La próxima vez que escribas "uber" sugerirá la categoría que usaste

### Paso 3 (Filtros):
1. Ve a /dashboard/transactions
2. Deberías ver un botón "Filters" expandible
3. Puedes filtrar por fecha, monto, tipo, etc.
4. Los filtros activos aparecen como "pills" removibles

### Paso 4 (Keyboard):
1. Presiona `Shift + ?` en cualquier parte del dashboard
2. Deberías ver un modal con todos los atajos
3. Prueba presionar `h` (ir a dashboard), `t` (ir a transacciones)

### Paso 5 (Dashboard):
1. Ve a /dashboard
2. Deberías ver botones "Grid/Masonry", "Compact/Normal", "Customize"
3. Los widgets deben tener íconos de arrastre al hacer hover
4. Arrastra un widget para moverlo

---

## PROBLEMAS COMUNES

### Error: "Table already exists"
✅ Normal, significa que ya tienes esa tabla. El SQL usa `IF NOT EXISTS` para evitar errores.

### Error: "Column already exists"
✅ Normal, el SQL usa `ADD COLUMN IF NOT EXISTS`.

### Smart Categorization no muestra sugerencias
1. La primera vez estará vacío (necesita aprender)
2. Crea algunas transacciones con descripciones y categorías
3. La próxima vez que uses palabras similares, sugerirá categorías

### Los filtros no funcionan
1. Verifica que `TransactionList` soporte el prop `filters`
2. Si no, necesitarás modificar ese componente para usarlos

### Dashboard no se ve
1. Verifica que ejecutaste el SQL (necesita `dashboard_config` en `profiles`)
2. Verifica que no haya errores en la consola del navegador
3. Si hay errores, muéstramelos

---

## PRÓXIMOS PASOS

Una vez que tengas funcionando los pasos 1-4, podemos agregar:

1. **Multi-Currency Support** - Selector de monedas en transacciones
2. **Calculator Input** - Input de monto con calculadora integrada
3. **Animated Numbers** - Números con animaciones suaves
4. **Progress Bars** - Barras de progreso auto-coloreadas
5. **Calendar Heatmap** - Visualización de actividad anual
6. **Swipe Gestures** - Deslizar para editar/eliminar (móvil)

¿Quieres que continuemos con alguno de estos?
