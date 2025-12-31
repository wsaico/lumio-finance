// Budget Types with Advanced Filtering

export type TransactionFilterMode =
  | 'DEFAULT'          // Por defecto - todas las transacciones normales
  | 'EXPENSE'          // Solo gastos
  | 'INCOME'           // Solo ingresos
  | 'LOANED'           // Solo pr\u00e9stamos (prestados/pedidos)
  | 'ADDED_TO_BUDGETS' // Agregado a otros presupuestos
  | 'ADDED_TO_GOAL'    // Agregado al objetivo (savings goal)
  | 'BALANCE_CORRECTION' // Corrección de saldo

export type BudgetScope =
  | 'GLOBAL'           // Global (Todas las cuentas)
  | 'ACCOUNT'          // Cuenta Específica

export type BudgetType = 'EXPENSE' | 'SAVINGS'
export type BudgetPeriod = 'MONTHLY' | 'CUSTOM'

export interface BudgetFormData {
  // Basic Info
  name: string
  amount: number | string
  type: BudgetType
  period: BudgetPeriod
  color: string
  currencyCode: string

  // Date Range
  startDate: Date
  endDate: Date

  // Transaction Filters
  transactionFilterMode: TransactionFilterMode
  budgetScope: BudgetScope

  // Advanced Filters
  includeLoaned: boolean
  includeGoalTransactions: boolean
  includeBalanceCorrections: boolean
  includeFromOtherBudgets: boolean
  excludedBudgetIds: string[]

  // Account & Category Filters
  accountIds: string[]
  includeCategories: string[]
  excludeCategories: string[]
  includeTags: string[]
}

export interface Budget extends BudgetFormData {
  id: string
  userId: string
  spent: number
  isActive: boolean
  createdAt: Date
  updatedAt: Date
  stats?: {
    spent: number
    remaining: number
    percentage: number
  }
}

// Filter options for UI
// Filter options for UI
export type FilterCategory = 'NEEDS' | 'WANTS' | 'SAVINGS' | 'NEUTRAL' | 'MIXED'

export interface TransactionFilterOption {
  value: TransactionFilterMode
  label: string
  description: string
  icon?: string
  checked?: boolean
  filterCategory?: FilterCategory // For 50/30/20 Tags
}

export const TRANSACTION_FILTER_OPTIONS: TransactionFilterOption[] = [
  {
    value: 'DEFAULT',
    label: 'Gastos Reales',
    description: 'Tus gastos del día a día (Comida, Servicios, Transporte). Lo que realmente consumes.',
    checked: true,
    filterCategory: 'MIXED' // 50% Needs / 30% Wants
  },
  {
    value: 'LOANED',
    label: 'Préstamos a Terceros',
    description: 'Dinero que prestas y esperas recuperar. No es una pérdida real, es una cuenta por cobrar.',
    filterCategory: 'NEUTRAL' // Cashflow
  },
  {
    value: 'ADDED_TO_GOAL',
    label: 'Ahorro para Metas',
    description: 'Dinero que envías a tus metas. Técnicamente no lo "gastaste", te lo "pagaste" a tu futuro.',
    filterCategory: 'SAVINGS' // 20% Savings
  },
  {
    value: 'BALANCE_CORRECTION',
    label: 'Ajustes y Transferencias',
    description: 'Mover dinero entre cuentas o corregir saldos. No te hace ni más rico ni más pobre.',
    filterCategory: 'NEUTRAL'
  }
]

export const BUDGET_SCOPE_OPTIONS = [
  {
    value: 'GLOBAL' as BudgetScope,
    label: 'Global (Todas las cuentas)',
    description: 'Incluye transacciones de todas tus cuentas y tarjetas.'
  },
  {
    value: 'ACCOUNT' as BudgetScope,
    label: 'Cuenta Específica',
    description: 'Selecciona una o más cuentas específicas para este presupuesto.'
  }
]
