import { useMemo } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiDelete, apiGet, apiPatch, apiPost } from '@/lib/api-client';
import { invalidateFinancialGraph } from '@/lib/query-keys';
import { useExchangeRates } from './useExchangeRates';
import { useSettingsStore } from '@/stores/settings-store';
import { showAppToast } from '@/stores/toast-store';

const EMPTY_ARRAY: any[] = [];

export function useAccounts() {
  const queryClient = useQueryClient();
  const { convert } = useExchangeRates();
  const baseCurrency = useSettingsStore((s) => s.currencyCode) || 'PEN';

  const { data: accounts, isLoading, error, refetch } = useQuery<any[]>({
    queryKey: ['accounts'],
    queryFn: () => apiGet<any[]>('/api/accounts'),
    staleTime: 1000 * 45,
    refetchOnMount: true,
  });

  const summary = useMemo(() => {
    const list = accounts || EMPTY_ARRAY;
    let liquidBalanceConverted = 0;
    let totalCreditDebtConverted = 0;
    let totalCreditLimitConverted = 0;
    const balancesByCurrency: Record<string, number> = {};

    for (const account of list) {
      const currency = account.currencyCode || baseCurrency;
      if (account.accountType === 'CREDIT_CARD') {
        const limit = Math.max(0, Number(account.creditLimit) || 0);
        const used = Math.abs(Number(account.usedBalance) || 0);
        totalCreditLimitConverted += convert(limit, currency, baseCurrency);
        totalCreditDebtConverted += convert(used, currency, baseCurrency);
      } else {
        const balance = Number(account.currentBalance) || 0;
        balancesByCurrency[currency] = (balancesByCurrency[currency] || 0) + balance;
        liquidBalanceConverted += convert(balance, currency, baseCurrency);
      }
    }

    const totalCreditAvailableConverted = Math.max(
      0,
      totalCreditLimitConverted - totalCreditDebtConverted
    );
    const netWorthConverted = liquidBalanceConverted - totalCreditDebtConverted;

    return {
      totalBalanceConverted: liquidBalanceConverted,
      liquidBalanceConverted,
      totalCreditDebtConverted,
      totalCreditLimitConverted,
      totalCreditAvailableConverted,
      netWorthConverted,
      balancesByCurrency,
    };
  }, [accounts, baseCurrency, convert]);

  const createAccount = useMutation({
    mutationFn: (newAccount: Record<string, any>) => apiPost('/api/accounts', newAccount),
    onSuccess: () => {
      invalidateFinancialGraph(queryClient);
      showAppToast.success({ title: 'Cuenta creada exitosamente' });
    },
    onError: (err: any) => {
      if (err?.code === 'ACCOUNT_LIMIT_REACHED' || err?.status === 403) {
        showAppToast.premium({
          title: 'Límite del Plan Básico',
          description: err.message,
        });
      } else {
        showAppToast.error({
          title: 'No se pudo crear la cuenta',
          description: err?.message,
        });
      }
    },
  });

  const updateAccount = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Record<string, any> }) =>
      apiPatch(`/api/accounts/${id}`, data),
    onSuccess: () => {
      invalidateFinancialGraph(queryClient);
      showAppToast.success({ title: 'Cuenta actualizada' });
    },
    onError: (err: any) => {
      showAppToast.error({
        title: 'No se pudo actualizar la cuenta',
        description: err?.message,
      });
    },
  });

  const deleteAccount = useMutation({
    mutationFn: (id: string) => apiDelete(`/api/accounts/${id}`),
    onSuccess: () => {
      invalidateFinancialGraph(queryClient);
      showAppToast.success({ title: 'Cuenta eliminada' });
    },
    onError: (err: any) => {
      showAppToast.error({
        title: 'No se pudo eliminar la cuenta',
        description: err?.message,
      });
    },
  });

  const adjustBalance = useMutation({
    mutationFn: ({
      id,
      newInitialBalance,
      reason,
    }: {
      id: string;
      newInitialBalance: number;
      reason?: string;
    }) => apiPost(`/api/accounts/${id}/adjust-balance`, { newInitialBalance, reason }),
    onSuccess: () => {
      invalidateFinancialGraph(queryClient);
      showAppToast.success({ title: 'Saldo inicial ajustado' });
    },
    onError: (err: any) => {
      showAppToast.error({
        title: 'No se pudo ajustar el saldo',
        description: err?.message,
      });
    },
  });

  return {
    accounts: accounts || EMPTY_ARRAY,
    isLoading,
    error,
    refetch,
    ...summary,
    createAccount,
    updateAccount,
    deleteAccount,
    adjustBalance,
  };
}
