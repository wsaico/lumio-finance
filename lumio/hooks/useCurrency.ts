import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

interface Currency {
  id: string;
  code: string;
  name: string;
  symbol: string;
}

interface ExchangeRate {
  id: string;
  fromCurrency: string;
  toCurrency: string;
  rate: number;
  date: Date;
}

async function fetchCurrencies(): Promise<Currency[]> {
  const response = await fetch('/api/currencies');
  if (!response.ok) {
    throw new Error('Failed to fetch currencies');
  }
  const data = await response.json();
  return data.currencies;
}

async function fetchExchangeRate(from: string, to: string): Promise<ExchangeRate> {
  const response = await fetch(`/api/exchange-rates?from=${from}&to=${to}`);
  if (!response.ok) {
    throw new Error('Failed to fetch exchange rate');
  }
  const data = await response.json();
  return data.exchangeRate;
}

async function syncExchangeRates(baseCurrency: string): Promise<void> {
  const response = await fetch('/api/exchange-rates/sync', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ baseCurrency }),
  });

  if (!response.ok) {
    throw new Error('Failed to sync exchange rates');
  }
}

export function useCurrencies() {
  return useQuery({
    queryKey: ['currencies'],
    queryFn: fetchCurrencies,
    staleTime: 1000 * 60 * 60, // 1 hour
  });
}

export function useExchangeRate(fromCurrency: string, toCurrency: string, enabled = true) {
  return useQuery({
    queryKey: ['exchange-rate', fromCurrency, toCurrency],
    queryFn: () => fetchExchangeRate(fromCurrency, toCurrency),
    enabled: enabled && fromCurrency !== toCurrency,
    staleTime: 1000 * 60 * 30, // 30 minutes
  });
}

export function useSyncExchangeRates() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: syncExchangeRates,
    onSuccess: () => {
      // Invalidate all exchange rate queries
      queryClient.invalidateQueries({ queryKey: ['exchange-rate'] });
    },
  });
}

export function useConvertCurrency() {
  const queryClient = useQueryClient();

  return {
    convert: async (
      amount: number,
      fromCurrency: string,
      toCurrency: string
    ): Promise<number> => {
      if (fromCurrency === toCurrency) {
        return amount;
      }

      // Try to get from cache first
      const cachedRate = queryClient.getQueryData<ExchangeRate>([
        'exchange-rate',
        fromCurrency,
        toCurrency,
      ]);

      if (cachedRate) {
        return amount * Number(cachedRate.rate);
      }

      // Fetch if not cached
      const rate = await fetchExchangeRate(fromCurrency, toCurrency);
      return amount * Number(rate.rate);
    },
  };
}
