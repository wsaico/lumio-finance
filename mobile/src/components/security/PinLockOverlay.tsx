import React, { useCallback, useEffect, useState } from 'react';
import {
  AppState,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
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
  const pinLockEnabled = useSettingsStore((s) => s.pinLockEnabled);
  const biometricsEnabled = useSettingsStore((s) => s.biometricsEnabled);
  const [locked, setLocked] = useState(false);
  const [expectedPin, setExpectedPin] = useState('');
  const [entered, setEntered] = useState('');
  const [error, setError] = useState(false);
  const [bioAvailable, setBioAvailable] = useState(false);

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
        if (!has) return false;
        return LocalAuthentication.isEnrolledAsync();
      })
      .then((ok) => setBioAvailable(Boolean(ok)))
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

  return (
    <Animated.View
      entering={FadeIn.duration(180)}
      exiting={FadeOut.duration(150)}
      style={[styles.overlay, { backgroundColor: theme.bg }]}
    >
      <View style={styles.header}>
        <View style={[styles.badge, { backgroundColor: theme.brandSoft }]}>
          <Lock size={28} color={theme.brand} />
        </View>
        <Text style={{ color: theme.text, fontFamily: theme.font('800'), fontSize: theme.sp(22) }}>
          Lumio bloqueado
        </Text>
        <Text
          style={{
            color: error ? theme.expense : theme.textMuted,
            fontFamily: theme.font('600'),
            fontSize: theme.sp(13),
          }}
        >
          {error ? 'PIN incorrecto, intenta otra vez' : 'Ingresa tu PIN de 4 dígitos'}
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
                    borderColor: error ? theme.expense : filled ? theme.brand : theme.border,
                    backgroundColor: error
                      ? theme.expense
                      : filled
                        ? theme.brand
                        : 'transparent',
                  },
                ]}
              />
            );
          })}
        </View>
      </View>

      <View style={styles.pad}>
        {keys.map((k) => (
          <Pressable
            key={k}
            onPress={() => pushDigit(k)}
            style={({ pressed }) => [
              styles.padKey,
              {
                backgroundColor: theme.card,
                borderColor: theme.border,
                transform: [{ scale: pressed ? 0.93 : 1 }],
              },
            ]}
          >
            <Text style={{ color: theme.text, fontFamily: theme.font('800'), fontSize: theme.sp(24) }}>
              {k}
            </Text>
          </Pressable>
        ))}

        <Pressable
          onPress={biometricsEnabled && bioAvailable ? tryBiometric : undefined}
          style={[
            styles.padKey,
            {
              backgroundColor: biometricsEnabled && bioAvailable ? theme.brandSoft : 'transparent',
              borderColor: 'transparent',
            },
          ]}
        >
          {biometricsEnabled && bioAvailable ? (
            <Fingerprint size={26} color={theme.brand} />
          ) : (
            <ShieldCheck size={22} color={theme.textMuted} />
          )}
        </Pressable>

        <Pressable
          onPress={() => pushDigit('0')}
          style={({ pressed }) => [
            styles.padKey,
            {
              backgroundColor: theme.card,
              borderColor: theme.border,
              transform: [{ scale: pressed ? 0.93 : 1 }],
            },
          ]}
        >
          <Text style={{ color: theme.text, fontFamily: theme.font('800'), fontSize: theme.sp(24) }}>
            0
          </Text>
        </Pressable>

        <Pressable
          onPress={() => {
            triggerHaptic('light');
            setEntered((p) => p.slice(0, -1));
          }}
          style={[styles.padKey, { backgroundColor: 'transparent', borderColor: 'transparent' }]}
        >
          <Delete size={24} color={theme.textSecondary} />
        </Pressable>
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
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 64,
    paddingHorizontal: 28,
  },
  header: {
    alignItems: 'center',
    gap: 10,
    marginTop: 20,
  },
  badge: {
    width: 68,
    height: 68,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
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
});
