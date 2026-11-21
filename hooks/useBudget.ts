import { useQuery } from '@tanstack/react-query'
import type { Budget } from '@/types/budget'

export function useBudget(year?: number, month?: number, options?: { activeOnly?: boolean }) {
    const queryParams = new URLSearchParams()
    if (year) queryParams.append('year', year.toString())
    if (month) queryParams.append('month', month.toString())
    if (options?.activeOnly) queryParams.append('activeOnly', 'true')

    const qs = queryParams.toString()

    const { data: budgets, isLoading, error, refetch } = useQuery<Budget[]>({
        queryKey: ['budgets', year, month, options?.activeOnly ?? false],
        queryFn: async () => {
            const res = await fetch(qs ? `/api/budgets?${qs}` : '/api/budgets')
            if (!res.ok) throw new Error('Error fetching budgets')
            return res.json()
        },
    })

    return {
        budgets: budgets || [],
        isLoading,
        error,
        refetch,
    }
}
