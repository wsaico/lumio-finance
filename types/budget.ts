// Budget Types

export type TransactionFilterMode =
  | 'DEFAULT'
  | 'LOANED'
  | 'ADDED_TO_GOAL'
  | 'BALANCE_CORRECTION'

export type BudgetScope =
  | 'GLOBAL'           // Global (Todas las cuentas)
  | 'ACCOUNT'          // Cuenta Específica

export type BudgetType = 'EXPENSE' | 'SAVINGS'
export type BudgetPeriod = 'MONTHLY'

export interface BudgetFormData {
  // Basic Info
  name: string
  amount: number | string
  type: BudgetType
  period: BudgetPeriod
  color: string
  currencyCode: string

  // Period
  budgetYear?: number
  budgetMonth?: number

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
  isZbbControlled?: boolean
  zbbAllocationId?: string | null
  createdAt: string | Date
  updatedAt?: string | Date
  stats?: {
    spent: number
    remaining: number
    percentage: number
  }
}

export type FilterCategory = 'NEEDS' | 'WANTS' | 'SAVINGS' | 'NEUTRAL' | 'MIXED'

export interface TransactionFilterOption {
  value: TransactionFilterMode
  label: string
  description: string
  checked?: boolean
  filterCategory?: FilterCategory
}

export const TRANSACTION_FILTER_OPTIONS: TransactionFilterOption[] = [
  {
    value: 'DEFAULT',
    label: 'Gastos Reales',
    description: 'Tus gastos del día a día (Comida, Servicios, Transporte). Lo que realmente consumes.',
    checked: true,
    filterCategory: 'MIXED'
  },
  {
    value: 'LOANED',
    label: 'Préstamos a Terceros',
    description: 'Dinero que prestas y esperas recuperar. No es una pérdida real, es una cuenta por cobrar.',
    filterCategory: 'NEUTRAL'
  },
  {
    value: 'ADDED_TO_GOAL',
    label: 'Ahorro para Metas',
    description: 'Dinero que envías a tus metas. Técnicamente no lo "gastaste", te lo "pagaste" a tu futuro.',
    filterCategory: 'SAVINGS'
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
