import React, { useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Stack, useRouter, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import * as SplashScreen from 'expo-splash-screen';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { QueryClient, QueryClientProvider, useQueryClient } from '@tanstack/react-query';
import { useFonts } from 'expo-font';
import {
  Outfit_400Regular,
  Outfit_500Medium,
  Outfit_600SemiBold,
  Outfit_700Bold,
  Outfit_800ExtraBold,
} from '@expo-google-fonts/outfit';
import {
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
  Inter_700Bold,
  Inter_800ExtraBold,
} from '@expo-google-fonts/inter';
import {
  PlusJakartaSans_400Regular,
  PlusJakartaSans_500Medium,
  PlusJakartaSans_600SemiBold,
  PlusJakartaSans_700Bold,
  PlusJakartaSans_800ExtraBold,
} from '@expo-google-fonts/plus-jakarta-sans';
import {
  Montserrat_400Regular,
  Montserrat_500Medium,
  Montserrat_600SemiBold,
  Montserrat_700Bold,
  Montserrat_800ExtraBold,
} from '@expo-google-fonts/montserrat';
import { supabase } from '@/lib/supabase';
import { ThemeProvider, useAppTheme } from '@/theme/ThemeProvider';
import { useSettingsStore } from '@/stores/settings-store';
import { useUser } from '@/hooks/useUser';
import { useOfflineSync } from '@/hooks/useOfflineSync';
import { AppToastHost } from '@/components/alerts/AppToastHost';
import { PinLockOverlay } from '@/components/security/PinLockOverlay';
import { OnboardingWizardModal } from '@/components/security/OnboardingWizardModal';

SplashScreen.preventAutoHideAsync().catch(() => undefined);

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      staleTime: 1000 * 45,
    },
  },
});

function RootNavigator() {
  const theme = useAppTheme();
  const router = useRouter();
  const segments = useSegments();
  const qc = useQueryClient();
  const [sessionChecked, setSessionChecked] = useState(false);
  const [hasSession, setHasSession] = useState(false);

  const activeUserId = useSettingsStore((s) => s.activeUserId);
  const setActiveUserId = useSettingsStore((s) => s.setActiveUserId);
  const resetUserPreferencesForSwitch = useSettingsStore((s) => s.resetUserPreferencesForSwitch);
  const startHiddenBalances = useSettingsStore((s) => s.startHiddenBalances);
  const setIsBalanceVisible = useSettingsStore((s) => s.setIsBalanceVisible);
  const setCountryCode = useSettingsStore((s) => s.setCountryCode);
  const setCurrencyCode = useSettingsStore((s) => s.setCurrencyCode);
  const setTimezone = useSettingsStore((s) => s.setTimezone);

  const { profile, isLoading: profileLoading } = useUser();
  useOfflineSync(hasSession);

  useEffect(() => {
    if (startHiddenBalances) {
      setIsBalanceVisible(false);
    }
  }, [startHiddenBalances, setIsBalanceVisible]);

  useEffect(() => {
    let mounted = true;
    supabase.auth.getSession().then(({ data }) => {
      if (!mounted) return;
      const sess = data.session;
      setHasSession(Boolean(sess?.user));
      if (sess?.user?.id && activeUserId && activeUserId !== sess.user.id) {
        resetUserPreferencesForSwitch(sess.user.id);
      } else if (sess?.user?.id && !activeUserId) {
        setActiveUserId(sess.user.id);
      }
      setSessionChecked(true);
    }).catch(() => {
      if (mounted) {
        setSessionChecked(true);
      }
    });

    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      const uid = session?.user?.id;
      setHasSession(Boolean(uid));
      if (uid) {
        const currentUid = useSettingsStore.getState().activeUserId;
        if (currentUid && currentUid !== uid) {
          resetUserPreferencesForSwitch(uid);
        } else {
          setActiveUserId(uid);
        }
        qc.invalidateQueries();
      } else {
        qc.clear();
      }
    });

    return () => {
      mounted = false;
      sub.subscription.unsubscribe();
    };
  }, [activeUserId, resetUserPreferencesForSwitch, setActiveUserId, qc]);

  // Sync profile localization once fetched
  useEffect(() => {
    if (!profile) return;
    if (profile.country_code) setCountryCode(profile.country_code);
    if (profile.base_currency) setCurrencyCode(profile.base_currency);
    if (profile.timezone) setTimezone(profile.timezone);
  }, [profile, setCountryCode, setCurrencyCode, setTimezone]);

  useEffect(() => {
    if (!sessionChecked) return;
    const inAuthGroup = (segments[0] as string) === '(auth)' || (segments[0] as string) === 'auth';
    if (!hasSession && !inAuthGroup) {
      router.replace('/(auth)/welcome');
    } else if (hasSession && inAuthGroup) {
      router.replace('/(tabs)');
    }
  }, [sessionChecked, hasSession, segments, router]);

  const showOnboarding = Boolean(
    hasSession && !profileLoading && profile && !profile.onboarding_completed
  );

  return (
    <View style={[styles.root, { backgroundColor: theme.bg }]}>
      <StatusBar style={theme.isDark ? 'light' : 'dark'} />
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: theme.bg },
          animation: theme.motion === 'none' ? 'none' : 'slide_from_right',
        }}
      >
        <Stack.Screen name="(auth)" options={{ headerShown: false }} />
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen
          name="transactions/new"
          options={{
            animation: theme.motion === 'none' ? 'none' : 'fade',
          }}
        />
        <Stack.Screen name="transactions/[id]" />
        <Stack.Screen name="accounts/[id]" />
        <Stack.Screen name="budgets/index" />
        <Stack.Screen name="savings-goals/index" />
        <Stack.Screen name="savings-goals/[id]" />
        <Stack.Screen name="subscriptions/index" />
        <Stack.Screen name="loans/index" />
        <Stack.Screen name="planning/index" />
        <Stack.Screen name="analysis/index" />
        <Stack.Screen name="exchange-rates/index" />
        <Stack.Screen name="reports/index" />
        <Stack.Screen name="billing/index" />
        <Stack.Screen name="notifications/index" />
        <Stack.Screen name="settings/index" />
        <Stack.Screen name="settings/[section]" />
        <Stack.Screen name="settings/categories" />
      </Stack>

      <OnboardingWizardModal visible={showOnboarding} />
      <PinLockOverlay isAuthenticated={hasSession} />
      <AppToastHost />
    </View>
  );
}

export function ErrorBoundary({ error, retry }: { error: Error; retry: () => void }) {
  return (
    <View style={styles.errorContainer}>
      <ScrollView
        contentContainerStyle={styles.errorContent}
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.errorTitle}>Ocurrió un error inesperado</Text>
        <Text style={styles.errorMessage}>
          {error?.message || 'No se pudo cargar la aplicación correctamente.'}
        </Text>
        <Pressable
          onPress={retry}
          style={({ pressed }) => [styles.retryButton, pressed && { opacity: 0.85 }]}
        >
          <Text style={styles.retryButtonText}>Reintentar</Text>
        </Pressable>
      </ScrollView>
    </View>
  );
}

export default function RootLayout() {
  const [fontsLoaded, fontError] = useFonts({
    Outfit_400Regular,
    Outfit_500Medium,
    Outfit_600SemiBold,
    Outfit_700Bold,
    Outfit_800ExtraBold,
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    Inter_700Bold,
    Inter_800ExtraBold,
    PlusJakartaSans_400Regular,
    PlusJakartaSans_500Medium,
    PlusJakartaSans_600SemiBold,
    PlusJakartaSans_700Bold,
    PlusJakartaSans_800ExtraBold,
    Montserrat_400Regular,
    Montserrat_500Medium,
    Montserrat_600SemiBold,
    Montserrat_700Bold,
    Montserrat_800ExtraBold,
  });

  const fontsReady = fontsLoaded || Boolean(fontError);

  useEffect(() => {
    if (fontsReady) {
      SplashScreen.hideAsync().catch(() => undefined);
    }
  }, [fontsReady]);

  if (!fontsReady) return null;

  return (
    <GestureHandlerRootView style={styles.root}>
      <SafeAreaProvider>
        <QueryClientProvider client={queryClient}>
          <ThemeProvider>
            <RootNavigator />
          </ThemeProvider>
        </QueryClientProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  errorContainer: {
    flex: 1,
    backgroundColor: '#F5F6FB',
    paddingHorizontal: 24,
    paddingVertical: 48,
  },
  errorContent: {
    flexGrow: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 14,
  },
  errorTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#18192B',
    textAlign: 'center',
  },
  errorMessage: {
    fontSize: 14,
    color: '#475569',
    textAlign: 'center',
    lineHeight: 20,
  },
  retryButton: {
    marginTop: 8,
    backgroundColor: '#5B35D5',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 14,
  },
  retryButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },
});
