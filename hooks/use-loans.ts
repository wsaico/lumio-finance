
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'

export function useLoans() {
    const queryClient = useQueryClient()

    const { data: loans, isLoading, error } = useQuery({
        queryKey: ['loans'],
        queryFn: async () => {
            const res = await fetch('/api/loans')
            if (!res.ok) throw new Error('Error fetching loans')
            return res.json()
        },
    })

    const createLoan = useMutation({
        mutationFn: async (newLoan: any) => {
            const res = await fetch('/api/loans', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(newLoan),
            })
            if (!res.ok) throw new Error('Error creating loan')
            return res.json()
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['loans'] })
            queryClient.invalidateQueries({ queryKey: ['accounts'] }) // Updates balance if account linked
            toast.success('Préstamo registrado')
        },
        onError: (error) => {
            toast.error('Error al registrar préstamo')
            console.error(error)
        },
    })

    // TODO: Add addPayment mutation later

    return {
        loans,
        isLoading,
        error,
        createLoan,
    }
}
