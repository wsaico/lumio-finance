import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import type { AccountReceivable, CreateAccountReceivableDTO, LoansSummary } from '@/types/loans'
import { toast } from 'sonner'

// ============================================
// FETCH Functions
// ============================================

async function fetchAccountsReceivable(status?: string): Promise<AccountReceivable[]> {
    const params = new URLSearchParams()
    if (status && status !== 'ALL') params.append('status', status)

    const res = await fetch(`/api/accounts-receivable?${params}`)
    if (!res.ok) throw new Error('Error al cargar cuentas por cobrar')
    return res.json()
}

async function createAccountReceivable(data: CreateAccountReceivableDTO): Promise<AccountReceivable> {
    const res = await fetch('/api/accounts-receivable', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
    })

    if (!res.ok) {
        const error = await res.json()
        throw new Error(error.error || 'Error al crear cuenta por cobrar')
    }

    return res.json()
}

async function registerPayment(id: string, paymentAmount: number, accountId: string, notes?: string): Promise<AccountReceivable> {
    const res = await fetch('/api/accounts-receivable', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, paymentAmount, accountId, notes }),
    })

    if (!res.ok) {
        const error = await res.json()
        throw new Error(error.error || 'Error al registrar pago')
    }

    return res.json()
}

// ============================================
// HOOKS
// ============================================

export function useAccountsReceivable(status?: string) {
    return useQuery({
        queryKey: ['accounts-receivable', status],
        queryFn: () => fetchAccountsReceivable(status),
        staleTime: 30000, // 30 seconds
    })
}

export function useCreateAccountReceivable() {
    const queryClient = useQueryClient()

    return useMutation({
        mutationFn: createAccountReceivable,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['accounts-receivable'] })
            queryClient.invalidateQueries({ queryKey: ['accounts'] }) // Update account balance
            queryClient.invalidateQueries({ queryKey: ['transactions'] })
            toast.success('Préstamo otorgado registrado')
        },
        onError: (error: Error) => {
            toast.error(error.message)
        },
    })
}

export function useRegisterPayment() {
    const queryClient = useQueryClient()

    return useMutation({
        mutationFn: ({ id, paymentAmount, accountId, notes }: { id: string; paymentAmount: number; accountId: string; notes?: string }) =>
            registerPayment(id, paymentAmount, accountId, notes),
        onSuccess: (data) => {
            queryClient.invalidateQueries({ queryKey: ['accounts-receivable'] })
            queryClient.invalidateQueries({ queryKey: ['accounts'] })
            queryClient.invalidateQueries({ queryKey: ['transactions'] })

            if (data.status === 'COLLECTED') {
                toast.success('¡Préstamo cobrado completamente!')
            } else {
                toast.success('Pago parcial registrado')
            }
        },
        onError: (error: Error) => {
            toast.error(error.message)
        },
    })
}

// ============================================
// SUMMARY HOOK (Statistics)
// ============================================

export function useReceivablesSummary() {
    const { data: receivables } = useAccountsReceivable()

    if (!receivables) return null

    const summary = {
        total: receivables.length,
        pending: receivables.filter(r => r.status === 'PENDING').length,
        partial: receivables.filter(r => r.status === 'PARTIAL').length,
        overdue: receivables.filter(r => r.status === 'OVERDUE').length,
        collected: receivables.filter(r => r.status === 'COLLECTED').length,
        totalAmount: receivables.reduce((sum, r) => sum + r.originalAmount, 0),
        totalOutstanding: receivables.filter(r => r.status !== 'COLLECTED' && r.status !== 'CANCELLED')
            .reduce((sum, r) => sum + r.outstandingBalance, 0),
    }

    return summary
}
