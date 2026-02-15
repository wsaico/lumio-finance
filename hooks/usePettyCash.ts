"use client"

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'

// Types
export interface PettyCashFund {
    id: string
    fund_code: string
    name: string
    balance: number
    status: 'ACTIVE' | 'CLOSED'
    currency: string
    department?: string
    responsible?: string
    description?: string
}

export interface PettyCashExpense {
    id: string
    expense_code: string
    amount: number
    description: string
    status: 'PENDING' | 'APPROVED' | 'REJECTED'
    fund_id: string
}

export interface PettyCashSettlement {
    id: string
    settlement_code: string
    total_amount: number
    status: 'DRAFT' | 'SUBMITTED' | 'APPROVED' | 'REJECTED' | 'ACCOUNTED' | 'REPLENISHED'
    fund_id: string
}

export interface PettyCashReplenishment {
    id: string
    amount: number
    status: 'PENDING' | 'CONFIRMED'
    fund_id: string
}

export interface PettyCashAudit {
    id: string
    audit_date: string
    auditor_id: string
    fund_id: string
    status: 'COMPLIANT' | 'NON_COMPLIANT'
    audit_type?: string
    expected_cash?: number
    actual_cash?: number
    pending_expenses?: number
    responsible_present?: boolean
    findings?: string
    recommendations?: string
    audited_by?: string
}

// Fetcher helper
const fetcher = async <T>(url: string): Promise<T> => {
    const res = await fetch(url)
    if (!res.ok) throw new Error('API Error')
    return res.json()
}

// ==================== PETTY CASH FUNDS ====================
export function usePettyCashFunds(status?: string, department?: string) {
    const params = new URLSearchParams()
    if (status) params.append('status', status)
    if (department) params.append('department', department)

    return useQuery({
        queryKey: ['petty-cash', 'funds', { status, department }],
        queryFn: () => fetcher<PettyCashFund[]>(`/api/petty-cash/funds?${params.toString()}`)
    })
}

export function useCreatePettyCashFund() {
    const queryClient = useQueryClient()

    return useMutation({
        mutationFn: async (fundData: Partial<PettyCashFund>) => {
            const res = await fetch('/api/petty-cash/funds', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(fundData)
            })
            const data = await res.json()
            if (!res.ok) throw new Error(data.error || 'Error al crear el fondo')
            return data
        },
        onSuccess: (data) => {
            toast.success('Fondo creado exitosamente', {
                description: `Código: ${data.fund_code}`
            })
            queryClient.invalidateQueries({ queryKey: ['petty-cash', 'funds'] })
            queryClient.invalidateQueries({ queryKey: ['accounts'] }) // Fund creation might involve accounts
        },
        onError: (error: any) => {
            toast.error('Error al crear el fondo', {
                description: error.message
            })
        }
    })
}

export function useUpdatePettyCashFund() {
    const queryClient = useQueryClient()

    return useMutation({
        mutationFn: async ({ id, ...updates }: { id: string } & Partial<PettyCashFund>) => {
            const res = await fetch('/api/petty-cash/funds', {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ id, ...updates })
            })
            const data = await res.json()
            if (!res.ok) throw new Error(data.error || 'Error al actualizar el fondo')
            return data
        },
        onSuccess: () => {
            toast.success('Fondo actualizado exitosamente')
            queryClient.invalidateQueries({ queryKey: ['petty-cash', 'funds'] })
        },
        onError: (error: any) => {
            toast.error('Error al actualizar el fondo', {
                description: error.message
            })
        }
    })
}

export function useClosePettyCashFund() {
    const queryClient = useQueryClient()

    return useMutation({
        mutationFn: async (id: string) => {
            const res = await fetch(`/api/petty-cash/funds?id=${id}`, {
                method: 'DELETE'
            })
            const data = await res.json()
            if (!res.ok) throw new Error(data.error || 'Error al cerrar el fondo')
            return data
        },
        onSuccess: (data) => {
            toast.success(data.message || 'Fondo cerrado exitosamente')
            queryClient.invalidateQueries({ queryKey: ['petty-cash', 'funds'] })
        },
        onError: (error: any) => {
            toast.error('Error al cerrar el fondo', {
                description: error.message
            })
        }
    })
}

// ==================== PETTY CASH EXPENSES ====================
export function usePettyCashExpenses(fundId?: string, status?: string, settlementId?: string) {
    const params = new URLSearchParams()
    if (fundId) params.append('fundId', fundId)
    if (status) params.append('status', status)
    if (settlementId) params.append('settlementId', settlementId)

    return useQuery({
        queryKey: ['petty-cash', 'expenses', { fundId, status, settlementId }],
        queryFn: () => fetcher<PettyCashExpense[]>(`/api/petty-cash/expenses?${params.toString()}`)
    })
}

export function useCreatePettyCashExpense() {
    const queryClient = useQueryClient()

    return useMutation({
        mutationFn: async (expenseData: Partial<PettyCashExpense>) => {
            const res = await fetch('/api/petty-cash/expenses', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(expenseData)
            })
            const data = await res.json()

            if (!res.ok) {
                throw new Error(data.error || 'Error al registrar el gasto')
            }

            return data
        },
        onSuccess: (data) => {
            toast.success(data.message || 'Gasto registrado exitosamente', {
                description: data.expense?.expense_code
            })
            if (data.thresholdReached) {
                toast.warning('Umbral de liquidación alcanzado', {
                    description: 'Es momento de realizar una liquidación del fondo'
                })
            }
            queryClient.invalidateQueries({ queryKey: ['petty-cash', 'expenses'] })
            queryClient.invalidateQueries({ queryKey: ['petty-cash', 'funds'] })
        },
        onError: (error: any) => {
            toast.error('Error al registrar el gasto', {
                description: error.message
            })
        }
    })
}

export function useDeletePettyCashExpense() {
    const queryClient = useQueryClient()

    return useMutation({
        mutationFn: async (id: string) => {
            const res = await fetch(`/api/petty-cash/expenses?id=${id}`, {
                method: 'DELETE'
            })
            const data = await res.json()
            if (!res.ok) throw new Error(data.error || 'Error al eliminar el gasto')
            return data
        },
        onSuccess: (data) => {
            toast.success(data.message || 'Gasto eliminado exitosamente')
            queryClient.invalidateQueries({ queryKey: ['petty-cash', 'expenses'] })
            queryClient.invalidateQueries({ queryKey: ['petty-cash', 'funds'] })
        },
        onError: (error: any) => {
            toast.error('Error al eliminar el gasto', {
                description: error.message
            })
        }
    })
}

export function useUpdatePettyCashExpense() {
    const queryClient = useQueryClient()

    return useMutation({
        mutationFn: async ({ id, ...updates }: { id: string } & Partial<PettyCashExpense>) => {
            const res = await fetch('/api/petty-cash/expenses', {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ id, ...updates })
            })
            const data = await res.json()
            if (!res.ok) throw new Error(data.error || 'Error al actualizar el gasto')
            return data
        },
        onSuccess: (data) => {
            const statusLabel = data.status === 'APPROVED' ? 'aprobado' : data.status === 'REJECTED' ? 'rechazado' : 'actualizado'
            toast.success(`Gasto ${statusLabel} exitosamente`)
            queryClient.invalidateQueries({ queryKey: ['petty-cash', 'expenses'] })
            queryClient.invalidateQueries({ queryKey: ['petty-cash', 'settlements'] })
        },
        onError: (error: any) => {
            toast.error('Error al actualizar el gasto', {
                description: error.message
            })
        }
    })
}

// ==================== PETTY CASH SETTLEMENTS ====================
export function usePettyCashSettlements(fundId?: string, status?: string) {
    const params = new URLSearchParams()
    if (fundId) params.append('fundId', fundId)
    if (status) params.append('status', status)

    return useQuery({
        queryKey: ['petty-cash', 'settlements', { fundId, status }],
        queryFn: () => fetcher<PettyCashSettlement[]>(`/api/petty-cash/settlements?${params.toString()}`)
    })
}

export function useCreatePettyCashSettlement() {
    const queryClient = useQueryClient()

    return useMutation({
        mutationFn: async (settlementData: Partial<PettyCashSettlement>) => {
            const res = await fetch('/api/petty-cash/settlements', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(settlementData)
            })
            const data = await res.json()
            if (!res.ok) throw new Error(data.error || 'Error al crear la liquidación')
            return data
        },
        onSuccess: (data) => {
            toast.success(data.message || 'Liquidación creada exitosamente', {
                description: `Código: ${data.settlement?.settlement_code}`
            })
            queryClient.invalidateQueries({ queryKey: ['petty-cash', 'settlements'] })
            queryClient.invalidateQueries({ queryKey: ['petty-cash', 'expenses'] })
        },
        onError: (error: any) => {
            toast.error('Error al crear la liquidación', {
                description: error.message
            })
        }
    })
}

export function useUpdatePettyCashSettlement() {
    const queryClient = useQueryClient()

    return useMutation({
        mutationFn: async ({ id, ...updates }: { id: string } & Partial<PettyCashSettlement>) => {
            const res = await fetch('/api/petty-cash/settlements', {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ id, ...updates })
            })
            const data = await res.json()
            if (!res.ok) throw new Error(data.error || 'Error al actualizar la liquidación')
            return data
        },
        onSuccess: (data) => {
            const statusLabel = data.status === 'APPROVED' ? 'aprobada' : data.status === 'REJECTED' ? 'rechazada' : data.status === 'ACCOUNTED' ? 'contabilizada' : 'actualizada'
            toast.success(`Liquidación ${statusLabel} exitosamente`)
            queryClient.invalidateQueries({ queryKey: ['petty-cash', 'settlements'] })
            queryClient.invalidateQueries({ queryKey: ['petty-cash', 'replenishments'] })
        },
        onError: (error: any) => {
            toast.error('Error al actualizar la liquidación', {
                description: error.message
            })
        }
    })
}

// ==================== PETTY CASH REPLENISHMENTS ====================
export function usePettyCashReplenishments(fundId?: string, status?: string) {
    const params = new URLSearchParams()
    if (fundId) params.append('fundId', fundId)
    if (status) params.append('status', status)

    return useQuery({
        queryKey: ['petty-cash', 'replenishments', { fundId, status }],
        queryFn: () => fetcher<PettyCashReplenishment[]>(`/api/petty-cash/replenishments?${params.toString()}`)
    })
}

export function useCreatePettyCashReplenishment() {
    const queryClient = useQueryClient()

    return useMutation({
        mutationFn: async (replenishmentData: Partial<PettyCashReplenishment>) => {
            const res = await fetch('/api/petty-cash/replenishments', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(replenishmentData)
            })
            const data = await res.json()
            if (!res.ok) throw new Error(data.error || 'Error al registrar la reposición')
            return data
        },
        onSuccess: (data) => {
            toast.success(data.message || 'Reposición registrada exitosamente')
            queryClient.invalidateQueries({ queryKey: ['petty-cash', 'replenishments'] })
            queryClient.invalidateQueries({ queryKey: ['petty-cash', 'settlements'] }) // Settlement status changes to Replenished (if tracked) or logic depends on it
            queryClient.invalidateQueries({ queryKey: ['petty-cash', 'funds'] }) // Balance updates
        },
        onError: (error: any) => {
            toast.error('Error al registrar la reposición', {
                description: error.message
            })
        }
    })
}

export function useConfirmReplenishment() {
    const queryClient = useQueryClient()

    return useMutation({
        mutationFn: async (id: string) => {
            const res = await fetch('/api/petty-cash/replenishments', {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ id, status: 'CONFIRMED' })
            })
            const data = await res.json()
            if (!res.ok) throw new Error(data.error || 'Error al confirmar la reposición')
            return data
        },
        onSuccess: (data) => {
            toast.success(data.message || 'Reposición confirmada exitosamente')
            queryClient.invalidateQueries({ queryKey: ['petty-cash', 'replenishments'] })
            queryClient.invalidateQueries({ queryKey: ['petty-cash', 'funds'] })
            queryClient.invalidateQueries({ queryKey: ['accounts'] })
        },
        onError: (error: any) => {
            toast.error('Error al confirmar la reposición', {
                description: error.message
            })
        }
    })
}
// ==================== PETTY CASH AUDITS ====================
export function usePettyCashAudits(fundId?: string, auditType?: string) {
    const params = new URLSearchParams()
    if (fundId) params.append('fundId', fundId)
    if (auditType) params.append('auditType', auditType)

    return useQuery({
        queryKey: ['petty-cash', 'audits', { fundId, auditType }],
        queryFn: () => fetcher<PettyCashAudit[]>(`/api/petty-cash/audits?${params.toString()}`)
    })
}

export function useCreatePettyCashAudit() {
    const queryClient = useQueryClient()

    return useMutation({
        mutationFn: async (auditData: Partial<PettyCashAudit>) => {
            const res = await fetch('/api/petty-cash/audits', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(auditData)
            })
            const data = await res.json()
            if (!res.ok) throw new Error(data.error || 'Error al registrar el arqueo')
            return data
        },
        onSuccess: (data) => {
            toast.success(data.message || 'Arqueo registrado exitosamente')
            queryClient.invalidateQueries({ queryKey: ['petty-cash', 'audits'] })
        },
        onError: (error: any) => {
            toast.error('Error al registrar el arqueo', {
                description: error.message
            })
        }
    })
}

// ==================== PETTY CASH TRANSFERS ====================
export function usePettyCashTransfers(fundId?: string, status?: string) {
    const params = new URLSearchParams()
    if (fundId) params.append('fundId', fundId)
    if (status) params.append('status', status)

    return useQuery({
        queryKey: ['petty-cash', 'transfers', { fundId, status }],
        queryFn: () => fetcher(`/api/petty-cash/transfers?${params.toString()}`)
    })
}
