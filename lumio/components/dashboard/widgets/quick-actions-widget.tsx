"use client"

import { Card } from "@/components/ui/card"
import { Plus, Target, ArrowRightLeft, CreditCard, Receipt, PiggyBank, Zap, Sparkles } from "lucide-react"
import { useRouter } from "next/navigation"
import { motion } from "framer-motion"

export function QuickActionsWidget() {
    const router = useRouter()

    const actions = [
        {
            label: "Nueva Transacción",
            shortLabel: "Transacción",
            icon: Plus,
            gradient: "from-emerald-500 to-teal-500",
            glow: "shadow-emerald-500/30",
            onClick: () => router.push('/transactions/new')
        },
        {
            label: "Crear Meta",
            shortLabel: "Meta",
            icon: Target,
            gradient: "from-blue-500 to-cyan-500",
            glow: "shadow-blue-500/30",
            onClick: () => router.push('/dashboard/savings-goals?new=true')
        },
        {
            label: "Transferir",
            shortLabel: "Transferir",
            icon: ArrowRightLeft,
            gradient: "from-violet-500 to-purple-500",
            glow: "shadow-violet-500/30",
            onClick: () => router.push('/transfers/new')
        },
        {
            label: "Tarjetas",
            shortLabel: "Tarjetas",
            icon: CreditCard,
            gradient: "from-rose-500 to-pink-500",
            glow: "shadow-rose-500/30",
            onClick: () => router.push('/credit-cards')
        },
        {
            label: "Presupuestos",
            shortLabel: "Presupuesto",
            icon: PiggyBank,
            gradient: "from-amber-500 to-orange-500",
            glow: "shadow-amber-500/30",
            onClick: () => router.push('/budgets')
        },
        {
            label: "Ver Reportes",
            shortLabel: "Reportes",
            icon: Receipt,
            gradient: "from-cyan-500 to-sky-500",
            glow: "shadow-cyan-500/30",
            onClick: () => router.push('/reports')
        }
    ]

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="h-full"
        >
            <Card className="relative overflow-hidden border-none h-full shadow-2xl">
                {/* Premium Background */}
                <div className="absolute inset-0 bg-gradient-to-br from-slate-900 via-violet-950 to-slate-900" />

                {/* Animated Orbs */}
                <div className="absolute inset-0 overflow-hidden">
                    <motion.div
                        className="absolute top-0 right-1/4 w-32 h-32 bg-violet-500/15 rounded-full blur-3xl"
                        animate={{ scale: [1, 1.3, 1], opacity: [0.2, 0.4, 0.2] }}
                        transition={{ duration: 4, repeat: Infinity }}
                    />
                    <motion.div
                        className="absolute bottom-0 left-1/4 w-28 h-28 bg-fuchsia-500/15 rounded-full blur-3xl"
                        animate={{ scale: [1.2, 1, 1.2], opacity: [0.2, 0.4, 0.2] }}
                        transition={{ duration: 5, repeat: Infinity }}
                    />
                </div>

                <div className="relative h-full flex flex-col">
                    {/* Header */}
                    <div className="p-4 flex items-center gap-2 border-b border-white/5">
                        <div className="p-1.5 rounded-lg bg-violet-500/20">
                            <Zap className="h-4 w-4 text-violet-400" />
                        </div>
                        <h3 className="font-bold text-sm text-white/90 uppercase tracking-wider">Acciones Rápidas</h3>
                        <motion.div
                            animate={{ rotate: [0, 15, -15, 0] }}
                            transition={{ duration: 2, repeat: Infinity, repeatDelay: 3 }}
                        >
                            <Sparkles className="h-3 w-3 text-amber-400/60" />
                        </motion.div>
                    </div>

                    {/* Actions Grid */}
                    <div className="flex-1 p-4 grid grid-cols-3 gap-3">
                        {actions.map((action, index) => (
                            <motion.button
                                key={action.label}
                                initial={{ opacity: 0, scale: 0.8 }}
                                animate={{ opacity: 1, scale: 1 }}
                                transition={{ delay: index * 0.05 }}
                                whileHover={{ scale: 1.05, y: -4 }}
                                whileTap={{ scale: 0.95 }}
                                onClick={action.onClick}
                                className="group relative flex flex-col items-center justify-center gap-2 p-3 rounded-2xl bg-white/5 border border-white/10 hover:border-white/20 transition-all duration-300"
                            >
                                {/* Glow Effect on Hover */}
                                <div className={`absolute inset-0 rounded-2xl bg-gradient-to-br ${action.gradient} opacity-0 group-hover:opacity-20 transition-opacity duration-300 blur-xl`} />

                                {/* Icon Container */}
                                <motion.div
                                    className={`relative p-2.5 rounded-xl bg-gradient-to-br ${action.gradient} shadow-lg ${action.glow}`}
                                    whileHover={{ rotate: [0, -10, 10, 0] }}
                                    transition={{ duration: 0.4 }}
                                >
                                    <action.icon className="h-4 w-4 text-white" />
                                </motion.div>

                                {/* Label */}
                                <span className="text-[10px] font-semibold text-white/70 group-hover:text-white/90 transition-colors text-center leading-tight">
                                    {action.shortLabel}
                                </span>
                            </motion.button>
                        ))}
                    </div>
                </div>
            </Card>
        </motion.div>
    )
}
