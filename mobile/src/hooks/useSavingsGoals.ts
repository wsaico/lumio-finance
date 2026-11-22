import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiDelete, apiGet, apiPatch, apiPost } from '@/lib/api-client';
import { invalidateFinancialGraph } from '@/lib/query-keys';
import { showAppToast } from '@/stores/toast-store';

export interface SavingsGoal {
  id: string;
  name: string;
  target_amount: number;
  current_amount: number;
  currency: string;
  status: 'ACTIVE' | 'COMPLETED' | 'PAUSED' | 'CANCELLED';
  goal_type?: string;
  priority?: 'HIGH' | 'MEDIUM' | 'LOW';
  icon?: string;
  description?: string;
  color?: string;
  target_date?: string;
  primary_account_id?: string | null;
  progress?: number;
  daysRemaining?: number;
  amountRemaining?: number;
  monthlyNeeded?: number;
  isOnTrack?: boolean;
}

export interface GoalContribution {
  id: string;
  amount: number;
  contribution_date: string;
  notes?: string;
  goal_id: string;
}

export interface SavingsGoalsAnalytics {
  totalSaved: number;
  activeGoals: number;
  completedGoals: number;
  avgProgress: number;
  avgMonthlyContribution: number;
}

export function useSavingsGoals(status?: string, type?: string, accountId?: string) {
  const params = new URLSearchParams();
  if (status) params.append('status', status);
  if (type) params.append('type', type);
  if (accountId) params.append('accountId', accountId);
  const qs = params.toString();

  return useQuery<SavingsGoal[]>({
    queryKey: ['savings-goals', { status, type, accountId }],
    queryFn: async () => {
      const res = await apiGet<{ goals: SavingsGoal[] }>(
        qs ? `/api/savings-goals?${qs}` : '/api/savings-goals'
      );
      return res?.goals || [];
    },
  });
}

export function useSavingsGoal(goalId: string) {
  return useQuery<SavingsGoal>({
    queryKey: ['savings-goal', goalId],
    queryFn: async () => {
      const res = await apiGet<{ goal: SavingsGoal }>(`/api/savings-goals/${goalId}`);
      return res.goal;
    },
    enabled: Boolean(goalId),
  });
}

export function useGoalContributions(goalId: string) {
  return useQuery<GoalContribution[]>({
    queryKey: ['goal-contributions', goalId],
    queryFn: async () => {
      const res = await apiGet<{ contributions: GoalContribution[] }>(
        `/api/savings-goals/${goalId}/contributions`
      );
      return res?.contributions || [];
    },
    enabled: Boolean(goalId),
  });
}

export function useSavingsGoalsAnalytics() {
  return useQuery<SavingsGoalsAnalytics>({
    queryKey: ['savings-goals-analytics'],
    queryFn: () => apiGet<SavingsGoalsAnalytics>('/api/savings-goals/analytics'),
  });
}

export function useCreateSavingsGoal() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (goalData: Record<string, any>) => apiPost('/api/savings-goals', goalData),
    onSuccess: (data: any) => {
      invalidateFinancialGraph(queryClient);
      showAppToast.success({
        title: 'Meta creada exitosamente',
        description: data?.goal?.name || undefined,
      });
    },
    onError: (err: any) => {
      if (err?.code === 'PREMIUM_REQUIRED' || err?.status === 403) {
        showAppToast.premium({ title: 'Metas de ahorro Premium', description: err.message });
      } else {
        showAppToast.error({ title: 'Error al crear la meta', description: err?.message });
      }
    },
  });
}

export function useUpdateSavingsGoal() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: Record<string, any>) => apiPatch('/api/savings-goals', payload),
    onSuccess: () => {
      invalidateFinancialGraph(queryClient);
      queryClient.invalidateQueries({ queryKey: ['savings-goal'] });
      showAppToast.success({ title: 'Meta actualizada' });
    },
    onError: (err: any) =>
      showAppToast.error({ title: 'Error al actualizar la meta', description: err?.message }),
  });
}

export function useDeleteSavingsGoal() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) =>
      apiDelete(`/api/savings-goals?id=${encodeURIComponent(id)}`),
    onSuccess: () => {
      invalidateFinancialGraph(queryClient);
      showAppToast.success({ title: 'Meta eliminada' });
    },
    onError: (err: any) =>
      showAppToast.error({ title: 'Error al eliminar la meta', description: err?.message }),
  });
}

export function useAddContribution() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: { goalId: string; amount: number; date?: string; notes?: string }) =>
      apiPost('/api/savings-goals/contribute', data),
    onSuccess: (data: any) => {
      invalidateFinancialGraph(queryClient);
      queryClient.invalidateQueries({ queryKey: ['savings-goal'] });
      showAppToast.success({
        title: 'Aporte registrado',
        description: data?.milestoneAchieved
          ? 'Hito de ahorro alcanzado'
          : 'El progreso de tu meta se ha actualizado.',
      });
    },
    onError: (err: any) =>
      showAppToast.error({ title: 'Error al aportar', description: err?.message }),
  });
}

export function useTransferAndContribute() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: {
      goalId: string;
      amount: number;
      fromAccountId: string;
      toAccountId?: string | null;
      date?: string;
      notes?: string;
    }) => apiPost('/api/savings-goals/transfer-and-contribute', data),
    onSuccess: () => {
      invalidateFinancialGraph(queryClient);
      queryClient.invalidateQueries({ queryKey: ['savings-goal'] });
      showAppToast.success({ title: 'Transferencia y aporte registrados' });
    },
    onError: (err: any) =>
      showAppToast.error({ title: 'Error al transferir', description: err?.message }),
  });
}

export function useWithdrawSavings() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: {
      goalId: string;
      amount: number;
      fromAccountId?: string;
      toAccountId: string;
      date?: string;
      notes?: string;
    }) => apiPost('/api/savings-goals/withdraw', data),
    onSuccess: () => {
      invalidateFinancialGraph(queryClient);
      queryClient.invalidateQueries({ queryKey: ['savings-goal'] });
      showAppToast.success({ title: 'Retiro realizado exitosamente' });
    },
    onError: (err: any) =>
      showAppToast.error({ title: 'Error al retirar fondos', description: err?.message }),
  });
}

export function useSyncSavingsGoal() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => apiPost(`/api/savings-goals/${id}/sync`, {}),
    onSuccess: () => {
      invalidateFinancialGraph(queryClient);
      queryClient.invalidateQueries({ queryKey: ['savings-goal'] });
      showAppToast.success({ title: 'Meta sincronizada' });
    },
    onError: (err: any) =>
      showAppToast.error({ title: 'Error al sincronizar', description: err?.message }),
  });
}
