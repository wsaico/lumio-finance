export type WidgetSize = 'small' | 'medium' | 'large' | 'full' | 'wide';

export type WidgetType =
    // Row 1: KPIs
    | 'available-money'
    | 'income-trend'
    | 'expense-trend'
    | 'net-flow'
    | 'savings-rate'
    | 'transactions-count'
    // Row 2: Trends
    | 'balance-history'
    | 'financial-trend'
    | 'monthly-evolution'
    // Row 3: Deep Analysis
    | 'financial-health'
    | 'cash-flow-daily'
    | 'daily-volatility'
    | 'global-budget'
    // Row 4: Details
    | 'accounts-list'
    | 'expense-treemap'
    | 'budget-alerts'
    | 'daily-metrics'
    | 'expense-calendar';

export interface WidgetInstance {
    id: string;
    type: WidgetType;
    size: WidgetSize;
    order: number;
    isVisible: boolean;
}

export const WIDGET_SIZES: Record<WidgetSize, string> = {
    small: 'col-span-12 sm:col-span-4 lg:col-span-2',
    medium: 'col-span-12 sm:col-span-6 lg:col-span-4',
    large: 'col-span-12 lg:col-span-6 row-span-2',
    wide: 'col-span-12 lg:col-span-6',
    full: 'col-span-12 row-span-2'
};

export interface WidgetDefinition {
    type: WidgetType;
    title: string;
    defaultSize: WidgetSize;
    description: string;
}

// Data Interfaces
export interface AccountSummary {
    id: string;
    name: string;
    currency: string;
    balance: number;
    type: string;
}

export interface MonthlyMetric {
    month: string;
    income: number;
    expense: number;
    balance: number; // End of month balance approximation or net flow
}

export interface ExpenseByCategory {
    name: string;
    value: number;
    fill: string;
    children?: ExpenseByCategory[]; // For hierarchy
}

export interface BudgetAlert {
    name: string;
    total: number;
    spent: number;
    percent: number;
    color: string;
}

export interface ActivityDay {
    count: number;
    net: number;
}

export interface DashboardData {
    // KPIs
    metrics: {
        availableMoney: number;
        totalIncome: number;
        totalExpense: number;
        netFlow: number;
        savingsRate: number;
        transactionsCount: number;
        dailyIncomeAvg?: number;
        dailyExpenseAvg?: number;
    };

    // Charts
    history: MonthlyMetric[]; // Last 6 months

    // Details
    accounts: AccountSummary[];
    expensesByCategory: ExpenseByCategory[]; // Top 6 categories

    // Health (Derived or Simplified)
    healthScore: number; // 0-100

    // Activity
    activityHeatmap: boolean[]; // Legacy boolean map
    activityDaily?: ActivityDay[]; // Per-day activity for current month

    // New: Budget Comparison
    budget?: {
        totalActual: number;
        totalSpent: number;
        usagePercentage: number;
    };
    budgetAlerts?: BudgetAlert[];
}
