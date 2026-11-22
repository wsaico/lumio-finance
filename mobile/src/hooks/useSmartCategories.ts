import { useMutation, useQuery } from '@tanstack/react-query';
import { apiPost } from '@/lib/api-client';

export interface CategorySuggestion {
  categoryId: string;
  subcategoryId: string | null;
  categoryName: string;
  subcategoryName: string | null;
  categoryIcon: string | null;
  categoryColor: string | null;
  confidence: number;
  matchedKeywords: string[];
}

export function useSmartCategories(
  description: string,
  type: 'EXPENSE' | 'INCOME' = 'EXPENSE',
  enabled = true
) {
  return useQuery<{ suggestions: CategorySuggestion[] }>({
    queryKey: ['smart-categories', type, description.trim().toLowerCase()],
    queryFn: () =>
      apiPost('/api/smart-categories/suggest', { description, type }),
    enabled: enabled && description.trim().length >= 3,
    staleTime: 1000 * 60 * 5,
    gcTime: 1000 * 60 * 10,
  });
}

export function useLearnCategory() {
  return useMutation({
    mutationFn: (payload: {
      description: string;
      categoryId: string;
      subcategoryId?: string;
    }) => apiPost('/api/smart-categories/learn', payload),
  });
}
