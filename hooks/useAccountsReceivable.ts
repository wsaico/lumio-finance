import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import type { AccountReceivable, CreateAccountReceivableDTO, PaymentMethod } from '@/types/loans'
import { toast } from 'sonner'

async function fetchAccountsReceivable(status?: string): Promise<AccountReceivable[]> {
    const params = new URLSearchParams()
    if (status && status !== 'ALL') params.append('status', status)

    const qs = params.toString()
    const res = await fetch(qs ? `/api/accounts-receivable?${qs}` : '/api/accounts-receivable')
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
        const error = await res.json().catch(() => ({}))
        throw new Error(error.details || error.error || 'Error al crear cuenta por cobrar')
    }

    return res.json()
}

export interface RegisterLoanPaymentPayload {
    id: string
    paymentAmount: number
    accountId: string
    principalAmount?: number
    interestAmount?: number
    paymentMethod?: PaymentMethod
    notes?: string
}

async function registerPayment(data: RegisterLoanPaymentPayload): Promise<AccountReceivable> {
    const res = await fetch('/api/accounts-receivable', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
    })

    if (!res.ok) {
        const error = await res.json().catch(() => ({}))
        throw new Error(error.details || error.error || 'Error al registrar cobro')
    }

    return res.json()
}

export function useAccountsReceivable(status?: string) {
    return useQuery({
        queryKey: ['accounts-receivable', status],
        queryFn: () => fetchAccountsReceivable(status),
        staleTime: 30000,
    })
}

export function useCreateAccountReceivable() {
    const queryClient = useQueryClient()

    return useMutation({
        mutationFn: createAccountReceivable,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['accounts-receivable'] })
            queryClient.invalidateQueries({ queryKey: ['accounts'] })
            queryClient.invalidateQueries({ queryKey: ['transactions'] })
            queryClient.invalidateQueries({ queryKey: ['budgets'] })
            toast.success('Préstamo otorgado registrado')
        },
        onError: (error: Error) => {
            toast.error(error.message)
        },
    })
}

export function useUpdateAccountReceivable() {
    const queryClient = useQueryClient()

    return useMutation({
        mutationFn: registerPayment,
        onSuccess: (data) => {
            queryClient.invalidateQueries({ queryKey: ['accounts-receivable'] })
            queryClient.invalidateQueries({ queryKey: ['accounts'] })
            queryClient.invalidateQueries({ queryKey: ['transactions'] })
            queryClient.invalidateQueries({ queryKey: ['budgets'] })

            if (data.status === 'COLLECTED') {
                toast.success('¡Préstamo cobrado completamente!')
            } else {
                toast.success('Cobro parcial registrado')
            }
        },
        onError: (error: Error) => {
            toast.error(error.message)
        },
    })
}
