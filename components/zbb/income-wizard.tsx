"use client"

import { useState, useEffect } from "react"
import { useSWRConfig } from "swr"
import { Play, Plus, Trash2, Calculator, Sparkles, Copy, History } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { toast } from "sonner"
import { format } from "date-fns"
import { es } from "date-fns/locale"
import { useFormat } from "@/hooks/useFormat"
import { useSettingsStore } from "@/hooks/useSettingsStore"
import { toLocalDateString } from "@/lib/loans"
import { cn } from "@/lib/utils"

interface IncomeSource {
    id: string
    name: string
    amount: string
    currency: "PEN" | "USD"
}

export interface PlanningSuggestions {
    previousCycle?: { id: string; cycle_name: string; period_start?: string } | null
    suggestedIncomePEN?: number
    suggestedIncomeUSD?: number
}

interface IncomeWizardProps {
    existingData?: {
        cycleId: string
        sources: IncomeSource[]
    }
    suggestions?: PlanningSuggestions
    onSuccess?: () => void
}

type AutoFillMode = "blank" | "previous_cycle" | "previous_spending"

export function IncomeWizard({ existingData, suggestions, onSuccess }: IncomeWizardProps) {
    const [open, setOpen] = useState(false)
    const [isLoading, setIsLoading] = useState(false)
    const [autoFillFrom, setAutoFillFrom] = useState<AutoFillMode>("blank")
    const { mutate } = useSWRConfig()
    const { formatMoney } = useFormat()
    const { currencyCode } = useSettingsStore()

    const defaultCurrency: "PEN" | "USD" = currencyCode === "USD" ? "USD" : "PEN"
    const now = new Date()
    const currentMonthRaw = format(now, "MMMM yyyy", { locale: es })
    const currentMonthName = currentMonthRaw.charAt(0).toUpperCase() + currentMonthRaw.slice(1)

    const [sources, setSources] = useState<IncomeSource[]>(
        existingData?.sources?.length
            ? existingData.sources
            : [{ id: "1", name: "Sueldo Principal", amount: "", currency: defaultCurrency }]
    )

    useEffect(() => {
        if (open) {
            if (existingData?.sources?.length) {
                setSources(existingData.sources)
            } else {
                setSources([{ id: "1", name: "Sueldo Principal", amount: "", currency: defaultCurrency }])
            }
            setAutoFillFrom(suggestions?.previousCycle ? "previous_cycle" : "blank")
        }
    }, [open, existingData, defaultCurrency, suggestions?.previousCycle])

    const totalPEN = sources
        .filter((s) => s.currency === "PEN")
        .reduce((sum, s) => sum + (parseFloat(s.amount) || 0), 0)

    const totalUSD = sources
        .filter((s) => s.currency === "USD")
        .reduce((sum, s) => sum + (parseFloat(s.amount) || 0), 0)

    const addSource = () => {
        setSources([
            ...sources,
            {
                id: crypto.randomUUID(),
                name: "",
                amount: "",
                currency: defaultCurrency,
            },
        ])
    }

    const removeSource = (id: string) => {
        setSources(sources.filter((s) => s.id !== id))
    }

    const updateSource = (id: string, field: keyof IncomeSource, value: string) => {
        setSources(sources.map((s) => (s.id === id ? { ...s, [field]: value } : s)))
    }

    const applySuggestedIncome = () => {
        const next: IncomeSource[] = []
        if ((suggestions?.suggestedIncomePEN || 0) > 0) {
            next.push({
                id: crypto.randomUUID(),
                name: "Ingresos mes anterior (PEN)",
                amount: String(suggestions!.suggestedIncomePEN),
                currency: "PEN",
            })
        }
        if ((suggestions?.suggestedIncomeUSD || 0) > 0) {
            next.push({
                id: crypto.randomUUID(),
                name: "Ingresos mes anterior (USD)",
                amount: String(suggestions!.suggestedIncomeUSD),
                currency: "USD",
            })
        }
        if (next.length > 0) {
            setSources(next)
            toast.success("Ingresos del mes anterior cargados")
        }
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        if (totalPEN <= 0 && totalUSD <= 0) {
            toast.error("Ingresa al menos un monto mayor a 0")
            return
        }

        setIsLoading(true)
        try {
            const isUpdate = !!existingData?.cycleId
            const periodStart = toLocalDateString(new Date(now.getFullYear(), now.getMonth(), 1))
            const periodEnd = toLocalDateString(new Date(now.getFullYear(), now.getMonth() + 1, 0))

            const payload = {
                id: existingData?.cycleId,
                incomeUSD: Math.round(totalUSD * 100) / 100,
                incomePEN: Math.round(totalPEN * 100) / 100,
                incomeBreakdown: sources.filter((s) => s.name.trim() && parseFloat(s.amount) > 0),
                autoFillFrom: !isUpdate && autoFillFrom !== "blank" ? autoFillFrom : undefined,
                period: isUpdate
                    ? undefined
                    : {
                          start: periodStart,
                          end: periodEnd,
                          name: currentMonthName,
                      },
            }

            const res = await fetch("/api/zbb/planning-cycle", {
                method: isUpdate ? "PUT" : "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload),
            })

            const data = await res.json()
            if (!res.ok) throw new Error(data.error || "Error al guardar")

            toast.success(isUpdate ? "Ingresos actualizados" : "¡Planificación iniciada!", {
                description: [
                    totalPEN > 0 ? formatMoney(totalPEN, "PEN") : null,
                    totalUSD > 0 ? formatMoney(totalUSD, "USD") : null,
                ]
                    .filter(Boolean)
                    .join(" · "),
            })

            setOpen(false)
            mutate("/api/zbb/planning-cycle")
            mutate("/api/zbb/planning-cycle?history=true")
            onSuccess?.()
        } catch (error: any) {
            toast.error(error.message || "Error al guardar ingresos")
        } finally {
            setIsLoading(false)
        }
    }

    const hasSuggestedIncome =
        !existingData &&
        ((suggestions?.suggestedIncomePEN || 0) > 0 || (suggestions?.suggestedIncomeUSD || 0) > 0)

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                {existingData ? (
                    <Button
                        variant="outline"
                        size="sm"
                        className="h-9 border-dashed rounded-full px-4 hover:bg-muted bg-card text-xs font-bold"
                    >
                        <Plus className="w-3.5 h-3.5 mr-1.5" /> Editar Ingresos
                    </Button>
                ) : (
                    <Button
                        size="lg"
                        className="rounded-full px-7 bg-primary hover:bg-primary/90 text-primary-foreground font-extrabold text-sm h-12 shadow-xl shadow-primary/25 transition-all gap-2"
                    >
                        <Play className="w-4 h-4 fill-current" />
                        Iniciar Planificación de {currentMonthName}
                    </Button>
                )}
            </DialogTrigger>

            <DialogContent className="sm:max-w-[580px] p-0 overflow-hidden flex flex-col max-h-[90dvh] bg-card border border-border/60 rounded-3xl shadow-2xl">
                <DialogHeader className="px-6 pt-6 pb-4 border-b border-border/50 shrink-0">
                    <DialogTitle className="text-xl font-black flex items-center gap-2.5 text-foreground">
                        <span className="h-9 w-9 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
                            <Calculator className="w-5 h-5" />
                        </span>
                        {existingData ? "Editar Ingresos del Ciclo" : `Planificar ${currentMonthName}`}
                    </DialogTitle>
                    <DialogDescription className="text-xs sm:text-sm">
                        {existingData
                            ? "Ajusta tus fuentes de ingreso esperadas. Tu pool disponible se recalculará al instante."
                            : "Registra cuánto dinero esperas recibir este mes para darle un propósito al 100%."}
                    </DialogDescription>
                </DialogHeader>

                <form
                    onSubmit={handleSubmit}
                    className="flex-1 overflow-y-auto px-6 py-4 space-y-5 custom-scrollbar"
                >
                    {/* Smart Income Import Banner */}
                    {hasSuggestedIncome && (
                        <div className="rounded-2xl bg-primary/8 border border-primary/20 p-3.5 flex items-center justify-between gap-3">
                            <div className="min-w-0">
                                <p className="text-xs font-extrabold text-primary flex items-center gap-1.5">
                                    <Sparkles className="h-3.5 w-3.5" />
                                    Ingresos reales del mes pasado
                                </p>
                                <p className="text-[11px] text-muted-foreground mt-0.5 tabular-nums">
                                    {[
                                        (suggestions?.suggestedIncomePEN || 0) > 0
                                            ? formatMoney(suggestions!.suggestedIncomePEN!, "PEN")
                                            : null,
                                        (suggestions?.suggestedIncomeUSD || 0) > 0
                                            ? formatMoney(suggestions!.suggestedIncomeUSD!, "USD")
                                            : null,
                                    ]
                                        .filter(Boolean)
                                        .join(" · ")}
                                </p>
                            </div>
                            <Button
                                type="button"
                                size="sm"
                                variant="secondary"
                                onClick={applySuggestedIncome}
                                className="rounded-full text-xs font-bold shrink-0"
                            >
                                Importar
                            </Button>
                        </div>
                    )}

                    {/* Income Sources List */}
                    <div className="space-y-3">
                        {sources.map((source, index) => (
                            <div key={source.id} className="flex gap-2 items-end">
                                <div className="flex-1 space-y-1 min-w-0">
                                    {index === 0 && (
                                        <Label className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                                            Fuente de Ingreso
                                        </Label>
                                    )}
                                    <Input
                                        placeholder="Ej. Sueldo, Freelance, Bono..."
                                        value={source.name}
                                        onChange={(e) => updateSource(source.id, "name", e.target.value)}
                                        className="h-11 rounded-xl bg-muted/40"
                                        required
                                    />
                                </div>
                                <div className="w-24 space-y-1 shrink-0">
                                    {index === 0 && (
                                        <Label className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                                            Moneda
                                        </Label>
                                    )}
                                    <Select
                                        value={source.currency}
                                        onValueChange={(val: "PEN" | "USD") =>
                                            updateSource(source.id, "currency", val)
                                        }
                                    >
                                        <SelectTrigger className="h-11 rounded-xl bg-muted/40">
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="PEN">PEN</SelectItem>
                                            <SelectItem value="USD">USD</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="w-28 sm:w-32 space-y-1 shrink-0">
                                    {index === 0 && (
                                        <Label className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                                            Monto
                                        </Label>
                                    )}
                                    <Input
                                        type="number"
                                        step="0.01"
                                        min="0"
                                        placeholder="0.00"
                                        value={source.amount}
                                        onChange={(e) => updateSource(source.id, "amount", e.target.value)}
                                        className="h-11 rounded-xl bg-muted/40 font-bold tabular-nums"
                                        required
                                    />
                                </div>
                                <Button
                                    type="button"
                                    variant="ghost"
                                    size="icon"
                                    onClick={() => removeSource(source.id)}
                                    disabled={sources.length === 1}
                                    aria-label="Quitar fuente"
                                    className="h-11 w-10 shrink-0 rounded-xl text-muted-foreground hover:text-rose-500"
                                >
                                    <Trash2 className="w-4 h-4" />
                                </Button>
                            </div>
                        ))}
                    </div>

                    <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={addSource}
                        className="w-full h-10 rounded-xl border-dashed font-bold text-xs"
                    >
                        <Plus className="w-3.5 h-3.5 mr-1.5" /> Agregar otra fuente de ingreso
                    </Button>

                    {/* Auto-fill Starting Template (Only when creating a new cycle) */}
                    {!existingData && (
                        <div className="space-y-2 pt-2 border-t border-border/50">
                            <Label className="text-[11px] font-extrabold uppercase tracking-wider text-muted-foreground">
                                ¿Cómo quieres iniciar tus partidas?
                            </Label>
                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                                <button
                                    type="button"
                                    onClick={() => setAutoFillFrom("blank")}
                                    className={cn(
                                        "p-3 rounded-xl border text-left transition-all",
                                        autoFillFrom === "blank"
                                            ? "border-primary bg-primary/8"
                                            : "border-border bg-muted/25 hover:bg-muted/50"
                                    )}
                                >
                                    <Sparkles className="h-4 w-4 text-primary mb-1" />
                                    <p className="text-xs font-extrabold text-foreground">Desde cero</p>
                                    <p className="text-[10px] text-muted-foreground mt-0.5">
                                        Elige cada categoría manualmente
                                    </p>
                                </button>

                                {suggestions?.previousCycle && (
                                    <button
                                        type="button"
                                        onClick={() => setAutoFillFrom("previous_cycle")}
                                        className={cn(
                                            "p-3 rounded-xl border text-left transition-all",
                                            autoFillFrom === "previous_cycle"
                                                ? "border-primary bg-primary/8"
                                                : "border-border bg-muted/25 hover:bg-muted/50"
                                        )}
                                    >
                                        <Copy className="h-4 w-4 text-indigo-500 mb-1" />
                                        <p className="text-xs font-extrabold text-foreground">
                                            Copiar plan previo
                                        </p>
                                        <p className="text-[10px] text-muted-foreground mt-0.5 truncate">
                                            De {suggestions.previousCycle.cycle_name}
                                        </p>
                                    </button>
                                )}

                                <button
                                    type="button"
                                    onClick={() => setAutoFillFrom("previous_spending")}
                                    className={cn(
                                        "p-3 rounded-xl border text-left transition-all",
                                        autoFillFrom === "previous_spending"
                                            ? "border-primary bg-primary/8"
                                            : "border-border bg-muted/25 hover:bg-muted/50"
                                    )}
                                >
                                    <History className="h-4 w-4 text-emerald-500 mb-1" />
                                    <p className="text-xs font-extrabold text-foreground">
                                        Según gastos reales
                                    </p>
                                    <p className="text-[10px] text-muted-foreground mt-0.5">
                                        Usa tu historial del mes pasado
                                    </p>
                                </button>
                            </div>
                        </div>
                    )}
                </form>

                {/* Footer */}
                <div className="border-t border-border/60 bg-muted/30 px-6 py-4 space-y-3 shrink-0">
                    <div className="flex justify-between items-center text-sm">
                        <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                            Total del Pool
                        </span>
                        <div className="flex gap-3 font-black tabular-nums">
                            {totalPEN > 0 && (
                                <span className="text-foreground">{formatMoney(totalPEN, "PEN")}</span>
                            )}
                            {totalUSD > 0 && (
                                <span className="text-emerald-600 dark:text-emerald-400">
                                    {formatMoney(totalUSD, "USD")}
                                </span>
                            )}
                            {totalPEN === 0 && totalUSD === 0 && (
                                <span className="text-muted-foreground">--</span>
                            )}
                        </div>
                    </div>

                    <Button
                        type="button"
                        onClick={handleSubmit}
                        disabled={isLoading || (totalPEN <= 0 && totalUSD <= 0)}
                        className="w-full h-11 rounded-xl font-extrabold bg-primary hover:bg-primary/90 text-primary-foreground shadow-lg shadow-primary/20"
                    >
                        {isLoading
                            ? "Guardando..."
                            : existingData
                              ? "Actualizar Ingresos"
                              : "Confirmar y Empezar Plan"}
                    </Button>
                </div>
            </DialogContent>
        </Dialog>
    )
}
