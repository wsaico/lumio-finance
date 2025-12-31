
"use client"

import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { User, ArrowUpRight, ArrowDownLeft, Calendar, TrendingUp } from "lucide-react"
import { format } from "date-fns"
import { es } from "date-fns/locale"
import { useFormat } from "@/hooks/use-format"
import { motion } from "framer-motion"

interface LoanCardProps {
    loan: {
        id: string
        loanType: 'LENT' | 'BORROWED'
        contactName: string
        principalAmount: number
        remainingBalance: number
        currencyCode: string
        loanDate: string
        status: string
    }
}

export function LoanCard({ loan }: LoanCardProps) {
    const isLent = loan.loanType === 'LENT'
    const { formatMoney } = useFormat()

    // Calculate percentage paid
    const percentagePaid = ((loan.principalAmount - loan.remainingBalance) / loan.principalAmount) * 100

    // Color scheme based on loan type
    const colorScheme = isLent ? {
        bg: 'from-amber-500/10 to-orange-500/10',
        iconBg: 'bg-amber-500/10',
        iconColor: 'text-amber-600 dark:text-amber-400',
        badgeClass: 'bg-amber-500/20 text-amber-700 dark:text-amber-300',
        progressColor: '#f59e0b',
        arrow: ArrowUpRight
    } : {
        bg: 'from-blue-500/10 to-indigo-500/10',
        iconBg: 'bg-blue-500/10',
        iconColor: 'text-blue-600 dark:text-blue-400',
        badgeClass: 'bg-blue-500/20 text-blue-700 dark:text-blue-300',
        progressColor: '#3b82f6',
        arrow: ArrowDownLeft
    }

    return (
        <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.3 }}
            whileHover={{ scale: 1.02, y: -4 }}
        >
            <Card className={`relative overflow-hidden border-none shadow-premium-md hover:shadow-premium-lg transition-all duration-300 bg-gradient-to-br ${colorScheme.bg}`}>
                {/* Accent Border */}
                <div
                    className="absolute left-0 top-0 bottom-0 w-1"
                    style={{ backgroundColor: colorScheme.progressColor }}
                />

                <CardContent className="p-4 pl-5">
                    <div className="flex items-start justify-between gap-4">
                        {/* Left: Contact Info */}
                        <div className="flex items-start gap-3 flex-1 min-w-0">
                            <div className={`p-3 rounded-xl ${colorScheme.iconBg} shrink-0`}>
                                <User className={`h-5 w-5 ${colorScheme.iconColor}`} />
                            </div>
                            <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 mb-1">
                                    <h4 className="font-semibold text-base truncate">{loan.contactName}</h4>
                                    <Badge variant="outline" className={`text-xs px-2 py-0.5 ${colorScheme.badgeClass} border-none`}>
                                        {isLent ? "Te debe" : "Le debes"}
                                    </Badge>
                                </div>
                                <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                                    <Calendar className="w-3 h-3" />
                                    <span>
                                        {format(new Date(loan.loanDate), "d 'de' MMM, yyyy", { locale: es })}
                                    </span>
                                </div>
                            </div>
                        </div>

                        {/* Right: Amount */}
                        <div className="text-right shrink-0">
                            <div className="flex items-center gap-1 justify-end mb-0.5">
                                <colorScheme.arrow className={`w-4 h-4 ${colorScheme.iconColor}`} />
                                <p className="font-bold text-lg md:text-xl">
                                    {formatMoney(loan.remainingBalance, loan.currencyCode)}
                                </p>
                            </div>
                            <p className="text-xs text-muted-foreground">
                                de {formatMoney(loan.principalAmount, loan.currencyCode)}
                            </p>
                        </div>
                    </div>

                    {/* Progress Bar */}
                    <div className="mt-4 space-y-1.5">
                        <div className="flex justify-between items-center text-xs text-muted-foreground">
                            <span>Progreso de pago</span>
                            <span className="font-medium">{percentagePaid.toFixed(0)}% pagado</span>
                        </div>
                        <div className="h-2 rounded-full bg-muted/30 overflow-hidden">
                            <motion.div
                                className="h-full rounded-full"
                                style={{ backgroundColor: colorScheme.progressColor }}
                                initial={{ width: 0 }}
                                animate={{ width: `${percentagePaid}%` }}
                                transition={{ duration: 1, ease: "easeOut" }}
                            />
                        </div>
                    </div>

                    {/* Status Badge */}
                    {loan.status && (
                        <div className="mt-3 flex items-center gap-1.5 text-xs">
                            <TrendingUp className={`w-3 h-3 ${colorScheme.iconColor}`} />
                            <span className="text-muted-foreground">
                                Estado: <span className="font-medium text-foreground capitalize">{loan.status.toLowerCase()}</span>
                            </span>
                        </div>
                    )}
                </CardContent>
            </Card>
        </motion.div>
    )
}
