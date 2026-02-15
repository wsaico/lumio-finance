
"use client"

import { useCreditCards, CreditCard } from "@/hooks/useCreditCards"
import { useFormat } from "@/hooks/useFormat"
import { Card } from "@/components/ui/card"
import { CreditCard as CardIcon, AlertTriangle, Calendar, CheckCircle2 } from "lucide-react"
import { motion } from "framer-motion"
import { format, addMonths, setDate, isPast, differenceInDays } from "date-fns"
import { es } from "date-fns/locale"

export function CreditCardAlertWidget() {
    const { cards, isLoading } = useCreditCards()
    const { formatMoney } = useFormat()

    if (isLoading) return <div className="h-[200px] animate-pulse bg-muted rounded-xl" />

    // Filter cards with balance that need attention
    const activeCards = cards?.filter(c => Number(c.used_balance) > 0) || []

    // Sort by urgency (days until payment due)
    const getNearestPaymentDate = (day: number) => {
        const today = new Date()

        // 1. Try current month
        let currentMonthDate = setDate(today, day)

        // 2. Try previous month (to check for overdue)
        let prevMonthDate = addMonths(currentMonthDate, -1)

        const daysSincePrev = differenceInDays(today, prevMonthDate)
        const daysToCurrent = differenceInDays(currentMonthDate, today)

        // If previous month's due date was within last 14 days, prioritize it as "Vencido"
        // provided it's in the past.
        if (daysSincePrev >= 0 && daysSincePrev <= 14) {
            return prevMonthDate
        }

        // If current month's due date is in the past, move to next month UNLESS it's very recent (overdue)
        if (isPast(currentMonthDate) && differenceInDays(today, currentMonthDate) > 7) {
            return addMonths(currentMonthDate, 1)
        }

        return currentMonthDate
    }

    const sortedCards = activeCards.map(card => {
        const paymentDate = getNearestPaymentDate(card.payment_due_day)
        const now = new Date()
        const daysLeft = differenceInDays(paymentDate, now)
        return { ...card, paymentDate, daysLeft }
    }).sort((a, b) => a.daysLeft - b.daysLeft)

    if (sortedCards.length === 0) {
        return (
            <Card className="widget-surface h-full min-h-[180px] p-6 flex flex-col items-center justify-center text-center">
                <div className="w-12 h-12 rounded-full bg-indigo-100 dark:bg-indigo-900/50 flex items-center justify-center mb-3">
                    <CheckCircle2 className="w-6 h-6 text-indigo-600 dark:text-indigo-400" />
                </div>
                <h3 className="font-semibold text-foreground">Todo en orden</h3>
                <p className="text-xs text-muted-foreground max-w-[180px]">No tienes pagos de tarjeta pendientes próximos.</p>
            </Card>
        )
    }

    return (
        <Card className="widget-surface h-full flex flex-col">
            <div className="widget-header">
                <div className="flex items-center gap-2">
                    <CardIcon className="w-4 h-4 text-primary" />
                    <h3 className="font-semibold text-sm">Vencimientos TC</h3>
                </div>
                <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-primary/10 text-primary">
                    {sortedCards.length} pendientes
                </span>
            </div>

            <div className="flex-1 overflow-y-auto p-2 space-y-2">
                {sortedCards.map((card, idx) => {
                    const isUrgent = card.daysLeft <= 3
                    const isWarning = card.daysLeft <= 7

                    return (
                        <motion.div
                            key={card.id}
                            initial={{ opacity: 0, x: -10 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: idx * 0.1 }}
                            className={`
                                p-3 rounded-lg border flex items-center justify-between
                                ${isUrgent
                                    ? 'bg-rose-50 dark:bg-rose-950/20 border-rose-100 dark:border-rose-900/30'
                                    : isWarning
                                        ? 'bg-amber-50 dark:bg-amber-950/20 border-amber-100 dark:border-amber-900/30'
                                        : 'bg-card border-border'
                                }
                            `}
                        >
                            <div className="flex flex-col gap-0.5">
                                <span className={`text-xs font-bold truncate max-w-[120px] ${isUrgent ? 'text-rose-700 dark:text-rose-400' : 'text-foreground'}`}>
                                    {card.name}
                                    <span className="ml-1 text-[9px] opacity-70 font-normal">
                                        (•••• {card.last_four_digits})
                                    </span>
                                </span>
                                <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
                                    <Calendar className="w-3 h-3" />
                                    <span>
                                        {format(card.paymentDate, "d 'de' MMM", { locale: es })}
                                    </span>
                                    <span className={`
                                        ml-1 font-bold px-1.5 py-0.5 rounded-sm
                                        ${isUrgent
                                            ? 'bg-rose-200 dark:bg-rose-900 text-rose-800 dark:text-rose-200'
                                            : isWarning
                                                ? 'bg-amber-200 dark:bg-amber-900 text-amber-800 dark:text-amber-200'
                                                : 'bg-muted text-foreground'
                                        }
                                    `}>
                                        {card.daysLeft < 0 ? 'VENCIDO' : card.daysLeft === 0 ? 'HOY' : `${card.daysLeft} días`}
                                    </span>
                                </div>
                            </div>

                            <div className="text-right">
                                <div className="text-sm font-black tabular-nums">
                                    {formatMoney(Number(card.used_balance), card.currency_code)}
                                </div>
                                {isUrgent && (
                                    <div className="flex items-center justify-end gap-1 text-[10px] text-rose-600 dark:text-rose-400 font-bold animate-pulse">
                                        <AlertTriangle className="w-3 h-3" />
                                        <span>Pagar ya</span>
                                    </div>
                                )}
                            </div>
                        </motion.div>
                    )
                })}
            </div>
        </Card>
    )
}

