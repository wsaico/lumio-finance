import React, { useEffect } from 'react';
import { ActivityIndicator, Platform, StyleSheet, Text, View } from 'react-native';
import * as Linking from 'expo-linking';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { supabase } from '@/lib/supabase';
import { useAppTheme } from '@/theme/ThemeProvider';
import { showAppToast } from '@/stores/toast-store';

function extractParamsFromUrl(url: string): Record<string, string> {
  const out: Record<string, string> = {};
  try {
    const [, queryAndHash = ''] = url.split('?');
    const [query = '', hash = ''] = queryAndHash.split('#');
    const hashOnly = !url.includes('?') && url.includes('#') ? url.split('#')[1] || '' : hash;
    for (const part of [query, hashOnly]) {
      if (!part) continue;
      for (const pair of part.split('&')) {
        const [k, v = ''] = pair.split('=');
        if (k) out[decodeURIComponent(k)] = decodeURIComponent(v.replace(/\+/g, ' '));
      }
    }
  } catch {
    // ignore malformed URL
  }
  return out;
}

export default function AuthCallbackScreen() {
  const theme = useAppTheme();
  const router = useRouter();
  const params = useLocalSearchParams<Record<string, string | string[]>>();

  useEffect(() => {
    let cancelled = false;

    const completeAuth = async () => {
      try {
        const { data: existing } = await supabase.auth.getSession();
        if (existing?.session) {
          if (!cancelled) router.replace('/(tabs)' as any);
          return;
        }

        const initialUrl =
          Platform.OS === 'web' && typeof window !== 'undefined'
            ? window.location.href
            : await Linking.getInitialURL();
        const urlParams = initialUrl ? extractParamsFromUrl(initialUrl) : {};

        const readParam = (key: string) => {
          const val = params[key];
          if (typeof val === 'string' && val) return val;
          if (Array.isArray(val) && val[0]) return val[0];
          return urlParams[key];
        };

        const errorDesc = readParam('error_description') || readParam('error');
        if (errorDesc) {
          showAppToast.error({
            title: 'No se pudo iniciar sesión con Google',
            description: errorDesc,
          });
          if (!cancelled) router.replace('/(auth)/login' as any);
          return;
        }

        const code = readParam('code');
        if (code) {
          const { error } = await supabase.auth.exchangeCodeForSession(code);
          if (error) throw error;
          if (!cancelled) router.replace('/(tabs)' as any);
          return;
        }

        const accessToken = readParam('access_token');
        const refreshToken = readParam('refresh_token');
        if (accessToken && refreshToken) {
          const { error } = await supabase.auth.setSession({
            access_token: accessToken,
            refresh_token: refreshToken,
          });
          if (error) throw error;
          if (!cancelled) router.replace('/(tabs)' as any);
          return;
        }

        const { data: retrySession } = await supabase.auth.getSession();
        if (retrySession?.session) {
          if (!cancelled) router.replace('/(tabs)' as any);
          return;
        }

        if (!cancelled) router.replace('/(auth)/login' as any);
      } catch (err: any) {
        showAppToast.error({
          title: 'Error de autenticación',
          description: err?.message || 'Vuelve a intentar iniciar sesión.',
        });
        if (!cancelled) router.replace('/(auth)/login' as any);
      }
    };

    void completeAuth();
    return () => {
      cancelled = true;
    };
  }, [params, router]);

  return (
    <View style={[styles.center, { backgroundColor: theme.bg }]}>
      <ActivityIndicator size="large" color={theme.brand} />
      <Text style={{ color: theme.textSecondary, fontFamily: theme.font('600'), fontSize: 13.5, marginTop: 12 }}>
        Completando inicio de sesión con Google...
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
