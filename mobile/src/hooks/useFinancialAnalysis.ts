import { useQuery } from '@tanstack/react-query';
import { apiGet } from '@/lib/api-client';
import { useSettingsStore } from '@/stores/settings-store';

export function useFinancialAnalysis(params: {
  period: string;
  type: string;
  accountId: string;
  categoryId: string;
}) {
  const currencyCode = useSettingsStore((s) => s.currencyCode) || 'PEN';

  return useQuery<any>({
    queryKey: [
      'financial-health-expert',
      params.period,
      params.type,
      params.accountId,
      params.categoryId,
      currencyCode,
    ],
    queryFn: () => {
      const qs = new URLSearchParams({
        type: params.type,
        period: params.period,
        currency: currencyCode,
      });
      if (params.accountId !== 'ALL') qs.append('accounts', params.accountId);
      if (params.categoryId !== 'ALL') qs.append('categories', params.categoryId);
      return apiGet(`/api/analytics/financial-health?${qs.toString()}`);
    },
    staleTime: 1000 * 60,
  });
}
