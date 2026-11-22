import { useQuery } from '@tanstack/react-query';
import { apiGet } from '@/lib/api-client';
import type { DashboardData } from '@/types/analytics';

export function useDashboardData() {
  return useQuery<DashboardData>({
    queryKey: ['dashboard-analytics'],
    queryFn: () => apiGet<DashboardData>('/api/analytics/dashboard'),
    staleTime: 1000 * 10,
    refetchOnMount: 'always',
  });
}
