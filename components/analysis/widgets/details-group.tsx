'use client';

import { Card } from '@/components/ui/card';
import { Treemap, ResponsiveContainer } from 'recharts';
import { ArrowUp, ArrowDown } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useDashboard } from '../dashboard-context';





function DetailWidgetWrapper({
    title,
    subtitle,
    kicker = 'Detalle',
    children
}: {
    title: string;
    subtitle?: string;
    kicker?: string;
    children: React.ReactNode;
}) {
    return (
        <Card className="relative h-full w-full overflow-hidden rounded-2xl border border-white/30 bg-white/70 p-4 shadow-[0_18px_45px_-30px_rgba(15,23,42,0.6)] backdrop-blur-xl dark:border-white/5 dark:bg-zinc-900/60">
            <div className="absolute -bottom-24 right-0 h-32 w-32 rounded-full bg-fuchsia-400/10 blur-3xl" />
            <div className="relative z-10 flex h-full flex-col">
                <div className="mb-3">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">{kicker}</p>
                    <h3 className="text-base font-semibold text-foreground truncate">{title}</h3>
                    {subtitle && (
                        <p className="text-xs text-muted-foreground truncate">{subtitle}</p>
                    )}
                </div>
                <div className="flex-1 min-h-0">
                    {children}
                </div>
            </div>
        </Card>
    );
}

const formatMoney = (value: number) => {
    return `S/ ${value.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
};

const CustomizedContent = (props: any) => {
    const { x, y, width, height, payload, name } = props;
    const value = payload?.value || 0;
    const canLabel = width > 90 && height > 50;

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
                    fill: payload?.fill || '#333',
                    stroke: 'rgba(255,255,255,0.12)',
                    strokeWidth: 1,
                }}
            />
            {canLabel && (
                <>
                    <text
                        x={x + width / 2}
                        y={y + height / 2 - 4}
                        textAnchor="middle"
                        fill="#fff"
                        fontSize={11}
                        fontWeight="bold"
                    >
                        {name}
                    </text>
                    <text
                        x={x + width / 2}
                        y={y + height / 2 + 12}
                        textAnchor="middle"
                        fill="rgba(255,255,255,0.75)"
                        fontSize={10}
                        fontWeight="normal"
                    >
                        {formatMoney(value)}
                    </text>
                </>
            )}
        </g>
    );
};

export function ExpenseTreemapWidget() {
    const { data: dashboardData } = useDashboard();
    const expensesByCategory = dashboardData?.expensesByCategory || [];

    const data = expensesByCategory;

    if (!data.length) {
        return (
            <DetailWidgetWrapper title="Mapa de Gastos">
                <div className="flex h-full items-center justify-center rounded-xl border border-dashed border-muted-foreground/30 bg-muted/30 text-xs text-muted-foreground">
                    Sin gastos registrados
                </div>
            </DetailWidgetWrapper>
        );
    }

    return (
        <DetailWidgetWrapper title="Mapa de Gastos" subtitle="Jerarquia por categoria" kicker="Categorias">
            <ResponsiveContainer width="100%" height="100%">
                <Treemap
                    data={data}
                    dataKey="value"
                    aspectRatio={4 / 3}
                    stroke="transparent"
                    fill="#8884d8"
                    content={<CustomizedContent />}
                    isAnimationActive={true}
                >
                </Treemap>
            </ResponsiveContainer>
        </DetailWidgetWrapper>
    );
}

export function DailyMetricsWidget() {
    const { data: dashboardData } = useDashboard();
    const metrics = dashboardData?.metrics;

    const displayMetrics = [
        {
            label: 'Gasto Promedio Diario',
            value: metrics?.dailyExpenseAvg ? formatMoney(metrics.dailyExpenseAvg) : 'S/ 0.00',
            trend: 'neutral'
        },
        {
            label: 'Ingreso Promedio Diario',
            value: metrics?.dailyIncomeAvg ? formatMoney(metrics.dailyIncomeAvg) : 'S/ 0.00',
            trend: 'neutral'
        },
    ];

    return (
        <DetailWidgetWrapper title="Metricas Diarias">
            <div className="grid gap-3">
                {displayMetrics.map((metric, i) => (
                    <div key={i} className="flex items-center justify-between rounded-xl border border-white/10 bg-white/40 p-3 dark:bg-white/5">
                        <div className="space-y-1">
                            <p className="text-xs text-muted-foreground uppercase tracking-wider">{metric.label}</p>
                            <p className="text-lg font-bold">{metric.value}</p>
                        </div>
                        <div className="rounded-full bg-zinc-900/5 p-2 text-muted-foreground dark:bg-white/10">
                            {metric.trend === 'up' ? <ArrowUp className="w-4 h-4" /> : <ArrowDown className="w-4 h-4" />}
                        </div>
                    </div>
                ))}
            </div>
        </DetailWidgetWrapper>
    );
}

export function BudgetAlertsWidget() {
    const { data: dashboardData } = useDashboard();
    const budgetAlerts = dashboardData?.budgetAlerts || [];

    return (
        <DetailWidgetWrapper title="Alertas de Presupuesto">
            {budgetAlerts.length === 0 ? (
                <div className="flex h-full items-center justify-center rounded-xl border border-dashed border-muted-foreground/30 bg-muted/30 text-xs text-muted-foreground">
                    Sin alertas criticas hoy
                </div>
            ) : (
                <div className="space-y-4 max-h-[160px] overflow-y-auto pr-2 custom-scrollbar">
                    {budgetAlerts.map((alert, i) => (
                        <div key={i} className="space-y-2">
                            <div className="flex justify-between text-sm">
                                <span className="font-medium truncate mr-2">{alert.name}</span>
                                <span className={alert.percent >= 90 ? 'text-red-500 font-bold' : 'text-muted-foreground'}>
                                    {alert.percent}%
                                </span>
                            </div>
                            <div className="h-2 w-full rounded-full bg-secondary">
                                <div className={`h-full rounded-full ${alert.color}`} style={{ width: `${alert.percent}%` }} />
                            </div>
                            <div className="flex justify-between text-[10px] text-muted-foreground">
                                <span>S/ {alert.spent.toLocaleString()}</span>
                                <span>Total: S/ {alert.total.toLocaleString()}</span>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </DetailWidgetWrapper>
    );
}

export function ExpenseCalendarWidget() {
    const { data } = useDashboard();
    const heatmap = data?.activityHeatmap || [];
    const activityDaily = data?.activityDaily || [];
    const now = new Date();
    const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
    const firstDay = new Date(now.getFullYear(), now.getMonth(), 1).getDay(); // 0=Sun
    const totalCells = Math.ceil((firstDay + daysInMonth) / 7) * 7;
    const weekRows = totalCells / 7;
    const fallbackDaily = activityDaily.length
        ? activityDaily
        : heatmap.map((active) => ({ count: active ? 1 : 0, net: 0 }));
    const maxCount = Math.max(1, ...fallbackDaily.map((d) => d.count || 0));
    const cells: Array<{ day: number | null }> = [];

    for (let i = 0; i < totalCells; i++) {
        const dayNumber = i - firstDay + 1;
        if (dayNumber < 1 || dayNumber > daysInMonth) {
            cells.push({ day: null });
        } else {
            cells.push({ day: dayNumber });
        }
    }

    return (
        <DetailWidgetWrapper title="Actividad Financiera">
            <div className="flex h-full flex-col gap-2">
                <div className="flex items-center justify-between text-[10px] text-muted-foreground">
                    <span>Mapa de calor de actividad</span>
                    <span>Mes actual</span>
                </div>

                {fallbackDaily.length === 0 ? (
                    <div className="flex h-full items-center justify-center rounded-xl border border-dashed border-muted-foreground/30 bg-muted/30 text-xs text-muted-foreground">
                        Sin datos de actividad disponibles
                    </div>
                ) : (
                    <div className="flex-1 rounded-lg border border-white/10 bg-white/5 p-1.5 shadow-[inset_0_0_0_1px_rgba(255,255,255,0.03)]">
                        <div className="grid grid-cols-7 gap-1 text-[9px] text-muted-foreground font-medium">
                            {['D', 'L', 'M', 'M', 'J', 'V', 'S'].map((day, idx) => (
                                <div key={`${day}-${idx}`} className="text-center">
                                    {day}
                                </div>
                            ))}
                        </div>
                        <div
                            className="mt-1 grid grid-cols-7 gap-1"
                            style={{ gridTemplateRows: `repeat(${weekRows}, minmax(0, 1fr))` }}
                        >
                            {cells.map((cell, i) => {
                                if (!cell.day) {
                                    return (
                                        <div
                                            key={`cell-${i}`}
                                            className="min-h-[22px] h-full w-full rounded-[5px] border border-transparent text-transparent"
                                        />
                                    );
                                }

                                const daily = fallbackDaily[cell.day - 1] || { count: 0, net: 0 };
                                const count = daily.count || 0;
                                const net = daily.net || 0;
                                const intensity = Math.min(1, count / maxCount);
                                const isPositive = net >= 0;
                                const base = isPositive ? '16,185,129' : '236,72,153';
                                const bg = `rgba(${base}, ${0.12 + intensity * 0.88})`;
                                const glow = `rgba(${base}, ${0.25 + intensity * 0.5})`;

                                return (
                                    <div
                                        key={`cell-${i}`}
                                        className={cn(
                                            'min-h-[22px] h-full w-full rounded-[5px] border border-white/5 transition-all flex items-center justify-center text-[9px] font-semibold text-white'
                                        )}
                                        title={`Dia ${cell.day}: ${count} transacciones, neto ${net.toFixed(2)}`}
                                        style={{
                                            backgroundColor: count > 0 ? bg : 'rgba(255,255,255,0.06)',
                                            boxShadow: count > 0 ? `0 0 10px ${glow}` : 'none'
                                        }}
                                    >
                                        {cell.day}
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                )}

                <div className="flex items-center justify-between text-[9px] text-muted-foreground">
                    <span>Menos</span>
                    <div className="h-1.5 w-16 rounded-full bg-[linear-gradient(90deg,rgba(255,255,255,0.08),rgba(236,72,153,0.9))]" />
                    <span>Mas</span>
                </div>
            </div>
        </DetailWidgetWrapper>
    );
}
