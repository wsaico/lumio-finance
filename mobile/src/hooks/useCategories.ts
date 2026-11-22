import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiDelete, apiGet, apiPost, apiPut } from '@/lib/api-client';
import {
  DEFAULT_EXPENSE_CATEGORIES,
  DEFAULT_INCOME_CATEGORIES,
} from '@/lib/default-categories';
import { showAppToast } from '@/stores/toast-store';

const FALLBACK_EXPENSE = DEFAULT_EXPENSE_CATEGORIES.map((c) => ({
  ...c,
  type: 'EXPENSE' as const,
  isSystem: true,
}));
const FALLBACK_INCOME = DEFAULT_INCOME_CATEGORIES.map((c) => ({
  ...c,
  type: 'INCOME' as const,
  isSystem: true,
}));
const FALLBACK_ALL = [...FALLBACK_EXPENSE, ...FALLBACK_INCOME];

export function useCategories() {
  const queryClient = useQueryClient();

  const { data: categories, isLoading, error, refetch } = useQuery<any>({
    queryKey: ['categories'],
    queryFn: () => apiGet('/api/categories'),
    retry: 2,
    staleTime: 1000 * 60 * 3,
  });

  const rawAll = Array.isArray(categories)
    ? categories
    : categories?.all ||
      (categories?.expense
        ? [...(categories.expense || []), ...(categories.income || [])]
        : null);

  const allCategories =
    rawAll && rawAll.length > 0
      ? rawAll
      : error
        ? FALLBACK_ALL
        : categories?.all || [];

  const rawExpense = Array.isArray(categories)
    ? categories.filter((c: any) => c.type === 'EXPENSE')
    : categories?.expense;

  const expenseCategories =
    rawExpense && rawExpense.length > 0
      ? rawExpense
      : error
        ? FALLBACK_EXPENSE
        : categories?.expense || [];

  const rawIncome = Array.isArray(categories)
    ? categories.filter((c: any) => c.type === 'INCOME')
    : categories?.income;

  const incomeCategories =
    rawIncome && rawIncome.length > 0
      ? rawIncome
      : error
        ? FALLBACK_INCOME
        : categories?.income || [];

  const createCategory = useMutation({
    mutationFn: (newCat: any) => apiPost('/api/categories', newCat),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['categories'] });
      showAppToast.success({ title: 'Categoría creada' });
    },
    onError: (err: any) =>
      showAppToast.error({ title: 'Error al crear categoría', description: err?.message }),
  });

  const updateCategory = useMutation({
    mutationFn: ({ id, ...data }: any) =>
      apiPut(`/api/categories?id=${encodeURIComponent(id)}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['categories'] });
      showAppToast.success({ title: 'Categoría actualizada' });
    },
    onError: (err: any) =>
      showAppToast.error({ title: 'Error al actualizar categoría', description: err?.message }),
  });

  const deleteCategory = useMutation({
    mutationFn: (id: string) =>
      apiDelete(`/api/categories?id=${encodeURIComponent(id)}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['categories'] });
      showAppToast.success({ title: 'Categoría eliminada' });
    },
    onError: (err: any) =>
      showAppToast.error({ title: 'Error al eliminar categoría', description: err?.message }),
  });

  return {
    categories: allCategories,
    all: allCategories,
    expense: expenseCategories,
    income: incomeCategories,
    isLoading,
    error,
    refetch,
    createCategory,
    updateCategory,
    deleteCategory,
  };
}
