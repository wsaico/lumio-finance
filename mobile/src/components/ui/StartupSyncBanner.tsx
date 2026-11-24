import React, { useEffect } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, {
  Easing,
  FadeIn,
  FadeOut,
  cancelAnimation,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';
import { CheckCircle2, RefreshCw } from 'lucide-react-native';
import { useAppTheme } from '@/theme/ThemeProvider';
import { alphaHex } from '@/lib/color-math';
import type { StartupSyncPhase } from '@/hooks/useStartupSync';

export function StartupSyncBanner({ phase }: { phase: StartupSyncPhase }) {
  const theme = useAppTheme();
  const insets = useSafeAreaInsets();
  const rotation = useSharedValue(0);

  useEffect(() => {
    if (phase === 'syncing') {
      rotation.value = 0;
      rotation.value = withRepeat(
        withTiming(360, { duration: 1100, easing: Easing.linear }),
        -1,
        false
      );
    } else {
      cancelAnimation(rotation);
      rotation.value = 0;
    }
    return () => {
      cancelAnimation(rotation);
    };
  }, [phase, rotation]);

  const spinStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${rotation.value}deg` }],
  }));

  if (phase === 'idle') return null;

  const isDone = phase === 'done';
  const accent = isDone ? theme.income : theme.brand;

  return (
    <View
      pointerEvents="none"
      style={[
        styles.host,
        { top: Math.max(insets.top, 12) + 8 },
      ]}
    >
      <Animated.View
        entering={theme.motion === 'none' ? undefined : FadeIn.duration(180)}
        exiting={theme.motion === 'none' ? undefined : FadeOut.duration(220)}
        style={[
          styles.pill,
          {
            backgroundColor: theme.elevated,
            borderColor: alphaHex(accent, 0.35),
            shadowColor: accent,
          },
        ]}
      >
        <View style={[styles.iconBadge, { backgroundColor: alphaHex(accent, 0.14) }]}>
          {isDone ? (
            <CheckCircle2 size={14} color={theme.income} strokeWidth={2.5} />
          ) : (
            <Animated.View style={spinStyle}>
              <RefreshCw size={14} color={theme.brand} strokeWidth={2.4} />
            </Animated.View>
          )}
        </View>
        <Text
          style={{
            color: theme.text,
            fontFamily: theme.font('700'),
            fontSize: theme.sp(12),
          }}
        >
          {isDone ? 'Todo al día' : 'Sincronizando tus finanzas...'}
        </Text>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  host: {
    position: 'absolute',
    left: 0,
    right: 0,
    alignItems: 'center',
    zIndex: 9500,
    paddingHorizontal: 16,
  },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 999,
    borderWidth: 1,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.14,
    shadowRadius: 12,
    elevation: 8,
  },
  iconBadge: {
    width: 24,
    height: 24,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
