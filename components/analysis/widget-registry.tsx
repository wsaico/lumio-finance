'use client';

import { WidgetType } from './types';
import React from 'react';
import { AvailableMoneyWidget } from './widgets/available-money';
import {
    IncomeTrendWidget,
    ExpenseTrendWidget,
    NetFlowWidget,
    SavingsRateWidget,
    TransactionsCountWidget
} from './widgets/kpi-group';
import {
    BalanceHistoryWidget,
    FinancialTrendWidget,
    MonthlyEvolutionWidget
} from './widgets/trend-group';
import {
    FinancialHealthWidget,
    CashFlowDailyWidget,
    DailyVolatilityWidget,
    GlobalBudgetWidget
} from './widgets/analysis-group';
import { AccountsListWidget } from './widgets/accounts-list';
import {
    ExpenseTreemapWidget,
    BudgetAlertsWidget,
    DailyMetricsWidget,
    ExpenseCalendarWidget
} from './widgets/details-group';

// Placeholder imports - will be replaced by actual widgets
const PlaceholderWidget = ({ title }: { title: string }) => (
    <div className="w-full h-full min-h-[140px] bg-card border rounded-xl p-4 shadow-sm flex flex-col items-center justify-center text-muted-foreground/50">
        <span className="text-sm font-medium">{title}</span>
    </div>
);

// Map each type to a component
export const WidgetRegistry: Record<WidgetType, React.ComponentType<any>> = {
    // KPIs
    'available-money': AvailableMoneyWidget,
    'income-trend': IncomeTrendWidget,
    'expense-trend': ExpenseTrendWidget,
    'net-flow': NetFlowWidget,
    'savings-rate': SavingsRateWidget,
    'transactions-count': TransactionsCountWidget,

    // Trends
    'balance-history': BalanceHistoryWidget,
    'financial-trend': FinancialTrendWidget,
    'monthly-evolution': MonthlyEvolutionWidget,

    // Analysis
    'financial-health': FinancialHealthWidget,
    'cash-flow-daily': CashFlowDailyWidget,
    'daily-volatility': DailyVolatilityWidget,
    'global-budget': GlobalBudgetWidget,

    // Details
    'accounts-list': AccountsListWidget,
    'expense-treemap': ExpenseTreemapWidget,
    'budget-alerts': BudgetAlertsWidget,
    'daily-metrics': DailyMetricsWidget,
    'expense-calendar': ExpenseCalendarWidget
};
