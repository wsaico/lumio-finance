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
  balance: number;
}

export interface ExpenseByCategory {
  name: string;
  value: number;
  fill: string;
  children?: ExpenseByCategory[];
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
  history: MonthlyMetric[];
  accounts: AccountSummary[];
  expensesByCategory: ExpenseByCategory[];
  healthScore: number;
  activityHeatmap: boolean[];
  activityDaily?: ActivityDay[];
  budget?: {
    totalActual: number;
    totalSpent: number;
    usagePercentage: number;
  };
  budgetAlerts?: BudgetAlert[];
}
