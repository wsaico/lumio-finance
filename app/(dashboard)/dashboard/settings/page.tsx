"use client"

import {
    LayoutDashboard,
    CreditCard,
    Tags,
    Coins,
    Calculator,
    Smartphone,
    Monitor,
    Star,
    Type,
    Zap,
    Regex,
    Eye,
    CheckCircle2,
    Calendar,
    ListPlus,
    Scale,
    Key,
    DollarSign,
    CaseSensitive,
    FileType,
    PenTool,
    Wallet,
    Sparkles
} from "lucide-react"

import {
    SettingsSection,
    SettingsRow,
    SettingsSelect,
    SettingsSwitch
} from "@/components/settings/settings-components"

import { useSettingsStore } from "@/hooks/use-settings-store"
import { useRouter } from "next/navigation"
import { useTheme } from "next-themes"
import { Palette } from "lucide-react"

import { BudgetingMethod } from "@/types/budget-methodology"
import { useState, useEffect } from "react"

export default function SettingsPage() {
    const router = useRouter()
    const store = useSettingsStore()
    const { theme, setTheme } = useTheme()

    // Server State for Budget Method
    const [budgetMethod, setBudgetMethod] = useState<BudgetingMethod | null>(null)
    const [loadingMethod, setLoadingMethod] = useState(false)

    useEffect(() => {
        fetch('/api/user/preferences')
            .then(res => res.json())
            .then(data => setBudgetMethod(data.budgeting_method))
            .catch(err => console.error(err))
    }, [])

    const handleMethodChange = async (newMethod: BudgetingMethod) => {
        try {
            setLoadingMethod(true)
            await fetch('/api/user/preferences', {
                method: 'PATCH',
                body: JSON.stringify({ budgeting_method: newMethod })
            })
            setBudgetMethod(newMethod)
            // Force refresh to update sidebar/layout based on new method
            router.refresh()
        } catch (error) {
            console.error(error)
        } finally {
            setLoadingMethod(false)
        }
    }

    return (
        <div className="container mx-auto max-w-2xl py-8 px-4 space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-20">

            {/* Header Title if needed, though usually in layout */}
            <div className="text-center mb-6">
                <h1 className="text-2xl font-bold">Más</h1>
            </div>

            {/* ESTILO */}
            <SettingsSection title="Estilo">
                <SettingsRow
                    icon={LayoutDashboard}
                    title="Altura del encabezado"
                    action={
                        <SettingsSelect
                            value={store.headerHeight}
                            onValueChange={(v: any) => store.setHeaderHeight(v)}
                            options={[
                                { label: "Largo", value: "large" },
                                { label: "Pequeño", value: "small" },
                            ]}
                        />
                    }
                />
                <SettingsRow
                    icon={Star}
                    title="Estilo de icono"
                    action={
                        <SettingsSelect
                            value={store.iconStyle}
                            onValueChange={(v: any) => store.setIconStyle(v)}
                            options={[
                                { label: "Redondeado", value: "rounded" },
                                { label: "Cuadrado", value: "square" },
                                { label: "Círculo", value: "circle" },
                            ]}
                        />
                    }
                />
                <SettingsRow
                    icon={Type}
                    title="Fuente"
                    action={
                        <SettingsSelect
                            value={store.font}
                            onValueChange={(v: any) => store.setFont(v)}
                            options={[
                                { label: "Por defecto", value: "default" },
                                { label: "Inter", value: "inter" },
                                { label: "Roboto", value: "roboto" },
                                { label: "Mono", value: "mono" },
                            ]}
                        />
                    }
                />
                <SettingsRow
                    icon={Zap}
                    title="Animaciones"
                    description="Deshabilitar las animaciones puede mejorar el rendimiento."
                    action={
                        <SettingsSelect
                            value={store.animations}
                            onValueChange={(v: any) => store.setAnimations(v)}
                            options={[
                                { label: "Todo", value: "all" },
                                { label: "Minimal", value: "minimal" },
                                { label: "Ninguna", value: "none" },
                            ]}
                        />
                    }
                />
                <SettingsRow
                    icon={Regex}
                    title="Animación de números"
                    action={
                        <SettingsSelect
                            value={store.numberAnimation}
                            onValueChange={(v: any) => store.setNumberAnimation(v)}
                            options={[
                                { label: "Contar hasta", value: "count" },
                                { label: "Instantáneo", value: "instant" },
                            ]}
                        />
                    }
                />
                <SettingsRow
                    icon={Eye}
                    title="Texto de alto contraste"
                    description="Aumentar el contraste del texto"
                    action={
                        <SettingsSwitch
                            checked={store.highContrast}
                            onCheckedChange={store.setHighContrast}
                        />
                    }
                />
                <SettingsRow
                    icon={Palette}
                    title="Tema"
                    action={
                        <SettingsSelect
                            value={theme || "system"}
                            onValueChange={(v) => setTheme(v)}
                            options={[
                                { label: "Sistema", value: "system" },
                                { label: "Claro", value: "light" },
                                { label: "Oscuro", value: "dark" },
                            ]}
                        />
                    }
                />
            </SettingsSection>

            {/* TRANSACCIONES */}
            <SettingsSection title="Transacciones">
                <SettingsRow
                    icon={CheckCircle2}
                    title="Transacciones de pago automático"
                    description="Mark Transacciones atrasadas como pagadas"
                    action={
                        <SettingsSwitch
                            checked={store.autoPayTransactions}
                            onCheckedChange={store.setAutoPayTransactions}
                        />
                    }
                />
                <SettingsRow
                    icon={Calendar}
                    title="Fecha de pago"
                    action={
                        <SettingsSelect
                            value={store.paymentDate}
                            onValueChange={(v: any) => store.setPaymentDate(v)}
                            options={[
                                { label: "Fecha actual", value: "actual" },
                                { label: "Fecha vencimiento", value: "due" },
                            ]}
                        />
                    }
                />
                <SettingsRow
                    icon={ListPlus}
                    title="Total de banner de fecha"
                    action={
                        <SettingsSelect
                            value={store.dateBannerTotal}
                            onValueChange={(v: any) => store.setDateBannerTotal(v)}
                            options={[
                                { label: "Total de un día", value: "day" },
                                { label: "Semana", value: "week" },
                                { label: "Mes", value: "month" },
                                { label: "Ocultar", value: "none" },
                            ]}
                        />
                    }
                />
                <SettingsRow
                    icon={Scale}
                    title="Resumen de gastos mensuales"
                    description="Banner de las transacciones de cashflow"
                    action={
                        <SettingsSwitch
                            checked={store.monthlySummary}
                            onCheckedChange={store.setMonthlySummary}
                        />
                    }
                />
            </SettingsSection>

            {/* CUENTAS */}
            <SettingsSection title="Cuentas">
                <SettingsRow
                    icon={Key} // Or Label tag icon
                    title="Etiqueta de cuenta"
                    description="Agregar etiqueta de cuenta para todas las transacciones"
                    action={
                        <SettingsSwitch
                            checked={store.showAccountLabel}
                            onCheckedChange={store.setShowAccountLabel}
                        />
                    }
                />
                <SettingsRow
                    icon={Coins}
                    title="Tipos de cambio"
                    description="Ver tasas de cambio actuales"
                    onClick={() => router.push('/dashboard/settings/exchange-rates')}
                />
                <SettingsRow
                    icon={DollarSign}
                    title="Moneda primaria"
                    action={
                        <div className="flex items-center gap-2" onClick={() => router.push('/dashboard/settings/currency')}>
                            <span className="bg-muted px-2 py-1 rounded text-xs font-bold">PEN</span>
                        </div>
                    }
                    onClick={() => router.push('/dashboard/settings/currency')}
                />
            </SettingsSection>

            {/* PRESUPUESTOS Y OBJETIVOS */}
            <SettingsSection title="Estrategia de Presupuesto">
                <SettingsRow
                    icon={Sparkles}
                    title="Metodología"
                    description={budgetMethod === '50_30_20'
                        ? 'Regla 50/30/20 (Necesidades / Deseos / Ahorro)'
                        : 'Estilo Libre (Categorías Personalizadas)'
                    }
                    action={
                        <SettingsSelect
                            value={budgetMethod || 'TRADITIONAL'}
                            onValueChange={(v) => handleMethodChange(v as BudgetingMethod)}
                            options={[
                                { label: "Estilo Libre", value: "TRADITIONAL" },
                                { label: "Regla 50/30/20", value: "50_30_20" },
                            ]}
                            disabled={loadingMethod}
                        />
                    }
                />
            </SettingsSection>

            <SettingsSection title="Opciones Avanzadas">
                <SettingsRow
                    icon={Calculator}
                    title="Tipo total presupuestario"
                    description={store.budgetTotalType === 'remaining' ? 'Total restante' : 'Total gastado'}
                    action={
                        <SettingsSelect // Simplified for demo, ideally a custom modal picker as per screenshot
                            value={store.budgetTotalType}
                            onValueChange={(v: any) => store.setBudgetTotalType(v)}
                            options={[
                                { label: "Total Restante", value: "remaining" },
                                { label: "Total Gastado", value: "spent" },
                            ]}
                        />
                    }
                />

                <SettingsRow
                    icon={Calculator}
                    title="Tipo total de objetivos"
                    description={store.goalTotalType === 'remaining' ? 'Total restante' : 'Total guardado'}
                    action={
                        <SettingsSelect
                            value={store.goalTotalType}
                            onValueChange={(v: any) => store.setGoalTotalType(v)}
                            options={[
                                { label: "Total Restante", value: "remaining" },
                                { label: "Total Guardado", value: "saved" },
                            ]}
                        />
                    }
                />
            </SettingsSection>

            {/* TÍTULOS */}
            <SettingsSection title="Títulos">
                <SettingsRow
                    icon={CaseSensitive}
                    title="Solicitar el título de la transacción"
                    description="Al agregar una transacción"
                    action={
                        <SettingsSwitch
                            checked={store.promptTransactionTitle}
                            onCheckedChange={store.setPromptTransactionTitle}
                        />
                    }
                />
                <SettingsRow
                    icon={FileType}
                    title="Agregar títulos automáticamente"
                    description="Cuando se crea una transacción"
                    action={
                        <SettingsSwitch
                            checked={store.autoTitles}
                            onCheckedChange={store.setAutoTitles}
                        />
                    }
                />
            </SettingsSection>

            {/* DANDO FORMATO */}
            <SettingsSection title="Dando formato">
                <SettingsRow
                    icon={PenTool}
                    title="Formato numérico"
                    action={
                        <SettingsSelect
                            value={store.numberFormat}
                            onValueChange={(v: any) => store.setNumberFormat(v)}
                            placeholder="Seleccionar"
                            options={[
                                { label: "S/. 1,234.56", value: "S/. 1,234.56" },
                                { label: "S/. 1.234,56", value: "S/. 1.234,56" },
                                { label: "1,234.56 S/.", value: "1,234.56 S/." },
                            ]}
                        />
                    }
                />
            </SettingsSection>

            {/* LINKS DIRECTOS IMPORTANTES (GENERAL) */}
            <SettingsSection title="General">
                <SettingsRow
                    icon={Tags}
                    title="Administrar Categorías"
                    description="Crear, editar y eliminar categorías"
                    onClick={() => router.push('/dashboard/settings/categories')}
                />
                <SettingsRow
                    icon={Monitor}
                    title="Pantalla Principal"
                    description="Configurar widgets"
                    onClick={() => router.push('/dashboard/settings/home')}
                />
            </SettingsSection>

            {/* CAJA CHICA */}
            <SettingsSection title="Caja Chica">
                <SettingsRow
                    icon={Wallet}
                    title="Modo Simple"
                    description="Deshabilita el flujo de aprobación de gastos"
                    action={
                        <SettingsSwitch
                            checked={store.pettyCashSimpleMode}
                            onCheckedChange={store.setPettyCashSimpleMode}
                        />
                    }
                />
                <SettingsRow
                    icon={Sparkles}
                    title="Escaneo Inteligente (IA) - Experimental"
                    description="Permite subir fotos/PDFs y extraer datos automáticamente con Gemini"
                    action={
                        <SettingsSwitch
                            checked={store.enableAIReceiptScanning}
                            onCheckedChange={store.setEnableAIReceiptScanning}
                        />
                    }
                />
                <SettingsRow
                    icon={LayoutDashboard}
                    title="Mostrar en Dashboard"
                    description="Muestra indicadores de caja chica (Saldo/Pendientes) en el panel principal"
                    action={
                        <SettingsSwitch
                            checked={store.showPettyCashIndicators}
                            onCheckedChange={store.setShowPettyCashIndicators}
                        />
                    }
                />
            </SettingsSection>

            <div className="text-center text-xs text-muted-foreground/30 mt-12 mb-4">
                Lumio Finance v1.0.0
            </div>
        </div>
    )
}
