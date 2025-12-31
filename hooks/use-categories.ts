
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'

export function useCategories() {
    const { data: categories, isLoading, error } = useQuery({
        queryKey: ['categories'],
        queryFn: async () => {
            const res = await fetch('/api/categories')
            if (!res.ok) throw new Error('Error fetching categories')
            return await res.json()
        },
    })

    const queryClient = useQueryClient()

    // Derived data for compatibility
    const allCategories = categories?.all || []
    const expenseCategories = categories?.expense || []
    const incomeCategories = categories?.income || []

    const createCategory = useMutation({
        mutationFn: async (newCategory: any) => {
            const res = await fetch('/api/categories', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(newCategory),
            })
            if (!res.ok) throw new Error('Error creating category')
            return res.json()
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['categories'] })
        },
    })

    const updateCategory = useMutation({
        mutationFn: async ({ id, ...data }: any) => {
            const res = await fetch(`/api/categories?id=${id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data),
            })
            if (!res.ok) throw new Error('Error updating category')
            return res.json()
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['categories'] })
        },
    })

    const deleteCategory = useMutation({
        mutationFn: async (id: string) => {
            const res = await fetch(`/api/categories?id=${id}`, {
                method: 'DELETE',
            })
            if (!res.ok) throw new Error('Error deleting category')
            return res.json()
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['categories'] })
        },
    })

    return {
        categories: allCategories, // Mantener compatibilidad con lista plana
        expense: expenseCategories,
        income: incomeCategories,
        isLoading,
        error,
        createCategory,
        updateCategory,
        deleteCategory,
    }
}
