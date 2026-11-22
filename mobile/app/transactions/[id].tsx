import React from 'react';
import { ActivityIndicator, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { apiGet } from '@/lib/api-client';
import { useAppTheme } from '@/theme/ThemeProvider';
import { TransactionEditorView } from '@/components/transactions/TransactionEditorView';
import { EmptyStateCard } from '@/components/ui/EmptyStateCard';
import { AlertCircle } from 'lucide-react-native';

export default function EditTransactionScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const theme = useAppTheme();
  const router = useRouter();

  const { data, isLoading, isError } = useQuery({
    queryKey: ['transaction', id],
    queryFn: () => apiGet(`/api/transactions?id=${encodeURIComponent(id)}`),
    enabled: Boolean(id),
  });

  if (isLoading) {
    return (
      <View style={{ flex: 1, backgroundColor: theme.bg, alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator size="large" color={theme.brand} />
      </View>
    );
  }

  if (isError || !data) {
    return (
      <View style={{ flex: 1, backgroundColor: theme.bg, padding: 20, justifyContent: 'center' }}>
        <EmptyStateCard
          icon={<AlertCircle size={28} color={theme.expense} />}
          title="Movimiento no encontrado"
          description="Es posible que haya sido eliminado o no tengas acceso."
          actionLabel="Volver"
          onAction={() => router.back()}
        />
      </View>
    );
  }

  return <TransactionEditorView initialData={data} />;
}
