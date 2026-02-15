"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { useAccounts } from "@/hooks/useAccounts"
import { useFormat } from "@/hooks/useFormat"
import { Coins } from "lucide-react"
import { motion } from "framer-motion"

const COLORS = ['#3b82f6', '#8b5cf6', '#10b981', '#f59e0b', '#ef4444', '#ec4899']

export function CurrencyBreakdownWidget() {
    const { balancesByCurrency, isLoading } = useAccounts()
    const { formatMoney } = useFormat()

    if (isLoading) {
        return (
            <Card className="glass border-none shadow-premium-md">
                <CardHeader className="pb-3">
                    <div className="h-4 w-32 bg-muted/50 rounded animate-pulse" />
                </CardHeader>
                <CardContent>
                    <div className="h-32 bg-muted/50 rounded animate-pulse" />
                </CardContent>
            </Card>
        )
    }

    const currencies = Object.keys(balancesByCurrency || {})

    if (currencies.length === 0) {
        return null
    }

    const total = currencies.reduce((sum, curr) => sum + balancesByCurrency[curr], 0)

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
        >
            <Card className="glass border-none shadow-premium-md hover:shadow-premium-lg transition-all duration-300 h-full">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Distribución por Moneda</CardTitle>
                    <Coins className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent className="space-y-2">
                    {/* Compact Currency List */}
                    {currencies.map((currency, index) => {
                        const amount = balancesByCurrency[currency]
                        const percentage = ((amount / total) * 100).toFixed(1)

                        return (
                            <motion.div
                                key={currency}
                                initial={{ opacity: 0, x: -20 }}
                                animate={{ opacity: 1, x: 0 }}
                                transition={{ delay: index * 0.1 }}
                                className="space-y-1"
                            >
                                <div className="flex items-center justify-between text-xs">
                                    <div className="flex items-center gap-2">
                                        <div
                                            className="w-2 h-2 rounded-full flex-shrink-0"
                                            style={{ backgroundColor: COLORS[index % COLORS.length] }}
                                        />
                                        <span className="font-medium">{currency}</span>
                                    </div>
                                    <div className="flex items-baseline gap-2">
                                        <span className="font-bold">
                                            {formatMoney(amount, currency)}
                                        </span>
                                        <span className="text-[10px] text-muted-foreground">
                                            {percentage}%
                                        </span>
                                    </div>
                                </div>

                                {/* Progress Bar */}
                                <div className="h-1 bg-muted rounded-full overflow-hidden">
                                    <motion.div
                                        className="h-full"
                                        style={{ backgroundColor: COLORS[index % COLORS.length] }}
                                        initial={{ width: 0 }}
                                        animate={{ width: `${percentage}%` }}
                                        transition={{ duration: 0.8, ease: "easeOut", delay: index * 0.1 }}
                                    />
                                </div>
                            </motion.div>
                        )
                    })}

                    {/* Summary Footer */}
                    <div className="pt-2 border-t border-border/50">
                        <div className="text-[10px] text-muted-foreground text-center">
                            {currencies.length} moneda{currencies.length !== 1 ? 's' : ''} activa{currencies.length !== 1 ? 's' : ''}
                        </div>
                    </div>
                </CardContent>
            </Card>
        </motion.div>
    )
}
