'use client';

import { Card } from '@/components/ui/card';
import {
    RadarChart,
    PolarGrid,
    PolarAngleAxis,
    Radar,
    ResponsiveContainer,
    RadialBarChart,
    RadialBar
} from 'recharts';

import { useDashboard } from '../dashboard-context';

function AnalysisWidgetWrapper({ title, children }: { title: string; children: React.ReactNode }) {
    return (
        <Card className="relative h-full w-full overflow-hidden rounded-2xl border border-white/30 bg-white/70 p-4 shadow-[0_18px_45px_-30px_rgba(15,23,42,0.6)] backdrop-blur-xl dark:border-white/5 dark:bg-zinc-900/60">
            <div className="absolute -top-24 right-0 h-32 w-32 rounded-full bg-sky-400/10 blur-3xl" />
            <div className="relative z-10 flex h-full flex-col">
                <div>
                    <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">Analisis</p>
                    <h3 className="text-base font-semibold text-foreground truncate">{title}</h3>
                </div>
                <div className="flex-1 min-h-0 pt-3">
                    {children}
                </div>
            </div>
        </Card>
    );
}

export function FinancialHealthWidget() {
    const { data } = useDashboard();
    const score = data?.healthScore || 0;

    const dataChart = [
        { subject: 'Global', A: score, fullMark: 100 },
        { subject: 'Estabilidad', A: score * 0.8, fullMark: 100 },
        { subject: 'Ahorro', A: (data?.metrics.savingsRate || 0) * 5, fullMark: 100 },
    ];

    return (
        <AnalysisWidgetWrapper title="Salud Financiera">
            <div className="relative h-full">
                <ResponsiveContainer width="100%" height="100%">
                    <RadarChart cx="50%" cy="50%" outerRadius="80%" data={dataChart}>
                        <PolarGrid stroke="#334155" />
                        <PolarAngleAxis dataKey="subject" tick={{ fill: '#94a3b8', fontSize: 10 }} />
                        <Radar name="Salud" dataKey="A" stroke="#06b6d4" fill="#06b6d4" fillOpacity={0.25} />
                    </RadarChart>
                </ResponsiveContainer>
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                    <div className="text-center">
                        <span className="text-2xl font-semibold text-foreground">{score}</span>
                        <p className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground">score</p>
                    </div>
                </div>
            </div>
        </AnalysisWidgetWrapper>
    );
}

export function CashFlowDailyWidget() {
    return (
        <AnalysisWidgetWrapper title="Flujo de Caja">
            <div className="flex h-full items-center justify-center rounded-xl border border-dashed border-muted-foreground/30 bg-muted/30 text-xs text-muted-foreground">
                Proximamente: analisis diario
            </div>
        </AnalysisWidgetWrapper>
    );
}

export function DailyVolatilityWidget() {
    return (
        <AnalysisWidgetWrapper title="Volatilidad Diaria">
            <div className="flex h-full items-center justify-center rounded-xl border border-dashed border-muted-foreground/30 bg-muted/30 text-xs text-muted-foreground">
                Proximamente: historico diario
            </div>
        </AnalysisWidgetWrapper>
    );
}

export function GlobalBudgetWidget() {
    const { data } = useDashboard();
    const budget = data?.budget || { totalActual: 0, totalSpent: 0, usagePercentage: 0 };

    const chartData = [
        { name: 'Gastado', value: budget.usagePercentage || 0, fill: '#10b981' },
        { name: 'Restante', value: 100 - (budget.usagePercentage || 0), fill: '#1e293b' }
    ];

    return (
        <AnalysisWidgetWrapper title="Presupuesto Global">
            <div className="relative h-full">
                <div className="absolute inset-0 flex items-center justify-center">
                    <div className="text-center">
                        <span className="text-3xl font-semibold text-emerald-500">
                            {Math.floor(budget.usagePercentage)}%
                        </span>
                        <p className="text-[10px] text-muted-foreground mt-1 uppercase tracking-[0.2em]">
                            S/ {budget.totalSpent.toLocaleString()} / S/ {budget.totalActual.toLocaleString()}
                        </p>
                    </div>
                </div>
                <ResponsiveContainer width="100%" height="100%">
                    <RadialBarChart
                        cx="50%"
                        cy="50%"
                        innerRadius="80%"
                        outerRadius="100%"
                        barSize={8}
                        data={chartData}
                        startAngle={180}
                        endAngle={0}
                    >
                        <RadialBar background dataKey="value" cornerRadius={10} />
                    </RadialBarChart>
                </ResponsiveContainer>
            </div>
        </AnalysisWidgetWrapper>
    );
}
