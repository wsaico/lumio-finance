import React, { useCallback, useEffect, useState } from 'react';
import {
  AppState,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { StatusBar } from 'expo-status-bar';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as SecureStore from 'expo-secure-store';
import * as LocalAuthentication from 'expo-local-authentication';
import Animated, { FadeIn, FadeOut } from 'react-native-reanimated';
import { Delete, Fingerprint, Lock, ShieldCheck } from 'lucide-react-native';
import { useSettingsStore } from '@/stores/settings-store';
import { useAppTheme } from '@/theme/ThemeProvider';
import { triggerHaptic } from '@/lib/haptics';

const PIN_KEY = 'lumio_mobile_pin_code_v1';

export async function getStoredPinCode(): Promise<string> {
  if (Platform.OS === 'web') {
    return typeof window !== 'undefined' ? window.localStorage.getItem(PIN_KEY) || '' : '';
  }
  return (await SecureStore.getItemAsync(PIN_KEY)) || '';
}

export async function setStoredPinCode(pin: string): Promise<void> {
  if (Platform.OS === 'web') {
    if (typeof window !== 'undefined') {
      if (pin) window.localStorage.setItem(PIN_KEY, pin);
      else window.localStorage.removeItem(PIN_KEY);
    }
    return;
  }
  if (pin) await SecureStore.setItemAsync(PIN_KEY, pin);
  else await SecureStore.deleteItemAsync(PIN_KEY);
}

export function PinLockOverlay({ isAuthenticated }: { isAuthenticated: boolean }) {
  const theme = useAppTheme();
  const insets = useSafeAreaInsets();
  const pinLockEnabled = useSettingsStore((s) => s.pinLockEnabled);
  const biometricsEnabled = useSettingsStore((s) => s.biometricsEnabled);
  const [locked, setLocked] = useState(false);
  const [expectedPin, setExpectedPin] = useState('');
  const [entered, setEntered] = useState('');
  const [error, setError] = useState(false);
  const [bioAvailable, setBioAvailable] = useState(false);
  const [bioLabel, setBioLabel] = useState('huella digital');

  const loadAndCheckLock = useCallback(async () => {
    if (!isAuthenticated || !pinLockEnabled) {
      setLocked(false);
      return;
    }
    const stored = await getStoredPinCode();
    if (stored.length === 4) {
      setExpectedPin(stored);
      setLocked(true);
      setEntered('');
      setError(false);
    } else {
      setLocked(false);
    }
  }, [isAuthenticated, pinLockEnabled]);

  useEffect(() => {
    loadAndCheckLock();
  }, [loadAndCheckLock]);

  useEffect(() => {
    if (Platform.OS === 'web') return;
    LocalAuthentication.hasHardwareAsync()
      .then(async (has) => {
        if (!has) return { ok: false, label: 'biometría' };
        const enrolled = await LocalAuthentication.isEnrolledAsync();
        const types = await LocalAuthentication.supportedAuthenticationTypesAsync();
        const hasFinger = types.includes(LocalAuthentication.AuthenticationType.FINGERPRINT);
        const hasFace = types.includes(LocalAuthentication.AuthenticationType.FACIAL_RECOGNITION);
        const label = hasFinger ? 'huella digital' : hasFace ? 'Face ID' : 'biometría';
        return { ok: Boolean(enrolled), label };
      })
      .then(({ ok, label }) => {
        setBioAvailable(ok);
        setBioLabel(label);
      })
      .catch(() => setBioAvailable(false));
  }, []);

  useEffect(() => {
    const sub = AppState.addEventListener('change', (nextState) => {
      if (nextState === 'background' && isAuthenticated && pinLockEnabled) {
        loadAndCheckLock();
      }
    });
    return () => sub.remove();
  }, [isAuthenticated, pinLockEnabled, loadAndCheckLock]);

  const tryBiometric = useCallback(async () => {
    if (Platform.OS === 'web' || !bioAvailable || !biometricsEnabled) return;
    try {
      const res = await LocalAuthentication.authenticateAsync({
        promptMessage: 'Desbloquear Lumio Finance',
        cancelLabel: 'Usar PIN',
        disableDeviceFallback: true,
      });
      if (res.success) {
        triggerHaptic('success');
        setLocked(false);
        setEntered('');
      }
    } catch {
      // user cancelled or unavailable
    }
  }, [bioAvailable, biometricsEnabled]);

  useEffect(() => {
    if (locked && biometricsEnabled && bioAvailable) {
      tryBiometric();
    }
  }, [locked, biometricsEnabled, bioAvailable, tryBiometric]);

  if (!locked) return null;

  const pushDigit = (d: string) => {
    if (entered.length >= 4) return;
    triggerHaptic('light');
    const next = entered + d;
    setEntered(next);
    setError(false);
    if (next.length === 4) {
      if (next === expectedPin) {
        triggerHaptic('success');
        setTimeout(() => {
          setLocked(false);
          setEntered('');
        }, 90);
      } else {
        triggerHaptic('error');
        setError(true);
        setTimeout(() => {
          setEntered('');
          setError(false);
        }, 420);
      }
    }
  };

  const keys = ['1', '2', '3', '4', '5', '6', '7', '8', '9'];
  const canUseBiometrics = biometricsEnabled && bioAvailable;

  return (
    <Animated.View
      entering={theme.motion === 'none' ? undefined : FadeIn.duration(180)}
      exiting={theme.motion === 'none' ? undefined : FadeOut.duration(150)}
      style={styles.overlay}
    >
      <StatusBar style="light" />
      <LinearGradient
        colors={theme.heroGradient}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={StyleSheet.absoluteFill}
      />
      <View pointerEvents="none" style={styles.orbTopRight} />
      <View pointerEvents="none" style={styles.orbBottomLeft} />

      <View
        style={[
          styles.inner,
          {
            paddingTop: Math.max(insets.top, 20) + 22,
            paddingBottom: Math.max(insets.bottom, 20) + 18,
          },
        ]}
      >
        <View style={styles.header}>
          <View style={styles.badge}>
            <Lock size={28} color="#FFFFFF" strokeWidth={2.2} />
          </View>
          <Text style={[styles.title, { fontFamily: theme.font('800'), fontSize: theme.sp(23) }]}>
            Lumio bloqueado
          </Text>
          <Text
            style={[
              styles.subtitle,
              {
                color: error ? '#FECDD3' : 'rgba(255,255,255,0.8)',
                fontFamily: theme.font('600'),
                fontSize: theme.sp(13),
              },
            ]}
          >
            {error
              ? 'PIN incorrecto, intenta otra vez'
              : canUseBiometrics
                ? `Ingresa tu PIN o usa tu ${bioLabel}`
                : 'Ingresa tu PIN de 4 dígitos'}
          </Text>

          <View style={styles.dotsRow}>
            {[0, 1, 2, 3].map((idx) => {
              const filled = idx < entered.length;
              return (
                <View
                  key={idx}
                  style={[
                    styles.dot,
                    {
                      borderColor: error
                        ? '#FCA5A5'
                        : filled
                          ? '#FFFFFF'
                          : 'rgba(255,255,255,0.45)',
                      backgroundColor: error
                        ? '#EF4444'
                        : filled
                          ? '#FFFFFF'
                          : 'transparent',
                    },
                  ]}
                />
              );
            })}
          </View>
        </View>

        <View style={styles.padWrap}>
          <View style={styles.pad}>
            {keys.map((k) => (
              <Pressable
                key={k}
                onPress={() => pushDigit(k)}
                style={({ pressed }) => [
                  styles.padKey,
                  {
                    backgroundColor: pressed
                      ? 'rgba(255,255,255,0.28)'
                      : 'rgba(255,255,255,0.14)',
                    borderColor: 'rgba(255,255,255,0.24)',
                  },
                ]}
              >
                <Text
                  style={[
                    styles.keyText,
                    { fontFamily: theme.font('800'), fontSize: theme.sp(24) },
                  ]}
                >
                  {k}
                </Text>
              </Pressable>
            ))}

            <Pressable
              onPress={canUseBiometrics ? tryBiometric : undefined}
              style={({ pressed }) => [
                styles.padKey,
                {
                  backgroundColor: canUseBiometrics
                    ? pressed
                      ? 'rgba(255,255,255,0.3)'
                      : 'rgba(255,255,255,0.2)'
                    : 'transparent',
                  borderColor: canUseBiometrics ? 'rgba(255,255,255,0.34)' : 'transparent',
                },
              ]}
              accessibilityLabel={canUseBiometrics ? `Desbloquear con ${bioLabel}` : undefined}
            >
              {canUseBiometrics ? (
                <Fingerprint size={28} color="#FFFFFF" />
              ) : (
                <ShieldCheck size={22} color="rgba(255,255,255,0.5)" />
              )}
            </Pressable>

            <Pressable
              onPress={() => pushDigit('0')}
              style={({ pressed }) => [
                styles.padKey,
                {
                  backgroundColor: pressed
                    ? 'rgba(255,255,255,0.28)'
                    : 'rgba(255,255,255,0.14)',
                  borderColor: 'rgba(255,255,255,0.24)',
                },
              ]}
            >
              <Text
                style={[
                  styles.keyText,
                  { fontFamily: theme.font('800'), fontSize: theme.sp(24) },
                ]}
              >
                0
              </Text>
            </Pressable>

            <Pressable
              onPress={() => {
                triggerHaptic('light');
                setEntered((p) => p.slice(0, -1));
              }}
              style={({ pressed }) => [
                styles.padKey,
                {
                  backgroundColor: pressed ? 'rgba(255,255,255,0.16)' : 'transparent',
                  borderColor: 'transparent',
                },
              ]}
              accessibilityLabel="Borrar dígito"
            >
              <Delete size={24} color="#FFFFFF" />
            </Pressable>
          </View>

          {canUseBiometrics ? (
            <Pressable
              onPress={tryBiometric}
              style={({ pressed }) => [
                styles.bioPill,
                { opacity: pressed ? 0.85 : 1 },
              ]}
            >
              <Fingerprint size={17} color="#FFFFFF" />
              <Text
                style={{
                  color: '#FFFFFF',
                  fontFamily: theme.font('700'),
                  fontSize: theme.sp(13),
                }}
              >
                Desbloquear con {bioLabel}
              </Text>
            </Pressable>
          ) : null}
        </View>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    zIndex: 9998,
    overflow: 'hidden',
  },
  orbTopRight: {
    position: 'absolute',
    top: -60,
    right: -40,
    width: 220,
    height: 220,
    borderRadius: 999,
    backgroundColor: 'rgba(255, 255, 255, 0.09)',
  },
  orbBottomLeft: {
    position: 'absolute',
    bottom: -70,
    left: -50,
    width: 210,
    height: 210,
    borderRadius: 999,
    backgroundColor: 'rgba(255, 122, 51, 0.16)',
  },
  inner: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 28,
  },
  header: {
    alignItems: 'center',
    gap: 10,
    marginTop: 12,
  },
  badge: {
    width: 70,
    height: 70,
    borderRadius: 24,
    backgroundColor: 'rgba(255,255,255,0.16)',
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.28)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  title: {
    color: '#FFFFFF',
    letterSpacing: -0.4,
  },
  subtitle: {
    textAlign: 'center',
  },
  dotsRow: {
    flexDirection: 'row',
    gap: 16,
    marginTop: 14,
  },
  dot: {
    width: 16,
    height: 16,
    borderRadius: 99,
    borderWidth: 2,
  },
  padWrap: {
    width: '100%',
    alignItems: 'center',
    gap: 16,
  },
  pad: {
    width: '100%',
    maxWidth: 300,
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    gap: 14,
  },
  padKey: {
    width: '29%',
    aspectRatio: 1,
    borderRadius: 999,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  keyText: {
    color: '#FFFFFF',
  },
  bioPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 18,
    paddingVertical: 11,
    borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.16)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.26)',
  },
});
