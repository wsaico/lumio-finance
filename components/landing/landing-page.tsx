"use client"

import React, { useState } from "react"
import Link from "next/link"
import { motion, AnimatePresence } from "framer-motion"
import {
    ArrowRight,
    BarChart3,
    Calculator,
    Check,
    CreditCard,
    FileSpreadsheet,
    Globe,
    HandCoins,
    Lock,
    PieChart,
    Plus,
    Repeat,
    ShieldCheck,
    Sparkles,
    Target,
    Wallet,
    ChevronDown,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import type { PlanDefinition } from "@/lib/entitlements"
import type { SystemBrandingSettings } from "@/lib/server/system-settings"
import { cn } from "@/lib/utils"

interface LandingPageProps {
    settings: SystemBrandingSettings
    plans: PlanDefinition[]
    isAuthenticated: boolean
}

const PREVIEW_TABS = [
    {
        id: "overview",
        label: "Resumen diario",
        title: "Patrimonio neto en tiempo real",
        headline: "S/. 14,820.50",
        sub: "3 cuentas activas · Flujo positivo este mes (+S/. 1,450.00)",
        rows: [
            { title: "Sueldo mensual", meta: "Banco BCP · Ingreso", amount: "+S/. 4,200.00", positive: true },
            { title: "Supermercado semanal", meta: "Efectivo · Comida y bebidas", amount: "-S/. 184.50", positive: false },
            { title: "Alquiler departamento", meta: "Banco BCP · Vivienda", amount: "-S/. 1,100.00", positive: false },
        ],
    },
    {
        id: "cards",
        label: "Tarjetas de crédito",
        title: "Crédito disponible vs usado",
        headline: "S/. 6,420.00 libres",
        sub: "Línea total S/. 8,000 · Cierre día 20 · Pago sin duplicar gastos",
        rows: [
            { title: "Compra en 3 cuotas", meta: "Tarjeta Visa · Electrónica", amount: "-S/. 540.00", positive: false },
            { title: "Suscripción nube", meta: "Cargo automático mensual", amount: "-S/. 39.00", positive: false },
            { title: "Pago de tarjeta", meta: "Transferencia desde Banco BCP", amount: "S/. 950.00", positive: true },
        ],
    },
    {
        id: "budgets",
        label: "Presupuestos y metas",
        title: "Ritmo mensual controlado",
        headline: "62% ejecutado",
        sub: "Te quedan S/. 38.50 diarios recomendados para cerrar el mes en verde",
        rows: [
            { title: "Comida y bebidas", meta: "S/. 410 de S/. 700 · Al ritmo esperado", amount: "58%", positive: true },
            { title: "Fondo de emergencia", meta: "Meta S/. 10,000 · Racha de 4 meses", amount: "S/. 6,500", positive: true },
            { title: "Salidas y ocio", meta: "S/. 290 de S/. 350 · Últimos días", amount: "82%", positive: false },
        ],
    },
    {
        id: "loans",
        label: "Préstamos y cuotas",
        title: "Lo que te deben y lo que pagas",
        headline: "S/. 1,250 por cobrar",
        sub: "Recordatorios antes del vencimiento e intereses calculados",
        rows: [
            { title: "Carlos Mendoza", meta: "Por cobrar · Cuota 2 de 3 vence pronto", amount: "+S/. 450.00", positive: true },
            { title: "Préstamo equipo trabajo", meta: "Por pagar · 4 cuotas restantes", amount: "-S/. 320.00", positive: false },
            { title: "Cobro parcial recibido", meta: "Ingresado en Cuenta Principal", amount: "+S/. 350.00", positive: true },
        ],
    },
]

const FAQS = [
    {
        q: "¿De verdad puedo usar el Plan Básico gratis de por vida?",
        a: "Sí. Al crear tu cuenta recibes 15 días con todo desbloqueado sin ingresar tarjeta. Cuando terminan esos 15 días, si decides no suscribirte pasas automáticamente al Plan Básico gratuito con tu cuenta principal y todos tus movimientos sin límite de tiempo.",
    },
    {
        q: "¿Cómo funciona el modo demostración para probar antes de meter mis datos?",
        a: "En tu primera entrada puedes elegir cargar datos de ejemplo en tu propia moneda. Verás cómo luce todo con cuentas, tarjetas, presupuestos y préstamos listos. Cuando quieras empezar con tus cifras reales, tocas Desactivar demo y conservas intacto cualquier registro propio que hayas hecho.",
    },
    {
        q: "¿Qué métodos de pago aceptan para pasar a Premium?",
        a: "En Perú puedes activar con Yape, Plin o tarjeta Visa y Mastercard. Si estás en otro país puedes pagar con tarjeta internacional o PayPal. Los planes son Mensual (S/. 10), 6 meses (S/. 50), Anual (S/. 79) o un solo pago De por vida (S/. 169).",
    },
    {
        q: "¿Mis datos financieros se mezclan o son visibles para otras cuentas?",
        a: "Nunca. Cada cuenta de usuario opera aislada mediante políticas de seguridad por fila en base de datos, sesiones limpias al cambiar de cuenta y bloqueo opcional con PIN de 4 dígitos en tus dispositivos.",
    },
]

export function LandingPage({ settings, plans, isAuthenticated }: LandingPageProps) {
    const [activeTabId, setActiveTabId] = useState(PREVIEW_TABS[0].id)
    const [currency, setCurrency] = useState<"PEN" | "USD">("PEN")
    const [openFaq, setOpenFaq] = useState<number | null>(0)

    const brandColor = settings.primary_color || "#7C3AED"
    const appName = settings.app_name || "Lumio Finance"
    const shortName = appName.split(" ")[0] || "Lumio"

    const activePreview = PREVIEW_TABS.find((t) => t.id === activeTabId) || PREVIEW_TABS[0]
    const appHostUrl = process.env.NEXT_PUBLIC_APP_URL || ""
    const registerHref = `${appHostUrl}/register`
    const loginHref = `${appHostUrl}/login`
    const dashboardHref = `${appHostUrl}/dashboard`

    const freePlan = plans.find((p) => p.code === "FREE")
    const paidPlans = plans.filter((p) => p.code !== "FREE" && p.is_active !== false)
    const currSym = currency === "USD" ? "$" : "S/."

    return (
        <div
            className="min-h-screen bg-[#FAFBFD] dark:bg-[#0B0C11] text-foreground selection:bg-primary/20 overflow-x-clip"
            style={{ "--brand": brandColor } as React.CSSProperties}
        >
            {/* NAVBAR */}
            <header className="sticky top-0 z-50 border-b border-border/50 bg-background/80 backdrop-blur-xl">
                <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-4">
                    <Link href="/" className="flex items-center gap-2.5 shrink-0">
                        <img
                            src={settings.logo_light_url || "/icons/icon-light.png"}
                            alt={appName}
                            className="h-9 w-9 rounded-xl object-cover shadow-sm dark:hidden"
                        />
                        <img
                            src={settings.logo_dark_url || "/icons/icon-dark.png"}
                            alt={appName}
                            className="h-9 w-9 rounded-xl object-cover shadow-sm hidden dark:block"
                        />
                        <span className="font-black text-lg tracking-tight">{shortName}</span>
                    </Link>

                    <nav className="hidden md:flex items-center gap-7 text-sm font-semibold text-muted-foreground">
                        <a href="#producto" className="hover:text-foreground transition-colors">
                            Cómo funciona
                        </a>
                        <a href="#modulos" className="hover:text-foreground transition-colors">
                            Módulos
                        </a>
                        <a href="#precios" className="hover:text-foreground transition-colors">
                            Planes y precios
                        </a>
                        <a href="#preguntas" className="hover:text-foreground transition-colors">
                            Preguntas
                        </a>
                    </nav>

                    <div className="flex items-center gap-2.5">
                        {isAuthenticated ? (
                            <Button asChild className="h-9 px-4 rounded-full font-bold text-xs gap-1.5">
                                <Link href={dashboardHref}>
                                    Ir a mi panel
                                    <ArrowRight className="h-3.5 w-3.5" />
                                </Link>
                            </Button>
                        ) : (
                            <>
                                <Button
                                    asChild
                                    variant="ghost"
                                    className="h-9 px-3.5 rounded-full font-bold text-xs hidden sm:inline-flex"
                                >
                                    <Link href={loginHref}>Iniciar sesión</Link>
                                </Button>
                                <Button
                                    asChild
                                    className="h-9 px-4 rounded-full font-extrabold text-xs gap-1.5 shadow-md shadow-primary/25"
                                >
                                    <Link href={registerHref}>
                                        Probar {settings.trial_days || 15} días gratis
                                        <ArrowRight className="h-3.5 w-3.5" />
                                    </Link>
                                </Button>
                            </>
                        )}
                    </div>
                </div>
            </header>

            {/* HERO WITH LIVE ANIMATED BACKGROUND */}
            <section className="relative pt-14 pb-20 sm:pt-20 sm:pb-28 overflow-hidden">
                {/* Animated Aurora + Subtle Grid */}
                <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
                    <motion.div
                        animate={{
                            x: [0, 35, -20, 0],
                            y: [0, -25, 20, 0],
                            scale: [1, 1.08, 0.96, 1],
                        }}
                        transition={{ duration: 18, repeat: Infinity, ease: "easeInOut" }}
                        className="absolute -top-36 left-1/4 h-[480px] w-[480px] rounded-full blur-[130px] opacity-25"
                        style={{ backgroundColor: brandColor }}
                    />
                    <motion.div
                        animate={{
                            x: [0, -30, 25, 0],
                            y: [0, 30, -20, 0],
                            scale: [1, 0.94, 1.08, 1],
                        }}
                        transition={{ duration: 22, repeat: Infinity, ease: "easeInOut" }}
                        className="absolute top-12 right-1/5 h-[380px] w-[380px] rounded-full bg-emerald-500/20 blur-[130px]"
                    />
                    <div
                        className="absolute inset-0 opacity-[0.035] dark:opacity-[0.05]"
                        style={{
                            backgroundImage:
                                "radial-gradient(circle at 1px 1px, currentColor 1px, transparent 0)",
                            backgroundSize: "28px 28px",
                        }}
                    />
                </div>

                <div className="relative max-w-6xl mx-auto px-4 sm:px-6 space-y-14">
                    <motion.div
                        initial={{ opacity: 0, y: 18 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.45 }}
                        className="max-w-3xl mx-auto text-center space-y-6"
                    >
                        <div className="inline-flex items-center gap-2 rounded-full border border-primary/25 bg-primary/10 px-4 py-1.5 text-xs font-bold text-primary">
                            <Sparkles className="h-3.5 w-3.5" />
                            <span>
                                {settings.trial_days || 15} días de prueba completa · Plan Básico gratis de por vida
                            </span>
                        </div>

                        <h1 className="text-4xl sm:text-5xl lg:text-[3.5rem] font-black tracking-tight text-foreground leading-[1.08]">
                            Sabes cuánto entra cada mes. Ahora ten claro a dónde va cada sol.
                        </h1>

                        <p className="text-base sm:text-lg text-muted-foreground max-w-2xl mx-auto leading-relaxed">
                            Reúne tus cuentas, tarjetas de crédito, presupuestos, metas y préstamos en una sola pantalla rápida, ordenada y pensada para usarla en segundos todos los días.
                        </p>

                        {/* HOTMART-STYLE CONVERSION CTA BLOCK */}
                        <div className="pt-2 flex flex-col items-center gap-3.5">
                            <div className="flex flex-col sm:flex-row items-center gap-3 w-full sm:w-auto justify-center">
                                <motion.div
                                    whileHover={{ scale: 1.02 }}
                                    whileTap={{ scale: 0.98 }}
                                    className="w-full sm:w-auto"
                                >
                                    <Link
                                        href={isAuthenticated ? dashboardHref : registerHref}
                                        className="group relative inline-flex w-full sm:w-auto items-center justify-center gap-3 rounded-2xl bg-primary px-8 py-4 text-sm sm:text-base font-black text-primary-foreground shadow-2xl shadow-primary/35 overflow-hidden transition-all"
                                    >
                                        <span className="relative z-10">
                                            {isAuthenticated
                                                ? "Entrar a mi panel financiero"
                                                : `Empezar ${settings.trial_days || 15} días Premium gratis`}
                                        </span>
                                        <ArrowRight className="relative z-10 h-5 w-5 transition-transform group-hover:translate-x-1" />
                                        <span
                                            aria-hidden
                                            className="absolute inset-0 -translate-x-full group-hover:translate-x-full transition-transform duration-1000 bg-gradient-to-r from-transparent via-white/25 to-transparent"
                                        />
                                    </Link>
                                </motion.div>

                                <a
                                    href="#precios"
                                    className="inline-flex w-full sm:w-auto items-center justify-center rounded-2xl border border-border bg-card px-6 py-4 text-sm font-bold text-foreground hover:bg-muted/60 transition-colors"
                                >
                                    Ver planes desde S/. 10
                                </a>
                            </div>

                            <div className="flex flex-wrap items-center justify-center gap-x-5 gap-y-2 text-xs font-semibold text-muted-foreground pt-1">
                                <span className="inline-flex items-center gap-1.5">
                                    <Check className="h-3.5 w-3.5 text-emerald-500" />
                                    Sin tarjeta de crédito para iniciar
                                </span>
                                <span className="inline-flex items-center gap-1.5">
                                    <Check className="h-3.5 w-3.5 text-emerald-500" />
                                    Plan Básico gratis para siempre
                                </span>
                                <span className="inline-flex items-center gap-1.5">
                                    <Check className="h-3.5 w-3.5 text-emerald-500" />
                                    Modo demostración incluido
                                </span>
                            </div>
                        </div>
                    </motion.div>

                    {/* INTERACTIVE PRODUCT SHOWCASE */}
                    <motion.div
                        id="producto"
                        initial={{ opacity: 0, y: 24 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.55, delay: 0.1 }}
                        className="rounded-[2rem] border border-border/80 bg-card/95 backdrop-blur-xl shadow-2xl shadow-black/10 p-4 sm:p-7 space-y-6"
                    >
                        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border/60 pb-4">
                            <div className="flex flex-wrap gap-1.5">
                                {PREVIEW_TABS.map((tab) => (
                                    <button
                                        key={tab.id}
                                        type="button"
                                        onClick={() => setActiveTabId(tab.id)}
                                        className={cn(
                                            "px-3.5 py-2 rounded-xl text-xs font-bold transition-all",
                                            activeTabId === tab.id
                                                ? "bg-primary text-primary-foreground shadow-sm"
                                                : "text-muted-foreground hover:bg-muted hover:text-foreground"
                                        )}
                                    >
                                        {tab.label}
                                    </button>
                                ))}
                            </div>
                            <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground hidden sm:inline">
                                Vista interactiva del sistema
                            </span>
                        </div>

                        <AnimatePresence mode="wait">
                            <motion.div
                                key={activePreview.id}
                                initial={{ opacity: 0, y: 8 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -6 }}
                                transition={{ duration: 0.2 }}
                                className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-stretch"
                            >
                                <div className="lg:col-span-5 rounded-3xl bg-primary text-primary-foreground p-6 flex flex-col justify-between gap-6">
                                    <div className="space-y-1">
                                        <span className="text-xs font-bold uppercase tracking-wider text-primary-foreground/80">
                                            {activePreview.title}
                                        </span>
                                        <p className="text-3xl sm:text-4xl font-black tracking-tight tabular-nums">
                                            {activePreview.headline}
                                        </p>
                                    </div>
                                    <p className="text-xs sm:text-sm text-primary-foreground/85 font-medium leading-relaxed">
                                        {activePreview.sub}
                                    </p>
                                </div>

                                <div className="lg:col-span-7 rounded-3xl border border-border/60 bg-muted/25 divide-y divide-border/50 overflow-hidden">
                                    {activePreview.rows.map((r) => (
                                        <div
                                            key={r.title}
                                            className="px-5 py-4 flex items-center justify-between gap-4"
                                        >
                                            <div className="min-w-0">
                                                <p className="font-bold text-sm text-foreground truncate">
                                                    {r.title}
                                                </p>
                                                <p className="text-xs text-muted-foreground truncate mt-0.5">
                                                    {r.meta}
                                                </p>
                                            </div>
                                            <span
                                                className={cn(
                                                    "font-black text-sm tabular-nums shrink-0",
                                                    r.positive
                                                        ? "text-emerald-600 dark:text-emerald-400"
                                                        : "text-rose-500"
                                                )}
                                            >
                                                {r.amount}
                                            </span>
                                        </div>
                                    ))}
                                </div>
                            </motion.div>
                        </AnimatePresence>
                    </motion.div>
                </div>
            </section>

            {/* MODULES BENTO */}
            <section id="modulos" className="py-16 sm:py-24 max-w-6xl mx-auto px-4 sm:px-6 space-y-12">
                <div className="max-w-2xl space-y-3">
                    <span className="text-xs font-extrabold uppercase tracking-wider text-primary">
                        Todo lo que necesitas en un solo lugar
                    </span>
                    <h2 className="text-3xl sm:text-4xl font-black tracking-tight text-foreground">
                        Diseñado para resolver el desorden financiero real, sin complicarte la vida.
                    </h2>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                    {[
                        {
                            icon: Plus,
                            title: "Registro en tres toques",
                            desc: "Elige descripción, categoría y monto con calculadora integrada. Aprende tus gastos frecuentes para sugerirte la categoría al instante.",
                        },
                        {
                            icon: CreditCard,
                            title: "Tarjetas sin enredos",
                            desc: "Cada compra suma a tu deuda usada y te muestra cuánto crédito libre queda. Al pagar tu tarjeta desde el banco, no duplica el gasto.",
                        },
                        {
                            icon: PieChart,
                            title: "Presupuestos que sí avisan",
                            desc: "Controla topes por categoría, cuenta o etiqueta con ritmo diario calculado y alertas antes de pasarte.",
                        },
                        {
                            icon: HandCoins,
                            title: "Préstamos por cobrar y pagar",
                            desc: "Lleva quién te debe y qué cuotas te toca pagar, con fechas de vencimiento, abonos parciales e interés configurable.",
                        },
                        {
                            icon: Target,
                            title: "Metas y suscripciones",
                            desc: "Separa tu fondo de emergencia o próximo viaje y automatiza cargos mensuales para que no se te escape ningún cobro.",
                        },
                        {
                            icon: Globe,
                            title: "Multi-moneda y zona horaria",
                            desc: "Registra cuentas en Soles, Dólares u otras divisas con tipo de cambio personalizable y corte exacto en tu hora local.",
                        },
                    ].map((card) => (
                        <div
                            key={card.title}
                            className="rounded-3xl bg-card border border-border/70 p-6 space-y-3 hover:border-primary/40 hover:shadow-md transition-all"
                        >
                            <div className="h-11 w-11 rounded-2xl bg-primary/10 text-primary flex items-center justify-center">
                                <card.icon className="h-5 w-5" />
                            </div>
                            <h3 className="text-lg font-black text-foreground">{card.title}</h3>
                            <p className="text-sm text-muted-foreground leading-relaxed">{card.desc}</p>
                        </div>
                    ))}
                </div>
            </section>

            {/* PRICING SECTION */}
            <section id="precios" className="py-16 sm:py-24 bg-muted/35 border-y border-border/60">
                <div className="max-w-6xl mx-auto px-4 sm:px-6 space-y-10">
                    <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
                        <div className="space-y-2 max-w-xl">
                            <span className="text-xs font-extrabold uppercase tracking-wider text-primary">
                                Planes transparentes
                            </span>
                            <h2 className="text-3xl sm:text-4xl font-black tracking-tight text-foreground">
                                Empieza gratis. Quédate en Premium solo si te aporta valor real.
                            </h2>
                        </div>

                        <div className="inline-flex p-1 rounded-2xl bg-card border border-border/70 self-start">
                            {(["PEN", "USD"] as const).map((cur) => (
                                <button
                                    key={cur}
                                    type="button"
                                    onClick={() => setCurrency(cur)}
                                    className={cn(
                                        "px-4 py-1.5 rounded-xl text-xs font-extrabold transition-all",
                                        currency === cur
                                            ? "bg-primary text-primary-foreground shadow-xs"
                                            : "text-muted-foreground hover:text-foreground"
                                    )}
                                >
                                    {cur === "PEN" ? "Soles (S/.)" : "Dólares ($)"}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Paid Plans */}
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                        {paidPlans.map((plan) => {
                            const price = currency === "USD" ? plan.price_usd : plan.price_pen
                            const isPopular = plan.code === "PREMIUM_ANNUAL"
                            return (
                                <div
                                    key={plan.code}
                                    className={cn(
                                        "rounded-3xl bg-card border p-6 flex flex-col justify-between gap-6 transition-all",
                                        isPopular
                                            ? "border-primary ring-2 ring-primary/20 shadow-xl"
                                            : "border-border/70 shadow-xs"
                                    )}
                                >
                                    <div className="space-y-4">
                                        {plan.badge && (
                                            <span
                                                className={cn(
                                                    "inline-block px-3 py-1 rounded-full text-[10px] font-extrabold uppercase tracking-wider",
                                                    isPopular
                                                        ? "bg-primary text-primary-foreground"
                                                        : "bg-primary/10 text-primary"
                                                )}
                                            >
                                                {plan.badge}
                                            </span>
                                        )}
                                        <div>
                                            <h3 className="text-xl font-black text-foreground">{plan.name}</h3>
                                            <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                                                {plan.description}
                                            </p>
                                        </div>

                                        <div className="flex items-baseline gap-1.5">
                                            <span className="text-3xl font-black tabular-nums">
                                                {currSym} {price}
                                            </span>
                                            <span className="text-xs font-semibold text-muted-foreground">
                                                {plan.billing_cycle === "MONTHLY"
                                                    ? "/ mes"
                                                    : plan.billing_cycle === "SEMIANNUAL"
                                                      ? "/ 6 meses"
                                                      : plan.billing_cycle === "ANNUAL"
                                                        ? "/ año"
                                                        : "pago único"}
                                            </span>
                                        </div>

                                        <ul className="space-y-2.5 pt-3 border-t border-border/50">
                                            {(plan.features || []).map((feat) => (
                                                <li key={feat} className="flex items-start gap-2 text-xs font-medium text-foreground/90">
                                                    <Check className="h-4 w-4 text-emerald-500 shrink-0 mt-0.5" />
                                                    <span>{feat}</span>
                                                </li>
                                            ))}
                                        </ul>
                                    </div>

                                    <Button
                                        asChild
                                        variant={isPopular ? "default" : "outline"}
                                        className="w-full h-11 rounded-2xl font-extrabold text-xs"
                                    >
                                        <Link href={registerHref}>
                                            Probar {settings.trial_days || 15} días gratis
                                        </Link>
                                    </Button>
                                </div>
                            )
                        })}
                    </div>

                    {/* Free Lifetime Plan Banner */}
                    <div className="rounded-3xl bg-card border border-border/70 p-6 sm:p-7 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
                        <div className="space-y-2 max-w-2xl">
                            <div className="flex flex-wrap items-center gap-2.5">
                                <h3 className="text-xl font-black text-foreground">
                                    {freePlan?.name || "Plan Básico"} — {currSym} 0
                                </h3>
                                <span className="px-3 py-1 rounded-full bg-emerald-500/12 text-emerald-600 dark:text-emerald-400 text-[11px] font-extrabold">
                                    Gratis de por vida
                                </span>
                            </div>
                            <p className="text-sm text-muted-foreground leading-relaxed">
                                Incluye 1 cuenta activa, movimientos ilimitados, categorías y etiquetas personalizadas, y vista previa en modo lector de presupuestos, metas, préstamos y reportes.
                            </p>
                        </div>

                        <Button asChild variant="secondary" className="h-11 px-6 rounded-2xl font-extrabold text-xs shrink-0">
                            <Link href={registerHref}>Crear cuenta gratis</Link>
                        </Button>
                    </div>

                    {/* Payment methods strip */}
                    <div className="flex flex-wrap items-center justify-center gap-4 pt-2 text-xs font-bold text-muted-foreground">
                        <span>Medios de pago aceptados:</span>
                        {["Yape", "Plin", "Visa", "Mastercard", "PayPal"].map((m) => (
                            <span
                                key={m}
                                className="px-3.5 py-1.5 rounded-xl bg-card border border-border/70 text-foreground font-extrabold"
                            >
                                {m}
                            </span>
                        ))}
                    </div>
                </div>
            </section>

            {/* FAQ SECTION */}
            <section id="preguntas" className="py-16 sm:py-24 max-w-3xl mx-auto px-4 sm:px-6 space-y-8">
                <div className="text-center space-y-2">
                    <h2 className="text-3xl font-black tracking-tight">Preguntas frecuentes</h2>
                    <p className="text-sm text-muted-foreground">
                        Respuestas directas sobre la prueba gratuita, privacidad y planes.
                    </p>
                </div>

                <div className="space-y-3">
                    {FAQS.map((item, idx) => {
                        const isOpen = openFaq === idx
                        return (
                            <div
                                key={item.q}
                                className="rounded-2xl bg-card border border-border/70 overflow-hidden"
                            >
                                <button
                                    type="button"
                                    onClick={() => setOpenFaq(isOpen ? null : idx)}
                                    className="w-full px-5 py-4 flex items-center justify-between gap-4 text-left font-bold text-sm text-foreground hover:bg-muted/30 transition-colors"
                                >
                                    <span>{item.q}</span>
                                    <ChevronDown
                                        className={cn(
                                            "h-4 w-4 text-muted-foreground transition-transform shrink-0",
                                            isOpen && "rotate-180"
                                        )}
                                    />
                                </button>
                                {isOpen && (
                                    <div className="px-5 pb-4 text-sm text-muted-foreground leading-relaxed border-t border-border/40 pt-3">
                                        {item.a}
                                    </div>
                                )}
                            </div>
                        )
                    })}
                </div>
            </section>

            {/* FINAL HOTMART CONVERSION CTA */}
            <section className="pb-20 px-4 sm:px-6">
                <div className="max-w-5xl mx-auto rounded-[2.25rem] bg-primary text-primary-foreground p-8 sm:p-12 text-center space-y-6 shadow-2xl shadow-primary/25 relative overflow-hidden">
                    <div className="space-y-2 max-w-2xl mx-auto relative z-10">
                        <h2 className="text-3xl sm:text-4xl font-black tracking-tight">
                            Pon tus cuentas en orden hoy mismo, en menos de dos minutos.
                        </h2>
                        <p className="text-sm sm:text-base text-primary-foreground/85">
                            Activa tus 15 días de prueba completa o explora con el modo demostración sin comprometer tus datos.
                        </p>
                    </div>
                    <div className="relative z-10 flex flex-col sm:flex-row items-center justify-center gap-3">
                        <Link
                            href={isAuthenticated ? dashboardHref : registerHref}
                            className="inline-flex items-center justify-center gap-2 rounded-2xl bg-white text-slate-950 px-8 py-4 text-sm font-black shadow-xl hover:bg-white/95 transition-transform hover:scale-[1.02]"
                        >
                            {isAuthenticated ? "Ir a mi cuenta" : "Comenzar mis 15 días gratis"}
                            <ArrowRight className="h-4 w-4" />
                        </Link>
                    </div>
                </div>
            </section>

            {/* FOOTER */}
            <footer className="border-t border-border/60 bg-card/60 py-8 px-4 sm:px-6">
                <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4 text-xs text-muted-foreground">
                    <p>
                        © {new Date().getFullYear()} {appName} · Desarrollado por{" "}
                        <strong className="text-foreground">Wilber Saico</strong> (
                        <a
                            href="https://esaico.com"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-primary font-bold hover:underline"
                        >
                            esaico.com
                        </a>
                        )
                    </p>
                    <div className="flex items-center gap-5 font-semibold">
                        <Link href="/privacidad" className="hover:text-foreground transition-colors">
                            Privacidad
                        </Link>
                        <Link href="/terminos" className="hover:text-foreground transition-colors">
                            Términos
                        </Link>
                        <Link href={loginHref} className="hover:text-foreground transition-colors">
                            Iniciar sesión
                        </Link>
                    </div>
                </div>
            </footer>
        </div>
    )
}
