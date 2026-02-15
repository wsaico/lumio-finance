"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { HelpCircle, Info, CheckCircle2, AlertTriangle, Lightbulb, Target, BrainCircuit } from "lucide-react"
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from "@/components/ui/tooltip"
import { cn } from "@/lib/utils"
import { useFormat } from "@/hooks/useFormat"

interface BudgetRuleEducationProps {
    data?: {
        needs: { amount: number, percent: number, target: number, status: string }
        wants: { amount: number, percent: number, target: number, status: string }
        savings: { amount: number, percent: number, target: number, status: string }
    }
}

export function BudgetRuleEducation({ data }: BudgetRuleEducationProps) {
    const { formatMoney, formatCompactMoney } = useFormat()
    if (!data) return null

    const rules = [
        {
            id: 'needs',
            label: 'NECESIDADES',
            subLabel: 'Gastos Fijos',
            target: 50,
            percent: data.needs.percent,
            amount: data.needs.amount,
            description: 'Vivienda, Servicios, Comida, Transporte',
            color: 'bg-blue-500',
            textColor: 'text-blue-500',
            borderColor: 'border-blue-500/20',
            bgHover: 'group-hover:bg-blue-500/10',
            status: data.needs.status,
            icon: <CheckCircle2 className="h-4 w-4" />
        },
        {
            id: 'wants',
            label: 'DESEOS',
            subLabel: 'Estilo de Vida',
            target: 30,
            percent: data.wants.percent,
            amount: data.wants.amount,
            description: 'Salidas, Hobbies, Compras, Streaming',
            color: 'bg-purple-500',
            textColor: 'text-purple-500',
            borderColor: 'border-purple-500/20',
            bgHover: 'group-hover:bg-purple-500/10',
            status: data.wants.status,
            icon: <Lightbulb className="h-4 w-4" />
        },
        {
            id: 'savings',
            label: 'EL FUTURO',
            subLabel: 'Ahorro y Deuda',
            target: 20,
            percent: data.savings.percent,
            amount: data.savings.amount,
            description: 'Fondo de Emergencia, Inversiones, Pago de Deudas',
            color: 'bg-emerald-500',
            textColor: 'text-emerald-500',
            borderColor: 'border-emerald-500/20',
            bgHover: 'group-hover:bg-emerald-500/10',
            status: data.savings.status,
            icon: <Target className="h-4 w-4" />
        }
    ]

    const getExpertAdvice = () => {
        // Dynamic calculation: Recommended Mini-Emergency Fund = 50% of Monthly Needs or min S/ 500
        const recommendedFund = Math.max(500, Math.ceil((data.needs.amount * 0.5) / 100) * 100)

        // Calculate total income based on needs logic (Needs = 50% of Income) to find excess
        // Income = Needs Amount / (Needs Percent / 100)
        // This is an approximation if the base wasn't passed, but works for the ratio
        const approximateTotalIncome = data.needs.percent > 0 ? (data.needs.amount / data.needs.percent) * 100 : 0

        const needsExcess = data.needs.amount - (approximateTotalIncome * 0.50)
        const wantsExcess = data.wants.amount - (approximateTotalIncome * 0.30)

        if (data.savings.percent < 5) return `Crítico: Tu 'Futuro' está en riesgo. La prioridad #1 debe ser crear un mini-fondo de emergencia de ${formatMoney(recommendedFund)}. Vende cosas que no uses o recorta 'Deseos' drásticamente este mes.`

        if (data.needs.percent > 65) return `Tus Gastos Fijos (Necesidades) están consumiendo demasiado. Excedes el límite ideal por aprox. ${formatMoney(Math.max(0, needsExcess))}. Revisa alquiler, servicios y suscripciones para recuperar ese flujo de caja.`

        if (data.wants.percent > 40) return `Cuidado con el estilo de vida. Estás gastando aprox. ${formatMoney(Math.max(0, wantsExcess))} de más en cosas opcionales. Aplica la 'Regla de las 24 horas' antes de cualquier compra no esencial.`

        if (data.savings.percent >= 20) return "¡Excelente! Estás en el camino rápido a la libertad financiera. Si ya tienes tu fondo de emergencia, considera invertir el excedente en SP500 o Bitcoin."

        return `El equilibrio no es exacto, pero la tendencia importa. Si tu 'Futuro' (Ahorro/Deuda) está bajo, prioriza pagar tus deudas más caras o empezar tu fondo de emergencia con ${formatMoney(100)}.`
    }

    return (
        <Card className="border-none shadow-none bg-transparent">
            <CardHeader className="px-0 pt-0 pb-6">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-xl shadow-lg shadow-indigo-500/20">
                            <BrainCircuit className="h-5 w-5 text-white" />
                        </div>
                        <div>
                            <CardTitle className="text-base font-black tracking-tight uppercase">
                                Regla de Oro 50/30/20
                            </CardTitle>
                            <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">
                                Análisis de Distribución Financiera
                            </p>
                        </div>
                    </div>
                </div>
            </CardHeader>
            <CardContent className="px-0 py-0">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {rules.map((rule) => (
                        <div
                            key={rule.id}
                            className={cn(
                                "group relative flex flex-col justify-between p-6 rounded-3xl border transition-all duration-300 hover:shadow-lg",
                                "bg-card text-card-foreground shadow-sm",
                                rule.borderColor
                            )}
                        >
                            {/* Header */}
                            <div className="flex justify-between items-start mb-6">
                                <div className="space-y-1.5">
                                    <div className="flex items-center gap-2">
                                        <div className={cn("p-1.5 rounded-full bg-primary/5", rule.textColor)}>
                                            {rule.icon}
                                        </div>
                                        <h4 className={cn("text-xs font-black uppercase tracking-widest", rule.textColor)}>
                                            {rule.label}
                                        </h4>
                                    </div>
                                    <p className="text-xs font-medium text-muted-foreground pl-1">
                                        {rule.subLabel}
                                    </p>
                                </div>
                            </div>

                            {/* Main Numbers */}
                            <div className="mb-6 space-y-3">
                                <div className="flex items-end justify-between">
                                    <span className="text-3xl font-black tracking-tighter tabular-nums text-foreground" title={formatMoney(rule.amount)}>
                                        {formatCompactMoney(rule.amount)}
                                    </span>
                                    <div className="flex flex-col items-end">
                                        <span className={cn("text-xs font-black", rule.textColor)}>
                                            {Math.round(rule.percent)}%
                                        </span>
                                        <span className="text-[10px] text-muted-foreground font-medium">
                                            Meta: {rule.target}%
                                        </span>
                                    </div>
                                </div>

                                <div className="h-2 w-full rounded-full bg-muted overflow-hidden">
                                    <div
                                        className={cn("h-full rounded-full transition-all duration-1000", rule.color)}
                                        style={{ width: `${Math.min(rule.percent, 100)}%` }}
                                    />
                                </div>
                            </div>

                            {/* Footer Description */}
                            <p className="text-[11px] leading-relaxed text-muted-foreground border-t pt-4 mt-auto">
                                {rule.description}
                            </p>
                        </div>
                    ))}
                </div>

                <div className="mt-6 flex items-start gap-4 p-4 rounded-2xl bg-muted/50 border border-border/50">
                    <div className="p-2 bg-background rounded-full shadow-sm shrink-0">
                        <BrainCircuit className="h-4 w-4 text-primary" />
                    </div>
                    <div className="space-y-1">
                        <p className="text-xs font-bold text-foreground">Consejo de Experto</p>
                        <p className="text-[11px] text-muted-foreground leading-relaxed">
                            {getExpertAdvice()}
                        </p>
                    </div>
                </div>
            </CardContent>
        </Card>
    )
}
