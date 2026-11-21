import { useMutation, useQuery } from '@tanstack/react-query';

interface CategorySuggestion {
  categoryId: string;
  subcategoryId: string | null;
  categoryName: string;
  subcategoryName: string | null;
  categoryIcon: string | null;
  categoryColor: string | null;
  confidence: number;
  matchedKeywords: string[];
}

interface SuggestResponse {
  suggestions: CategorySuggestion[];
}

interface LearnResponse {
  message: string;
  learned: number;
  keywords: string[];
}

async function fetchSuggestions(
  description: string,
  type: 'EXPENSE' | 'INCOME' = 'EXPENSE'
): Promise<SuggestResponse> {
  const response = await fetch('/api/smart-categories/suggest', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ description, type }),
  });

  if (!response.ok) {
    throw new Error('Failed to fetch category suggestions');
  }

  return response.json();
}

async function learnCategoryAssociation(
  description: string,
  categoryId: string,
  subcategoryId?: string
): Promise<LearnResponse> {
  const response = await fetch('/api/smart-categories/learn', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ description, categoryId, subcategoryId }),
  });

  if (!response.ok) {
    throw new Error('Failed to learn category association');
  }

  return response.json();
}

export function useSmartCategories(
  description: string,
  type: 'EXPENSE' | 'INCOME' = 'EXPENSE',
  enabled = true
) {
  return useQuery({
    queryKey: ['smart-categories', type, description.trim().toLowerCase()],
    queryFn: () => fetchSuggestions(description, type),
    enabled: enabled && description.trim().length >= 3,
    staleTime: 1000 * 60 * 5,
    gcTime: 1000 * 60 * 10,
  });
}

export function useLearnCategory() {
  return useMutation({
    mutationFn: ({
      description,
      categoryId,
      subcategoryId,
    }: {
      description: string;
      categoryId: string;
      subcategoryId?: string;
    }) => learnCategoryAssociation(description, categoryId, subcategoryId),
    onError: (error) => {
      console.error('Failed to learn category:', error);
    },
  });
}
