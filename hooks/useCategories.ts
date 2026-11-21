"use client"

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { DEFAULT_EXPENSE_CATEGORIES, DEFAULT_INCOME_CATEGORIES } from '@/lib/constants/default-categories'

const EMPTY_ARRAY: any[] = []

const FALLBACK_EXPENSE = DEFAULT_EXPENSE_CATEGORIES.map(c => ({ ...c, type: 'EXPENSE' as const, isSystem: true }))
const FALLBACK_INCOME = DEFAULT_INCOME_CATEGORIES.map(c => ({ ...c, type: 'INCOME' as const, isSystem: true }))
const FALLBACK_ALL = [...FALLBACK_EXPENSE, ...FALLBACK_INCOME]

export function useCategories() {
    const queryClient = useQueryClient()

    const { data: categories, isLoading, error, refetch } = useQuery({
        queryKey: ['categories'],
        queryFn: async () => {
            const res = await fetch('/api/categories')
            if (!res.ok) {
                // If 401 or network error, don't crash the UI — allow fallback
                console.warn('Advertencia al obtener categorías:', res.statusText)
                throw new Error('Error al obtener categorías')
            }
            return await res.json()
        },
        retry: 2,
        staleTime: 1000 * 60 * 3, // 3 min cache
    })

    // Derived data with resilience: if API call failed or is empty, provide default system categories
    const rawAll = Array.isArray(categories)
        ? categories
        : (categories?.all || (categories?.expense ? [...(categories.expense || []), ...(categories.income || [])] : null))

    const allCategories = (rawAll && rawAll.length > 0)
        ? rawAll
        : (error ? FALLBACK_ALL : (categories?.all || EMPTY_ARRAY))

    const rawExpense = Array.isArray(categories)
        ? categories.filter((c: any) => c.type === 'EXPENSE')
        : categories?.expense

    const expenseCategories = (rawExpense && rawExpense.length > 0)
        ? rawExpense
        : (error ? FALLBACK_EXPENSE : (categories?.expense || EMPTY_ARRAY))

    const rawIncome = Array.isArray(categories)
        ? categories.filter((c: any) => c.type === 'INCOME')
        : categories?.income

    const incomeCategories = (rawIncome && rawIncome.length > 0)
        ? rawIncome
        : (error ? FALLBACK_INCOME : (categories?.income || EMPTY_ARRAY))

    const createCategory = useMutation({
        mutationFn: async (newCategory: any) => {
            const res = await fetch('/api/categories', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(newCategory),
            })
            if (!res.ok) throw new Error('Error al crear categoría')
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
            if (!res.ok) throw new Error('Error al actualizar categoría')
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
            if (!res.ok) throw new Error('Error al eliminar categoría')
            return res.json()
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['categories'] })
        },
    })

    return {
        categories: allCategories,
        all: allCategories,
        expense: expenseCategories,
        income: incomeCategories,
        isLoading,
        error,
        refetch,
        createCategory,
        updateCategory,
        deleteCategory,
    }
}
