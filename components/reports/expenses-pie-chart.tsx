"use client"

import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip, Legend } from 'recharts'

interface ExpensesPieChartProps {
    data: { id?: string, name: string, amount: number, color: string }[]
    onSliceClick?: (categoryId: string) => void
}

export function ExpensesPieChart({ data = [], onSliceClick }: ExpensesPieChartProps) {
    if (!data || data.length === 0) {
        return (
            <div className="flex items-center justify-center h-[300px] text-muted-foreground text-xs font-semibold uppercase tracking-widest border border-dashed border-muted-foreground/20 rounded-2xl bg-muted/5">
                Sin datos de gastos este mes
            </div>
        )
    }

    return (
        <ResponsiveContainer width="100%" height={300}>
            <PieChart>
                <Pie
                    data={data}
                    cx="50%"
                    cy="45%"
                    innerRadius={60}
                    outerRadius={85}
                    paddingAngle={5}
                    dataKey="amount"
                    stroke="none"
                    animationBegin={0}
                    animationDuration={1500}
                    label={((props: any) => {
                        const { name, percent } = props
                        const p = (percent || 0) * 100
                        return `${name} ${p.toFixed(0)}%`
                    }) as any}
                    labelLine={true}
                    onClick={(entry: any) => {
                        if (onSliceClick && entry.id) {
                            onSliceClick(entry.id)
                        }
                    }}
                    style={{ cursor: onSliceClick ? 'pointer' : 'default' }}
                >
                    {data.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color || '#666'} />
                    ))}
                </Pie>
                <Tooltip
                    contentStyle={{
                        backgroundColor: 'rgba(0, 0, 0, 0.8)',
                        backdropFilter: 'blur(8px)',
                        borderRadius: '16px',
                        border: '1px solid rgba(255,255,255,0.1)',
                        boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
                        color: '#fff',
                        fontSize: '11px',
                        fontWeight: 'bold'
                    }}
                    itemStyle={{ color: '#fff' }}
                    formatter={(value: number | string | undefined) => [`S/ ${Number(value || 0).toFixed(2)}`, 'Gasto']}
                />
                <Legend
                    verticalAlign="bottom"
                    height={36}
                    content={({ payload }) => (
                        <div className="flex flex-wrap justify-center gap-x-4 gap-y-2 mt-4">
                            {payload?.map((entry: any, index: number) => (
                                <div key={`item-${index}`} className="flex items-center gap-1.5">
                                    <div className="w-2 h-2 rounded-full" style={{ backgroundColor: entry.color }} />
                                    <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-tight">
                                        {entry.value}
                                    </span>
                                </div>
                            ))}
                        </div>
                    )}
                />
            </PieChart>
        </ResponsiveContainer>
    )
}
