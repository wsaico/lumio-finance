import { useMutation, useQueryClient, useInfiniteQuery } from '@tanstack/react-query'
import { toast } from 'sonner'
import { notifyTransactionChange } from './use-budget-refresh'

type Filters = {
    month?: number
    year?: number
    accountId?: string
    search?: string
}

async function fetchTransactions(filters: Filters, pageParam = 1) {
    const params = new URLSearchParams()
    if (filters.month) params.append("month", filters.month.toString())
    if (filters.year) params.append("year", filters.year.toString())
    if (filters.accountId) params.append("accountId", filters.accountId)

    // Pagination params
    params.append("page", pageParam.toString())
    params.append("limit", "20")

    const res = await fetch(`/api/transactions?${params.toString()}`)
    if (!res.ok) throw new Error("Failed to fetch transactions")

    // Expecting structure: { data: [], meta: { ... } }
    return res.json()
}

export function useTransactions(filters: Filters) {
    const queryClient = useQueryClient()

    const {
        data,
        error,
        fetchNextPage,
        hasNextPage,
        isFetching,
        isFetchingNextPage,
        status,
        isLoading
    } = useInfiniteQuery({
        queryKey: ["transactions", filters],
        queryFn: ({ pageParam }) => fetchTransactions(filters, pageParam as number),
        initialPageParam: 1,
        getNextPageParam: (lastPage) => {
            // Check meta.hasMore from API
            if (lastPage.meta?.hasMore) {
                return lastPage.meta.page + 1
            }
            return undefined
        },
    })

    // Flatten pages into a single array for consumption
    const transactions = data?.pages.flatMap((page) => page.data) || []

    const createTransaction = useMutation({
        mutationFn: async (newTransaction: any) => {
            console.log('[CREATE_TRANSACTION] Sending data:', JSON.stringify(newTransaction, null, 2))
            const res = await fetch('/api/transactions', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(newTransaction),
            })
            console.log('[CREATE_TRANSACTION] Sending payload:', newTransaction)
            console.log('[CREATE_TRANSACTION] Response status:', res.status, res.statusText)
            if (!res.ok) {
                const text = await res.text()
                console.error('[CREATE_TRANSACTION] Error response text:', text)
                let errorData
                try {
                    errorData = JSON.parse(text)
                } catch {
                    errorData = { error: text || 'Unknown error' }
                }
                console.error('[CREATE_TRANSACTION] Error data:', errorData)
                if (errorData.details) {
                    console.error('[CREATE_TRANSACTION] Validation details:', errorData.details)
                }
                throw new Error(errorData.error || `HTTP ${res.status}: ${res.statusText}`)
            }
            return res.json()
        },
        onSuccess: (data: any) => {
            console.log('[USE_TRANSACTIONS] Success callback triggered with data:', data)
            queryClient.invalidateQueries({ queryKey: ['transactions'] })
            queryClient.invalidateQueries({ queryKey: ['accounts'] }) // Balance changes!
            notifyTransactionChange('created') // Notify budgets to refresh

            // CENTRALIZED SUCCESS TOAST - Only place where transaction success is shown
            toast.success('Transacción guardada exitosamente')

            // Budget warnings are now handled by the centralized alert system in budgets/page.tsx
            // This prevents duplicate notifications
            if (data.budgetWarnings && Array.isArray(data.budgetWarnings) && data.budgetWarnings.length > 0) {
                console.warn('[USE_TRANSACTIONS] Budget warnings detected (alerts shown in budgets page):', data.budgetWarnings)
            } else {
                console.log('[USE_TRANSACTIONS] No budget warnings found.')
            }
        },
        onError: (error: any) => {
            console.error('[CREATE_TRANSACTION] Full error:', error)
            toast.error(error.message || 'Error al registrar transacción')
        },
    })

    const updateTransaction = useMutation({
        mutationFn: async ({ id, ...data }: any) => {
            const res = await fetch('/api/transactions', {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ id, ...data }),
            })
            if (!res.ok) {
                const text = await res.text()
                let errorData
                try {
                    errorData = JSON.parse(text)
                } catch {
                    errorData = { error: text || 'Unknown error' }
                }
                console.error('[UPDATE_TRANSACTION] Error:', errorData)
                throw new Error(errorData.error || `HTTP ${res.status}: ${res.statusText}`)
            }
            return res.json()
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['transactions'] })
            queryClient.invalidateQueries({ queryKey: ['accounts'] })
            notifyTransactionChange('updated') // Notify budgets to refresh
            toast.success('Transacción actualizada')
        },
        onError: (error) => {
            toast.error('Error al actualizar transacción')
            console.error(error)
        },
    })

    const deleteTransaction = useMutation({
        mutationFn: async (transactionId: string) => {
            const res = await fetch(`/api/transactions?id=${transactionId}`, {
                method: 'DELETE',
            })
            if (!res.ok) throw new Error('Error deleting transaction')
            return res.json()
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['transactions'] })
            queryClient.invalidateQueries({ queryKey: ['accounts'] })
            notifyTransactionChange('deleted')
            toast.success('Transacción eliminada')
        },
        onError: (error: any) => {
            console.error("Delete failed", error)
            toast.error('Error al eliminar transacción')
        }
    })

    return {
        transactions,
        isLoading,
        error,
        fetchNextPage,
        hasNextPage,
        isFetchingNextPage,
        createTransaction,
        updateTransaction,
        deleteTransaction,
    }
}
