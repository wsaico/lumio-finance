import { useCallback, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { apiGet } from '@/lib/api-client';

export interface SuggestedTransaction {
  id: string;
  description: string;
  type: 'EXPENSE' | 'INCOME' | 'TRANSFER';
  count: number;
  lastAmount: number;
  currencyCode?: string;
  categoryId?: string;
  subcategoryId?: string;
  categoryName?: string;
  categoryIcon?: string;
  categoryColor?: string;
  accountId?: string;
  transferToAccountId?: string;
  mode?: string;
  recurrence?: string;
  isScheduled: boolean;
  lastDate: string;
}

export function useTransactionSuggestions(
  activeType?: 'EXPENSE' | 'INCOME' | 'TRANSFER'
) {
  const { data: rawTransactions = [], isLoading } = useQuery({
    queryKey: ['transactions-suggestions-pool'],
    queryFn: async () => {
      const json = await apiGet('/api/transactions?page=1&limit=120');
      return Array.isArray(json?.data) ? json.data : [];
    },
    staleTime: 1000 * 60 * 2,
  });

  const { allGrouped, frequent, scheduled, recentCategoryIds } = useMemo(() => {
    const grouped = new Map<string, SuggestedTransaction>();
    const catCounts = new Map<string, number>();

    for (const tx of rawTransactions) {
      const txType = (tx.transactionType || tx.transaction_type || 'EXPENSE') as
        | 'EXPENSE'
        | 'INCOME'
        | 'TRANSFER';
      if (!['EXPENSE', 'INCOME', 'TRANSFER'].includes(txType)) continue;

      const catId =
        tx.expenseCategoryId ||
        tx.expense_category_id ||
        tx.incomeCategoryId ||
        tx.income_category_id ||
        tx.categoryId ||
        undefined;

      if (catId && (!activeType || txType === activeType)) {
        catCounts.set(catId, (catCounts.get(catId) || 0) + 1);
      }

      const rawDesc = (tx.description || '').trim();
      if (!rawDesc) continue;

      const key = `${txType}::${rawDesc.toLowerCase()}`;
      const mode = tx.metadata?.mode || 'DEFAULT';
      const recurrence = tx.metadata?.recurrence || 'NONE';
      const isScheduled =
        ['SUBSCRIPTION', 'RECURRING', 'UPCOMING'].includes(mode) ||
        (recurrence && recurrence !== 'NONE');

      const catObj =
        tx.expenseCategory || tx.expense_category || tx.incomeCategory || tx.income_category;

      const existing = grouped.get(key);
      if (!existing) {
        grouped.set(key, {
          id: tx.id || key,
          description: rawDesc,
          type: txType,
          count: 1,
          lastAmount: Number(tx.amount) || 0,
          currencyCode: tx.currencyCode || tx.currency_code,
          categoryId: catId,
          subcategoryId: tx.subcategoryId || tx.sub_category_id || undefined,
          categoryName: catObj?.name,
          categoryIcon: catObj?.icon,
          categoryColor: catObj?.color,
          accountId: tx.accountId || tx.account_id || undefined,
          transferToAccountId: tx.transferToAccountId || tx.transfer_to_account_id || undefined,
          mode,
          recurrence,
          isScheduled: Boolean(isScheduled),
          lastDate: tx.transactionDate || tx.transaction_date || '',
        });
      } else {
        existing.count += 1;
        if (isScheduled) existing.isScheduled = true;
      }
    }

    const all = Array.from(grouped.values());
    const byType = activeType ? all.filter((item) => item.type === activeType) : all;

    const freq = [...byType]
      .sort((a, b) => b.count - a.count || b.lastDate.localeCompare(a.lastDate))
      .slice(0, 8);

    const sched = [...byType]
      .filter((item) => item.isScheduled)
      .sort((a, b) => b.count - a.count || b.lastDate.localeCompare(a.lastDate))
      .slice(0, 6);

    const topCats = Array.from(catCounts.entries())
      .sort((a, b) => b[1] - a[1])
      .map(([id]) => id)
      .slice(0, 6);

    return {
      allGrouped: all,
      frequent: freq,
      scheduled: sched,
      recentCategoryIds: topCats,
    };
  }, [rawTransactions, activeType]);

  const getAutocompleteMatches = useCallback(
    (
      query: string,
      typeFilter?: 'EXPENSE' | 'INCOME' | 'TRANSFER'
    ): SuggestedTransaction[] => {
      const q = query.trim().toLowerCase();
      const pool = typeFilter
        ? allGrouped.filter((item) => item.type === typeFilter)
        : allGrouped;

      if (!q) return pool.slice(0, 5);

      return pool
        .filter(
          (item) =>
            item.description.toLowerCase().includes(q) ||
            (item.categoryName && item.categoryName.toLowerCase().includes(q))
        )
        .sort((a, b) => {
          const aStarts = a.description.toLowerCase().startsWith(q) ? 1 : 0;
          const bStarts = b.description.toLowerCase().startsWith(q) ? 1 : 0;
          if (aStarts !== bStarts) return bStarts - aStarts;
          return b.count - a.count;
        })
        .slice(0, 6);
    },
    [allGrouped]
  );

  return {
    frequent,
    scheduled,
    recentCategoryIds,
    getAutocompleteMatches,
    isLoading,
  };
}
