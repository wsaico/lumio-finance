# Análisis y Estrategia de Migración a Flutter

## 1. Resumen Ejecutivo
El proyecto actual **Lumio** es una aplicación web robusta de Gestión de Finanzas Personales construida con **Next.js (React)**, **Prisma**, y **Supabase (PostgreSQL)**.

El objetivo es migrar este proyecto a **Flutter 3.x** para logar una verdadera compatibilidad multiplataforma (Web, Android, iOS) con una sola base de código, manteniendo la misma lógica de negocio y estructura de datos.

**Complejidad Estimada:** Alta
**Tiempo Estimado:** 8-12 Semanas (dependiendo del equipo y dedicación)

## 2. Estrategia de Arquitectura
Actualmente, la aplicación mezcla lógica de servidor (API routes de Next.js) con la interfaz de usuario. Flutter es una tecnología puramente del lado del cliente ("Client-Side").

### Opción Recomendada: "Backend-as-a-Service" (Supabase nativo)
Dado que ya se usa Supabase, la mejor estrategia es eliminar la capa de API intermedia de Next.js y conectar la App Flutter directamente a Supabase.

*   **Autenticación:** Usar `supabase_flutter` para Auth nativo.
*   **Base de Datos:** Usar el cliente de Supabase para consultas directas (Row Level Security - RLS - en Postgres debe estar bien configurado para seguridad).
*   **Lógica de Negocio Compleja:** Migrar la lógica que reside en las API routes de Next.js (`app/api/*`) a **Supabase Edge Functions** (TypeScript/Deno) o **Database Functions** (PL/pgSQL).

## 3. Mapeo de Tecnologías (Tech Stack Mapping)

| Capa | Next.js (Actual) | Flutter (Propuesto) |
| :--- | :--- | :--- |
| **Lenguaje** | TypeScript | Dart |
| **UI Framework** | React / Tailwind CSS | Flutter Widgets / Material 3 |
| **Estado Global** | Zustand / Context API | Riverpod o BLoC |
| **Data Fetching** | React Query / SWR | Riverpod + Futures / Repository Pattern |
| **Base de Datos** | Prisma (Server-side) | Supabase Client (Client-side) |
| **Gráficos** | Recharts | fl_chart |
| **Fechas** | date-fns | intl / Jiffy |
| **Iconos** | Lucide React | Lucide Icons / Material Icons |
| **Formularios** | React Hook Form + Zod | flutter_form_builder + form_validator |

## 4. Análisis Módulo por Módulo

A continuación, se detalla el análisis de cada módulo identificado en el proyecto:

### 4.1. Módulo de Autenticación (`app/(auth)`)
*   **Estado Actual:** Login, Registro, Recuperación de contraseña usando Supabase Auth helpers para Next.js.
*   **Estrategia Flutter:** Usar el paquete oficial `supabase_flutter`. Las pantallas de Login/Registro deben recrearse visualmente.
*   **Complejidad:** Baja.
*   **Retos:** Manejo de sesiones persistentes y "Deep Linking" para recuperación de contraseñas en móvil.

### 4.2. Dashboard / Resumen (`app/(dashboard)/dashboard`)
*   **Estado Actual:** Muestra widgets interactivos (Balance, Gastos, Gráficos).
*   **Estrategia Flutter:** Crear un `DashboardScreen` con un `Grid` responsivo (1 columna en móvil, 2-3 en web).
*   **Componentes Clave:**
    *   Tarjetas de Resumen (Widgets).
    *   Gráficos circulares y de líneas (usar `fl_chart`).
*   **Complejidad:** Media (principalmente diseño UI adaptativo).

### 4.3. Transacciones (`/transactions`)
*   **Estado Actual:** Listado, filtrado, creación y edición de transacciones.
*   **Estrategia Flutter:**
    *   `ListView.builder` para scroll infinito de transacciones.
    *   Filtros mediante `ModalBottomSheet` o un panel lateral en Web.
    *   Formularios complejos con validación para Ingresos, Gastos, Transferencias.
*   **Complejidad:** Alta. (Manejo de estados, formularios dinámicos, actualizaciones en tiempo real).

### 4.4. Cuentas (`/accounts`)
*   **Estado Actual:** Gestión de cuentas bancarias y efectivo.
*   **Estrategia Flutter:** Pantalla CRUD (Crear, Leer, Actualizar, Eliminar).
*   **Complejidad:** Baja-Media.

### 4.5. Presupuestos (`/budgets`)
*   **Estado Actual:** Lógica compleja de comparación Mensual vs Real.
*   **Estrategia Flutter:** Requiere lógica de cálculo en el cliente o una Edge Function que devuelva el progreso del presupuesto. Visualización con barras de progreso lineales.
*   **Complejidad:** Media-Alta (Lógica de "Rollover" y cálculos).

### 4.6. Préstamos (`/loans`)
*   **Estado Actual:** Gestión de deudas y acreencias.
*   **Estrategia Flutter:** Listas separadas para "Por Cobrar" y "Por Pagar". Integración con Transacciones para abonos.
*   **Complejidad:** Media.

### 4.7. Tarjetas de Crédito (`/credit-cards`)
*   **Estado Actual:** Módulo complejo con fechas de corte, pagos mínimos, liquidaciones (cuotas).
*   **Estrategia Flutter:** Este es uno de los módulos más complejos. Requiere cálculos precisos de fechas. Migrar la lógica de cálculo de Next.js a código Dart puro en la capa de dominio.
*   **Complejidad:** Alta.

### 4.8. Caja Chica (`/petty-cash`)
*   **Estado Actual:** Sistema completo de gestión de fondos fijos, auditorías y reposiciones.
*   **Estrategia Flutter:** Flujos de trabajo secuenciales (Wizard).
    *   Aprobaciones y cambios de estado.
    *   Subida de fotos de comprobantes (usar `image_picker` y Supabase Storage).
*   **Complejidad:** Alta (Muchos estados y roles).

### 4.9. Reportes (`/reports`)
*   **Estado Actual:** Generación de visualizaciones y exportación de datos.
*   **Estrategia Flutter:**
    *   Uso intensivo de `fl_chart`.
    *   Exportación a PDF/Excel usando librerías de Dart (`pdf`, `excel`).
*   **Complejidad:** Alta (Renderizado de datos masivos).

## 5. Análisis de Riesgos

1.  **Seguridad (Row Level Security):** Al conectar Flutter directo a Supabase, toda la seguridad depende de las políticas RLS de PostgreSQL. Si actualmente Next.js hace validaciones de seguridad en el servidor antes de llamar a la DB, esas validaciones deben moverse a la base de datos (RLS) o Edge Functions.
2.  **Rendimiento en Web:** Flutter Web usa CanvasKit. La primera carga es más lenta que una web HTML/JS tradicional.
    *   **Nota sobre SEO:** Tienes toda la razón. Al ser un sistema de gestión financiera privado (detrás de un login), **el SEO es irrelevante**. Google no indexará tus transacciones privadas. Esto hace que Flutter Web sea una opción mucho más viable, ya que su principal desventaja (SEO) no aplica aquí. Solo importaría si tuvieras una "Landing Page" pública de marketing; esa sí se recomendaría hacerla en HTML/CSS simple, pero la app en sí misma es perfecta para Flutter.
3.  **Dependencias de UI:** Componentes como `shadcn/ui` o `Radix UI` no existen en Flutter. Se deberá construir un "Design System" propio en Flutter o usar librerías como `flutter_shadcn_ui` (comunidad).

## 6. Plan de Acción (Roadmap)

### Fase 1: Fundamentos (Semanas 1-2)
*   [ ] Configurar proyecto Flutter (FVM, Flavors).
*   [ ] Integrar `supabase_flutter`.
*   [ ] Implementar sistema de Rutas (`go_router`).
*   [ ] Crear estructura de directorios y arquitectura (Clean Architecture o Riverpod Architecture).
*   [ ] Implementar Autenticación (Login, Registro).

### Fase 2: Diseño y Core UI (Semanas 3-4)
*   [ ] Definir Tema (Colores, Tipografía).
*   [ ] Crear Widgets base (Botones, Inputs, Cards) para imitar el diseño actual.
*   [ ] Implementar Layout Base (Sidebar, AppBar responsivo).

### Fase 3: Módulos Principales (Semanas 5-8)
*   [ ] **Dashboard:** Widgets de resumen.
*   [ ] **Transacciones:** Listado y CRUD.
*   [ ] **Cuentas y Presupuestos.**

### Fase 4: Módulos Avanzados (Semanas 9-11)
*   [ ] **Tarjetas de Crédito:** Lógica de cuotas y cortes.
*   [ ] **Caja Chica:** Flujos de aprobación y evidencias.
*   [ ] **Reportes y Gráficos.**

### Fase 5: Pulido y Despliegue (Semana 12)
*   [ ] Adaptación Web vs Móvil (Responsive).
*   [ ] Pruebas en Android / iOS.
*   [ ] Despliegue a Stores y Web Hosting.

## Conclusión
La migración es totalmente viable y aprovechará la potencia de Supabase. El mayor desafío no es técnico, sino de re-escritura de la lógica de negocio y UI adaptativa. Se recomienda una arquitectura robusta (ej. Riverpod + Repository Pattern) para mantener el código ordenado y mantenible.
