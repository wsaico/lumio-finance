import { useMemo, useCallback } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiGet, apiPost } from '@/lib/api-client';
import { convertAmount, getEffectiveRate, type ExchangeRateMap } from '@/lib/currency';
import { showAppToast } from '@/stores/toast-store';

export interface ExchangeRateRecord {
  id: string;
  from_currency: string;
  to_currency: string;
  rate: number;
  source?: string;
  effective_date: string;
}

export function useExchangeRates() {
  const queryClient = useQueryClient();

  const { data: rates, isLoading, error } = useQuery<ExchangeRateRecord[]>({
    queryKey: ['exchange-rates'],
    queryFn: () => apiGet<ExchangeRateRecord[]>('/api/exchange-rates'),
    staleTime: 1000 * 60 * 5,
  });

  const rateMap = useMemo<ExchangeRateMap>(() => {
    if (!rates) return {};
    const map: ExchangeRateMap = {};
    rates.forEach((r) => {
      const key = `${r.from_currency}_${r.to_currency}`;
      if (!map[key] && Number(r.rate) > 0) {
        map[key] = Number(r.rate);
      }
    });
    return map;
  }, [rates]);

  const convert = useCallback(
    (amount: number, from: string, to: string) => convertAmount(amount, from, to, rateMap),
    [rateMap]
  );

  const getRate = useCallback(
    (from: string, to: string) => getEffectiveRate(from, to, rateMap),
    [rateMap]
  );

  const syncRates = useMutation({
    mutationFn: (options?: { forceOverwriteManual?: boolean; currency?: string }) =>
      apiPost('/api/exchange-rates/sync', options || {}),
    onSuccess: (data: any) => {
      queryClient.invalidateQueries({ queryKey: ['exchange-rates'] });
      queryClient.invalidateQueries({ queryKey: ['accounts'] });
      const preserved = Number(data?.preservedManual || 0);
      showAppToast.success({
        title: 'Tasas actualizadas',
        description:
          preserved > 0
            ? `${data?.synced || 0} monedas sincronizadas (${preserved} manuales conservadas)`
            : `${data?.synced || 0} monedas sincronizadas en vivo`,
      });
    },
    onError: (err: any) => {
      showAppToast.error({
        title: 'Error al sincronizar tasas',
        description: err?.message || 'Intenta nuevamente',
      });
    },
  });

  const saveManualRate = useMutation({
    mutationFn: (payload: { from_currency: string; to_currency: string; rate: number }) =>
      apiPost('/api/exchange-rates', { ...payload, source: 'MANUAL' }),
    onSuccess: (_data, vars) => {
      queryClient.invalidateQueries({ queryKey: ['exchange-rates'] });
      queryClient.invalidateQueries({ queryKey: ['accounts'] });
      showAppToast.success({
        title: 'Tasa personalizada guardada',
        description: `1 ${vars.from_currency} = ${vars.rate} ${vars.to_currency}`,
      });
    },
    onError: (err: any) => {
      showAppToast.error({
        title: 'No se pudo guardar la tasa',
        description: err?.message,
      });
    },
  });

  return {
    rates: rates || [],
    rateMap,
    isLoading,
    error,
    syncRates,
    saveManualRate,
    convert,
    getRate,
  };
}
