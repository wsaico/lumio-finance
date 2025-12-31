
export type BudgetingMethod = 'TRADITIONAL' | '50_30_20';

export type BudgetRule = 'NEED' | 'WANT' | 'SAVINGS';

export const BUDGET_RULES: { [key in BudgetRule]: { label: string, color: string, percent: number } } = {
    'NEED': { label: 'Necesidades', color: 'blue', percent: 50 },
    'WANT': { label: 'Deseos', color: 'purple', percent: 30 },
    'SAVINGS': { label: 'Ahorros', color: 'emerald', percent: 20 }
};
