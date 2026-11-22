import { DEFAULT_CURRENCY, FALLBACK_USD_RATES } from './currencies';

export type ExchangeRateMap = Record<string, number>;

export function getEffectiveRate(
  from: string | null | undefined,
  to: string | null | undefined,
  rateMap: ExchangeRateMap
): { rate: number; isFallback: boolean } {
  const fromCode = (from || DEFAULT_CURRENCY).toUpperCase();
  const toCode = (to || DEFAULT_CURRENCY).toUpperCase();

  if (fromCode === toCode) return { rate: 1, isFallback: false };

  const direct = rateMap[`${fromCode}_${toCode}`];
  if (direct && direct > 0) return { rate: direct, isFallback: false };

  const inverse = rateMap[`${toCode}_${fromCode}`];
  if (inverse && inverse > 0) return { rate: 1 / inverse, isFallback: false };

  let fromToUsd: number | null = null;
  if (fromCode === 'USD') {
    fromToUsd = 1;
  } else if (rateMap[`${fromCode}_USD`] > 0) {
    fromToUsd = rateMap[`${fromCode}_USD`];
  } else if (rateMap[`USD_${fromCode}`] > 0) {
    fromToUsd = 1 / rateMap[`USD_${fromCode}`];
  }

  let usdToTarget: number | null = null;
  if (toCode === 'USD') {
    usdToTarget = 1;
  } else if (rateMap[`USD_${toCode}`] > 0) {
    usdToTarget = rateMap[`USD_${toCode}`];
  } else if (rateMap[`${toCode}_USD`] > 0) {
    usdToTarget = 1 / rateMap[`${toCode}_USD`];
  }

  if (fromToUsd !== null && usdToTarget !== null) {
    return { rate: fromToUsd * usdToTarget, isFallback: false };
  }

  const fallbackFrom =
    fromToUsd ?? (FALLBACK_USD_RATES[fromCode] ? 1 / FALLBACK_USD_RATES[fromCode] : null);
  const fallbackTo = usdToTarget ?? FALLBACK_USD_RATES[toCode] ?? null;

  if (fallbackFrom !== null && fallbackTo !== null) {
    return { rate: fallbackFrom * fallbackTo, isFallback: true };
  }

  return { rate: 1, isFallback: true };
}

export function convertAmount(
  amount: number,
  from: string | null | undefined,
  to: string | null | undefined,
  rateMap: ExchangeRateMap
): number {
  const numericAmount = Number(amount || 0);
  if (!Number.isFinite(numericAmount)) return 0;
  const { rate } = getEffectiveRate(from, to, rateMap);
  return numericAmount * rate;
}
