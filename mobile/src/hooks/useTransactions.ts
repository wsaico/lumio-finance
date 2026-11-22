import { Platform } from 'react-native';
import { useInfiniteQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ApiError, apiDelete, apiGet, apiPatch, apiPost } from '@/lib/api-client';
import { invalidateFinancialGraph } from '@/lib/query-keys';
import { enqueueOfflineTransaction, generateClientRequestId } from '@/lib/offline-queue';
import { showAppToast } from '@/stores/toast-store';

export interface TxFilters {
  month?: number;
  year?: number;
  accountId?: string;
  type?: 'EXPENSE' | 'INCOME' | 'TRANSFER';
  search?: string;
}

async function fetchTransactions(filters: TxFilters, pageParam = 1) {
  const params = new URLSearchParams();
  if (filters.month) params.append('month', filters.month.toString());
  if (filters.year) params.append('year', filters.year.toString());
  if (filters.accountId) params.append('accountId', filters.accountId);
  if (filters.type) params.append('type', filters.type);
  if (filters.search?.trim()) params.append('search', filters.search.trim());
  params.append('page', pageParam.toString());
  params.append('limit', '20');
  return apiGet(`/api/transactions?${params.toString()}`);
}

export function useTransactions(filters: TxFilters = {}) {
  const queryClient = useQueryClient();

  const query = useInfiniteQuery({
    queryKey: ['transactions', filters],
    queryFn: ({ pageParam }) => fetchTransactions(filters, pageParam as number),
    initialPageParam: 1,
    getNextPageParam: (lastPage) =>
      lastPage?.meta?.hasMore ? lastPage.meta.page + 1 : undefined,
  });

  const transactions = query.data?.pages.flatMap((page: any) => page?.data || []) || [];

  const createTransaction = useMutation({
    mutationFn: async (newTx: any) => {
      const clientRequestId =
        newTx?.metadata?.clientRequestId || generateClientRequestId();
      const enrichedPayload = {
        ...newTx,
        metadata: {
          ...(newTx?.metadata || {}),
          clientRequestId,
        },
      };

      const isExplicitlyOffline =
        Platform.OS === 'web' &&
        typeof navigator !== 'undefined' &&
        navigator.onLine === false;

      if (isExplicitlyOffline) {
        await enqueueOfflineTransaction(enrichedPayload);
        return { queuedOffline: true, id: clientRequestId };
      }

      try {
        return await apiPost('/api/transactions', enrichedPayload);
      } catch (err: any) {
        if (!(err instanceof ApiError)) {
          await enqueueOfflineTransaction(enrichedPayload);
          return { queuedOffline: true, id: clientRequestId };
        }
        throw err;
      }
    },
    onSuccess: (res: any) => {
      if (res?.queuedOffline) {
        showAppToast.info({
          title: 'Guardado sin internet',
          description: 'Se sincronizará automáticamente sin duplicarse al volver la conexión.',
        });
        return;
      }
      invalidateFinancialGraph(queryClient);
    },
    onError: (error: any) => {
      if (error?.code === 'PREMIUM_REQUIRED' || error?.status === 403) {
        showAppToast.premium({
          title: 'Suscripciones y recurrentes Premium',
          description: error.message,
        });
      } else {
        showAppToast.error({
          title: error?.message || 'Error al registrar transacción',
          description: error?.details,
        });
      }
    },
  });

  const updateTransaction = useMutation({
    mutationFn: ({ id, ...data }: any) => apiPatch('/api/transactions', { id, ...data }),
    onSuccess: () => {
      invalidateFinancialGraph(queryClient);
      queryClient.invalidateQueries({ queryKey: ['transaction'] });
      showAppToast.success({ title: 'Transacción actualizada' });
    },
    onError: (error: any) => {
      showAppToast.error({
        title: error?.message || 'Error al actualizar transacción',
        description: error?.details,
      });
    },
  });

  const deleteTransaction = useMutation({
    mutationFn: (transactionId: string) =>
      apiDelete(`/api/transactions?id=${encodeURIComponent(transactionId)}`),
    onSuccess: () => {
      invalidateFinancialGraph(queryClient);
      showAppToast.success({ title: 'Transacción eliminada' });
    },
    onError: (error: any) => {
      showAppToast.error({
        title: 'Error al eliminar transacción',
        description: error?.message,
      });
    },
  });

  return {
    transactions,
    isLoading: query.isLoading,
    isFetching: query.isFetching,
    refetch: query.refetch,
    error: query.error,
    fetchNextPage: query.fetchNextPage,
    hasNextPage: query.hasNextPage,
    isFetchingNextPage: query.isFetchingNextPage,
    createTransaction,
    updateTransaction,
    deleteTransaction,
  };
}
