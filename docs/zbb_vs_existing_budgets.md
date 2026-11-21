# ZBB vs Presupuestos Existentes - Estrategia de Coexistencia

## Situación Actual

Tienes actualmente:
1. **Módulo de Presupuestos por Categorías** (tradicional)
2. **Regla 50/30/20** (método de distribución automática)
3. **Nuevo: ZBB** (planificación desde cero)

---

## PROBLEMA: Tres formas de presupuestar

```
┌─────────────────────────────────────────────────────────┐
│         ¿Cómo debe interactuar el usuario?              │
└─────────────────────────────────────────────────────────┘

Opción A: Presupuesto Manual por Categorías
├─ Usuario define: Alimentos = $400, Transporte = $200
└─ Flexible, sin reglas

Opción B: Regla 50/30/20
├─ Sistema calcula: 50% Necesidades, 30% Deseos, 20% Ahorros
└─ Automático, basado en ingresos

Opción C: ZBB (Zero-Based Budgeting)
├─ Usuario justifica cada peso desde cero cada mes
└─ Disciplinado, requiere planificación

❓ ¿Cómo evitamos confundir al usuario?
```

---

## SOLUCIÓN RECOMENDADA: Sistema de "Modos de Presupuestación"

### Arquitectura: Un Usuario, Un Modo Activo

```
┌─────────────────────────────────────────────────────────────┐
│              CONFIGURACIÓN DE USUARIO                        │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  Tabla: user_settings                                        │
│  ├─ user_id                                                  │
│  ├─ budget_mode: 'manual' | '50-30-20' | 'zbb'             │
│  ├─ last_mode_change: timestamp                             │
│  └─ mode_history: json                                      │
│                                                              │
└─────────────────────────────────────────────────────────────┘

        ┌──────────┬──────────┬──────────┐
        │  MANUAL  │ 50-30-20 │   ZBB    │
        └────┬─────┴─────┬────┴─────┬────┘
             │           │          │
             ↓           ↓          ↓
    ┌─────────────────────────────────────┐
    │     BUDGETS (Tabla Única)           │
    │  ├─ budget_mode: indica origen      │
    │  ├─ is_zbb_controlled: boolean      │
    │  └─ rule_50_30_20_category: enum    │
    └─────────────────────────────────────┘
```

---

## 1. MODO MANUAL (Presupuesto Tradicional)

### Cuándo usar
- Usuario quiere libertad total
- No quiere reglas estrictas
- Prefiere ajustar mes a mes sin justificaciones

### Funcionamiento
```typescript
// user_settings.budget_mode = 'manual'

budgets:
├─ Alimentos: $400 (usuario lo define)
├─ Transporte: $200 (usuario lo define)
└─ Sin validaciones especiales
```

### UI
```
┌─────────────────────────────────────────┐
│  📊 Presupuestos por Categoría          │
├─────────────────────────────────────────┤
│                                         │
│  🛒 Alimentos                           │
│  Límite: $ [___400___]                  │
│                                         │
│  🚗 Transporte                          │
│  Límite: $ [___200___]                  │
│                                         │
│  [+ Agregar Categoría]                  │
│                                         │
│  [Guardar]                              │
└─────────────────────────────────────────┘
```

---

## 2. MODO 50/30/20 (Regla Automática)

### Cuándo usar
- Usuario quiere simplicidad
- Prefiere que el sistema le diga cómo distribuir
- No tiene tiempo para planificar detalladamente

### Funcionamiento
```typescript
// user_settings.budget_mode = '50-30-20'

Ingresos: $3,000

Sistema calcula automáticamente:
├─ 50% Necesidades ($1,500)
│   ├─ Vivienda: $800
│   ├─ Alimentos: $400
│   └─ Servicios: $300
│
├─ 30% Deseos ($900)
│   ├─ Entretenimiento: $300
│   ├─ Restaurantes: $300
│   └─ Hobbies: $300
│
└─ 20% Ahorros ($600)
    └─ Ahorro General: $600

budgets:
├─ rule_50_30_20_category: 'needs' | 'wants' | 'savings'
└─ Límites calculados automáticamente
```

### UI
```
┌─────────────────────────────────────────────────────┐
│  📊 Presupuesto Regla 50/30/20                      │
├─────────────────────────────────────────────────────┤
│                                                     │
│  Ingresos Mensuales: $ [___3,000___]                │
│                                                     │
│  ┌───────────────────────────────────────────────┐│
│  │  50% NECESIDADES = $1,500                     ││
│  │  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ ││
│  │  🏠 Vivienda:        $800                     ││
│  │  🛒 Alimentos:       $400                     ││
│  │  💡 Servicios:       $300                     ││
│  │                                                ││
│  │  [+ Agregar categoría de Necesidades]         ││
│  └───────────────────────────────────────────────┘│
│                                                     │
│  ┌───────────────────────────────────────────────┐│
│  │  30% DESEOS = $900                            ││
│  │  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ ││
│  │  🎮 Entretenimiento: $300                     ││
│  │  🍽️  Restaurantes:    $300                    ││
│  │  🎨 Hobbies:         $300                     ││
│  └───────────────────────────────────────────────┘│
│                                                     │
│  ┌───────────────────────────────────────────────┐│
│  │  20% AHORROS = $600                           ││
│  │  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ ││
│  │  💰 Ahorro General:  $600                     ││
│  └───────────────────────────────────────────────┘│
│                                                     │
│  ⚠️ Si cambias de modo, estos valores se perderán │
│  [Guardar]  [Cambiar a otro modo]                  │
└─────────────────────────────────────────────────────┘
```

---

## 3. MODO ZBB (Planificación Base Cero)

### Cuándo usar
- Usuario quiere máximo control y disciplina
- Está dispuesto a justificar cada gasto
- Quiere optimizar al máximo sus finanzas

### Funcionamiento
```typescript
// user_settings.budget_mode = 'zbb'

Usuario crea ciclo de planificación:
├─ Define ingresos: $3,000
├─ Asigna categoría por categoría:
│   ├─ Vivienda: $800 (justificado ✅)
│   ├─ Alimentos: $400 (justificado ✅)
│   └─ ...
└─ Hasta que dinero_sin_asignar = $0

budgets:
├─ is_zbb_controlled: true
├─ zbb_allocation_id: referencia
└─ Límites vienen del ZBB
```

### UI
(Ya la diseñamos anteriormente)

---

## SELECTOR DE MODO: Primera Experiencia

### Onboarding del Usuario

```
┌─────────────────────────────────────────────────────────┐
│       ¿Cómo prefieres manejar tu presupuesto?           │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  ┌───────────────────────────────────────────────────┐│
│  │  📝 MANUAL - Tú decides                           ││
│  │  ────────────────────────────────────────────────││
│  │  Define límites por categoría sin reglas          ││
│  │  ✅ Flexible y rápido                             ││
│  │  ⚠️  Requiere disciplina propia                   ││
│  │                                                    ││
│  │  Ideal para: Principiantes                        ││
│  │  [Elegir Manual]                                  ││
│  └───────────────────────────────────────────────────┘│
│                                                         │
│  ┌───────────────────────────────────────────────────┐│
│  │  📊 REGLA 50/30/20 - Automático                   ││
│  │  ────────────────────────────────────────────────││
│  │  Sistema distribuye: 50% necesidades, 30% deseos,││
│  │  20% ahorros                                      ││
│  │  ✅ Simple y probado                              ││
│  │  ⚠️  Menos personalización                        ││
│  │                                                    ││
│  │  Ideal para: Quienes buscan simplicidad          ││
│  │  [Elegir 50/30/20]                                ││
│  └───────────────────────────────────────────────────┘│
│                                                         │
│  ┌───────────────────────────────────────────────────┐│
│  │  🎯 ZBB - Planificación Desde Cero               ││
│  │  ────────────────────────────────────────────────││
│  │  Justifica cada peso, asigna el 100% de ingresos ││
│  │  ✅ Máximo control y optimización                 ││
│  │  ⚠️  Requiere más tiempo mensual                  ││
│  │                                                    ││
│  │  Ideal para: Usuarios avanzados                   ││
│  │  [Elegir ZBB]                                     ││
│  └───────────────────────────────────────────────────┘│
│                                                         │
│  💡 Puedes cambiar de modo cuando quieras              │
└─────────────────────────────────────────────────────────┘
```

---

## TRANSICIÓN ENTRE MODOS

### Cambio: Manual → 50/30/20

```
┌─────────────────────────────────────────────────────────┐
│  ⚠️ Cambio de Modo de Presupuestación                   │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  Vas a cambiar de "Manual" a "Regla 50/30/20"          │
│                                                         │
│  ANTES (Manual):                                        │
│  • Alimentos: $400                                      │
│  • Transporte: $200                                     │
│  • Entretenimiento: $150                                │
│                                                         │
│  DESPUÉS (50/30/20 con ingresos de $3,000):            │
│  • Necesidades (50%): $1,500                            │
│    ├─ Alimentos: $400 ✅ (conservado)                   │
│    └─ Transporte: $200 ✅ (conservado)                  │
│    └─ Faltan: $900 por asignar                         │
│  • Deseos (30%): $900                                   │
│    └─ Entretenimiento: $150 ✅ (conservado)             │
│    └─ Faltan: $750 por asignar                         │
│  • Ahorros (20%): $600                                  │
│    └─ Nuevo: $600 por asignar                          │
│                                                         │
│  ℹ️ Tus categorías actuales se intentarán clasificar   │
│     automáticamente                                     │
│                                                         │
│  [Cancelar]  [Continuar con Cambio]                    │
└─────────────────────────────────────────────────────────┘
```

### Cambio: 50/30/20 → ZBB

```
┌─────────────────────────────────────────────────────────┐
│  🎯 Bienvenido a Planificación Base Cero                │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  Importaremos tu presupuesto 50/30/20 como punto       │
│  de partida para tu primera planificación ZBB.          │
│                                                         │
│  TUS DATOS ACTUALES:                                    │
│  ┌───────────────────────────────────────────────────┐│
│  │ Ingresos: $3,000                                  ││
│  │                                                    ││
│  │ Necesidades (50%): $1,500                         ││
│  │ Deseos (30%): $900                                ││
│  │ Ahorros (20%): $600                               ││
│  └───────────────────────────────────────────────────┘│
│                                                         │
│  En ZBB deberás:                                        │
│  ✅ Justificar cada categoría                           │
│  ✅ Asignar cada peso manualmente                       │
│  ✅ Priorizar tus gastos                                │
│                                                         │
│  ¿Cómo quieres empezar?                                 │
│  ○ Importar distribución 50/30/20 como base            │
│  ○ Empezar desde cero (recomendado para ZBB puro)      │
│                                                         │
│  [Cancelar]  [Iniciar Planificación ZBB]               │
└─────────────────────────────────────────────────────────┘
```

### Cambio: ZBB → Manual

```
┌─────────────────────────────────────────────────────────┐
│  ⚠️ Salir de Modo ZBB                                   │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  Tienes un plan ZBB activo para este mes.               │
│                                                         │
│  Si cambias a "Manual":                                 │
│  ✅ Tus límites actuales se conservarán                 │
│  ⚠️  Perderás las justificaciones y prioridades        │
│  ⚠️  El ciclo ZBB se cerrará                           │
│  ❌ No podrás volver a este plan específico             │
│                                                         │
│  ¿Qué deseas hacer?                                     │
│  ○ Terminar el mes con ZBB y cambiar después           │
│  ○ Cambiar ahora (convertir a presupuesto manual)      │
│  ○ Cancelar cambio                                      │
│                                                         │
│  [Cancelar]  [Confirmar Cambio]                        │
└─────────────────────────────────────────────────────────┘
```

---

## SCHEMA DE BASE DE DATOS ACTUALIZADO

```sql
-- Agregar campo de modo de presupuestación
ALTER TABLE user_settings 
ADD COLUMN budget_mode VARCHAR(20) DEFAULT 'manual'
  CHECK (budget_mode IN ('manual', '50-30-20', 'zbb'));

-- Modificar tabla budgets para soportar todos los modos
ALTER TABLE budgets 
ADD COLUMN budget_mode VARCHAR(20) DEFAULT 'manual',
ADD COLUMN rule_50_30_20_category VARCHAR(20),
  -- 'needs' | 'wants' | 'savings'
ADD COLUMN created_from_mode VARCHAR(20);
  -- Para rastrear origen del presupuesto

-- Índice para consultas por modo
CREATE INDEX idx_budgets_mode ON budgets(user_id, budget_mode);

-- Función para calcular distribución 50/30/20
CREATE OR REPLACE FUNCTION calculate_50_30_20(
  total_income DECIMAL(10,2)
) RETURNS TABLE(
  needs DECIMAL(10,2),
  wants DECIMAL(10,2),
  savings DECIMAL(10,2)
) AS $$
BEGIN
  RETURN QUERY SELECT
    (total_income * 0.50) AS needs,
    (total_income * 0.30) AS wants,
    (total_income * 0.20) AS savings;
END;
$$ LANGUAGE plpgsql;
```

---

## MENÚ DE CONFIGURACIÓN

```
┌─────────────────────────────────────────────────────────┐
│  ⚙️ Configuración de Presupuesto                        │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  MODO ACTUAL: 🎯 ZBB (Planificación Base Cero)         │
│  Activado desde: 01/01/2026                             │
│                                                         │
│  ┌───────────────────────────────────────────────────┐│
│  │  Historial de Modos:                              ││
│  │  • 01/2026 - Presente: ZBB                        ││
│  │  • 10/2025 - 12/2025: Regla 50/30/20              ││
│  │  • 01/2025 - 09/2025: Manual                      ││
│  └───────────────────────────────────────────────────┘│
│                                                         │
│  ¿Quieres cambiar de modo?                              │
│                                                         │
│  [Cambiar a Manual]                                     │
│  [Cambiar a 50/30/20]                                   │
│  [Mantener ZBB]                                         │
│                                                         │
│  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ │
│                                                         │
│  💡 Consejos según tu modo:                             │
│                                                         │
│  Como usuario ZBB:                                      │
│  • Planifica al inicio de cada mes                      │
│  • Revisa tus gastos semanalmente                       │
│  • Ajusta si es necesario                               │
│  • Compara mes a mes para mejorar                       │
└─────────────────────────────────────────────────────────┘
```

---

## DASHBOARD UNIFICADO

```
┌─────────────────────────────────────────────────────────┐
│  💰 FINANZAS - Enero 2026                               │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  Modo Activo: 🎯 ZBB                    [⚙️ Cambiar]   │
│                                                         │
│  ┌─────────────────────────────────────────────────┐  │
│  │  RESUMEN DEL MES                                │  │
│  │  ────────────────────────────────────────────── │  │
│  │  Ingresos:    $3,000                            │  │
│  │  Asignado:    $3,000 (100%) ✅                  │  │
│  │  Gastado:     $1,450 (48%)                      │  │
│  │  Restante:    $1,550                            │  │
│  └─────────────────────────────────────────────────┘  │
│                                                         │
│  [Ver Detalle de Planificación ZBB]                    │
│  [Ver Gastos por Categoría]                             │
│  [Ver Transacciones]                                    │
│                                                         │
│  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ │
│                                                         │
│  🔍 Comparación con otros modos:                        │
│                                                         │
│  ¿Qué pasaría si usaras 50/30/20?                       │
│  • Necesidades: $1,500 (vs $1,800 actual)              │
│  • Deseos: $900 (vs $700 actual)                        │
│  • Ahorros: $600 (vs $500 actual)                       │
│                                                         │
│  [Ver Análisis Completo]                                │
└─────────────────────────────────────────────────────────┘
```

---

## RECOMENDACIÓN FINAL

### Estrategia de Producto

```
┌────────────────────────────────────────────────────────┐
│  FASE 1: Usuario Nuevo (Onboarding)                   │
├────────────────────────────────────────────────────────┤
│  1. Mostrar selector de modo                           │
│  2. Recomendar "Manual" para principiantes             │
│  3. Explicar beneficios de cada modo                   │
│  4. Permitir cambio fácil después                      │
└────────────────────────────────────────────────────────┘

┌────────────────────────────────────────────────────────┐
│  FASE 2: Usuario Intermedio                            │
├────────────────────────────────────────────────────────┤
│  1. Sugerir 50/30/20 si gasta sin control              │
│  2. Notificar sobre ZBB para optimizar                 │
│  3. Mostrar comparativas entre modos                   │
└────────────────────────────────────────────────────────┘

┌────────────────────────────────────────────────────────┐
│  FASE 3: Usuario Avanzado                              │
├────────────────────────────────────────────────────────┤
│  1. Impulsar adopción de ZBB                           │
│  2. Gamificación: "Nivel ZBB Master"                   │
│  3. Permitir híbridos (algunas categorías ZBB)         │
└────────────────────────────────────────────────────────┘
```

### Configuración Recomendada

```typescript
// Default para nuevos usuarios
user_settings.budget_mode = 'manual'; 

// Sugerencias automáticas del sistema:
if (user.months_active > 3 && user.overspending_categories > 2) {
  suggest('50-30-20'); // Necesitas estructura
}

if (user.months_active > 6 && user.savings_goal_hit_rate > 80%) {
  suggest('zbb'); // Estás listo para optimizar más
}
```

---

## TABLA COMPARATIVA FINAL

| Característica | Manual | 50/30/20 | ZBB |
|----------------|--------|----------|-----|
| **Complejidad** | Baja ⭐ | Media ⭐⭐ | Alta ⭐⭐⭐ |
| **Tiempo setup** | 5 min | 10 min | 30 min |
| **Flexibilidad** | Alta ✅ | Media ⚠️ | Baja ❌ |
| **Disciplina requerida** | Usuario decide | Moderada | Alta |
| **Optimización** | Baja | Media | Alta ✅ |
| **Justificaciones** | No | No | Sí (obligatorio) |
| **Regla del $0** | No | No | Sí ✅ |
| **Cambio mid-mes** | Fácil ✅ | Medio ⚠️ | Controlado ⚠️ |
| **Ideal para** | Principiantes | Mayoría | Avanzados |

---

**Conclusión**: Los tres modos coexisten, pero solo UNO está activo por usuario a la vez. Permite transiciones suaves entre ellos.