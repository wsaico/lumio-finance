import { DEFAULT_CURRENCY, getCurrencySymbol } from './currencies';

export function formatMoneyValue(
  amount: number | string | null | undefined,
  currencyCode?: string | null,
  numberFormat: string = '1,234.56'
): string {
  if (amount === null || amount === undefined) return '';
  const num = typeof amount === 'string' ? parseFloat(amount) : amount;
  if (!Number.isFinite(num)) return '';

  const symbol = getCurrencySymbol(currencyCode || DEFAULT_CURRENCY);
  const isEuropean = numberFormat.includes('1.234,56');
  const abs = Math.abs(num);
  const fixed = abs.toFixed(2);
  const [intPart, decPart] = fixed.split('.');
  const thousandsSep = isEuropean ? '.' : ',';
  const decSep = isEuropean ? ',' : '.';
  const groupedInt = intPart.replace(/\B(?=(\d{3})+(?!\d))/g, thousandsSep);
  const sign = num < 0 ? '-' : '';
  return `${sign}${symbol} ${groupedInt}${decSep}${decPart}`;
}

export function formatCompactMoneyValue(
  amount: number | string | null | undefined,
  currencyCode?: string | null
): string {
  if (amount === null || amount === undefined) return '';
  const num = typeof amount === 'string' ? parseFloat(amount) : amount;
  if (!Number.isFinite(num)) return '';
  const symbol = getCurrencySymbol(currencyCode || DEFAULT_CURRENCY);
  const abs = Math.abs(num);
  const sign = num < 0 ? '-' : '';
  if (abs >= 1_000_000) return `${sign}${symbol}${(abs / 1_000_000).toFixed(1)}M`;
  if (abs >= 1_000) return `${sign}${symbol}${(abs / 1_000).toFixed(1)}k`;
  return `${sign}${symbol}${abs.toFixed(0)}`;
}

export function formatAccountPillName(name: string, currencyCode?: string): string {
  if (!name) return '';
  if (!currencyCode) return name;
  const pattern = new RegExp(`\\s*\\(${currencyCode}\\)\\s*$`, 'i');
  const baseName = name.replace(pattern, '').trim();
  return `${baseName} (${currencyCode})`;
}

export function formatShortTimeNow(timeZone = 'America/Lima'): string {
  try {
    return new Intl.DateTimeFormat('es-PE', {
      timeZone,
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
    }).format(new Date());
  } catch {
    return '';
  }
}

export function toLocalDateString(date: Date = new Date()): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function safeEvaluateExpression(expr: string): string {
  const cleaned = expr.replace(/[^0-9+\-*/.]/g, '');
  if (!cleaned) return '0';

  // Tokenize numbers and operators deterministically without eval/Function
  const tokens: string[] = [];
  let currentNum = '';

  for (let i = 0; i < cleaned.length; i++) {
    const ch = cleaned[i];
    if ((ch >= '0' && ch <= '9') || ch === '.') {
      currentNum += ch;
    } else if ('+-*/'.includes(ch)) {
      if (currentNum) {
        tokens.push(currentNum);
        currentNum = '';
      } else if (ch === '-' && (tokens.length === 0 || '+-*/'.includes(tokens[tokens.length - 1]))) {
        currentNum = '-';
        continue;
      }
      if (tokens.length > 0 && !'+-*/'.includes(tokens[tokens.length - 1])) {
        tokens.push(ch);
      }
    }
  }
  if (currentNum && currentNum !== '-') {
    tokens.push(currentNum);
  }
  if (tokens.length === 0) return '0';
  if ('+-*/'.includes(tokens[tokens.length - 1])) {
    tokens.pop();
  }
  if (tokens.length === 0) return '0';

  // Pass 1: * and /
  const pass1: (number | string)[] = [];
  let idx = 0;
  while (idx < tokens.length) {
    const tok = tokens[idx];
    if ((tok === '*' || tok === '/') && pass1.length > 0 && idx + 1 < tokens.length) {
      const left = Number(pass1.pop());
      const right = Number(tokens[idx + 1]);
      if (!Number.isFinite(left) || !Number.isFinite(right)) return '0';
      const val = tok === '*' ? left * right : right === 0 ? 0 : left / right;
      pass1.push(val);
      idx += 2;
    } else {
      pass1.push(tok === '+' || tok === '-' || tok === '*' || tok === '/' ? tok : Number(tok));
      idx += 1;
    }
  }

  // Pass 2: + and -
  let total = Number(pass1[0]) || 0;
  for (let i = 1; i < pass1.length; i += 2) {
    const op = pass1[i];
    const rhs = Number(pass1[i + 1]) || 0;
    if (op === '+') total += rhs;
    else if (op === '-') total -= rhs;
  }

  if (!Number.isFinite(total) || Number.isNaN(total)) return '0';
  const rounded = Math.max(0, Math.round(total * 100) / 100);
  return String(rounded);
}
