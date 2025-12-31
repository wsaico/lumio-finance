"use client"

import { motion } from "framer-motion"
import { DashboardGrid } from "@/components/dashboard/DashboardGrid"
import { useDashboard } from "@/hooks/useDashboard"
import { TransactionFilters } from "@/components/transactions/TransactionFilters"
import { SmartCategorySelector } from "@/components/transactions/SmartCategorySelector"
import { AnimatedNumber } from "@/components/ui/animated-number"
import { ProgressBar } from "@/components/ui/progress-bar"
import { AmountInput } from "@/components/ui/amount-input"
import { CurrencySelector } from "@/components/ui/CurrencySelector"
import { KeyboardShortcutsDialog } from "@/components/ui/KeyboardShortcutsDialog"
import { useGlobalKeyboardShortcuts } from "@/hooks/useKeyboardShortcuts"
import { Settings, LayoutGrid, Maximize2, Sparkles, Calculator, Filter, DollarSign, Keyboard } from "lucide-react"
import { useState } from "react"
import { useRouter } from "next/navigation"

export default function DemoPage() {
    const router = useRouter()
    const { config, toggleLayout, toggleCompactMode, resetToDefault } = useDashboard()
    const [showSettings, setShowSettings] = useState(false)
    const [showShortcuts, setShowShortcuts] = useState(false)

    // Demo states
    const [demoAmount, setDemoAmount] = useState(1250.50)
    const [demoDescription, setDemoDescription] = useState("")
    const [demoCategoryId, setDemoCategoryId] = useState("")
    const [demoCurrency, setDemoCurrency] = useState("USD")
    const [demoAmountInput, setDemoAmountInput] = useState(0)

    // Setup keyboard shortcuts
    const shortcuts = useGlobalKeyboardShortcuts(
        () => console.log("New transaction"),
        () => console.log("Search"),
        () => console.log("Toggle sidebar"),
        () => router.push("/dashboard"),
        () => router.push("/dashboard/transactions"),
        () => router.push("/dashboard/budgets"),
        () => setShowShortcuts(true)
    )

    return (
        <div className="space-y-8 pb-20 md:pb-6">
            {/* Header */}
            <motion.div
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4 }}
            >
                <div className="flex items-center gap-3 mb-2">
                    <div className="p-2 bg-gradient-to-br from-primary-500 to-primary-700 rounded-lg">
                        <Sparkles className="w-6 h-6 text-white" />
                    </div>
                    <div>
                        <h1 className="text-3xl md:text-4xl font-bold tracking-tight">
                            Nuevas Características
                        </h1>
                        <p className="text-sm md:text-base text-muted-foreground">
                            Todas las implementaciones premium de Lumio Finance
                        </p>
                    </div>
                </div>
                <div className="mt-4 p-4 bg-primary-50 dark:bg-primary-900/20 border border-primary-200 dark:border-primary-700 rounded-lg">
                    <p className="text-sm text-primary-900 dark:text-primary-100">
                        Esta página demuestra TODAS las nuevas características implementadas. Presiona <kbd className="px-2 py-1 bg-white dark:bg-neutral-700 rounded border border-neutral-300 dark:border-neutral-600 text-xs">Shift + ?</kbd> para ver todos los atajos de teclado.
                    </p>
                </div>
            </motion.div>

            {/* Feature Sections */}
            <div className="space-y-8">
                {/* 1. Dashboard Personalizable */}
                <section className="space-y-4">
                    <div className="flex items-center justify-between">
                        <div>
                            <h2 className="text-2xl font-bold flex items-center gap-2">
                                <LayoutGrid className="w-6 h-6" />
                                Dashboard Personalizable
                            </h2>
                            <p className="text-sm text-muted-foreground">
                                Arrastra y reorganiza los widgets como quieras
                            </p>
                        </div>
                        <div className="flex items-center gap-2">
                            <button
                                type="button"
                                onClick={toggleLayout}
                                className="flex items-center gap-2 px-3 py-2 rounded-lg border border-neutral-200 dark:border-neutral-700 hover:bg-neutral-50 dark:hover:bg-neutral-800 transition-colors text-sm"
                            >
                                <LayoutGrid className="w-4 h-4" />
                                {config.layout === 'grid' ? 'Grid' : 'Masonry'}
                            </button>
                            <button
                                type="button"
                                onClick={toggleCompactMode}
                                className="flex items-center gap-2 px-3 py-2 rounded-lg border border-neutral-200 dark:border-neutral-700 hover:bg-neutral-50 dark:hover:bg-neutral-800 transition-colors text-sm"
                            >
                                <Maximize2 className="w-4 h-4" />
                                {config.compactMode ? 'Compact' : 'Normal'}
                            </button>
                        </div>
                    </div>
                    <DashboardGrid />
                </section>

                {/* 2. Componentes UI Animados */}
                <section className="space-y-4">
                    <h2 className="text-2xl font-bold flex items-center gap-2">
                        <Sparkles className="w-6 h-6" />
                        Componentes UI con Animaciones
                    </h2>

                    <div className="grid gap-4 md:grid-cols-2">
                        {/* Animated Number */}
                        <div className="p-6 bg-white dark:bg-neutral-800 rounded-xl border border-neutral-200 dark:border-neutral-700">
                            <h3 className="font-semibold mb-2">Animated Number</h3>
                            <p className="text-sm text-muted-foreground mb-4">Números con animación suave</p>
                            <AnimatedNumber value={demoAmount} currency="USD" className="text-4xl font-bold" />
                            <div className="mt-4">
                                <button
                                    type="button"
                                    onClick={() => setDemoAmount(Math.random() * 10000)}
                                    className="px-4 py-2 bg-primary-500 text-white rounded-lg text-sm hover:bg-primary-600 transition-colors"
                                >
                                    Cambiar Valor
                                </button>
                            </div>
                        </div>

                        {/* Progress Bar */}
                        <div className="p-6 bg-white dark:bg-neutral-800 rounded-xl border border-neutral-200 dark:border-neutral-700">
                            <h3 className="font-semibold mb-2">Progress Bar Auto-Color</h3>
                            <p className="text-sm text-muted-foreground mb-4">Se colorea según el porcentaje</p>
                            <div className="space-y-4">
                                <ProgressBar current={450} total={1000} showLabel />
                                <ProgressBar current={850} total={1000} showLabel />
                                <ProgressBar current={1050} total={1000} showLabel />
                            </div>
                        </div>

                        {/* Amount Input with Calculator */}
                        <div className="p-6 bg-white dark:bg-neutral-800 rounded-xl border border-neutral-200 dark:border-neutral-700">
                            <h3 className="font-semibold mb-2 flex items-center gap-2">
                                <Calculator className="w-5 h-5" />
                                Calculadora Integrada
                            </h3>
                            <p className="text-sm text-muted-foreground mb-4">Input con calculadora incorporada</p>
                            <AmountInput
                                value={demoAmountInput}
                                onChange={setDemoAmountInput}
                                placeholder="Ej: 100+50*2"
                            />
                            <p className="text-xs text-muted-foreground mt-2">
                                Prueba escribir: 100+50*2-25
                            </p>
                        </div>

                        {/* Currency Selector */}
                        <div className="p-6 bg-white dark:bg-neutral-800 rounded-xl border border-neutral-200 dark:border-neutral-700">
                            <h3 className="font-semibold mb-2 flex items-center gap-2">
                                <DollarSign className="w-5 h-5" />
                                Selector de Moneda
                            </h3>
                            <p className="text-sm text-muted-foreground mb-4">Con búsqueda integrada</p>
                            <CurrencySelector
                                value={demoCurrency}
                                onChange={setDemoCurrency}
                            />
                        </div>
                    </div>
                </section>

                {/* 3. Smart Categorization */}
                <section className="space-y-4">
                    <h2 className="text-2xl font-bold flex items-center gap-2">
                        <Sparkles className="w-6 h-6" />
                        Categorización Inteligente con IA
                    </h2>

                    <div className="p-6 bg-white dark:bg-neutral-800 rounded-xl border border-neutral-200 dark:border-neutral-700">
                        <h3 className="font-semibold mb-2">Smart Category Selector</h3>
                        <p className="text-sm text-muted-foreground mb-4">
                            Escribe una descripción y la IA sugerirá categorías basadas en aprendizaje previo
                        </p>

                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium mb-2">Descripción</label>
                                <input
                                    type="text"
                                    value={demoDescription}
                                    onChange={(e) => setDemoDescription(e.target.value)}
                                    placeholder="Ej: Uber a casa, Compra en Walmart, Netflix mensual..."
                                    className="w-full px-3 py-2 rounded-lg border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-900"
                                />
                            </div>

                            <SmartCategorySelector
                                description={demoDescription}
                                selectedCategoryId={demoCategoryId}
                                onSelectCategory={setDemoCategoryId}
                            />
                        </div>
                    </div>
                </section>

                {/* 4. Advanced Filters */}
                <section className="space-y-4">
                    <h2 className="text-2xl font-bold flex items-center gap-2">
                        <Filter className="w-6 h-6" />
                        Filtros Avanzados
                    </h2>

                    <div className="p-6 bg-white dark:bg-neutral-800 rounded-xl border border-neutral-200 dark:border-neutral-700">
                        <TransactionFilters />
                    </div>
                </section>

                {/* 5. Keyboard Shortcuts */}
                <section className="space-y-4">
                    <h2 className="text-2xl font-bold flex items-center gap-2">
                        <Keyboard className="w-6 h-6" />
                        Atajos de Teclado
                    </h2>

                    <div className="p-6 bg-white dark:bg-neutral-800 rounded-xl border border-neutral-200 dark:border-neutral-700">
                        <p className="text-sm text-muted-foreground mb-4">
                            Navega rápidamente por la aplicación usando el teclado
                        </p>
                        <button
                            type="button"
                            onClick={() => setShowShortcuts(true)}
                            className="px-4 py-2 bg-primary-500 text-white rounded-lg hover:bg-primary-600 transition-colors"
                        >
                            Ver Todos los Atajos
                        </button>
                    </div>
                </section>
            </div>

            {/* Keyboard Shortcuts Dialog */}
            <KeyboardShortcutsDialog
                isOpen={showShortcuts}
                onClose={() => setShowShortcuts(false)}
                shortcuts={shortcuts}
            />
        </div>
    )
}
