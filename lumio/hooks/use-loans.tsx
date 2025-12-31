"use client"

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'

export interface Loan {
    id: string
    userId: string
    transactionId?: string
    accountId?: string
    loanType: 'LENT' | 'BORROWED' // LENT (Prestado), BORROWED (Adeudado)
    personName: string
    amount: number
    currencyCode: string
    interestRate: number
    startDate: string
    dueDate?: string
    status: 'ACTIVE' | 'PAID' | 'DEFAULTED'
    description?: string
    payments?: any[]
    createdAt: string
    updatedAt: string
}

export function useLoans() {
    const queryClient = useQueryClient()

    const { data: loans, isLoading, error } = useQuery({
        queryKey: ['loans'],
        queryFn: async () => {
            const res = await fetch('/api/loans')
            if (!res.ok) throw new Error('Failed to fetch loans')
            return res.json() as Promise<Loan[]>
        }
    })

    const updateLoan = useMutation({
        mutationFn: async ({ id, ...data }: Partial<Loan> & { id: string }) => {
            const res = await fetch('/api/loans', {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ id, ...data }),
            })
            if (!res.ok) throw new Error('Error updating loan')
            return res.json()
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['loans'] })
            toast.success('Préstamo actualizado')
        },
        onError: () => {
            toast.error('Error al actualizar préstamo')
        }
    })

    return {
        loans,
        isLoading,
        error,
        updateLoan
    }
}
