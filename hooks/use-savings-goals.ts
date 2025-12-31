"use client"

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'

// Fetcher helper
const fetcher = (url: string) => fetch(url).then((r) => r.json())

// ==================== SAVINGS GOALS ====================

export function useSavingsGoals(status?: string, type?: string, accountId?: string) {
    const params = new URLSearchParams()
    if (status) params.append('status', status)
    if (type) params.append('type', type)
    if (accountId) params.append('accountId', accountId)

    return useQuery({
        queryKey: ['savings-goals', { status, type, accountId }],
        queryFn: () => fetcher(`/api/savings-goals?${params.toString()}`)
    })
}

export function useSavingsGoal(goalId: string) {
    return useQuery({
        queryKey: ['savings-goal', goalId],
        queryFn: () => fetcher(`/api/savings-goals/${goalId}`),
        enabled: !!goalId
    })
}

export function useCreateSavingsGoal() {
    const queryClient = useQueryClient()

    return useMutation({
        mutationFn: async (goalData: any) => {
            const res = await fetch('/api/savings-goals', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(goalData)
            })
            const data = await res.json()
            if (!res.ok) throw new Error(data.error || 'Error al crear la meta')
            return data
        },
        onSuccess: (data) => {
            toast.success('Meta creada exitosamente', {
                description: `${data.goal.name} - S/ ${data.goal.target_amount}`
            })
            queryClient.invalidateQueries({ queryKey: ['savings-goals'] })
        },
        onError: (error: any) => {
            toast.error('Error al crear la meta', {
                description: error.message
            })
        }
    })
}

export function useUpdateSavingsGoal() {
    const queryClient = useQueryClient()

    return useMutation({
        mutationFn: async ({ id, ...updates }: { id: string } & any) => {
            const res = await fetch('/api/savings-goals', {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ id, ...updates })
            })
            const data = await res.json()
            if (!res.ok) throw new Error(data.error || 'Error al actualizar la meta')
            return data
        },
        onSuccess: () => {
            toast.success('Meta actualizada exitosamente')
            queryClient.invalidateQueries({ queryKey: ['savings-goals'] })
        },
        onError: (error: any) => {
            toast.error('Error al actualizar la meta', {
                description: error.message
            })
        }
    })
}

export function useDeleteSavingsGoal() {
    const queryClient = useQueryClient()

    return useMutation({
        mutationFn: async (id: string) => {
            const res = await fetch(`/api/savings-goals?id=${id}`, {
                method: 'DELETE'
            })
            const data = await res.json()
            if (!res.ok) throw new Error(data.error || 'Error al eliminar la meta')
            return data
        },
        onSuccess: (data) => {
            toast.success(data.message || 'Meta eliminada exitosamente')
            queryClient.invalidateQueries({ queryKey: ['savings-goals'] })
        },
        onError: (error: any) => {
            toast.error('Error al eliminar la meta', {
                description: error.message
            })
        }
    })
}

// ==================== CONTRIBUTIONS ====================

export function useGoalContributions(goalId: string) {
    return useQuery({
        queryKey: ['goal-contributions', goalId],
        queryFn: () => fetcher(`/api/savings-goals/${goalId}/contributions`),
        enabled: !!goalId
    })
}

export function useAddContribution() {
    const queryClient = useQueryClient()

    return useMutation({
        mutationFn: async (contributionData: any) => {
            const res = await fetch('/api/savings-goals/contribute', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(contributionData)
            })
            const data = await res.json()
            if (!res.ok) throw new Error(data.error || 'Error al agregar contribución')
            return data
        },
        onSuccess: (data) => {
            toast.success('Contribución agregada', {
                description: `S/ ${data.contribution.amount} - ${data.milestoneAchieved ? '🎉 ¡Hito alcanzado!' : ''}`
            })
            queryClient.invalidateQueries({ queryKey: ['savings-goals'] })
            queryClient.invalidateQueries({ queryKey: ['goal-contributions'] })
        },
        onError: (error: any) => {
            toast.error('Error al agregar contribución', {
                description: error.message
            })
        }
    })
}

export function useTransferAndContribute() {
    const queryClient = useQueryClient()

    return useMutation({
        mutationFn: async (transferData: any) => {
            const res = await fetch('/api/savings-goals/transfer-and-contribute', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(transferData)
            })
            const data = await res.json()
            if (!res.ok) throw new Error(data.error || 'Error al transferir y contribuir')
            return data
        },
        onSuccess: (data) => {
            toast.success('Transferencia y contribución exitosa', {
                description: `S/ ${data.contribution.amount} transferidos a tu meta`
            })
            queryClient.invalidateQueries({ queryKey: ['savings-goals'] })
            queryClient.invalidateQueries({ queryKey: ['goal-contributions'] })
            queryClient.invalidateQueries({ queryKey: ['transactions'] })
            queryClient.invalidateQueries({ queryKey: ['accounts'] })
        },
        onError: (error: any) => {
            toast.error('Error al transferir', {
                description: error.message
            })
        }
    })
}

export function useUpdateContribution() {
    const queryClient = useQueryClient()

    return useMutation({
        mutationFn: async ({ id, ...data }: { id: string; amount?: number; contributionDate?: string; notes?: string }) => {
            const res = await fetch(`/api/savings-goals/contributions/${id}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data)
            })
            const result = await res.json()
            if (!res.ok) throw new Error(result.error || 'Error al actualizar contribución')
            return result
        },
        onSuccess: () => {
            toast.success('Contribución actualizada')
            queryClient.invalidateQueries({ queryKey: ['savings-goals'] })
            queryClient.invalidateQueries({ queryKey: ['savings-goal'] }) // Invalidate specific goal
            queryClient.invalidateQueries({ queryKey: ['goal-contributions'] })
        },
        onError: (error: any) => {
            toast.error('Error al actualizar contribución', {
                description: error.message
            })
        }
    })
}

export function useDeleteContribution() {
    const queryClient = useQueryClient()

    return useMutation({
        mutationFn: async (id: string) => {
            const res = await fetch(`/api/savings-goals/contributions/${id}`, {
                method: 'DELETE'
            })
            const result = await res.json()
            if (!res.ok) throw new Error(result.error || 'Error al eliminar contribución')
            return result
        },
        onSuccess: () => {
            toast.success('Contribución eliminada')
            queryClient.invalidateQueries({ queryKey: ['savings-goals'] })
            queryClient.invalidateQueries({ queryKey: ['savings-goal'] }) // Invalidate specific goal
            queryClient.invalidateQueries({ queryKey: ['goal-contributions'] })
        },
        onError: (error: any) => {
            toast.error('Error al eliminar contribución', {
                description: error.message
            })
        }
    })
}

//Sync Hook
export function useSyncSavingsGoal() {
    const queryClient = useQueryClient()

    return useMutation({
        mutationFn: async (id: string) => {
            const res = await fetch(`/api/savings-goals/${id}/sync`, {
                method: 'POST'
            })
            const result = await res.json()
            if (!res.ok) throw new Error(result.error || 'Error al sincronizar meta')
            return result
        },
        onSuccess: () => {
            toast.success('Meta sincronizada')
            queryClient.invalidateQueries({ queryKey: ['savings-goals'] })
            queryClient.invalidateQueries({ queryKey: ['savings-goal'] })
        },
        onError: (error: any) => {
            toast.error('Error al sincronizar meta', {
                description: error.message
            })
        }
    })
}

// ==================== ANALYTICS ====================

export function useSavingsGoalsAnalytics() {
    return useQuery({
        queryKey: ['savings-goals-analytics'],
        queryFn: () => fetcher('/api/savings-goals/analytics')
    })
}

export function useAccountGoalsSummary(accountId: string) {
    return useQuery({
        queryKey: ['account-goals-summary', accountId],
        queryFn: () => fetcher(`/api/savings-goals/account-summary/${accountId}`),
        enabled: !!accountId
    })
}
