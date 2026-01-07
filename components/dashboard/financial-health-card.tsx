"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { useAccounts } from "@/hooks/use-accounts"
import { useFormat } from "@/hooks/use-format"
import { TrendingUp, TrendingDown, Activity, Wallet, CreditCard } from "lucide-react"
import { motion } from "framer-motion"
import { PolarAngleAxis, RadialBar, RadialBarChart, ResponsiveContainer } from "recharts"
import { useWindowSize } from "@/hooks/use-window-size"

export function FinancialHealthCard() {
    const { accounts, isLoading, totalBalanceConverted } = useAccounts()
    const { formatCompactMoney } = useFormat()
    const { width } = useWindowSize()
    const isMobile = width > 0 && width < 640

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

    // Calculate financial metrics using CONVERTED balances
    const totalAssets = totalBalanceConverted || 0  // Already converted to base currency

    const totalLiabilities = accounts?.reduce((sum, acc) => {
        if (acc.accountType !== 'CREDIT_CARD') return sum
        return sum + Number(acc.usedBalance || 0)
    }, 0) || 0

    const netWorth = totalAssets - totalLiabilities
    const debtRatio = totalAssets > 0 ? (totalLiabilities / totalAssets) * 100 : 0

    // Health score (0-100): Lower debt ratio = higher score
    const healthScore = Math.max(0, Math.min(100, 100 - debtRatio))

    // Chart data
    const chartData = [{
        name: 'Score',
        value: healthScore,
        fill: healthScore >= 70 ? '#10b981' : healthScore >= 40 ? '#f59e0b' : '#ef4444'
    }]

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
        >
            <Card className="glass border-none shadow-premium-md hover:shadow-premium-lg transition-all duration-300 h-full">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Salud Financiera</CardTitle>
                    <Activity className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent className="space-y-4">
                    {/* Compact Score Display */}
                    <div className="flex flex-col xs:flex-row items-center gap-4">
                        {/* Mini Radial Chart */}
                        <div className="relative w-20 h-20 flex-shrink-0">
                            <ResponsiveContainer width="100%" height="100%">
                                <RadialBarChart
                                    cx="50%"
                                    cy="50%"
                                    innerRadius="70%"
                                    outerRadius="100%"
                                    data={chartData}
                                    startAngle={90}
                                    endAngle={-270}
                                >
                                    <PolarAngleAxis type="number" domain={[0, 100]} angleAxisId={0} tick={false} />
                                    <RadialBar
                                        background={{ fill: 'hsl(var(--muted))' }}
                                        dataKey="value"
                                        cornerRadius={10}
                                        fill={chartData[0].fill}
                                    />
                                </RadialBarChart>
                            </ResponsiveContainer>
                            <div className="absolute inset-0 flex items-center justify-center">
                                <div className="text-center">
                                    <div className="text-xl font-bold">{Math.round(healthScore)}</div>
                                    <div className="text-[10px] text-muted-foreground">/ 100</div>
                                </div>
                            </div>
                        </div>

                        {/* Stats Grid */}
                        <div className="w-full grid grid-cols-2 gap-3 xs:gap-2">
                            <div className="space-y-0.5">
                                <div className="flex items-center gap-1 text-xs text-muted-foreground font-medium">
                                    <Wallet className="h-3 w-3" />
                                    <span>Activos</span>
                                </div>
                                <div className="text-base font-bold text-emerald-600">
                                    {formatCompactMoney(totalAssets)}
                                </div>
                            </div>

                            <div className="space-y-0.5">
                                <div className="flex items-center gap-1 text-xs text-muted-foreground font-medium">
                                    <CreditCard className="h-3 w-3" />
                                    <span>Pasivos</span>
                                </div>
                                <div className="text-base font-bold text-rose-600">
                                    {formatCompactMoney(totalLiabilities)}
                                </div>
                            </div>

                            <div className="col-span-2 pt-2 border-t border-border/50">
                                <div className="flex items-center justify-between">
                                    <span className="text-xs text-muted-foreground font-medium">Patrimonio Neto</span>
                                    <span className="text-lg font-black tracking-tight">
                                        {formatCompactMoney(netWorth)}
                                    </span>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Health Status Bar */}
                    <div className="space-y-1">
                        <div className="flex items-center justify-between text-xs">
                            <span className="text-muted-foreground">Estado</span>
                            <span className={`font-semibold ${healthScore >= 70 ? 'text-emerald-600' :
                                healthScore >= 40 ? 'text-amber-600' :
                                    'text-rose-600'
                                }`}>
                                {healthScore >= 70 ? 'Excelente' : healthScore >= 40 ? 'Bueno' : 'Mejorable'}
                            </span>
                        </div>
                        <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                            <motion.div
                                className={`h-full ${healthScore >= 70 ? 'bg-emerald-500' :
                                    healthScore >= 40 ? 'bg-amber-500' :
                                        'bg-rose-500'
                                    }`}
                                initial={{ width: 0 }}
                                animate={{ width: `${healthScore}%` }}
                                transition={{ duration: 1, ease: "easeOut" }}
                            />
                        </div>
                    </div>
                </CardContent>
            </Card>
        </motion.div>
    )
}
