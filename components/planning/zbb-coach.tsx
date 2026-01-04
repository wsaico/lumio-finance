"use client"

import { Lightbulb, TrendingUp, AlertTriangle, CheckCircle2, PiggyBank } from "lucide-react"
import { motion, AnimatePresence } from "framer-motion"

interface ZBBCoachProps {
    pool: {
        usd: { unassigned: number; total: number }
        pen: { unassigned: number; total: number }
    }
}

export function ZBBCoach({ pool }: ZBBCoachProps) {
    // Determine the most critical state advice
    // Priority: 1. Deficit (Error) -> 2. Surplus (Opportunity) -> 3. Balanced (Success)

    // Agregate unassigned value (Approximation for coaching purposes)
    const hasDeficit = pool.pen.unassigned < -0.01 || pool.usd.unassigned < -0.01
    const hasSurplus = pool.pen.unassigned > 0.01 || pool.usd.unassigned > 0.01

    // Pick the primary currency for display examples (prefer PEN)
    const primaryUnassigned = pool.pen.unassigned !== 0 ? pool.pen.unassigned : pool.usd.unassigned
    const currency = pool.pen.unassigned !== 0 ? "S/" : "$"

    let message = {
        title: "",
        description: "",
        color: "",
        icon: Lightbulb,
        bg: ""
    }

    if (hasDeficit) {
        message = {
            title: "Presupuesto Excedido",
            description: "Tienes asignaciones que superan tus ingresos. Ajusta los montos para evitar saldos negativos.",
            color: "text-rose-600",
            icon: AlertTriangle,
            bg: "bg-rose-50 border-rose-100"
        }
    } else if (hasSurplus) {
        message = {
            title: "Fondos por Asignar",
            description: `Tienes ${currency} ${Math.abs(primaryUnassigned).toLocaleString()} disponibles. Asígnalos a tus ahorros o gastos futuros para completar tu presupuesto.`,
            color: "text-emerald-600",
            icon: PiggyBank,
            bg: "bg-emerald-50 border-emerald-100"
        }
    } else {
        message = {
            title: "Presupuesto Balanceado",
            description: "Todos tus ingresos han sido asignados. Tu plan de gastos está listo.",
            color: "text-blue-600",
            icon: CheckCircle2,
            bg: "bg-blue-50 border-blue-100"
        }
    }

    // Don't show if no income set at all (Empty state is handled elsewhere or implies setup needed)
    if (pool.pen.total === 0 && pool.usd.total === 0) return null

    return (
        <AnimatePresence mode="wait">
            <motion.div
                key={message.title}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className={`w-full p-4 rounded-xl border-l-4 shadow-sm mb-6 ${message.bg} ${message.color.replace('text-', 'border-')}`}
            >
                <div className="flex items-start gap-4">
                    <div className={`p-2 rounded-full bg-white/50 ${message.color}`}>
                        <message.icon className="w-6 h-6" />
                    </div>
                    <div>
                        <h4 className={`font-bold text-lg ${message.color}`}>{message.title}</h4>
                        <p className="text-sm text-neutral-600 mt-1 leading-relaxed">
                            {message.description}
                        </p>
                    </div>
                </div>
            </motion.div>
        </AnimatePresence>
    )
}
