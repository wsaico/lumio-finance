import { getRegionByCountry } from './regions';

export interface CurrencyInfo {
  code: string;
  name: string;
  symbol: string;
  region: string;
}

export const CURRENCIES: CurrencyInfo[] = [
  { code: 'PEN', name: 'Sol peruano', symbol: 'S/.', region: 'Perú' },
  { code: 'USD', name: 'Dólar estadounidense', symbol: '$', region: 'EE.UU. / Ecuador / Panamá' },
  { code: 'EUR', name: 'Euro', symbol: '€', region: 'Unión Europea' },
  { code: 'COP', name: 'Peso colombiano', symbol: 'COL$', region: 'Colombia' },
  { code: 'BOB', name: 'Boliviano', symbol: 'Bs.', region: 'Bolivia' },
  { code: 'MXN', name: 'Peso mexicano', symbol: 'MX$', region: 'México' },
  { code: 'CLP', name: 'Peso chileno', symbol: 'CL$', region: 'Chile' },
  { code: 'ARS', name: 'Peso argentino', symbol: 'AR$', region: 'Argentina' },
  { code: 'BRL', name: 'Real brasileño', symbol: 'R$', region: 'Brasil' },
  { code: 'UYU', name: 'Peso uruguayo', symbol: '$U', region: 'Uruguay' },
  { code: 'PYG', name: 'Guaraní paraguayo', symbol: '₲', region: 'Paraguay' },
  { code: 'CRC', name: 'Colón costarricense', symbol: '₡', region: 'Costa Rica' },
  { code: 'DOP', name: 'Peso dominicano', symbol: 'RD$', region: 'Rep. Dominicana' },
  { code: 'GTQ', name: 'Quetzal guatemalteco', symbol: 'Q', region: 'Guatemala' },
  { code: 'VES', name: 'Bolívar venezolano', symbol: 'Bs.D', region: 'Venezuela' },
  { code: 'GBP', name: 'Libra esterlina', symbol: '£', region: 'Reino Unido' },
  { code: 'CAD', name: 'Dólar canadiense', symbol: 'CA$', region: 'Canadá' },
];

export const DEFAULT_CURRENCY = 'PEN';

export const FALLBACK_USD_RATES: Record<string, number> = {
  USD: 1,
  PEN: 3.72,
  EUR: 0.92,
  COP: 4150,
  BOB: 6.96,
  MXN: 20.1,
  CLP: 950,
  ARS: 1050,
  BRL: 5.8,
  UYU: 42.5,
  PYG: 7800,
  CRC: 512,
  DOP: 60.5,
  GTQ: 7.72,
  VES: 55,
  GBP: 0.79,
  CAD: 1.4,
};

const SYMBOLS: Record<string, string> = Object.fromEntries(
  CURRENCIES.map((c) => [c.code, c.symbol])
);

export function getCurrencySymbol(code?: string | null): string {
  if (!code) return SYMBOLS[DEFAULT_CURRENCY];
  return SYMBOLS[code.toUpperCase()] || code;
}

export function getCurrencyName(code?: string | null): string {
  return CURRENCIES.find((c) => c.code === code)?.name || code || '';
}

export function getCurrencyInfo(code?: string | null): CurrencyInfo | undefined {
  if (!code) return CURRENCIES.find((c) => c.code === DEFAULT_CURRENCY);
  return CURRENCIES.find((c) => c.code === code);
}

/**
 * Returns only currencies relevant to the user's configured country/base currency
 * (local currency + major reference currencies USD/EUR) instead of suggesting unrelated countries.
 */
export function getQuickCurrenciesForUser(
  countryCode?: string | null,
  baseCurrency?: string | null,
  selectedCode?: string | null
): CurrencyInfo[] {
  const regionCurrency = getRegionByCountry(countryCode).currencyCode;
  const primary = (baseCurrency || regionCurrency || DEFAULT_CURRENCY).toUpperCase();
  const preferredCodes = Array.from(
    new Set([primary, regionCurrency, 'USD', 'EUR', selectedCode?.toUpperCase()].filter(Boolean) as string[])
  );
  return preferredCodes
    .map((code) => CURRENCIES.find((c) => c.code === code))
    .filter((c): c is CurrencyInfo => Boolean(c));
}

export function getAllCurrenciesOrdered(
  countryCode?: string | null,
  baseCurrency?: string | null
): CurrencyInfo[] {
  const quick = getQuickCurrenciesForUser(countryCode, baseCurrency);
  const quickSet = new Set(quick.map((c) => c.code));
  const rest = CURRENCIES.filter((c) => !quickSet.has(c.code));
  return [...quick, ...rest];
}

export const NUMBER_FORMATS = [
  { id: 'us', label: '1,234.56', locale: 'en-US' },
  { id: 'eu', label: '1.234,56', locale: 'es-ES' },
] as const;

export type NumberFormatId = (typeof NUMBER_FORMATS)[number]['id'];
