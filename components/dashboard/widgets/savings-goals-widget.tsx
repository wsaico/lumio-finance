"use client"

import { Card } from "@/components/ui/card"
import { useSavingsGoals } from "@/hooks/useSavingsGoals"
import { useFormat } from "@/hooks/useFormat"
import { useSettingsStore } from "@/hooks/useSettingsStore"
import { Button } from "@/components/ui/button"
import { Target, Plus, ChevronRight, Calendar, TrendingUp, Sparkles, Rocket } from "lucide-react"
import { useRouter } from "next/navigation"
import { motion } from "framer-motion"
import { cn } from "@/lib/utils"

const goalColors: Record<string, { gradient: string; glow: string; icon: string }> = {
    orange: { gradient: "from-orange-500 to-amber-500", glow: "shadow-orange-500/30", icon: "text-orange-400" },
    blue: { gradient: "from-blue-500 to-cyan-500", glow: "shadow-blue-500/30", icon: "text-blue-400" },
    green: { gradient: "from-emerald-500 to-teal-500", glow: "shadow-emerald-500/30", icon: "text-emerald-400" },
    purple: { gradient: "from-violet-500 to-purple-500", glow: "shadow-violet-500/30", icon: "text-violet-400" },
    pink: { gradient: "from-pink-500 to-rose-500", glow: "shadow-pink-500/30", icon: "text-pink-400" },
    red: { gradient: "from-red-500 to-rose-500", glow: "shadow-red-500/30", icon: "text-red-400" },
}

export function SavingsGoalsWidget() {
    const { data, isLoading } = useSavingsGoals('ACTIVE')
    const { formatMoney } = useFormat()
    const { goalTotalType } = useSettingsStore()
    const router = useRouter()

    const goals = data || []

    const getProjectedDate = (goal: any) => {
        if (!goal.current_amount || goal.current_amount <= 0 || !goal.start_date) return null
        const startDate = new Date(goal.start_date)
        const now = new Date()
        const daysElapsed = Math.max(1, Math.ceil((now.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)))
        const dailyRate = Number(goal.current_amount) / daysElapsed
        if (dailyRate <= 0) return null
        const remaining = Number(goal.target_amount) - Number(goal.current_amount)
        const daysRemaining = Math.ceil(remaining / dailyRate)
        const projectedDate = new Date()
        projectedDate.setDate(now.getDate() + daysRemaining)
        return projectedDate
    }

    if (isLoading) {
        return (
            <Card className="widget-surface h-full">
                <div className="absolute inset-0 bg-gradient-to-br from-slate-900 via-emerald-950 to-slate-900" />
                <div className="relative p-6 h-full flex items-center justify-center">
                    <div className="flex flex-col items-center gap-3">
                        <motion.div animate={{ rotate: 360 }} transition={{ duration: 2, repeat: Infinity, ease: "linear" }}>
                            <Target className="h-8 w-8 text-emerald-400" />
                        </motion.div>
                        <span className="text-white/60 text-sm">Cargando metas...</span>
                    </div>
                </div>
            </Card>
        )
    }

    if (goals.length === 0) {
        return (
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="h-full">
                <Card className="widget-surface h-full">
                    <div className="absolute inset-0 bg-gradient-to-br from-slate-900 via-emerald-950 to-slate-900" />
                    <motion.div
                        className="absolute top-10 right-10 w-32 h-32 bg-emerald-500/10 rounded-full blur-3xl"
                        animate={{ scale: [1, 1.3, 1], opacity: [0.3, 0.5, 0.3] }}
                        transition={{ duration: 4, repeat: Infinity }}
                    />
                    <div className="relative h-full flex flex-col items-center justify-center text-center p-6 gap-4">
                        <motion.div
                            className="p-4 rounded-2xl bg-gradient-to-br from-emerald-500/20 to-teal-500/10 border border-emerald-500/20"
                            whileHover={{ scale: 1.05, rotate: 5 }}
                        >
                            <Rocket className="h-10 w-10 text-emerald-400" />
                        </motion.div>
                        <div>
                            <h3 className="font-bold text-xl text-white mb-1">Define tu primera meta</h3>
                            <p className="text-sm text-white/50">Empieza a ahorrar para lo que más deseas</p>
                        </div>
                        <Button
                            onClick={() => router.push('/dashboard/savings-goals')}
                            className="bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-white shadow-lg shadow-emerald-500/30 border-0"
                        >
                            <Plus className="h-4 w-4 mr-2" /> Crear Meta
                        </Button>
                    </div>
                </Card>
            </motion.div>
        )
    }

    return (
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="h-full">
            <Card className="widget-surface h-full">
                {/* Premium Background */}
                <div className="absolute inset-0 bg-gradient-to-br from-slate-900 via-emerald-950 to-slate-900" />

                {/* Animated Orbs */}
                <div className="absolute inset-0 overflow-hidden">
                    <motion.div
                        className="absolute -top-20 right-20 w-40 h-40 bg-emerald-500/15 rounded-full blur-3xl"
                        animate={{ scale: [1, 1.2, 1], opacity: [0.2, 0.4, 0.2] }}
                        transition={{ duration: 5, repeat: Infinity }}
                    />
                    <motion.div
                        className="absolute bottom-0 left-1/4 w-32 h-32 bg-teal-500/15 rounded-full blur-3xl"
                        animate={{ scale: [1.2, 1, 1.2], opacity: [0.2, 0.4, 0.2] }}
                        transition={{ duration: 6, repeat: Infinity }}
                    />
                </div>

                <div className="relative h-full flex flex-col">
                    {/* Header */}
                    <div className="p-4 flex items-center justify-between border-b border-white/5">
                        <div className="flex items-center gap-2">
                            <div className="p-1.5 rounded-lg bg-emerald-500/20">
                                <Target className="h-4 w-4 text-emerald-400" />
                            </div>
                            <h3 className="font-bold text-sm text-white/90 uppercase tracking-wider">Metas de Ahorro</h3>
                            <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 text-[10px] font-bold">
                                {goals.length}
                            </span>
                        </div>
                        <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 text-xs text-white/60 hover:text-white hover:bg-white/10"
                            onClick={() => router.push('/dashboard/savings-goals')}
                        >
                            Ver todas <ChevronRight className="h-3 w-3 ml-1" />
                        </Button>
                    </div>

                    {/* Goals Carousel */}
                    <div className="flex-1 overflow-x-auto p-4 flex gap-4 snap-x snap-mandatory scrollbar-hide">
                        {goals.slice(0, 5).map((goal: any, index: number) => {
                            const progress = goal.progress || 0
                            const projectedDate = getProjectedDate(goal)
                            const isCompleted = progress >= 100
                            const colorKey = goal.color || 'emerald'
                            const colors = goalColors[colorKey] || goalColors.green

                            return (
                                <motion.div
                                    key={goal.id}
                                    initial={{ opacity: 0, x: 20 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    transition={{ delay: index * 0.1 }}
                                    className="snap-center shrink-0 w-[260px]"
                                >
                                    <motion.div
                                        className={cn(
                                            "relative h-full rounded-2xl p-4 cursor-pointer transition-all duration-300",
                                            "bg-gradient-to-br from-white/10 to-white/5",
                                            "border border-white/10 hover:border-white/20",
                                            `hover:shadow-xl ${colors.glow}`
                                        )}
                                        onClick={() => router.push(`/dashboard/savings-goals/${goal.id}`)}
                                        whileHover={{ scale: 1.02, y: -4 }}
                                        whileTap={{ scale: 0.98 }}
                                    >
                                        {/* Goal Header */}
                                        <div className="flex items-start justify-between mb-3">
                                            <div className={cn(
                                                "p-2 rounded-xl bg-gradient-to-br",
                                                colors.gradient,
                                                "shadow-lg",
                                                colors.glow
                                            )}>
                                                <TrendingUp className="h-4 w-4 text-white" />
                                            </div>
                                            <div className={cn(
                                                "px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wide",
                                                isCompleted
                                                    ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30"
                                                    : "bg-white/10 text-white/70 border border-white/10"
                                            )}>
                                                {isCompleted ? (
                                                    <span className="flex items-center gap-1">
                                                        <Sparkles className="h-3 w-3" /> Logrado
                                                    </span>
                                                ) : (
                                                    `${progress.toFixed(0)}%`
                                                )}
                                            </div>
                                        </div>

                                        {/* Goal Info */}
                                        <div className="mb-3">
                                            <h4 className="font-bold text-white truncate mb-1">{goal.name}</h4>
                                            <div className="flex items-baseline gap-1.5">
                                                <span className="text-xl font-black text-white">
                                                    {!isBalanceVisible ? '******' : (goalTotalType === 'remaining'
                                                        ? formatMoney(Math.max(0, goal.target_amount - goal.current_amount), goal.currency)
                                                        : formatMoney(goal.current_amount, goal.currency))
                                                    }
                                                </span>
                                                <span className="text-xs text-white/40">
                                                    {!isBalanceVisible ? ' / ***' : (goalTotalType === 'remaining'
                                                        ? ' para la meta'
                                                        : ` / ${formatMoney(goal.target_amount, goal.currency)}`)}
                                                </span>
                                            </div>
                                        </div>

                                        {/* Progress Bar */}
                                        <div className="mb-3">
                                            <div className="h-2 bg-white/10 rounded-full overflow-hidden">
                                                <motion.div
                                                    className={cn(
                                                        "h-full rounded-full bg-gradient-to-r",
                                                        isCompleted ? "from-emerald-400 to-teal-400" : colors.gradient
                                                    )}
                                                    initial={{ width: 0 }}
                                                    animate={{ width: `${Math.min(progress, 100)}%` }}
                                                    transition={{ duration: 1, delay: 0.2 + index * 0.1 }}
                                                />
                                            </div>
                                        </div>

                                        {/* Footer */}
                                        <div className="flex items-center justify-between text-[11px]">
                                            {projectedDate && !isCompleted ? (
                                                <div className="flex items-center gap-1.5 text-emerald-400/80">
                                                    <Calendar className="h-3 w-3" />
                                                    <span>Est. {projectedDate.toLocaleDateString('es-PE', { month: 'short', day: 'numeric' })}</span>
                                                </div>
                                            ) : goal.target_date ? (
                                                <div className="flex items-center gap-1.5 text-white/40">
                                                    <Calendar className="h-3 w-3" />
                                                    <span>Meta: {new Date(goal.target_date).toLocaleDateString('es-PE', { month: 'short', day: 'numeric' })}</span>
                                                </div>
                                            ) : (
                                                <span className="text-white/30">Sin fecha límite</span>
                                            )}
                                        </div>
                                    </motion.div>
                                </motion.div>
                            )
                        })}

                        {goals.length > 5 && (
                            <motion.div
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                className="snap-center shrink-0 w-[120px] flex items-center justify-center"
                            >
                                <Button
                                    variant="ghost"
                                    className="h-full w-full rounded-2xl border-2 border-dashed border-white/10 hover:border-white/20 hover:bg-white/5 text-white/50 hover:text-white/70"
                                    onClick={() => router.push('/dashboard/savings-goals')}
                                >
                                    <span className="text-2xl font-bold">+{goals.length - 5}</span>
                                </Button>
                            </motion.div>
                        )}
                    </div>
                </div>
            </Card>
        </motion.div>
    )
}

