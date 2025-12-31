
import { useQuery } from '@tanstack/react-query'

export function useBudget(year?: number, month?: number) {
    const queryParams = new URLSearchParams()
    if (year) queryParams.append('year', year.toString())
    if (month) queryParams.append('month', month.toString())

    const { data: budgets, isLoading, error } = useQuery({
        queryKey: ['budgets', year, month],
        queryFn: async () => {
            const res = await fetch(`/api/budgets?${queryParams.toString()}`)
            if (!res.ok) throw new Error('Error fetching budgets')
            return res.json()
        },
    })

    return {
        budgets: budgets || [],
        isLoading,
        error,
    }
}

