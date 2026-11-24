export interface BankPreset {
  id: string;
  name: string;
  color: string;
  type: 'BANK' | 'DIGITAL' | 'INVESTMENT' | 'CUSTOM';
  countries: string[];
  isCustom?: boolean;
}

export const BANK_PRESETS: BankPreset[] = [
  // Perú
  { id: 'bcp', name: 'BCP', color: '#002A8D', type: 'BANK', countries: ['PE'] },
  { id: 'interbank', name: 'Interbank', color: '#009A3E', type: 'BANK', countries: ['PE'] },
  { id: 'bbva-pe', name: 'BBVA', color: '#004481', type: 'BANK', countries: ['PE', 'MX', 'CO', 'AR', 'ES'] },
  { id: 'scotiabank', name: 'Scotiabank', color: '#EC111A', type: 'BANK', countries: ['PE', 'MX', 'CO', 'CL'] },
  { id: 'banbif', name: 'BanBif', color: '#007398', type: 'BANK', countries: ['PE'] },
  { id: 'nacion-pe', name: 'Banco de la Nación', color: '#C8102E', type: 'BANK', countries: ['PE'] },
  { id: 'falabella', name: 'Banco Falabella', color: '#1F8A3B', type: 'BANK', countries: ['PE', 'CL', 'CO'] },
  { id: 'ripley', name: 'Banco Ripley', color: '#6E2585', type: 'BANK', countries: ['PE', 'CL'] },
  { id: 'pichincha', name: 'Banco Pichincha', color: '#C69700', type: 'BANK', countries: ['PE', 'EC', 'CO'] },
  { id: 'gnb', name: 'Banco GNB', color: '#B91C1C', type: 'BANK', countries: ['PE', 'CO', 'PY'] },
  { id: 'mibanco', name: 'Mibanco', color: '#009E49', type: 'BANK', countries: ['PE', 'CO'] },
  { id: 'caja-arequipa', name: 'Caja Arequipa', color: '#004A8F', type: 'BANK', countries: ['PE'] },
  { id: 'yape', name: 'Yape', color: '#742384', type: 'DIGITAL', countries: ['PE', 'BO'] },
  { id: 'plin', name: 'Plin', color: '#00B2A9', type: 'DIGITAL', countries: ['PE'] },
  { id: 'agora', name: 'Agora Pay', color: '#009FE3', type: 'DIGITAL', countries: ['PE'] },
  { id: 'ligo', name: 'Ligo', color: '#0F172A', type: 'DIGITAL', countries: ['PE'] },
  { id: 'tunki', name: 'Tunki', color: '#EA580C', type: 'DIGITAL', countries: ['PE'] },
  { id: 'prex', name: 'Prex', color: '#5B35D5', type: 'DIGITAL', countries: ['PE', 'AR', 'UY', 'CL'] },
  { id: 'tyba', name: 'tyba', color: '#0EA5E9', type: 'INVESTMENT', countries: ['PE', 'CO'] },

  // México
  { id: 'banamex', name: 'Citibanamex', color: '#004687', type: 'BANK', countries: ['MX'] },
  { id: 'banorte', name: 'Banorte', color: '#EB0029', type: 'BANK', countries: ['MX'] },
  { id: 'santander', name: 'Santander', color: '#EC0000', type: 'BANK', countries: ['MX', 'CL', 'AR', 'ES', 'BR', 'UY'] },
  { id: 'hsbc', name: 'HSBC', color: '#DB0011', type: 'BANK', countries: ['MX', 'AR', 'US', 'GB'] },
  { id: 'nu', name: 'Nu', color: '#820AD1', type: 'DIGITAL', countries: ['MX', 'CO', 'BR'] },
  { id: 'mercadopago', name: 'Mercado Pago', color: '#009EE3', type: 'DIGITAL', countries: ['MX', 'AR', 'CL', 'BR', 'CO', 'PE', 'UY'] },
  { id: 'klar', name: 'Klar', color: '#0F172A', type: 'DIGITAL', countries: ['MX'] },
  { id: 'spin', name: 'Spin by OXXO', color: '#D97706', type: 'DIGITAL', countries: ['MX'] },

  // Colombia
  { id: 'bancolombia', name: 'Bancolombia', color: '#FDDA24', type: 'BANK', countries: ['CO'] },
  { id: 'davivienda', name: 'Davivienda', color: '#ED1C24', type: 'BANK', countries: ['CO', 'CR'] },
  { id: 'bogota', name: 'Banco de Bogotá', color: '#003B73', type: 'BANK', countries: ['CO'] },
  { id: 'nequi', name: 'Nequi', color: '#DA0081', type: 'DIGITAL', countries: ['CO', 'PA'] },
  { id: 'daviplata', name: 'Daviplata', color: '#DC2626', type: 'DIGITAL', countries: ['CO'] },
  { id: 'lulo', name: 'Lulo Bank', color: '#059669', type: 'DIGITAL', countries: ['CO'] },

  // Chile / Argentina / Ecuador / Bolivia / España / Global
  { id: 'bancoestado', name: 'BancoEstado', color: '#F97316', type: 'BANK', countries: ['CL'] },
  { id: 'bci', name: 'BCI', color: '#16A34A', type: 'BANK', countries: ['CL'] },
  { id: 'mach', name: 'MACH', color: '#6D28D9', type: 'DIGITAL', countries: ['CL'] },
  { id: 'tenpo', name: 'Tenpo', color: '#10B981', type: 'DIGITAL', countries: ['CL'] },
  { id: 'galicia', name: 'Banco Galicia', color: '#EA580C', type: 'BANK', countries: ['AR'] },
  { id: 'uala', name: 'Ualá', color: '#EF4444', type: 'DIGITAL', countries: ['AR', 'MX', 'CO'] },
  { id: 'brubank', name: 'Brubank', color: '#6366F1', type: 'DIGITAL', countries: ['AR'] },
  { id: 'guayaquil', name: 'Banco Guayaquil', color: '#DB2777', type: 'BANK', countries: ['EC'] },
  { id: 'produbanco', name: 'Produbanco', color: '#15803D', type: 'BANK', countries: ['EC'] },
  { id: 'deuna', name: 'Deuna!', color: '#7C3AED', type: 'DIGITAL', countries: ['EC'] },
  { id: 'bnb', name: 'BNB', color: '#059669', type: 'BANK', countries: ['BO'] },
  { id: 'bisa', name: 'Banco Bisa', color: '#1D4ED8', type: 'BANK', countries: ['BO'] },
  { id: 'caixabank', name: 'CaixaBank', color: '#0284C7', type: 'BANK', countries: ['ES'] },
  { id: 'bizum', name: 'Bizum', color: '#06B6D4', type: 'DIGITAL', countries: ['ES'] },
  { id: 'chase', name: 'Chase', color: '#117ACA', type: 'BANK', countries: ['US'] },
  { id: 'bofa', name: 'Bank of America', color: '#E31837', type: 'BANK', countries: ['US'] },

  // Digitales e Inversión Globales
  { id: 'paypal', name: 'PayPal', color: '#003087', type: 'DIGITAL', countries: ['GLOBAL'] },
  { id: 'wise', name: 'Wise', color: '#163300', type: 'DIGITAL', countries: ['GLOBAL'] },
  { id: 'revolut', name: 'Revolut', color: '#191C1F', type: 'DIGITAL', countries: ['GLOBAL'] },
  { id: 'binance', name: 'Binance', color: '#D97706', type: 'INVESTMENT', countries: ['GLOBAL'] },
  { id: 'trii', name: 'Trii', color: '#10B981', type: 'INVESTMENT', countries: ['PE', 'CO', 'CL'] },
  { id: 'hapi', name: 'Hapi', color: '#6366F1', type: 'INVESTMENT', countries: ['PE', 'MX', 'CO', 'CL', 'EC', 'AR'] },
  { id: 'ibkr', name: 'Interactive Brokers', color: '#B91C1C', type: 'INVESTMENT', countries: ['GLOBAL'] },
];

export const ENTITY_COLORS = [
  '#5B35D5',
  '#002A8D',
  '#009A3E',
  '#004481',
  '#EC111A',
  '#742384',
  '#009EE3',
  '#FF7A33',
  '#0F172A',
  '#D97706',
];

export function getEntitiesForCountry(
  countryCode?: string | null,
  accountType?: 'CASH' | 'BANK' | 'DIGITAL' | 'CREDIT_CARD' | 'INVESTMENT'
): BankPreset[] {
  const code = (countryCode || 'PE').toUpperCase();
  const preferredType =
    accountType === 'DIGITAL'
      ? 'DIGITAL'
      : accountType === 'INVESTMENT'
        ? 'INVESTMENT'
        : 'BANK';

  const score = (b: BankPreset) => {
    const inCountry = b.countries.includes(code) ? 4 : b.countries.includes('GLOBAL') ? 2 : 0;
    const typeMatch = b.type === preferredType ? 2 : 0;
    return inCountry * 10 + typeMatch;
  };

  return [...BANK_PRESETS].sort((a, b) => score(b) - score(a));
}

export function getDefaultEntityForCountry(
  countryCode?: string | null,
  accountType?: 'CASH' | 'BANK' | 'DIGITAL' | 'CREDIT_CARD' | 'INVESTMENT'
): BankPreset {
  return getEntitiesForCountry(countryCode, accountType)[0] || BANK_PRESETS[0];
}
