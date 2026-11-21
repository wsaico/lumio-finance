"use client"

import { AlertTriangle, CheckCircle2, PiggyBank } from "lucide-react"
import { motion, AnimatePresence } from "framer-motion"
import { cn } from "@/lib/utils"
import { useFormat } from "@/hooks/useFormat"
import { useSettingsStore } from "@/hooks/useSettingsStore"

interface ZBBCoachProps {
    pool: {
        usd: { unassigned: number; total: number }
        pen: { unassigned: number; total: number }
    }
    action?: React.ReactNode
}

export function ZBBCoach({ pool, action }: ZBBCoachProps) {
    const { formatMoney } = useFormat()
    const { isBalanceVisible } = useSettingsStore()

    if (!pool || (pool.pen.total === 0 && pool.usd.total === 0)) return null

    const penDiff = pool.pen.unassigned
    const usdDiff = pool.usd.unassigned
    const hasDeficit = penDiff < -0.01 || usdDiff < -0.01
    const hasSurplus = !hasDeficit && (penDiff > 0.01 || usdDiff > 0.01)

    const formatList = (filterFn: (v: number) => boolean) => {
        const parts: string[] = []
        if (filterFn(penDiff)) {
            parts.push(isBalanceVisible ? formatMoney(Math.abs(penDiff), "PEN") : "••••••")
        }
        if (filterFn(usdDiff)) {
            parts.push(isBalanceVisible ? formatMoney(Math.abs(usdDiff), "USD") : "••••••")
        }
        return parts.join(" y ")
    }

    const config = hasDeficit
        ? {
              title: "Plan excedido",
              description: `Asignaste ${formatList((v) => v < -0.01)} por encima de tus ingresos planificados. Reduce alguna partida opcional o registra un ingreso extra.`,
              icon: AlertTriangle,
              container: "bg-rose-500/8 border-rose-500/25",
              iconBg: "bg-rose-500/15 text-rose-600 dark:text-rose-400",
              titleColor: "text-rose-600 dark:text-rose-400",
          }
        : hasSurplus
          ? {
                title: "Dinero esperando un destino",
                description: `Te quedan ${formatList((v) => v > 0.01)} sin asignar. Dale un objetivo (ahorro, fondo de emergencia o gasto futuro) para completar Base Cero.`,
                icon: PiggyBank,
                container: "bg-primary/8 border-primary/20",
                iconBg: "bg-primary/15 text-primary",
                titleColor: "text-primary",
            }
          : {
                title: "¡Plan Base Cero balanceado al 100%!",
                description:
                    "Cada sol y dólar de tus ingresos tiene un propósito definido. Activa o sincroniza el plan para reflejarlo en tus presupuestos.",
                icon: CheckCircle2,
                container: "bg-emerald-500/8 border-emerald-500/25",
                iconBg: "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400",
                titleColor: "text-emerald-600 dark:text-emerald-400",
            }

    const Icon = config.icon

    return (
        <AnimatePresence mode="wait">
            <motion.div
                key={config.title}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -6 }}
                className={cn(
                    "w-full p-4 rounded-2xl border flex flex-col sm:flex-row sm:items-center justify-between gap-3.5 transition-colors",
                    config.container
                )}
            >
                <div className="flex items-start gap-3.5 min-w-0">
                    <div className={cn("p-2.5 rounded-xl shrink-0", config.iconBg)}>
                        <Icon className="w-5 h-5" />
                    </div>
                    <div className="min-w-0">
                        <h4 className={cn("font-extrabold text-sm leading-tight", config.titleColor)}>
                            {config.title}
                        </h4>
                        <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                            {config.description}
                        </p>
                    </div>
                </div>
                {action && <div className="shrink-0 sm:ml-2">{action}</div>}
            </motion.div>
        </AnimatePresence>
    )
}
