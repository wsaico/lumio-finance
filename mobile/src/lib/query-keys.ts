import { QueryClient } from '@tanstack/react-query';

export function invalidateFinancialGraph(queryClient: QueryClient): void {
  const keys = [
    ['dashboard-analytics'],
    ['accounts'],
    ['transactions'],
    ['transactions-suggestions-pool'],
    ['budgets'],
    ['financial-health-expert'],
    ['savings-goals'],
    ['savings-goals-analytics'],
    ['goal-contributions'],
    ['subscriptions'],
    ['zbb-cycle'],
    ['accounts-receivable'],
    ['accounts-payable'],
  ];
  for (const queryKey of keys) {
    queryClient.invalidateQueries({ queryKey, refetchType: 'all' });
  }
}
