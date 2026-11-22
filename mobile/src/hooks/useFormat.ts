import { useCallback } from 'react';
import { useSettingsStore } from '@/stores/settings-store';
import { DEFAULT_CURRENCY, getCurrencySymbol } from '@/lib/currencies';
import { formatCompactMoneyValue, formatMoneyValue } from '@/lib/format';

type Amount = number | string | null | undefined;

export function useFormat() {
  const numberFormat = useSettingsStore((s) => s.numberFormat);
  const currencyCode = useSettingsStore((s) => s.currencyCode);
  const isBalanceVisible = useSettingsStore((s) => s.isBalanceVisible);
  const baseCurrency = currencyCode || DEFAULT_CURRENCY;

  const formatMoney = useCallback(
    (amount: Amount, overrideCurrency?: string) =>
      formatMoneyValue(amount, overrideCurrency || baseCurrency, numberFormat),
    [baseCurrency, numberFormat]
  );

  const formatMaskedMoney = useCallback(
    (amount: Amount, overrideCurrency?: string) =>
      isBalanceVisible
        ? formatMoneyValue(amount, overrideCurrency || baseCurrency, numberFormat)
        : '••••••',
    [isBalanceVisible, baseCurrency, numberFormat]
  );

  const formatCompactMoney = useCallback(
    (amount: Amount, overrideCurrency?: string) =>
      formatCompactMoneyValue(amount, overrideCurrency || baseCurrency),
    [baseCurrency]
  );

  const getSymbol = useCallback(
    (overrideCurrency?: string) => getCurrencySymbol(overrideCurrency || baseCurrency),
    [baseCurrency]
  );

  return {
    formatMoney,
    formatMaskedMoney,
    formatCompactMoney,
    getCurrencySymbol: getSymbol,
    baseCurrency,
    isBalanceVisible,
  };
}
