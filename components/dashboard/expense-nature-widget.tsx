"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from "recharts"
import { useEffect, useState } from "react"
import { Info } from "lucide-react"

export function ExpenseNatureWidget() {
    const [data, setData] = useState<any[]>([])
    const [isLoading, setIsLoading] = useState(true)

    useEffect(() => {
        async function fetchData() {
            try {
                // Determine current month
                const now = new Date()
                const month = now.getMonth() + 1
                const year = now.getFullYear()

                const res = await fetch(`/api/analytics/budget-rule?month=${month}&year=${year}`)
                if (res.ok) {
                    const result = await res.json()
                    const chartData = [
                        { name: 'Debo', value: result?.savings?.spent || 0, color: '#ef4444', label: 'Ahorro/Deuda' },
                        { name: 'Necesito', value: result?.needs?.spent || 0, color: '#f59e0b', label: 'Necesidades' },
                        { name: 'Quiero', value: result?.wants?.spent || 0, color: '#10b981', label: 'Deseos' }
                    ]
                    setData(chartData)
                } else {
                    setData([])
                }
            } catch (error) {
                console.error('Error fetching expense nature:', error)
                setData([])
            } finally {
                setIsLoading(false)
            }
        }

        fetchData()
    }, [])

    if (isLoading) {
        return (
            <Card className="glass border-none shadow-premium-md">
                <CardHeader className="pb-3">
                    <CardTitle className="text-base md:text-lg font-semibold">Naturaleza del Gasto</CardTitle>
                </CardHeader>
                <CardContent className="flex items-center justify-center h-64">
                    <div className="animate-pulse text-muted-foreground">Cargando...</div>
                </CardContent>
            </Card>
        )
    }

    return (
        <Card className="glass border-none shadow-premium-md">
            <CardHeader className="pb-2">
                <div className="flex items-center justify-between mb-2">
                    <CardTitle className="text-base md:text-lg font-semibold">Naturaleza del Gasto</CardTitle>
                    <Info className="h-4 w-4 text-muted-foreground" />
                </div>
                <Tabs defaultValue="all" className="w-full">
                    <TabsList className="grid w-full grid-cols-4 h-8">
                        <TabsTrigger value="all" className="text-xs">Todo</TabsTrigger>
                        <TabsTrigger value="debo" className="text-xs">Debo</TabsTrigger>
                        <TabsTrigger value="necesito" className="text-xs">Nec.</TabsTrigger>
                        <TabsTrigger value="quiero" className="text-xs">Quiero</TabsTrigger>
                    </TabsList>
                </Tabs>
            </CardHeader>
            <CardContent>
                <ResponsiveContainer width="100%" height={220}>
                    <BarChart data={data} layout="vertical" margin={{ left: 0, right: 20 }}>
                        <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} className="text-border/30" />
                        <XAxis type="number" hide />
                        <YAxis
                            dataKey="name"
                            type="category"
                            width={60}
                            tick={{ fontSize: 12, fill: '#6b7280' }}
                            axisLine={false}
                            tickLine={false}
                        />
                        <Tooltip
                            cursor={{ fill: 'transparent' }}
                            contentStyle={{
                                backgroundColor: 'hsl(var(--background))',
                                border: '1px solid hsl(var(--border))',
                                borderRadius: '8px'
                            }}
                        />
                        <Bar dataKey="value" radius={[0, 4, 4, 0]} barSize={20}>
                            {data?.map((entry: any, index: number) => (
                                <Cell key={`cell-${index}`} fill={entry.color} />
                            ))}
                        </Bar>
                    </BarChart>
                </ResponsiveContainer>

                {/* Legend/Summary */}
                <div className="flex justify-between items-center mt-2 px-2">
                    {data?.map((item: any) => (
                        <div key={item.name} className="flex flex-col items-center">
                            <div className="flex items-center gap-1.5 mb-1">
                                <div className="w-2 h-2 rounded-full" style={{ backgroundColor: item.color }} />
                                <span className="text-[10px] text-muted-foreground uppercase">{item.name}</span>
                            </div>
                            <span className="text-xs font-bold">S/ {item.value.toLocaleString('es-PE', { maximumFractionDigits: 0 })}</span>
                        </div>
                    ))}
                </div>
            </CardContent>
        </Card>
    )
}
