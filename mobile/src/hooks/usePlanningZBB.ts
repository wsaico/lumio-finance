import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiDelete, apiGet, apiPost, apiPut } from '@/lib/api-client';
import { invalidateFinancialGraph } from '@/lib/query-keys';
import { showAppToast } from '@/stores/toast-store';

export function usePlanningZBB(monthStr?: string) {
  const queryClient = useQueryClient();

  const cycleQuery = useQuery<any>({
    queryKey: ['zbb-cycle', monthStr || 'current'],
    queryFn: () =>
      apiGet(
        monthStr
          ? `/api/zbb/planning-cycle?month=${encodeURIComponent(monthStr)}`
          : '/api/zbb/planning-cycle'
      ),
    staleTime: 1000 * 60,
  });

  const historyQuery = useQuery<any[]>({
    queryKey: ['zbb-history'],
    queryFn: () => apiGet<any[]>('/api/zbb/planning-cycle?view=list'),
    staleTime: 1000 * 60 * 3,
  });

  const createCycle = useMutation({
    mutationFn: (payload: any) => apiPost('/api/zbb/planning-cycle', payload),
    onSuccess: () => {
      invalidateFinancialGraph(queryClient);
      queryClient.invalidateQueries({ queryKey: ['zbb-history'] });
      showAppToast.success({ title: 'Ciclo mensual creado' });
    },
    onError: (err: any) =>
      showAppToast.error({ title: 'Error al crear ciclo', description: err?.message }),
  });

  const updateCycleIncome = useMutation({
    mutationFn: (payload: any) => apiPut('/api/zbb/planning-cycle', payload),
    onSuccess: () => {
      invalidateFinancialGraph(queryClient);
      showAppToast.success({ title: 'Ingreso planificado actualizado' });
    },
    onError: (err: any) =>
      showAppToast.error({ title: 'No se pudo actualizar', description: err?.message }),
  });

  const createAllocation = useMutation({
    mutationFn: (payload: any) => apiPost('/api/zbb/allocations', payload),
    onSuccess: () => {
      invalidateFinancialGraph(queryClient);
      showAppToast.success({ title: 'Sobre asignado' });
    },
    onError: (err: any) =>
      showAppToast.error({ title: 'Error al asignar sobre', description: err?.message }),
  });

  const updateAllocation = useMutation({
    mutationFn: (payload: any) => apiPut('/api/zbb/allocations', payload),
    onSuccess: () => {
      invalidateFinancialGraph(queryClient);
      showAppToast.success({ title: 'Asignación actualizada' });
    },
    onError: (err: any) =>
      showAppToast.error({ title: 'Error al actualizar', description: err?.message }),
  });

  const deleteAllocation = useMutation({
    mutationFn: (id: string) =>
      apiDelete(`/api/zbb/allocations?id=${encodeURIComponent(id)}`),
    onSuccess: () => {
      invalidateFinancialGraph(queryClient);
      showAppToast.success({ title: 'Sobre eliminado' });
    },
    onError: (err: any) =>
      showAppToast.error({ title: 'Error al eliminar', description: err?.message }),
  });

  const reallocate = useMutation({
    mutationFn: (payload: {
      cycleId: string;
      fromId: string;
      toId: string;
      amount: number;
    }) => apiPost('/api/zbb/reallocate', payload),
    onSuccess: () => {
      invalidateFinancialGraph(queryClient);
      showAppToast.success({ title: 'Fondos reasignados' });
    },
    onError: (err: any) =>
      showAppToast.error({ title: 'Error al reasignar', description: err?.message }),
  });

  const activateCycle = useMutation({
    mutationFn: (cycleId: string) => apiPost('/api/zbb/activate', { cycleId }),
    onSuccess: (res: any) => {
      invalidateFinancialGraph(queryClient);
      showAppToast.success({
        title: 'Plan mensual activado',
        description: `${res?.synced_count || 0} presupuestos sincronizados`,
      });
    },
    onError: (err: any) =>
      showAppToast.error({ title: 'Error al activar plan', description: err?.message }),
  });

  return {
    data: cycleQuery.data,
    history: historyQuery.data || [],
    isLoading: cycleQuery.isLoading,
    refetch: cycleQuery.refetch,
    createCycle,
    updateCycleIncome,
    createAllocation,
    updateAllocation,
    deleteAllocation,
    reallocate,
    activateCycle,
  };
}
