import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiDelete, apiGet, apiPost, apiPut } from '@/lib/api-client';
import { invalidateFinancialGraph } from '@/lib/query-keys';
import type { Budget } from '@/types/budget';
import { showAppToast } from '@/stores/toast-store';

export function useBudget(
  year?: number,
  month?: number,
  options?: { activeOnly?: boolean }
) {
  const queryClient = useQueryClient();
  const params = new URLSearchParams();
  if (year) params.append('year', year.toString());
  if (month) params.append('month', month.toString());
  if (options?.activeOnly) params.append('activeOnly', 'true');
  const qs = params.toString();

  const { data: budgets, isLoading, error, refetch } = useQuery<Budget[]>({
    queryKey: ['budgets', year, month, options?.activeOnly ?? false],
    queryFn: () => apiGet<Budget[]>(qs ? `/api/budgets?${qs}` : '/api/budgets'),
    staleTime: 1000 * 60,
  });

  const createBudget = useMutation({
    mutationFn: (payload: Record<string, any>) => apiPost('/api/budgets', payload),
    onSuccess: () => {
      invalidateFinancialGraph(queryClient);
      showAppToast.success({ title: 'Presupuesto creado' });
    },
    onError: (err: any) => {
      if (err?.code === 'PREMIUM_REQUIRED' || err?.status === 403) {
        showAppToast.premium({
          title: 'Presupuestos Premium',
          description: err.message,
        });
      } else {
        showAppToast.error({
          title: 'No se pudo crear el presupuesto',
          description: err?.message,
        });
      }
    },
  });

  const updateBudget = useMutation({
    mutationFn: ({ id, ...payload }: { id: string } & Record<string, any>) =>
      apiPut(`/api/budgets/${id}`, payload),
    onSuccess: () => {
      invalidateFinancialGraph(queryClient);
      showAppToast.success({ title: 'Presupuesto actualizado' });
    },
    onError: (err: any) => {
      showAppToast.error({
        title: 'No se pudo actualizar',
        description: err?.message,
      });
    },
  });

  const deleteBudget = useMutation({
    mutationFn: (id: string) => apiDelete(`/api/budgets/${id}`),
    onSuccess: () => {
      invalidateFinancialGraph(queryClient);
      showAppToast.success({ title: 'Presupuesto eliminado' });
    },
    onError: (err: any) => {
      showAppToast.error({
        title: 'Error al eliminar',
        description: err?.message,
      });
    },
  });

  return {
    budgets: budgets || [],
    isLoading,
    error,
    refetch,
    createBudget,
    updateBudget,
    deleteBudget,
  };
}
