import { create } from "zustand"

export interface TransactionFiltersState {
    search: string
    type: string // '' | 'INCOME' | 'EXPENSE' | 'TRANSFER'
    accountId: string
    categoryId: string
    currency: string
    minAmount: string
    maxAmount: string
    mode: string
    tag: string
    startDate?: string
    endDate?: string
}

function countActiveFilters(f: TransactionFiltersState): number {
    let count = 0
    if (f.accountId) count++
    if (f.categoryId) count++
    if (f.currency) count++
    if (f.minAmount || f.maxAmount) count++
    if (f.mode) count++
    if (f.tag) count++
    return count
}

const INITIAL_FILTERS: TransactionFiltersState = {
    search: "",
    type: "",
    accountId: "",
    categoryId: "",
    currency: "",
    minAmount: "",
    maxAmount: "",
    mode: "",
    tag: "",
}

interface TransactionFiltersStore {
    filters: TransactionFiltersState
    setFilters: (
        newFilters:
            | Partial<TransactionFiltersState>
            | ((prev: TransactionFiltersState) => TransactionFiltersState)
    ) => void
    updateFilter: <K extends keyof TransactionFiltersState>(
        key: K,
        value: TransactionFiltersState[K]
    ) => void
    clearFilters: () => void
    clearAllFilters: () => void
    activeFiltersCount: number
    filterCount: number
    hasActiveFilters: boolean
}

export const useTransactionFilters = create<TransactionFiltersStore>((set) => ({
    filters: INITIAL_FILTERS,
    activeFiltersCount: 0,
    filterCount: 0,
    hasActiveFilters: false,
    setFilters: (updater) => {
        set((state) => {
            const next =
                typeof updater === "function" ? updater(state.filters) : { ...state.filters, ...updater }
            const activeCount = countActiveFilters(next)
            return {
                filters: next,
                activeFiltersCount: activeCount,
                filterCount: activeCount,
                hasActiveFilters: activeCount > 0,
            }
        })
    },
    updateFilter: (key, value) => {
        set((state) => {
            const next = { ...state.filters, [key]: value }
            const activeCount = countActiveFilters(next)
            return {
                filters: next,
                activeFiltersCount: activeCount,
                filterCount: activeCount,
                hasActiveFilters: activeCount > 0,
            }
        })
    },
    clearFilters: () => {
        set({
            filters: INITIAL_FILTERS,
            activeFiltersCount: 0,
            filterCount: 0,
            hasActiveFilters: false,
        })
    },
    clearAllFilters: () => {
        set({
            filters: INITIAL_FILTERS,
            activeFiltersCount: 0,
            filterCount: 0,
            hasActiveFilters: false,
        })
    },
}))
