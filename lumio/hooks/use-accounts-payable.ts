import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import type { AccountPayable, CreateAccountPayableDTO } from '@/types/loans'
import { toast } from 'sonner'

// ============================================
// FETCH Functions
// ============================================

async function fetchAccountsPayable(status?: string): Promise<AccountPayable[]> {
    const params = new URLSearchParams()
    if (status && status !== 'ALL') params.append('status', status)

    const res = await fetch(`/api/accounts-payable?${params}`)
    if (!res.ok) throw new Error('Error al cargar cuentas por pagar')
    return res.json()
}

async function createAccountPayable(data: CreateAccountPayableDTO): Promise<AccountPayable> {
    const res = await fetch('/api/accounts-payable', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
    })

    if (!res.ok) {
        const error = await res.json()
        throw new Error(error.error || 'Error al crear cuenta por pagar')
    }

    return res.json()
}

async function registerPayment(id: string, paymentAmount: number, accountId: string, notes?: string): Promise<AccountPayable> {
    const res = await fetch('/api/accounts-payable', {
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

export function useAccountsPayable(status?: string) {
    return useQuery({
        queryKey: ['accounts-payable', status],
        queryFn: () => fetchAccountsPayable(status),
        staleTime: 30000,
    })
}

export function useCreateAccountPayable() {
    const queryClient = useQueryClient()

    return useMutation({
        mutationFn: createAccountPayable,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['accounts-payable'] })
            queryClient.invalidateQueries({ queryKey: ['accounts'] })
            queryClient.invalidateQueries({ queryKey: ['transactions'] })
            toast.success('Deuda registrada')
        },
        onError: (error: Error) => {
            toast.error(error.message)
        },
    })
}

export function usePayDebt() {
    const queryClient = useQueryClient()

    return useMutation({
        mutationFn: ({ id, paymentAmount, accountId, notes }: { id: string; paymentAmount: number; accountId: string; notes?: string }) =>
            registerPayment(id, paymentAmount, accountId, notes),
        onSuccess: (data) => {
            queryClient.invalidateQueries({ queryKey: ['accounts-payable'] })
            queryClient.invalidateQueries({ queryKey: ['accounts'] })
            queryClient.invalidateQueries({ queryKey: ['transactions'] })

            if (data.status === 'PAID') {
                toast.success('¡Deuda pagada completamente!')
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
// SUMMARY HOOK
// ============================================

export function usePayablesSummary() {
    const { data: payables } = useAccountsPayable()

    if (!payables) return null

    const summary = {
        total: payables.length,
        pending: payables.filter(p => p.status === 'PENDING').length,
        partial: payables.filter(p => p.status === 'PARTIAL').length,
        overdue: payables.filter(p => p.status === 'OVERDUE').length,
        paid: payables.filter(p => p.status === 'PAID').length,
        totalAmount: payables.reduce((sum, p) => sum + p.originalAmount, 0),
        totalOutstanding: payables.filter(p => p.status !== 'PAID' && p.status !== 'CANCELLED')
            .reduce((sum, p) => sum + p.outstandingBalance, 0),
    }

    return summary
}
