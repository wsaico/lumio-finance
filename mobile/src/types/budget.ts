export type TransactionFilterMode =
  | 'DEFAULT'
  | 'LOANED'
  | 'ADDED_TO_GOAL'
  | 'BALANCE_CORRECTION';

export type BudgetScope = 'GLOBAL' | 'ACCOUNT';
export type BudgetType = 'EXPENSE' | 'SAVINGS';
export type BudgetPeriod = 'MONTHLY';

export interface BudgetFormData {
  name: string;
  amount: number | string;
  type: BudgetType;
  period: BudgetPeriod;
  color: string;
  currencyCode: string;
  budgetYear?: number;
  budgetMonth?: number;
  transactionFilterMode: TransactionFilterMode;
  budgetScope: BudgetScope;
  includeLoaned: boolean;
  includeGoalTransactions: boolean;
  includeBalanceCorrections: boolean;
  includeFromOtherBudgets: boolean;
  excludedBudgetIds: string[];
  accountIds: string[];
  includeCategories: string[];
  excludeCategories: string[];
  includeTags: string[];
}

export interface Budget extends BudgetFormData {
  id: string;
  userId: string;
  spent: number;
  isActive: boolean;
  isZbbControlled?: boolean;
  zbbAllocationId?: string | null;
  createdAt: string;
  updatedAt?: string;
  // API also returns snake_case fields alongside camelCase
  currency_code?: string;
  include_categories?: string[];
  stats?: {
    spent: number;
    remaining: number;
    percentage: number;
  };
}
