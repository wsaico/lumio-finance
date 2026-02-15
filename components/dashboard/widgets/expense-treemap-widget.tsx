"use client"
import { useSettingsStore } from "@/hooks/useSettingsStore"

import { Treemap, ResponsiveContainer } from 'recharts'
import { useDashboardData } from "@/hooks/useDashboardData"
import { useFormat } from "@/hooks/useFormat"
import { ChartLine } from "lucide-react"
import { motion } from "framer-motion"
import { Card } from "@/components/ui/card"

const CustomizedContent = (props: any) => {
    const { x, y, width, height, index, name, value, formatMoney, isBalanceVisible } = props
    const colors = [
        '#FF007A', // Primary Magenta
        '#00D1FF', // Primary Cyan
        '#7000FF', // Purple
        '#FF4D00', // Orange
        '#00E5E5'  // Teal
    ]
    const displayFill = colors[index % colors.length]
    const canLabel = width > 60 && height > 30

    return (
        <g>
            <rect
                x={x}
                y={y}
                width={width}
                height={height}
                rx={12}
                ry={12}
                style={{
                    fill: displayFill,
                    fillOpacity: 0.8,
                    stroke: 'rgba(0,0,0,0.1)',
                    strokeWidth: 1
                }}
            />
            {canLabel && (
                <foreignObject x={x + 10} y={y + 10} width={width - 20} height={height - 20}>
                    <div className="flex flex-col h-full justify-between items-start pointer-events-none">
                        <span className="text-[10px] font-black text-white/90 uppercase tracking-widest leading-none truncate w-full">
                            {name}
                        </span>
                        <span className="text-[11px] font-bold text-white tabular-nums">
                            {isBalanceVisible ? formatMoney(value) : '***'}
                        </span>
                    </div>
                </foreignObject>
            )}
        </g>
    )
}

export function ExpenseTreemapWidget() {
    const { data: dashboardData, isLoading } = useDashboardData()
    const { formatMoney } = useFormat()
    const { isBalanceVisible } = useSettingsStore()
    const expensesByCategory = dashboardData?.expensesByCategory || []

    if (isLoading) return null

    return (
        <motion.div
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            className="h-full"
        >
            <Card className="widget-surface bg-white dark:bg-zinc-900 border-none h-full flex flex-col overflow-hidden relative shadow-2xl">
                {/* Header Section */}
                <div className="flex items-start justify-between p-6 pb-2">
                    <div className="flex items-center gap-4">
                        <div className="p-3 rounded-2xl bg-[#FF007A]/10 border border-[#FF007A]/20">
                            <ChartLine className="w-5 h-5 text-[#FF007A]" />
                        </div>
                        <div>
                            <h3 className="text-[11px] font-black uppercase tracking-[0.2em] text-zinc-400">Estructura de Gastos</h3>
                            <p className="text-[9px] font-bold text-zinc-500 opacity-60">Participación por Categoría</p>
                        </div>
                    </div>
                </div>

                <div className="flex-1 p-6 relative">
                    <ResponsiveContainer width="100%" height="100%">
                        <Treemap
                            data={expensesByCategory as any[]}
                            dataKey="value"
                            aspectRatio={4 / 3}
                            stroke="transparent"
                            content={<CustomizedContent formatMoney={formatMoney} isBalanceVisible={isBalanceVisible} />}
                            isAnimationActive={true}
                            animationDuration={1200}
                        />
                    </ResponsiveContainer>
                </div>
            </Card>
        </motion.div>
    )
}

