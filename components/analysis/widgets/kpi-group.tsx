'use client';

import { useCurrency } from '@/hooks/use-currency';
import { useDashboard } from '../dashboard-context';

import { KpiCard } from './kpi-card';
import { TrendingUp, TrendingDown, PiggyBank, Activity } from 'lucide-react';

export function IncomeTrendWidget() {
    const { data } = useDashboard();
    const metrics = data?.metrics || { totalIncome: 0, totalExpense: 0, netFlow: 0, savingsRate: 0, transactionsCount: 0 };
    const { format } = useCurrency();

    return (
        <KpiCard
            title="Ingresos Totales"
            value={format(metrics.totalIncome)}
            icon={TrendingUp}
            variant="cyan"
        // trend={{ value: 12.5, isPositive: true, label: "vs mes anterior" }} // TODO: Add Trend to Backend
        />
    );
}

export function ExpenseTrendWidget() {
    const { data } = useDashboard();
    const metrics = data?.metrics || { totalIncome: 0, totalExpense: 0, netFlow: 0, savingsRate: 0, transactionsCount: 0 };
    const { format } = useCurrency();

    return (
        <KpiCard
            title="Gastos Mensuales"
            value={format(metrics.totalExpense)}
            icon={TrendingDown}
            variant="magenta"
        // trend={{ value: 5.2, isPositive: false, label: "Mayor al promedio" }}
        />
    );
}

export function NetFlowWidget() {
    const { data } = useDashboard();
    const metrics = data?.metrics || { totalIncome: 0, totalExpense: 0, netFlow: 0, savingsRate: 0, transactionsCount: 0 };
    const { format } = useCurrency();

    return (
        <KpiCard
            title="Flujo de Caja Neto"
            value={format(metrics.netFlow)}
            icon={PiggyBank}
            variant="black"
        // trend={{ value: 8.1, isPositive: true, label: "Ahorro potencial" }}
        />
    );
}

export function SavingsRateWidget() {
    const { data } = useDashboard();
    const metrics = data?.metrics || { totalIncome: 0, totalExpense: 0, netFlow: 0, savingsRate: 0, transactionsCount: 0 };

    return (
        <KpiCard
            title="Tasa de Ahorro"
            value={`${metrics.savingsRate.toFixed(1)}%`}
            icon={Activity}
            variant="black"
            trend={{ value: 20, isPositive: metrics.savingsRate >= 20, label: "Meta: 20%" }}
        />
    );
}

export function TransactionsCountWidget() {
    const { data } = useDashboard();
    const metrics = data?.metrics || { transactionsCount: 0 };

    return (
        <KpiCard
            title="Transacciones"
            value={metrics.transactionsCount}
            icon={Activity}
            variant="default"
        />
    );
}
