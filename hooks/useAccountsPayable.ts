import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import type { AccountPayable, CreateAccountPayableDTO } from '@/types/loans'
import type { RegisterLoanPaymentPayload } from '@/hooks/useAccountsReceivable'
import { toast } from 'sonner'

async function fetchAccountsPayable(status?: string): Promise<AccountPayable[]> {
    const params = new URLSearchParams()
    if (status && status !== 'ALL') params.append('status', status)

    const qs = params.toString()
    const res = await fetch(qs ? `/api/accounts-payable?${qs}` : '/api/accounts-payable')
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
        const error = await res.json().catch(() => ({}))
        throw new Error(error.details || error.error || 'Error al crear cuenta por pagar')
    }

    return res.json()
}

async function registerPayment(data: RegisterLoanPaymentPayload): Promise<AccountPayable> {
    const res = await fetch('/api/accounts-payable', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
    })

    if (!res.ok) {
        const error = await res.json().catch(() => ({}))
        throw new Error(error.details || error.error || 'Error al registrar pago')
    }

    return res.json()
}

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
            queryClient.invalidateQueries({ queryKey: ['budgets'] })
            toast.success('Deuda registrada')
        },
        onError: (error: Error) => {
            toast.error(error.message)
        },
    })
}

export function useUpdateAccountPayable() {
    const queryClient = useQueryClient()

    return useMutation({
        mutationFn: registerPayment,
        onSuccess: (data) => {
            queryClient.invalidateQueries({ queryKey: ['accounts-payable'] })
            queryClient.invalidateQueries({ queryKey: ['accounts'] })
            queryClient.invalidateQueries({ queryKey: ['transactions'] })
            queryClient.invalidateQueries({ queryKey: ['budgets'] })

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
