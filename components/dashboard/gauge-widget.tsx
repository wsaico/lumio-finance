"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { useFormat } from "@/hooks/useFormat"
import { TrendingUp, TrendingDown, Wallet } from "lucide-react"
import { motion } from "framer-motion"

interface GaugeProps {
    value: number
    max: number
    label: string
    color: string
    icon: React.ReactNode
}

function Gauge({ value, max, label, color, icon }: GaugeProps) {
    const safeMax = max > 0 ? max : 1
    const percentage = Math.min(Math.abs(value) / safeMax * 100, 100)
    const isNegative = value < 0

    // Calculate rotation for the needle (0-180 degrees)
    const rotation = (percentage / 100) * 180 - 90

    return (
        <div className="flex flex-col items-center gap-3">
            <div className="relative w-32 h-16">
                {/* Background arc */}
                <svg className="w-full h-full" viewBox="0 0 100 50">
                    <path
                        d="M 10 45 A 40 40 0 0 1 90 45"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="8"
                        className="text-muted/20"
                    />
                    {/* Progress arc */}
                    <motion.path
                        d="M 10 45 A 40 40 0 0 1 90 45"
                        fill="none"
                        stroke={color}
                        strokeWidth="8"
                        strokeLinecap="round"
                        strokeDasharray={`${percentage * 1.26} 126`}
                        initial={{ strokeDasharray: "0 126" }}
                        animate={{ strokeDasharray: `${percentage * 1.26} 126` }}
                        transition={{ duration: 1, ease: "easeOut" }}
                    />
                    {/* Needle */}
                    <motion.line
                        x1="50"
                        y1="45"
                        x2="50"
                        y2="15"
                        stroke={color}
                        strokeWidth="2"
                        strokeLinecap="round"
                        initial={{ transform: "rotate(-90deg)" }}
                        animate={{ transform: `rotate(${rotation}deg)` }}
                        transition={{ duration: 1, ease: "easeOut" }}
                        style={{ transformOrigin: "50px 45px" }}
                    />
                    {/* Center dot */}
                    <circle cx="50" cy="45" r="3" fill={color} />
                </svg>
            </div>

            <div className="flex flex-col items-center gap-1">
                <div className="flex items-center gap-1.5">
                    <div className="text-muted-foreground">{icon}</div>
                    <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                        {label}
                    </span>
                </div>
                <span
                    className="text-2xl font-bold tabular-nums"
                    style={{ color: isNegative ? '#ef4444' : color }}
                >
                    {isNegative ? '-' : ''}{Math.abs(value).toLocaleString('es-PE', {
                        minimumFractionDigits: 0,
                        maximumFractionDigits: 0
                    })}
                </span>
            </div>
        </div>
    )
}

interface GaugeWidgetProps {
    balance: number
    income: number
    expenses: number
    currency?: string
}

export function GaugeWidget({ balance, income, expenses, currency = "PEN" }: GaugeWidgetProps) {
    const { formatCompactMoney } = useFormat()

    // Calculate max values for gauges (use the highest value + 20% buffer)
    const maxValue = Math.max(Math.abs(balance), income, expenses) * 1.2

    return (
        <Card className="relative overflow-hidden">
            <CardHeader className="pb-3">
                <CardTitle className="text-base font-semibold">Panel de Control</CardTitle>
            </CardHeader>
            <CardContent>
                <div className="grid grid-cols-3 gap-6">
                    <Gauge
                        value={balance}
                        max={maxValue}
                        label="Balance"
                        color={balance >= 0 ? "#10b981" : "#ef4444"}
                        icon={<Wallet className="h-4 w-4" />}
                    />
                    <Gauge
                        value={income}
                        max={maxValue}
                        label="Ingresos"
                        color="#10b981"
                        icon={<TrendingUp className="h-4 w-4" />}
                    />
                    <Gauge
                        value={expenses}
                        max={maxValue}
                        label="Gastos"
                        color="#ef4444"
                        icon={<TrendingDown className="h-4 w-4" />}
                    />
                </div>
            </CardContent>
        </Card>
    )
}
