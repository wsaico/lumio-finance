import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiGet, apiPatch, apiPost } from '@/lib/api-client';
import { invalidateFinancialGraph } from '@/lib/query-keys';
import type { AccountPayable, AccountReceivable, PaymentMethod } from '@/types/loans';
import { showAppToast } from '@/stores/toast-store';

export interface RegisterLoanPaymentPayload {
  id: string;
  paymentAmount: number;
  accountId: string;
  principalAmount?: number;
  interestAmount?: number;
  paymentMethod?: PaymentMethod;
  notes?: string;
}

export function useAccountsReceivable(status?: string) {
  const params = new URLSearchParams();
  if (status && status !== 'ALL') params.append('status', status);
  const qs = params.toString();

  return useQuery<AccountReceivable[]>({
    queryKey: ['accounts-receivable', status],
    queryFn: () =>
      apiGet<AccountReceivable[]>(
        qs ? `/api/accounts-receivable?${qs}` : '/api/accounts-receivable'
      ),
    staleTime: 30_000,
  });
}

export function useAccountsPayable(status?: string) {
  const params = new URLSearchParams();
  if (status && status !== 'ALL') params.append('status', status);
  const qs = params.toString();

  return useQuery<AccountPayable[]>({
    queryKey: ['accounts-payable', status],
    queryFn: () =>
      apiGet<AccountPayable[]>(
        qs ? `/api/accounts-payable?${qs}` : '/api/accounts-payable'
      ),
    staleTime: 30_000,
  });
}

export function useCreateAccountReceivable() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: Record<string, any>) => apiPost('/api/accounts-receivable', data),
    onSuccess: () => {
      invalidateFinancialGraph(queryClient);
      showAppToast.success({ title: 'Préstamo otorgado registrado' });
    },
    onError: (err: any) => {
      if (err?.code === 'PREMIUM_REQUIRED' || err?.status === 403) {
        showAppToast.premium({ title: 'Módulo Préstamos Premium', description: err.message });
      } else {
        showAppToast.error({ title: 'Error al registrar préstamo', description: err?.message });
      }
    },
  });
}

export function useCreateAccountPayable() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: Record<string, any>) => apiPost('/api/accounts-payable', data),
    onSuccess: () => {
      invalidateFinancialGraph(queryClient);
      showAppToast.success({ title: 'Deuda registrada' });
    },
    onError: (err: any) => {
      if (err?.code === 'PREMIUM_REQUIRED' || err?.status === 403) {
        showAppToast.premium({ title: 'Módulo Préstamos Premium', description: err.message });
      } else {
        showAppToast.error({ title: 'Error al registrar deuda', description: err?.message });
      }
    },
  });
}

export function useUpdateAccountReceivable() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: RegisterLoanPaymentPayload) =>
      apiPatch<AccountReceivable>('/api/accounts-receivable', data),
    onSuccess: (data) => {
      invalidateFinancialGraph(queryClient);
      showAppToast.success({
        title:
          data?.status === 'COLLECTED'
            ? 'Préstamo cobrado completamente'
            : 'Cobro parcial registrado',
      });
    },
    onError: (err: any) =>
      showAppToast.error({ title: 'Error al registrar cobro', description: err?.message }),
  });
}

export function useUpdateAccountPayable() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: RegisterLoanPaymentPayload) =>
      apiPatch<AccountPayable>('/api/accounts-payable', data),
    onSuccess: (data) => {
      invalidateFinancialGraph(queryClient);
      showAppToast.success({
        title:
          data?.status === 'PAID'
            ? 'Deuda pagada completamente'
            : 'Pago parcial registrado',
      });
    },
    onError: (err: any) =>
      showAppToast.error({ title: 'Error al registrar pago', description: err?.message }),
  });
}
