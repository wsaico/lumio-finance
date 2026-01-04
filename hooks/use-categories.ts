"use client"

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'

const EMPTY_ARRAY: any[] = []

export function useCategories() {
    const { data: categories, isLoading, error } = useQuery({
        queryKey: ['categories'],
        queryFn: async () => {
            const res = await fetch('/api/categories')
            if (!res.ok) throw new Error('Error fetching categories')
            return await res.json()
        },
    })

    let queryClient;
    try {
        queryClient = useQueryClient()
    } catch (e) {
        // Safe return during SSR
        return {
            categories: EMPTY_ARRAY,
            expense: EMPTY_ARRAY,
            income: EMPTY_ARRAY,
            isLoading,
            error,
            createCategory: { mutate: () => { } } as any,
            updateCategory: { mutate: () => { } } as any,
            deleteCategory: { mutate: () => { } } as any,
        }
    }

    // Derived data for compatibility
    const allCategories = categories?.all || EMPTY_ARRAY
    const expenseCategories = categories?.expense || EMPTY_ARRAY
    const incomeCategories = categories?.income || EMPTY_ARRAY

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
