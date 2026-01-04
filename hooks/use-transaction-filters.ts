import { create } from 'zustand'

interface TransactionFilters {
    search: string
    accountId: string
    categoryId: string
    type: string
    currency: string
    minAmount: string
    maxAmount: string
    mode: string
}

interface TransactionFiltersStore {
    filters: TransactionFilters
    setFilters: (filters: TransactionFilters) => void
    clearFilters: () => void
    activeFiltersCount: number
}

const defaultFilters: TransactionFilters = {
    search: '',
    accountId: '',
    categoryId: '',
    type: '',
    currency: '',
    minAmount: '',
    maxAmount: '',
    mode: ''
}

export const useTransactionFilters = create<TransactionFiltersStore>((set, get) => ({
    filters: defaultFilters,
    setFilters: (filters) => {
        set({ filters })
        // Calculate active filters count (excluding search which is always visible)
        const count = [
            filters.accountId,
            filters.categoryId,
            filters.currency,
            filters.minAmount,
            filters.maxAmount,
            filters.mode
        ].filter(Boolean).length
        set({ activeFiltersCount: count })
    },
    clearFilters: () => set({ filters: defaultFilters, activeFiltersCount: 0 }),
    activeFiltersCount: 0
}))
