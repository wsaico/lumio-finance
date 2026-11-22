import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiGet, apiPost } from '@/lib/api-client';
import { invalidateFinancialGraph } from '@/lib/query-keys';
import { showAppToast } from '@/stores/toast-store';

export interface ScheduledItem {
  id: string;
  source: 'RULE' | 'TRANSACTION';
  title: string;
  amount: number;
  monthlyEquivalent: number;
  currencyCode: string;
  transactionType: 'EXPENSE' | 'INCOME' | 'TRANSFER';
  mode: 'SUBSCRIPTION' | 'RECURRING' | 'UPCOMING';
  executionMethod: 'AUTO' | 'MANUAL';
  reminderDays: number;
  frequency: string;
  interval: number;
  dueDate: string;
  startDate?: string;
  endDate?: string | null;
  accountId: string;
  accountName: string;
  accountColor?: string;
  categoryId?: string | null;
  categoryName?: string;
  categoryIcon?: string;
  categoryColor?: string;
}

export function useSubscriptions() {
  const queryClient = useQueryClient();

  const query = useQuery<ScheduledItem[]>({
    queryKey: ['subscriptions'],
    queryFn: async () => {
      const res = await apiGet<{ items: ScheduledItem[] }>('/api/subscriptions');
      return Array.isArray(res?.items) ? res.items : [];
    },
    staleTime: 1000 * 60,
  });

  const executeAction = useMutation({
    mutationFn: (payload: {
      action: 'pay' | 'skip' | 'delete';
      id: string;
      source: 'RULE' | 'TRANSACTION';
    }) => apiPost('/api/subscriptions', payload),
    onSuccess: (_res, vars) => {
      invalidateFinancialGraph(queryClient);
      const msg =
        vars.action === 'pay'
          ? 'Movimiento confirmado y saldo actualizado'
          : vars.action === 'skip'
            ? 'Ciclo omitido hasta la próxima fecha'
            : 'Suscripción eliminada';
      showAppToast.success({ title: msg });
    },
    onError: (err: any) => {
      showAppToast.error({
        title: 'No se pudo completar la acción',
        description: err?.message,
      });
    },
  });

  return {
    items: query.data || [],
    isLoading: query.isLoading,
    refetch: query.refetch,
    executeAction,
  };
}
