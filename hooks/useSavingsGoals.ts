"use client"

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'

// Fetcher helper
// Fetcher helper
const fetcher = async <T>(url: string): Promise<T> => {
    const res = await fetch(url)
    if (!res.ok) throw new Error('API Error')
    return res.json()
}

// Types
export interface SavingsGoal {
    id: string
    name: string
    target_amount: number
    current_amount: number
    currency: string
    status: 'ACTIVE' | 'COMPLETED' | 'ARCHIVED'
    deadline?: string
    icon?: string
    description?: string
    color?: string
    target_date?: string
    completed_date?: string
    // Calculated fields
    progress?: number
    daysRemaining?: number
    amountRemaining?: number
    monthlyNeeded?: number
    isOnTrack?: boolean
}

export interface GoalContribution {
    id: string
    amount: number
    contribution_date: string
    notes?: string
    goal_id: string
}

export interface SavingsGoalsAnalytics {
    totalSaved: number
    activeGoals: number
    completedGoals: number
    avgProgress: number
    avgMonthlyContribution: number
}

// ==================== SAVINGS GOALS ====================

export function useSavingsGoals(status?: string, type?: string, accountId?: string) {
    const params = new URLSearchParams()
    if (status) params.append('status', status)
    if (type) params.append('type', type)
    if (accountId) params.append('accountId', accountId)

    return useQuery({
        queryKey: ['savings-goals', { status, type, accountId }],
        queryFn: async () => {
            const response = await fetcher<{ goals: SavingsGoal[] }>(`/api/savings-goals?${params.toString()}`)
            return response.goals
        }
    })
}

export function useSavingsGoal(goalId: string) {
    return useQuery({
        queryKey: ['savings-goal', goalId],
        queryFn: async () => {
            const response = await fetcher<{ goal: SavingsGoal }>(`/api/savings-goals/${goalId}`)
            return response.goal
        },
        enabled: !!goalId
    })
}

export function useCreateSavingsGoal() {
    const queryClient = useQueryClient()

    return useMutation({
        mutationFn: async (goalData: Partial<SavingsGoal>) => {
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
                description: `${data.goal.name} - ${data.goal.currency || 'S/'} ${data.goal.target_amount}`
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
        mutationFn: async ({ id, ...updates }: { id: string } & Partial<SavingsGoal>) => {
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
        queryFn: async () => {
            const response = await fetcher<{ contributions: GoalContribution[] }>(`/api/savings-goals/${goalId}/contributions`)
            return response.contributions || []
        },
        enabled: !!goalId
    })
}

export function useAddContribution() {
    const queryClient = useQueryClient()

    return useMutation({
        mutationFn: async (contributionData: Partial<GoalContribution>) => {
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
            // Invalidate all savings goals queries (list and individual goals)
            queryClient.invalidateQueries({ queryKey: ['savings-goals'] })
            queryClient.invalidateQueries({ queryKey: ['savings-goal'] })
            queryClient.invalidateQueries({ queryKey: ['goal-contributions'] })
            // Also invalidate accounts and transactions in case the contribution affected them
            queryClient.invalidateQueries({ queryKey: ['accounts'] })
            queryClient.invalidateQueries({ queryKey: ['transactions'] })
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
            queryClient.invalidateQueries({ queryKey: ['savings-goal'] })
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

export function useWithdrawSavings() {
    const queryClient = useQueryClient()

    return useMutation({
        mutationFn: async (withdrawData: any) => {
            const res = await fetch('/api/savings-goals/withdraw', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(withdrawData)
            })
            const data = await res.json()
            if (!res.ok) throw new Error(data.error || 'Error al realizar el retiro')
            return data
        },
        onSuccess: (data) => {
            toast.success('Retiro exitoso', {
                description: `S/ ${Math.abs(data.contribution.amount)} retirados de la meta`
            })
            // Invalidate EVERYTHING related to money
            queryClient.invalidateQueries({ queryKey: ['savings-goals'] })
            queryClient.invalidateQueries({ queryKey: ['savings-goal'] })
            queryClient.invalidateQueries({ queryKey: ['goal-contributions'] })
            queryClient.invalidateQueries({ queryKey: ['transactions'] })
            queryClient.invalidateQueries({ queryKey: ['accounts'] })
            queryClient.invalidateQueries({ queryKey: ['account-goals-summary'] })
        },
        onError: (error: any) => {
            toast.error('Error al retirar fondos', {
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
        queryFn: () => fetcher<SavingsGoalsAnalytics>('/api/savings-goals/analytics')
    })
}

export function useAccountGoalsSummary(accountId: string) {
    return useQuery({
        queryKey: ['account-goals-summary', accountId],
        queryFn: () => fetcher(`/api/savings-goals/account-summary/${accountId}`),
        enabled: !!accountId
    })
}
