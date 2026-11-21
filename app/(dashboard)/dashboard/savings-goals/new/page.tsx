"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { PremiumDatePicker } from "@/components/ui/premium-date-picker"
import { ArrowLeft, ArrowRight, Check, Target, Plane, Car, Home, GraduationCap, Heart, Wallet } from "lucide-react"
import { useCreateSavingsGoal } from "@/hooks/useSavingsGoals"
import { useAccounts } from "@/hooks/useAccounts"
import { useFormat } from "@/hooks/useFormat"
import { useSettingsStore } from "@/hooks/useSettingsStore"
import { getCurrencySymbol } from "@/lib/currencies"
import { cn, formatAccountPillName } from "@/lib/utils"
// @ts-ignore
import confetti from "canvas-confetti"

const GOAL_TEMPLATES = [
    {
        id: "emergency",
        name: "Fondo de Emergencia",
        icon: Target,
        color: "#ef4444",
        type: "EMERGENCY",
        priority: "HIGH",
        description: "Colchón para imprevistos",
        suggestedAmount: 10000,
        suggestedMonths: 12,
    },
    {
        id: "travel",
        name: "Vacaciones",
        icon: Plane,
        color: "#3b82f6",
        type: "TRAVEL",
        priority: "MEDIUM",
        description: "Tu próximo viaje soñado",
        suggestedAmount: 8000,
        suggestedMonths: 8,
    },
    {
        id: "car",
        name: "Vehículo",
        icon: Car,
        color: "#8b5cf6",
        type: "PURCHASE",
        priority: "MEDIUM",
        description: "Compra o inicial de auto",
        suggestedAmount: 30000,
        suggestedMonths: 24,
    },
    {
        id: "house",
        name: "Vivienda",
        icon: Home,
        color: "#10b981",
        type: "PURCHASE",
        priority: "HIGH",
        description: "Cuota inicial de casa",
        suggestedAmount: 80000,
        suggestedMonths: 36,
    },
    {
        id: "education",
        name: "Educación",
        icon: GraduationCap,
        color: "#f59e0b",
        type: "INVESTMENT",
        priority: "HIGH",
        description: "Maestría o especialización",
        suggestedAmount: 15000,
        suggestedMonths: 18,
    },
    {
        id: "custom",
        name: "Personalizada",
        icon: Heart,
        color: "#ec4899",
        type: "OTHER",
        priority: "MEDIUM",
        description: "Define tu propio objetivo",
        suggestedAmount: 5000,
        suggestedMonths: 6,
    },
] as const

const PRIORITIES = [
    { id: "HIGH", label: "Alta", activeClass: "bg-rose-500 text-white border-rose-500 shadow-rose-500/20" },
    { id: "MEDIUM", label: "Media", activeClass: "bg-primary text-primary-foreground border-primary shadow-primary/20" },
    { id: "LOW", label: "Baja", activeClass: "bg-emerald-600 text-white border-emerald-600 shadow-emerald-600/20" },
] as const

export default function NewSavingsGoalPage() {
    const router = useRouter()
    const { formatMoney } = useFormat()
    const { currencyCode } = useSettingsStore()
    const symbol = getCurrencySymbol(currencyCode)

    const [step, setStep] = useState(1)
    const [selectedTemplate, setSelectedTemplate] = useState<string | null>(null)

    const defaultDate = new Date()
    defaultDate.setMonth(defaultDate.getMonth() + 6)

    const [formData, setFormData] = useState<{
        name: string
        description: string
        goalType: "EMERGENCY" | "TRAVEL" | "HOME" | "CAR" | "EDUCATION" | "RETIREMENT" | "OTHER" | "GADGET" | "PURCHASE" | "INVESTMENT"
        priority: "LOW" | "MEDIUM" | "HIGH"
        targetAmount: number
        targetDate: Date
        primaryAccountId: string | null
        icon: string
        color: string
    }>({
        name: "",
        description: "",
        goalType: "OTHER",
        priority: "MEDIUM",
        targetAmount: 0,
        targetDate: defaultDate,
        primaryAccountId: null,
        icon: "target",
        color: "#7c3aed",
    })

    const { mutate: createGoal, isPending } = useCreateSavingsGoal()
    const { accounts = [] } = useAccounts()

    const handleTemplateSelect = (templateId: string) => {
        const template = GOAL_TEMPLATES.find((t) => t.id === templateId)
        if (!template) return

        setSelectedTemplate(templateId)

        const targetDate = new Date()
        targetDate.setMonth(targetDate.getMonth() + template.suggestedMonths)

        setFormData({
            name: template.name,
            description: template.description,
            goalType: template.type as any,
            priority: template.priority as any,
            targetAmount: template.suggestedAmount,
            targetDate,
            primaryAccountId: null,
            icon: template.id,
            color: template.color,
        })

        setStep(2)
    }

    const handleSubmit = () => {
        createGoal(
            {
                ...formData,
                targetDate: formData.targetDate.toISOString().split("T")[0],
            } as any,
            {
                onSuccess: (data) => {
                    confetti({
                        particleCount: 90,
                        spread: 70,
                        origin: { y: 0.6 },
                    })

                    setTimeout(() => {
                        router.push(`/dashboard/savings-goals/${data.goal.id}`)
                    }, 900)
                },
            }
        )
    }

    return (
        <div className="max-w-3xl mx-auto space-y-5 pb-10 animate-in fade-in duration-300">
            {/* Compact App Header */}
            <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                    <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => (step === 1 ? router.back() : setStep(step - 1))}
                        className="rounded-2xl h-10 w-10 bg-card border border-border/60"
                    >
                        <ArrowLeft className="w-4 h-4" />
                    </Button>
                    <div>
                        <h1 className="text-lg sm:text-xl font-black tracking-tight text-foreground leading-tight">
                            Nueva Meta de Ahorro
                        </h1>
                        <p className="text-xs text-muted-foreground">Paso {step} de 3</p>
                    </div>
                </div>

                {/* Progress dots */}
                <div className="flex items-center gap-1.5">
                    {[1, 2, 3].map((s) => (
                        <span
                            key={s}
                            className={cn(
                                "h-2 rounded-full transition-all duration-300",
                                step === s
                                    ? "w-7 bg-primary"
                                    : step > s
                                      ? "w-2 bg-emerald-500"
                                      : "w-2 bg-muted-foreground/25"
                            )}
                        />
                    ))}
                </div>
            </div>

            {/* Step 1: Template Selection */}
            {step === 1 && (
                <div className="space-y-4 animate-in fade-in slide-in-from-bottom-3 duration-300">
                    <div>
                        <h2 className="text-xl sm:text-2xl font-black tracking-tight">¿Qué quieres lograr?</h2>
                        <p className="text-xs sm:text-sm text-muted-foreground mt-0.5">
                            Elige una plantilla inteligente para empezar en segundos
                        </p>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                        {GOAL_TEMPLATES.map((template) => {
                            const Icon = template.icon
                            return (
                                <button
                                    key={template.id}
                                    type="button"
                                    onClick={() => handleTemplateSelect(template.id)}
                                    className={cn(
                                        "card-modern p-4 text-left flex flex-col items-start gap-3 transition-all hover:shadow-md active:scale-[0.98] border",
                                        selectedTemplate === template.id && "border-primary ring-2 ring-primary/20"
                                    )}
                                >
                                    <div
                                        className="h-11 w-11 rounded-2xl flex items-center justify-center shrink-0"
                                        style={{ backgroundColor: `${template.color}18`, color: template.color }}
                                    >
                                        <Icon className="w-5 h-5" />
                                    </div>
                                    <div className="space-y-0.5 min-w-0 w-full">
                                        <h3 className="font-extrabold text-sm text-foreground truncate">
                                            {template.name}
                                        </h3>
                                        <p className="text-[11px] text-muted-foreground line-clamp-1">
                                            {template.description}
                                        </p>
                                    </div>
                                    <span className="text-[10px] font-bold text-muted-foreground tabular-nums bg-muted/60 px-2 py-0.5 rounded-full">
                                        {formatMoney(template.suggestedAmount)} · {template.suggestedMonths}m
                                    </span>
                                </button>
                            )
                        })}
                    </div>
                </div>
            )}

            {/* Step 2: Details */}
            {step === 2 && (
                <div className="card-modern p-5 sm:p-6 space-y-5 animate-in fade-in slide-in-from-right-3 duration-300">
                    <div className="space-y-1.5">
                        <Label htmlFor="name" className="text-[11px] font-extrabold uppercase tracking-wider text-muted-foreground">
                            Nombre de la meta *
                        </Label>
                        <Input
                            id="name"
                            value={formData.name}
                            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                            placeholder="Ej. Viaje a Europa"
                            className="h-12 text-base font-bold rounded-2xl bg-muted/40 border-border/60"
                        />
                    </div>

                    <div className="grid gap-4 sm:grid-cols-2">
                        <div className="space-y-1.5">
                            <Label htmlFor="targetAmount" className="text-[11px] font-extrabold uppercase tracking-wider text-muted-foreground">
                                Monto objetivo ({currencyCode}) *
                            </Label>
                            <div className="relative">
                                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-base font-black text-primary pointer-events-none">
                                    {symbol}
                                </span>
                                <Input
                                    id="targetAmount"
                                    type="number"
                                    step="0.01"
                                    min="1"
                                    value={formData.targetAmount || ""}
                                    onChange={(e) =>
                                        setFormData({
                                            ...formData,
                                            targetAmount: parseFloat(e.target.value) || 0,
                                        })
                                    }
                                    placeholder="10000"
                                    className="pl-11 h-12 text-lg font-black tabular-nums rounded-2xl bg-muted/40 border-border/60"
                                />
                            </div>
                        </div>

                        <div className="space-y-1.5">
                            <Label className="text-[11px] font-extrabold uppercase tracking-wider text-muted-foreground">
                                Fecha objetivo *
                            </Label>
                            <PremiumDatePicker
                                value={formData.targetDate}
                                onChange={(d) => setFormData({ ...formData, targetDate: d })}
                            />
                        </div>
                    </div>

                    {/* Priority Pills */}
                    <div className="space-y-2">
                        <Label className="text-[11px] font-extrabold uppercase tracking-wider text-muted-foreground">
                            Prioridad
                        </Label>
                        <div className="grid grid-cols-3 gap-2">
                            {PRIORITIES.map((p) => {
                                const active = formData.priority === p.id
                                return (
                                    <button
                                        key={p.id}
                                        type="button"
                                        onClick={() => setFormData({ ...formData, priority: p.id })}
                                        className={cn(
                                            "h-10 rounded-xl text-xs font-extrabold border transition-all active:scale-95",
                                            active
                                                ? cn(p.activeClass, "shadow-md")
                                                : "bg-muted/40 text-foreground border-border/60 hover:bg-muted"
                                        )}
                                    >
                                        {p.label}
                                    </button>
                                )
                            })}
                        </div>
                    </div>

                    <div className="space-y-1.5">
                        <Label htmlFor="description" className="text-[11px] font-extrabold uppercase tracking-wider text-muted-foreground">
                            Motivación / Notas (opcional)
                        </Label>
                        <Textarea
                            id="description"
                            value={formData.description}
                            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                            placeholder="¿Qué te motiva a alcanzar esta meta?"
                            rows={2}
                            className="rounded-2xl bg-muted/40 border-border/60 resize-none text-sm"
                        />
                    </div>

                    <div className="flex gap-2.5 pt-2">
                        <Button
                            type="button"
                            variant="outline"
                            onClick={() => setStep(1)}
                            className="flex-1 h-12 rounded-2xl font-bold"
                        >
                            Atrás
                        </Button>
                        <Button
                            type="button"
                            onClick={() => setStep(3)}
                            disabled={!formData.name.trim() || formData.targetAmount <= 0}
                            className="flex-[1.5] h-12 rounded-2xl font-black bg-primary hover:bg-primary/90 text-primary-foreground shadow-lg shadow-primary/25 gap-1.5"
                        >
                            Continuar
                            <ArrowRight className="h-4 w-4" />
                        </Button>
                    </div>
                </div>
            )}

            {/* Step 3: Link Account & Review */}
            {step === 3 && (
                <div className="card-modern p-5 sm:p-6 space-y-5 animate-in fade-in slide-in-from-right-3 duration-300">
                    <div className="space-y-2.5">
                        <Label className="text-[11px] font-extrabold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                            <Wallet className="h-3.5 w-3.5 text-primary" />
                            Cuenta de ahorros vinculada (opcional)
                        </Label>
                        <div className="flex flex-wrap gap-2">
                            <button
                                type="button"
                                onClick={() => setFormData({ ...formData, primaryAccountId: null })}
                                className={cn(
                                    "px-3.5 py-2 rounded-full text-xs font-bold border transition-all active:scale-95",
                                    !formData.primaryAccountId
                                        ? "bg-primary text-primary-foreground border-primary shadow-sm"
                                        : "bg-muted/40 text-foreground border-border/60 hover:bg-muted"
                                )}
                            >
                                Sin vincular
                            </button>
                            {accounts.map((acc: any) => {
                                const selected = formData.primaryAccountId === acc.id
                                return (
                                    <button
                                        key={acc.id}
                                        type="button"
                                        onClick={() => setFormData({ ...formData, primaryAccountId: acc.id })}
                                        className={cn(
                                            "px-3.5 py-2 rounded-full text-xs font-bold border transition-all active:scale-95",
                                            selected
                                                ? "bg-emerald-600 text-white border-emerald-600 shadow-sm"
                                                : "bg-muted/40 text-foreground border-border/60 hover:border-emerald-500/40"
                                        )}
                                    >
                                        {formatAccountPillName(acc.name, acc.currencyCode)}
                                    </button>
                                )
                            })}
                        </div>
                        <p className="text-[11px] text-muted-foreground">
                            Si vinculas una cuenta, podrás transferir tus aportes directo a ella en 1 toque.
                        </p>
                    </div>

                    {/* Summary Card */}
                    <div className="p-4 rounded-2xl bg-muted/40 border border-border/60 space-y-2.5">
                        <h3 className="text-xs font-black uppercase tracking-wider text-muted-foreground">
                            Resumen de tu meta
                        </h3>
                        <div className="space-y-1.5 text-sm">
                            <div className="flex justify-between">
                                <span className="text-muted-foreground">Meta</span>
                                <span className="font-bold text-foreground">{formData.name}</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-muted-foreground">Objetivo</span>
                                <span className="font-black text-emerald-600 dark:text-emerald-400 tabular-nums">
                                    {formatMoney(formData.targetAmount)}
                                </span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-muted-foreground">Fecha límite</span>
                                <span className="font-bold text-foreground">
                                    {formData.targetDate.toLocaleDateString("es-PE")}
                                </span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-muted-foreground">Prioridad</span>
                                <span className="font-bold text-foreground">
                                    {formData.priority === "HIGH"
                                        ? "Alta"
                                        : formData.priority === "MEDIUM"
                                          ? "Media"
                                          : "Baja"}
                                </span>
                            </div>
                        </div>
                    </div>

                    <div className="flex gap-2.5 pt-1">
                        <Button
                            type="button"
                            variant="outline"
                            onClick={() => setStep(2)}
                            className="flex-1 h-12 rounded-2xl font-bold"
                        >
                            Atrás
                        </Button>
                        <Button
                            type="button"
                            onClick={handleSubmit}
                            disabled={isPending}
                            className="flex-[1.5] h-12 rounded-2xl font-black bg-emerald-600 hover:bg-emerald-700 text-white shadow-lg shadow-emerald-600/25 gap-1.5"
                        >
                            {isPending ? (
                                "Creando..."
                            ) : (
                                <>
                                    <Check className="h-4 w-4 stroke-[3]" />
                                    Crear Meta
                                </>
                            )}
                        </Button>
                    </div>
                </div>
            )}
        </div>
    )
}
