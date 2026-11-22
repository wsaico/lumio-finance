import type { Budget } from '@/types/budget';
import type { ScheduledItem } from '@/hooks/useSubscriptions';
import type { AccountPayable } from '@/types/loans';

export interface SafeToSpendResult {
  dailySafeAmount: number;
  dailyQuota: number;
  todaySpent: number;
  monthlyPool: number;
  reservedUpcoming: number;
  liquidTotal: number;
  daysRemaining: number;
  upcomingCount: number;
  hasBudgetPool: boolean;
  status: 'SAFE' | 'TIGHT' | 'DANGER';
  basisLabel: string;
}

export function computeSafeToSpendToday({
  accounts,
  budgets,
  subscriptions,
  payables,
  baseCurrency,
  convert,
  todayExpenses = 0,
}: {
  accounts: any[];
  budgets: Budget[];
  subscriptions: ScheduledItem[];
  payables: AccountPayable[];
  baseCurrency: string;
  convert: (amount: number, from: string, to: string) => number;
  todayExpenses?: number;
}): SafeToSpendResult {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth();
  const todayDay = now.getDate();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const daysRemaining = Math.max(1, daysInMonth - todayDay + 1);
  const todayIso = `${year}-${String(month + 1).padStart(2, '0')}-${String(todayDay).padStart(2, '0')}`;
  const monthEndIso = `${year}-${String(month + 1).padStart(2, '0')}-${String(daysInMonth).padStart(2, '0')}`;

  // 1. Liquid balance across active non-credit accounts
  let liquidTotal = 0;
  let upcomingCardPayments = 0;
  let cardCount = 0;

  for (const acc of accounts || []) {
    if (acc?.excludeFromStats || acc?.exclude_from_stats) continue;
    const curr = acc?.currencyCode || acc?.currency_code || baseCurrency;
    const accType = acc?.accountType || acc?.account_type;
    if (accType === 'CREDIT_CARD') {
      const used = Math.max(0, Number(acc?.usedBalance ?? acc?.used_balance ?? 0));
      const dueDay = Number(acc?.paymentDueDay ?? acc?.payment_due_day ?? 0);
      if (used > 0 && dueDay >= todayDay && dueDay <= daysInMonth) {
        upcomingCardPayments += convert(used, curr, baseCurrency);
        cardCount += 1;
      }
    } else {
      liquidTotal += convert(Number(acc?.currentBalance ?? acc?.current_balance ?? 0), curr, baseCurrency);
    }
  }

  // 2. Upcoming subscriptions/scheduled expenses within this month
  let upcomingSubBills = 0;
  let subCount = 0;
  for (const item of subscriptions || []) {
    if (item.transactionType !== 'EXPENSE') continue;
    const due = item.dueDate ? String(item.dueDate).slice(0, 10) : '';
    if (due >= todayIso && due <= monthEndIso) {
      upcomingSubBills += convert(Number(item.amount || 0), item.currencyCode || baseCurrency, baseCurrency);
      subCount += 1;
    }
  }

  // 3. Active non-mirror loans due on or before month end
  let upcomingLoanBills = 0;
  let loanCount = 0;
  for (const p of payables || []) {
    if ((p.metadata as any)?.isCreditCardMirror) continue;
    if (p.status === 'PAID' || p.status === 'CANCELLED') continue;
    const rem = Number(p.outstandingBalance || 0);
    if (rem <= 0 || !p.dueDate) continue;
    const due = String(p.dueDate).slice(0, 10);
    if (due <= monthEndIso) {
      upcomingLoanBills += convert(rem, p.currencyCode || baseCurrency, baseCurrency);
      loanCount += 1;
    }
  }

  const reservedUpcoming = Math.max(
    0,
    Math.round((upcomingSubBills + upcomingLoanBills + upcomingCardPayments) * 100) / 100
  );
  const upcomingCount = subCount + loanCount + cardCount;

  // 4. Budget remaining pool (if user configured monthly EXPENSE budgets)
  const activeExpenseBudgets = (budgets || []).filter(
    (b) => b.isActive !== false && (b.type || 'EXPENSE') === 'EXPENSE'
  );

  let hasBudgetPool = false;
  let budgetPoolRemaining = 0;
  if (activeExpenseBudgets.length > 0) {
    hasBudgetPool = true;
    for (const b of activeExpenseBudgets) {
      const curr = b.currencyCode || b.currency_code || baseCurrency;
      const limit = convert(Number(b.amount || 0), curr, baseCurrency);
      const spent = convert(Number(b.stats?.spent ?? b.spent ?? 0), curr, baseCurrency);
      budgetPoolRemaining += Math.max(0, limit - spent);
    }
  }

  const liquidAfterBills = liquidTotal - reservedUpcoming;
  const effectivePool = hasBudgetPool
    ? Math.min(liquidAfterBills, Math.max(0, budgetPoolRemaining - upcomingSubBills))
    : liquidAfterBills;

  const dailyQuota = Math.max(0, effectivePool / daysRemaining);
  const safeAfterToday = Math.max(0, dailyQuota - Math.max(0, todayExpenses));

  let status: 'SAFE' | 'TIGHT' | 'DANGER' = 'SAFE';
  if (effectivePool <= 0 || safeAfterToday < 5 || (todayExpenses > 0 && todayExpenses >= dailyQuota)) {
    status = 'DANGER';
  } else if (
    (reservedUpcoming > 0 && liquidAfterBills < reservedUpcoming * 0.25) ||
    safeAfterToday < 25
  ) {
    status = 'TIGHT';
  }

  const basisLabel = hasBudgetPool
    ? 'Calculado según tu presupuesto mensual y pagos próximos'
    : 'Calculado sobre tu liquidez disponible menos pagos próximos';

  return {
    dailySafeAmount: Math.round(safeAfterToday * 100) / 100,
    dailyQuota: Math.round(dailyQuota * 100) / 100,
    todaySpent: Math.round(Math.max(0, todayExpenses) * 100) / 100,
    monthlyPool: Math.round(Math.max(0, effectivePool) * 100) / 100,
    reservedUpcoming,
    liquidTotal: Math.round(liquidTotal * 100) / 100,
    daysRemaining,
    upcomingCount,
    hasBudgetPool,
    status,
    basisLabel,
  };
}

export interface DebtItemInput {
  id: string;
  name: string;
  kind: 'LOAN' | 'CARD';
  balance: number;
  annualRatePct: number;
  minPayment: number;
  dueDateLabel?: string | null;
}

export interface DebtScheduleItem {
  id: string;
  name: string;
  kind: 'LOAN' | 'CARD';
  initialBalance: number;
  annualRatePct: number;
  payoffMonth: number;
  payoffDateIso: string;
  interestPaid: number;
}

export interface DebtStrategyOutcome {
  months: number;
  payoffDateIso: string;
  totalInterest: number;
  schedule: DebtScheduleItem[];
}

export interface DebtPayoffComparison {
  totalDebt: number;
  avalanche: DebtStrategyOutcome;
  snowball: DebtStrategyOutcome;
  interestSavedWithAvalanche: number;
  monthsSavedWithAvalanche: number;
}

function runPayoffSimulation(
  debts: DebtItemInput[],
  extraMonthlyPayment: number,
  strategy: 'AVALANCHE' | 'SNOWBALL'
): DebtStrategyOutcome {
  const MAX_MONTHS = 120;
  const start = new Date();
  const state = debts
    .filter((d) => d.balance > 0.01)
    .map((d) => ({
      ...d,
      remaining: d.balance,
      minPayment: Math.max(10, d.minPayment),
      interestPaid: 0,
      payoffMonth: 0,
    }));

  if (state.length === 0) {
    return {
      months: 0,
      payoffDateIso: start.toISOString(),
      totalInterest: 0,
      schedule: [],
    };
  }

  let month = 0;
  while (month < MAX_MONTHS && state.some((d) => d.remaining > 0.01)) {
    month += 1;

    // Accrue monthly interest
    for (const d of state) {
      if (d.remaining <= 0.01) continue;
      const monthlyRate = Math.max(0, d.annualRatePct) / 100 / 12;
      const interest = d.remaining * monthlyRate;
      d.remaining += interest;
      d.interestPaid += interest;
    }

    // Pay minimum on every active debt and track freed extra pool from paid debts
    let extraPool = Math.max(0, extraMonthlyPayment);
    for (const d of state) {
      if (d.remaining <= 0.01) {
        extraPool += d.minPayment;
        continue;
      }
      const pay = Math.min(d.remaining, d.minPayment);
      d.remaining -= pay;
      if (d.remaining < 0.01) {
        extraPool += d.minPayment - pay;
        d.remaining = 0;
        if (d.payoffMonth === 0) d.payoffMonth = month;
      }
    }

    // Direct remaining snowball/avalanche surplus toward priority order
    const active = state.filter((d) => d.remaining > 0.01);
    active.sort((a, b) =>
      strategy === 'AVALANCHE'
        ? b.annualRatePct - a.annualRatePct || a.remaining - b.remaining
        : a.remaining - b.remaining || b.annualRatePct - a.annualRatePct
    );

    for (const target of active) {
      if (extraPool <= 0.01) break;
      const pay = Math.min(target.remaining, extraPool);
      target.remaining -= pay;
      extraPool -= pay;
      if (target.remaining < 0.01) {
        target.remaining = 0;
        if (target.payoffMonth === 0) target.payoffMonth = month;
      }
    }
  }

  const totalMonths = state.reduce((m, d) => Math.max(m, d.payoffMonth || month), 0);
  const totalInterest = state.reduce((s, d) => s + d.interestPaid, 0);

  const schedule: DebtScheduleItem[] = state
    .map((d) => {
      const m = d.payoffMonth || MAX_MONTHS;
      const pd = new Date(start.getFullYear(), start.getMonth() + m, start.getDate());
      return {
        id: d.id,
        name: d.name,
        kind: d.kind,
        initialBalance: Math.round(d.balance * 100) / 100,
        annualRatePct: Math.round(d.annualRatePct * 10) / 10,
        payoffMonth: m,
        payoffDateIso: pd.toISOString(),
        interestPaid: Math.round(d.interestPaid * 100) / 100,
      };
    })
    .sort((a, b) => a.payoffMonth - b.payoffMonth);

  const finalDate = new Date(start.getFullYear(), start.getMonth() + totalMonths, start.getDate());

  return {
    months: totalMonths,
    payoffDateIso: finalDate.toISOString(),
    totalInterest: Math.round(totalInterest * 100) / 100,
    schedule,
  };
}

export function simulateDebtPayoff({
  debts,
  extraMonthlyPayment,
}: {
  debts: DebtItemInput[];
  extraMonthlyPayment: number;
}): DebtPayoffComparison {
  const totalDebt = Math.round(debts.reduce((s, d) => s + Math.max(0, d.balance), 0) * 100) / 100;
  const avalanche = runPayoffSimulation(debts, extraMonthlyPayment, 'AVALANCHE');
  const snowball = runPayoffSimulation(debts, extraMonthlyPayment, 'SNOWBALL');

  return {
    totalDebt,
    avalanche,
    snowball,
    interestSavedWithAvalanche: Math.max(
      0,
      Math.round((snowball.totalInterest - avalanche.totalInterest) * 100) / 100
    ),
    monthsSavedWithAvalanche: Math.max(0, snowball.months - avalanche.months),
  };
}

export function isExtraIncomeKeyword(text: string): boolean {
  return /\b(grati|gratificaci[oó]n|cts|bono|utilidad|utilidades|aguinaldo|extra|comisi[oó]n)\b/i.test(
    text || ''
  );
}

export function computeDaysUntilDue(dueDate?: string | null): number | null {
  if (!dueDate) return null;
  const clean = String(dueDate).split('T')[0];
  const parts = clean.split('-').map(Number);
  if (parts.length !== 3 || !parts[0] || !parts[1] || !parts[2]) return null;
  const target = new Date(parts[0], parts[1] - 1, parts[2]);
  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  return Math.round((target.getTime() - todayStart.getTime()) / (1000 * 60 * 60 * 24));
}
