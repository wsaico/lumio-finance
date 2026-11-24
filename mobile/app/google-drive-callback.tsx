import React, { useEffect } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useAppTheme } from '@/theme/ThemeProvider';
import { showAppToast } from '@/stores/toast-store';

export default function GoogleDriveCallbackScreen() {
  const theme = useAppTheme();
  const router = useRouter();
  const params = useLocalSearchParams<{ status?: string; error?: string }>();

  useEffect(() => {
    const status = Array.isArray(params.status) ? params.status[0] : params.status;
    const err = Array.isArray(params.error) ? params.error[0] : params.error;

    if (status === 'connected') {
      showAppToast.success({
        title: 'Google Drive conectado',
        description: 'Comprobantes y copias de seguridad listos en la nube.',
      });
    } else if (status === 'error' || err) {
      showAppToast.error({
        title: 'Error al conectar Google Drive',
        description: err || 'Inténtalo nuevamente desde Ajustes.',
      });
    }

    const timer = setTimeout(() => {
      if (router.canGoBack()) {
        router.back();
      } else {
        router.replace('/settings/data' as any);
      }
    }, 250);

    return () => clearTimeout(timer);
  }, [params.status, params.error, router]);

  return (
    <View style={[styles.center, { backgroundColor: theme.bg }]}>
      <ActivityIndicator size="large" color={theme.brand} />
      <Text style={{ color: theme.textSecondary, fontFamily: theme.font('600'), fontSize: 13.5, marginTop: 12 }}>
        Finalizando conexión con Google Drive...
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
});
