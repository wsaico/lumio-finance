"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { useQuery } from "@tanstack/react-query"
import {
    FileSpreadsheet,
    FileText,
    FileCode2,
    Download,
    Loader2,
    Calendar,
    Wallet,
    ArrowRightLeft,
    PieChart,
    PiggyBank,
    HandCoins,
    CheckCircle2,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { PremiumDatePicker } from "@/components/ui/premium-date-picker"
import { useSettingsStore } from "@/hooks/useSettingsStore"
import { useFormat } from "@/hooks/useFormat"
import { DEFAULT_CURRENCY } from "@/lib/currencies"
import { toLocalDateString } from "@/lib/loans"
import { cn } from "@/lib/utils"
import { PremiumPreviewGate } from "@/components/billing/premium-preview-gate"
import { showAppToast } from "@/components/ui/app-alert-toast"

type ExportPeriod =
    | "this_month"
    | "last_month"
    | "last_3_months"
    | "this_year"
    | "all"
    | "custom"

const PERIOD_OPTIONS: { id: ExportPeriod; label: string }[] = [
    { id: "this_month", label: "Este mes" },
    { id: "last_month", label: "Mes pasado" },
    { id: "last_3_months", label: "Últimos 3 meses" },
    { id: "this_year", label: "Este año" },
    { id: "all", label: "Todo el historial" },
    { id: "custom", label: "Personalizado" },
]

export default function ReportsPage() {
    const router = useRouter()
    const { currencyCode, isBalanceVisible } = useSettingsStore()
    const { formatMoney } = useFormat()
    const baseCurrency = currencyCode || DEFAULT_CURRENCY

    const now = new Date()
    const firstOfMonth = toLocalDateString(new Date(now.getFullYear(), now.getMonth(), 1))
    const todayStr = toLocalDateString(now)

    const [period, setPeriod] = useState<ExportPeriod>("this_month")
    const [fromDate, setFromDate] = useState<string>(firstOfMonth)
    const [toDate, setToDate] = useState<string>(todayStr)
    const [downloading, setDownloading] = useState<"excel" | "pdf" | "csv" | null>(null)

    const money = (v: number) => (isBalanceVisible ? formatMoney(Number(v || 0)) : "••••••")

    const { data: preview, isLoading: previewLoading } = useQuery({
        queryKey: ["reports-export-preview", period, fromDate, toDate, baseCurrency],
        queryFn: async () => {
            const params = new URLSearchParams({
                format: "preview",
                period,
                currency: baseCurrency,
            })
            if (period === "custom") {
                params.set("from", fromDate)
                params.set("to", toDate)
            }
            const res = await fetch(`/api/reports/export?${params.toString()}`)
            if (!res.ok) return null
            return res.json()
        },
    })

    const handleDownload = async (format: "excel" | "pdf" | "csv") => {
        if (period === "custom" && fromDate > toDate) {
            showAppToast.warning({
                title: "Rango de fechas inválido",
                description: "La fecha inicial no puede ser mayor a la fecha final.",
            })
            return
        }

        setDownloading(format)

        try {
            const params = new URLSearchParams({
                format,
                period,
                currency: baseCurrency,
            })
            if (period === "custom") {
                params.set("from", fromDate)
                params.set("to", toDate)
            }

            const res = await fetch(`/api/reports/export?${params.toString()}`)
            if (res.status === 403) {
                showAppToast.premium({
                    title: "Función disponible en Plan Premium",
                    description:
                        "Actualiza a Premium para descargar reportes completos en Excel, PDF y CSV.",
                    actionLabel: "Ver planes",
                    onAction: () => router.push("/dashboard/billing"),
                })
                return
            }
            if (!res.ok) {
                const err = await res.json().catch(() => ({}))
                throw new Error(err.error || "No se pudo descargar el reporte")
            }

            const blob = await res.blob()
            const downloadUrl = window.URL.createObjectURL(blob)
            const a = document.createElement("a")
            const ext = format === "pdf" ? "pdf" : format === "csv" ? "csv" : "xlsx"
            const stamp = toLocalDateString(new Date())
            a.href = downloadUrl
            a.download = `Lumio-Reporte-${stamp}.${ext}`
            document.body.appendChild(a)
            a.click()
            a.remove()
            window.URL.revokeObjectURL(downloadUrl)

            showAppToast.success({
                title:
                    format === "pdf"
                        ? "Reporte PDF descargado"
                        : format === "csv"
                          ? "Archivo CSV descargado"
                          : "Libro Excel descargado",
                description: `Se exportó el periodo "${preview?.periodLabel || "seleccionado"}" en ${baseCurrency}.`,
            })
        } catch (err: any) {
            showAppToast.error({
                title: "No se pudo generar el archivo",
                description: err?.message || "Intenta nuevamente en unos segundos.",
            })
        } finally {
            setDownloading(null)
        }
    }

    return (
        <PremiumPreviewGate moduleName="Reportes Descargables">
            <div className="max-w-5xl mx-auto space-y-6 animate-in fade-in duration-300 pb-20">
                {/* Header */}
                <div className="space-y-1">
                    <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-foreground">
                        Reportes y Exportación
                    </h1>
                    <p className="text-sm text-muted-foreground">
                        Exporta toda tu contabilidad personal en español (cuentas, movimientos, presupuestos, metas y préstamos) valorizada en {baseCurrency}.
                    </p>
                </div>

                {/* Period Selector */}
                <Card className="p-5 bg-card border-border/60 rounded-3xl shadow-sm space-y-4">
                    <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2 text-xs font-extrabold uppercase tracking-wider text-muted-foreground">
                            <Calendar className="h-3.5 w-3.5 text-primary" />
                            <span>1. Selecciona el Periodo de Movimientos</span>
                        </div>
                        {preview?.periodLabel && (
                            <span className="text-xs font-bold text-primary bg-primary/10 px-3 py-1 rounded-full">
                                {preview.periodLabel}
                            </span>
                        )}
                    </div>

                    <div className="flex flex-wrap gap-2">
                        {PERIOD_OPTIONS.map((opt) => {
                            const active = period === opt.id
                            return (
                                <button
                                    key={opt.id}
                                    type="button"
                                    onClick={() => setPeriod(opt.id)}
                                    className={cn(
                                        "px-4 py-2 rounded-full text-xs font-bold border transition-all cursor-pointer",
                                        active
                                            ? "bg-primary text-primary-foreground border-primary shadow-sm"
                                            : "bg-muted/30 text-muted-foreground border-border/60 hover:text-foreground hover:bg-muted/60"
                                    )}
                                >
                                    {opt.label}
                                </button>
                            )
                        })}
                    </div>

                    {period === "custom" && (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t border-border/50 animate-in fade-in duration-200">
                            <div className="space-y-1.5 min-w-0">
                                <label className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground ml-1 block">
                                    Desde
                                </label>
                                <PremiumDatePicker
                                    value={fromDate}
                                    onChange={(d) => setFromDate(toLocalDateString(d))}
                                    label="Desde"
                                    className="w-full"
                                />
                            </div>
                            <div className="space-y-1.5 min-w-0">
                                <label className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground ml-1 block">
                                    Hasta
                                </label>
                                <PremiumDatePicker
                                    value={toDate}
                                    onChange={(d) => setToDate(toLocalDateString(d))}
                                    label="Hasta"
                                    className="w-full"
                                />
                            </div>
                        </div>
                    )}
                </Card>

                {/* Live Summary Preview of What Will Be Exported */}
                <Card className="p-5 sm:p-6 bg-card border-border/60 rounded-3xl shadow-sm space-y-4">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                        <div className="flex items-center gap-2 text-xs font-extrabold uppercase tracking-wider text-muted-foreground">
                            <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                            <span>2. Vista Previa de Datos Incluidos en tu Reporte</span>
                        </div>
                        <span className="text-xs font-semibold text-muted-foreground">
                            Moneda de consolidación: <strong className="text-foreground">{baseCurrency}</strong>
                        </span>
                    </div>

                    {previewLoading ? (
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 animate-pulse">
                            {[1, 2, 3, 4].map((i) => (
                                <div key={i} className="h-20 rounded-2xl bg-muted/40" />
                            ))}
                        </div>
                    ) : (
                        <>
                            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                                <div className="rounded-2xl bg-muted/30 border border-border/60 p-3.5">
                                    <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                                        Patrimonio en Cuentas
                                    </span>
                                    <p className="text-lg font-black text-foreground tabular-nums mt-1">
                                        {money(preview?.totals?.netWorth || 0)}
                                    </p>
                                    <span className="text-[11px] text-muted-foreground">
                                        {preview?.counts?.accounts ?? 0} cuenta(s) activa(s)
                                    </span>
                                </div>

                                <div className="rounded-2xl bg-emerald-500/8 border border-emerald-500/20 p-3.5">
                                    <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
                                        Ingresos del Periodo
                                    </span>
                                    <p className="text-lg font-black text-emerald-600 dark:text-emerald-400 tabular-nums mt-1">
                                        {money(preview?.totals?.income || 0)}
                                    </p>
                                    <span className="text-[11px] text-muted-foreground">
                                        Consolidado en {baseCurrency}
                                    </span>
                                </div>

                                <div className="rounded-2xl bg-rose-500/8 border border-rose-500/20 p-3.5">
                                    <span className="text-[10px] font-bold uppercase tracking-wider text-rose-500">
                                        Gastos del Periodo
                                    </span>
                                    <p className="text-lg font-black text-rose-500 tabular-nums mt-1">
                                        {money(preview?.totals?.expenses || 0)}
                                    </p>
                                    <span className="text-[11px] text-muted-foreground">
                                        {preview?.counts?.categories ?? 0} categoría(s) con gasto
                                    </span>
                                </div>

                                <div className="rounded-2xl bg-primary/8 border border-primary/20 p-3.5">
                                    <span className="text-[10px] font-bold uppercase tracking-wider text-primary">
                                        Flujo Neto
                                    </span>
                                    <p className="text-lg font-black text-foreground tabular-nums mt-1">
                                        {(preview?.totals?.netCashflow || 0) > 0 ? "+" : ""}
                                        {money(preview?.totals?.netCashflow || 0)}
                                    </p>
                                    <span className="text-[11px] text-muted-foreground">
                                        {preview?.counts?.transactions ?? 0} movimiento(s) en rango
                                    </span>
                                </div>
                            </div>

                            {/* Module badges included */}
                            <div className="flex flex-wrap items-center gap-2 pt-1">
                                <span className="inline-flex items-center gap-1.5 rounded-full bg-muted/60 border border-border/60 px-3 py-1 text-xs font-bold text-foreground">
                                    <Wallet className="h-3.5 w-3.5 text-primary" />
                                    {preview?.counts?.accounts ?? 0} Cuentas y Tarjetas
                                </span>
                                <span className="inline-flex items-center gap-1.5 rounded-full bg-muted/60 border border-border/60 px-3 py-1 text-xs font-bold text-foreground">
                                    <ArrowRightLeft className="h-3.5 w-3.5 text-primary" />
                                    {preview?.counts?.transactions ?? 0} Movimientos
                                </span>
                                <span className="inline-flex items-center gap-1.5 rounded-full bg-muted/60 border border-border/60 px-3 py-1 text-xs font-bold text-foreground">
                                    <PieChart className="h-3.5 w-3.5 text-primary" />
                                    {preview?.counts?.budgets ?? 0} Presupuestos
                                </span>
                                <span className="inline-flex items-center gap-1.5 rounded-full bg-muted/60 border border-border/60 px-3 py-1 text-xs font-bold text-foreground">
                                    <PiggyBank className="h-3.5 w-3.5 text-primary" />
                                    {preview?.counts?.goals ?? 0} Metas de Ahorro
                                </span>
                                <span className="inline-flex items-center gap-1.5 rounded-full bg-muted/60 border border-border/60 px-3 py-1 text-xs font-bold text-foreground">
                                    <HandCoins className="h-3.5 w-3.5 text-primary" />
                                    {preview?.counts?.loans ?? 0} Préstamos y Deudas
                                </span>
                            </div>
                        </>
                    )}
                </Card>

                {/* Download Cards (Excel, PDF, CSV) */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {/* Excel */}
                    <Card className="p-6 bg-card border-border/60 rounded-3xl shadow-sm flex flex-col justify-between gap-5">
                        <div className="space-y-3">
                            <div className="h-12 w-12 rounded-2xl bg-emerald-500/12 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
                                <FileSpreadsheet className="h-6 w-6" />
                            </div>
                            <div>
                                <h2 className="text-base font-extrabold text-foreground">
                                    Libro Excel (.xlsx)
                                </h2>
                                <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                                    6 hojas con formato financiero en español: Resumen Ejecutivo, Cuentas y Tarjetas, Movimientos, Presupuestos, Metas de Ahorro y Préstamos.
                                </p>
                            </div>
                        </div>
                        <Button
                            type="button"
                            onClick={() => handleDownload("excel")}
                            disabled={downloading !== null}
                            className="w-full h-11 rounded-2xl font-bold bg-emerald-600 hover:bg-emerald-700 text-white shadow-md shadow-emerald-600/20 gap-2 cursor-pointer"
                        >
                            {downloading === "excel" ? (
                                <>
                                    <Loader2 className="h-4 w-4 animate-spin" />
                                    Preparando...
                                </>
                            ) : (
                                <>
                                    <Download className="h-4 w-4" />
                                    Descargar Excel
                                </>
                            )}
                        </Button>
                    </Card>

                    {/* PDF */}
                    <Card className="p-6 bg-card border-border/60 rounded-3xl shadow-sm flex flex-col justify-between gap-5">
                        <div className="space-y-3">
                            <div className="h-12 w-12 rounded-2xl bg-primary/12 text-primary flex items-center justify-center">
                                <FileText className="h-6 w-6" />
                            </div>
                            <div>
                                <h2 className="text-base font-extrabold text-foreground">
                                    Reporte PDF (.pdf)
                                </h2>
                                <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                                    Informe ejecutivo con tarjetas de indicadores, estado de cuentas, ejecución de presupuestos, metas, préstamos y movimientos numerados.
                                </p>
                            </div>
                        </div>
                        <Button
                            type="button"
                            onClick={() => handleDownload("pdf")}
                            disabled={downloading !== null}
                            className="w-full h-11 rounded-2xl font-bold bg-primary hover:bg-primary/90 text-primary-foreground shadow-md shadow-primary/20 gap-2 cursor-pointer"
                        >
                            {downloading === "pdf" ? (
                                <>
                                    <Loader2 className="h-4 w-4 animate-spin" />
                                    Preparando...
                                </>
                            ) : (
                                <>
                                    <Download className="h-4 w-4" />
                                    Descargar PDF
                                </>
                            )}
                        </Button>
                    </Card>

                    {/* CSV */}
                    <Card className="p-6 bg-card border-border/60 rounded-3xl shadow-sm flex flex-col justify-between gap-5">
                        <div className="space-y-3">
                            <div className="h-12 w-12 rounded-2xl bg-sky-500/12 text-sky-600 dark:text-sky-400 flex items-center justify-center">
                                <FileCode2 className="h-6 w-6" />
                            </div>
                            <div>
                                <h2 className="text-base font-extrabold text-foreground">
                                    Hoja CSV (.csv)
                                </h2>
                                <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                                    Tabla limpia en español con codificación UTF-8 lista para abrir directamente en Google Sheets, Excel o herramientas contables.
                                </p>
                            </div>
                        </div>
                        <Button
                            type="button"
                            variant="outline"
                            onClick={() => handleDownload("csv")}
                            disabled={downloading !== null}
                            className="w-full h-11 rounded-2xl font-bold border-border/80 hover:bg-muted gap-2 cursor-pointer"
                        >
                            {downloading === "csv" ? (
                                <>
                                    <Loader2 className="h-4 w-4 animate-spin" />
                                    Preparando...
                                </>
                            ) : (
                                <>
                                    <Download className="h-4 w-4" />
                                    Descargar CSV
                                </>
                            )}
                        </Button>
                    </Card>
                </div>
            </div>
        </PremiumPreviewGate>
    )
}
