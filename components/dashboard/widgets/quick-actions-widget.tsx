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
            <Card className="widget-surface h-full">
                <div className="absolute -top-24 right-0 h-32 w-32 rounded-full bg-violet-400/20 blur-3xl" />
                <div className="absolute -bottom-24 left-0 h-28 w-28 rounded-full bg-fuchsia-400/15 blur-3xl" />

                <div className="relative h-full flex flex-col">
                    {/* Header */}
                    <div className="widget-header">
                        <div className="flex items-center gap-2">
                            <div className="p-1.5 rounded-lg bg-primary/10 border border-white/10">
                                <Zap className="h-4 w-4 text-primary" />
                            </div>
                            <div>
                                <p className="widget-kicker">Acciones</p>
                                <h3 className="widget-title">Acciones rapidas</h3>
                            </div>
                        </div>
                        <motion.div
                            animate={{ rotate: [0, 15, -15, 0] }}
                            transition={{ duration: 2, repeat: Infinity, repeatDelay: 3 }}
                        >
                            <Sparkles className="h-3 w-3 text-amber-400/60" />
                        </motion.div>
                    </div>

                    {/* Actions Grid */}
                    <div className="flex-1 px-4 pb-4 grid grid-cols-3 gap-3">
                        {actions.map((action, index) => (
                            <motion.button
                                key={action.label}
                                initial={{ opacity: 0, scale: 0.8 }}
                                animate={{ opacity: 1, scale: 1 }}
                                transition={{ delay: index * 0.05 }}
                                whileHover={{ scale: 1.05, y: -4 }}
                                whileTap={{ scale: 0.95 }}
                                onClick={action.onClick}
                                className="group relative flex flex-col items-center justify-center gap-2 p-3 rounded-2xl bg-zinc-50 dark:bg-white/5 border border-zinc-100 dark:border-white/10 hover:border-zinc-200 dark:hover:border-white/20 transition-all duration-300"
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
                                <span className="text-[10px] font-semibold text-zinc-500 dark:text-white/70 group-hover:text-zinc-900 dark:group-hover:text-white/90 transition-colors text-center leading-tight">
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








