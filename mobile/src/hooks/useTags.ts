import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiDelete, apiGet, apiPatch, apiPost } from '@/lib/api-client';
import { showAppToast } from '@/stores/toast-store';

export interface UserTag {
  id: string;
  name: string;
  color: string;
  is_demo?: boolean;
  created_at?: string;
}

export function useTags() {
  const queryClient = useQueryClient();

  const query = useQuery<UserTag[]>({
    queryKey: ['user-tags'],
    queryFn: async () => {
      try {
        const res = await apiGet<UserTag[]>('/api/tags');
        return Array.isArray(res) ? res : [];
      } catch {
        return [];
      }
    },
    staleTime: 60 * 1000,
  });

  const createTag = useMutation({
    mutationFn: (payload: { name: string; color?: string }) =>
      apiPost<UserTag>('/api/tags', payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['user-tags'] });
      showAppToast.success({ title: 'Etiqueta creada' });
    },
    onError: (err: any) => {
      showAppToast.error({
        title: 'No se pudo crear la etiqueta',
        description: err?.message,
      });
    },
  });

  const updateTag = useMutation({
    mutationFn: (payload: { id: string; name?: string; color?: string }) =>
      apiPatch('/api/tags', payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['user-tags'] });
      showAppToast.success({ title: 'Etiqueta actualizada' });
    },
  });

  const deleteTag = useMutation({
    mutationFn: (id: string) => apiDelete(`/api/tags?id=${encodeURIComponent(id)}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['user-tags'] });
      showAppToast.success({ title: 'Etiqueta eliminada' });
    },
  });

  return {
    tags: query.data || [],
    isLoading: query.isLoading,
    createTag,
    updateTag,
    deleteTag,
  };
}
