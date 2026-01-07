'use client';

import { Card } from '@/components/ui/card';
import {
    AreaChart,
    Area,
    XAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
    BarChart,
    Bar
} from 'recharts';
import { useDashboard } from '../dashboard-context';

function ChartWidgetWrapper({ title, subtitle, children }: { title: string; subtitle?: string; children: React.ReactNode }) {
    return (
        <Card className="relative h-full w-full overflow-hidden rounded-2xl border border-white/30 bg-white/70 p-4 shadow-[0_18px_45px_-30px_rgba(15,23,42,0.6)] backdrop-blur-xl dark:border-white/5 dark:bg-zinc-900/60">
            <div className="absolute -top-24 left-0 h-32 w-32 rounded-full bg-blue-400/10 blur-3xl" />
            <div className="relative z-10 flex h-full flex-col">
                <div className="mb-3">
                    <p className="text-[12px] font-bold uppercase tracking-[0.2em] text-muted-foreground/80">Tendencias</p>
                    <h3 className="text-base font-semibold text-foreground truncate">{title}</h3>
                    {subtitle && <p className="text-xs text-muted-foreground truncate">{subtitle}</p>}
                </div>
                <div className="flex-1 min-h-0">
                    {children}
                </div>
            </div>
        </Card>
    );
}

export function BalanceHistoryWidget() {
    const { data } = useDashboard();
    const history = data?.history || [];

    return (
        <ChartWidgetWrapper title="Balance Mensual" subtitle="Historico de flujo neto (6 meses)">
            <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={history}>
                    <defs>
                        <linearGradient id="colorBalance" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#06b6d4" stopOpacity={0.3} />
                            <stop offset="95%" stopColor="#06b6d4" stopOpacity={0} />
                        </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(148,163,184,0.2)" />
                    <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fill: '#9ca3af', fontSize: 11 }} />
                    <Tooltip
                        contentStyle={{ backgroundColor: 'rgba(15,23,42,0.9)', border: 'none', borderRadius: '10px' }}
                        itemStyle={{ color: '#fff' }}
                        formatter={(value: any) => [`S/ ${Number(value).toFixed(2)}`, 'Balance']}
                    />
                    <Area
                        type="monotone"
                        dataKey="balance"
                        stroke="#06b6d4"
                        fillOpacity={1}
                        fill="url(#colorBalance)"
                        strokeWidth={2}
                    />
                </AreaChart>
            </ResponsiveContainer>
        </ChartWidgetWrapper>
    );
}

export function FinancialTrendWidget() {
    const { data } = useDashboard();
    const history = data?.history || [];

    return (
        <ChartWidgetWrapper title="Tendencia Financiera" subtitle="Ingresos vs gastos (ultimos 6 meses)">
            <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={history}>
                    <defs>
                        <linearGradient id="colorIncome" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#06b6d4" stopOpacity={0.3} />
                            <stop offset="95%" stopColor="#06b6d4" stopOpacity={0} />
                        </linearGradient>
                        <linearGradient id="colorExpense" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#ec4899" stopOpacity={0.3} />
                            <stop offset="95%" stopColor="#ec4899" stopOpacity={0} />
                        </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(148,163,184,0.2)" />
                    <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fill: '#9ca3af', fontSize: 11 }} />
                    <Tooltip
                        contentStyle={{ backgroundColor: 'rgba(15,23,42,0.9)', border: 'none', borderRadius: '10px' }}
                        formatter={(value: any) => [`S/ ${Number(value).toFixed(2)}`, '']}
                    />
                    <Area type="monotone" dataKey="income" name="Ingresos" stackId="1" stroke="#06b6d4" fill="url(#colorIncome)" strokeWidth={2} />
                    <Area type="monotone" dataKey="expense" name="Gastos" stackId="2" stroke="#ec4899" fill="url(#colorExpense)" strokeWidth={2} />
                </AreaChart>
            </ResponsiveContainer>
        </ChartWidgetWrapper>
    );
}

export function MonthlyEvolutionWidget() {
    const { data } = useDashboard();
    const history = data?.history || [];

    return (
        <ChartWidgetWrapper title="Evolucion Mensual" subtitle="Comparativa de ingresos y gastos">
            <ResponsiveContainer width="100%" height="100%">
                <BarChart data={history}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(148,163,184,0.2)" />
                    <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fill: '#9ca3af', fontSize: 11 }} />
                    <Tooltip
                        cursor={{ fill: 'transparent' }}
                        contentStyle={{ backgroundColor: 'rgba(15,23,42,0.9)', border: 'none', borderRadius: '10px' }}
                        formatter={(value: any) => [`S/ ${Number(value).toFixed(2)}`, '']}
                    />
                    <Bar dataKey="income" name="Ingresos" fill="#06b6d4" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="expense" name="Gastos" fill="#ec4899" radius={[4, 4, 0, 0]} />
                </BarChart>
            </ResponsiveContainer>
        </ChartWidgetWrapper>
    );
}
