"use client"

import { useMemo, useState, useEffect } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { PieChart, Pie, Cell, ResponsiveContainer, Sector } from "recharts"
import { Loader2, Info, PieChart as PieChartIcon } from "lucide-react"
import { formatCurrency, cn } from "@/lib/utils"
import { format } from "date-fns"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { useSettingsStore } from "@/hooks/useSettingsStore"
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover"

interface ExpenseCategory {
    name: string
    value: number
    color: string
    percentage: number
}

interface ExpenseStructureWidgetProps {
    month?: Date
}

// Premium Color Palette
const COLORS = [
    '#10b981', // emerald-500 (Primary)
    '#3b82f6', // blue-500
    '#8b5cf6', // violet-500
    '#f59e0b', // amber-500
    '#ef4444', // red-500
    '#64748b', // slate-500 (Others)
];

const renderActiveShape = (props: any) => {
    const { cx, cy, innerRadius, outerRadius, startAngle, endAngle, fill, payload, value, percent } = props;

    return (
        <g>
            <Sector
                cx={cx}
                cy={cy}
                innerRadius={innerRadius}
                outerRadius={outerRadius + 4}
                startAngle={startAngle}
                endAngle={endAngle}
                fill={fill}
                fillOpacity={0.8}
            />
            <Sector
                cx={cx}
                cy={cy}
                startAngle={startAngle}
                endAngle={endAngle}
                innerRadius={innerRadius - 6}
                outerRadius={innerRadius - 2}
                fill={fill}
            />
        </g>
    );
};

export function ExpenseStructureWidget({ month }: ExpenseStructureWidgetProps) {
    const { currencyCode } = useSettingsStore()
    const [data, setData] = useState<ExpenseCategory[]>([])
    // ... rest of component ...
    const [total, setTotal] = useState(0)
    const [isLoading, setIsLoading] = useState(true)
    const [activeIndex, setActiveIndex] = useState<number | undefined>(undefined)

    // Derived state for dependency stability
    const targetMonth = month || new Date()
    const monthStr = format(targetMonth, 'yyyy-MM') // Use format instead of toISOString to avoid timezone shifts

    useEffect(() => {
        const controller = new AbortController()

        async function fetchExpenseBreakdown() {
            setIsLoading(true)
            try {
                // Add timeout to prevent hanging
                const timeoutId = setTimeout(() => controller.abort(), 15000)

                const res = await fetch(`/api/analytics/expense-breakdown?month=${monthStr}`, {
                    signal: controller.signal
                })
                clearTimeout(timeoutId)

                if (res.ok) {
                    const result = await res.json()
                    setData(result.categories || [])
                    setTotal(result.total || 0)
                }
            } catch (error: any) {
                if (error.name === 'AbortError') return
                console.error('Error fetching expense breakdown:', error)
            } finally {
                setIsLoading(false)
            }
        }

        fetchExpenseBreakdown()

        return () => controller.abort()
    }, [monthStr])

    const onPieEnter = (_: any, index: number) => {
        setActiveIndex(index)
    }

    const onPieLeave = () => {
        setActiveIndex(undefined)
    }

    // Determine what to show in the center
    const centerLabel = useMemo(() => {
        if (activeIndex !== undefined && data[activeIndex]) {
            const item = data[activeIndex]
            return {
                label: item.name === 'Otros' ? 'Otros' : item.name.split(' ')[0],
                amount: item.value,
                subtext: `${item.percentage.toFixed(1)}%`
            }
        }
        return {
            label: 'Total',
            amount: total,
            subtext: 'Gastos del Mes'
        }
    }, [activeIndex, data, total])

    if (isLoading) {
        return (
            <Card className="widget-surface h-[300px] flex items-center justify-center">
                <div className="flex flex-col items-center">
                    <Loader2 className="w-8 h-8 text-indigo-500 animate-spin mb-2" />
                    <p className="text-sm text-neutral-500 animate-pulse">Cargando datos...</p>
                </div>
            </Card>
        )
    }

    if (data.length === 0) {
        return (
            <Card className="widget-surface h-[300px] flex items-center justify-center">
                <div className="flex flex-col items-center">
                    <PieChartIcon className="w-12 h-12 text-neutral-300 mb-2" />
                    <p className="text-sm text-muted-foreground">No hay gastos registrados este mes</p>
                </div>
            </Card>
        )
    }

    return (
        <Card className="widget-surface h-full flex flex-col">
            <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                    <div>
                        <CardTitle className="text-lg font-bold flex items-center gap-2">
                            Estructura de Gastos
                            <Popover>
                                <PopoverTrigger asChild>
                                    <button className="rounded-full p-1 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors focus:outline-none">
                                        <Info className="w-4 h-4 text-neutral-400" />
                                    </button>
                                </PopoverTrigger>
                                <PopoverContent className="w-80">
                                    <div className="grid gap-4">
                                        <div className="space-y-2">
                                            <h4 className="font-medium leading-none">Distribución Inteligente</h4>
                                            <p className="text-sm text-muted-foreground">
                                                Este gráfico muestra tus principales categorías de gasto.
                                                Para mantener la claridad, las categorías menores se agrupan automáticamente en <strong>"Otros"</strong>.
                                            </p>
                                        </div>
                                    </div>
                                </PopoverContent>
                            </Popover>
                        </CardTitle>
                        <p className="text-xs text-muted-foreground">Top categorías del mes</p>
                    </div>
                </div>
            </CardHeader>
            <CardContent className="flex-1 flex flex-col md:flex-row items-center justify-between gap-4 pt-0 overflow-hidden">
                {/* Chart Section */}
                <div className="relative w-full h-[220px] md:w-[45%] flex items-center justify-center shrink-0">
                    <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                            {/* @ts-ignore */}
                            <Pie
                                activeIndex={activeIndex}
                                activeShape={renderActiveShape}
                                data={data as any[]}
                                cx="50%"
                                cy="50%"
                                innerRadius={65}
                                outerRadius={85}
                                paddingAngle={4}
                                dataKey="value"
                                onMouseEnter={onPieEnter}
                                onMouseLeave={onPieLeave}
                            >
                                {data.map((entry, index) => (
                                    <Cell
                                        key={`cell-${index}`}
                                        fill={entry.color ? entry.color : COLORS[index % COLORS.length]}
                                        stroke="none"
                                        style={{ outline: 'none' }}
                                    />
                                ))}
                            </Pie>
                        </PieChart>
                    </ResponsiveContainer>

                    {/* CENTER LABEL (Absolute Positioning) */}
                    <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                        <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                            {centerLabel.label}
                        </span>
                        <span className="text-xl font-black text-foreground">
                            {formatCurrency(centerLabel.amount, currencyCode).replace(currencyCode, '').trim()}
                        </span>
                        <span className="text-xs font-bold" style={{ color: activeIndex !== undefined && data[activeIndex] ? data[activeIndex].color : '#94a3b8' }}>
                            {centerLabel.subtext}
                        </span>
                    </div>
                </div>

                {/* Legend Section */}
                <div className="w-full md:w-[55%] space-y-2.5 overflow-y-auto max-h-[220px] custom-scrollbar pr-1">
                    {data.map((category, index) => (
                        <motion.div
                            key={category.name}
                            initial={{ opacity: 0, x: 20 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: index * 0.1 }}
                            className={`flex items-center justify-between p-2 rounded-lg transition-colors cursor-pointer ${activeIndex === index ? 'bg-neutral-100 dark:bg-neutral-800' : 'hover:bg-neutral-50 dark:hover:bg-neutral-800/50'}`}
                            onMouseEnter={() => setActiveIndex(index)}
                            onMouseLeave={onPieLeave}
                        >
                            <div className="flex items-center gap-3">
                                <div
                                    className="w-3 h-3 rounded-full ring-2 ring-background shadow-sm"
                                    style={{ backgroundColor: category.color || COLORS[index % COLORS.length] }}
                                />
                                <span className="text-sm font-medium truncate max-w-[120px]" title={category.name}>
                                    {category.name}
                                </span>
                            </div>
                            <div className="text-right shrink-0 min-w-[70px]">
                                <div className="text-[13px] font-black tracking-tight leading-none mb-0.5">
                                    {formatCurrency(category.value, currencyCode)}
                                </div>
                                <div className="text-[10px] font-bold text-muted-foreground/60">
                                    {category.percentage.toFixed(1)}%
                                </div>
                            </div>
                        </motion.div>
                    ))}
                </div>
            </CardContent>
        </Card>
    )
}

