import React, { useEffect } from 'react';
import {
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import Animated, {
  FadeInUp,
  FadeOutUp,
  LinearTransition,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  runOnJS,
} from 'react-native-reanimated';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  AlertCircle,
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  Crown,
  Info,
  Sparkles,
  X,
} from 'lucide-react-native';
import { useToastStore, type AppAlertVariant, type ToastItem } from '@/stores/toast-store';
import { useAppTheme } from '@/theme/ThemeProvider';

const VARIANT_META: Record<
  AppAlertVariant,
  {
    bar: [string, string];
    badgeGradient: [string, string];
    ctaBg: string;
    Icon: typeof Crown;
  }
> = {
  premium: {
    bar: ['#FBBF24', '#5B35D5'],
    badgeGradient: ['#F59E0B', '#5B35D5'],
    ctaBg: '#FF7A33',
    Icon: Crown,
  },
  error: {
    bar: ['#FB7185', '#E11D48'],
    badgeGradient: ['#F43F5E', '#E11D48'],
    ctaBg: '#E11D48',
    Icon: AlertCircle,
  },
  warning: {
    bar: ['#FBBF24', '#F97316'],
    badgeGradient: ['#F59E0B', '#EA580C'],
    ctaBg: '#EA580C',
    Icon: AlertTriangle,
  },
  success: {
    bar: ['#34D399', '#059669'],
    badgeGradient: ['#10B981', '#0D9488'],
    ctaBg: '#059669',
    Icon: CheckCircle2,
  },
  info: {
    bar: ['#38BDF8', '#5B35D5'],
    badgeGradient: ['#0EA5E9', '#5B35D5'],
    ctaBg: '#5B35D5',
    Icon: Info,
  },
};

function ToastRow({ item }: { item: ToastItem }) {
  const theme = useAppTheme();
  const dismiss = useToastStore((s) => s.dismiss);
  const meta = VARIANT_META[item.variant];
  const Icon = meta.Icon;
  const translateY = useSharedValue(0);

  useEffect(() => {
    const timer = setTimeout(() => {
      dismiss(item.id);
    }, item.duration);
    return () => clearTimeout(timer);
  }, [item.id, item.duration, dismiss]);

  const pan = Gesture.Pan()
    .onUpdate((e) => {
      if (e.translationY < 0) translateY.value = e.translationY;
    })
    .onEnd((e) => {
      if (e.translationY < -28 || e.velocityY < -300) {
        runOnJS(dismiss)(item.id);
      } else {
        translateY.value = withSpring(0);
      }
    });

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
  }));

  return (
    <GestureDetector gesture={pan}>
      <Animated.View
        entering={theme.motion === 'none' ? undefined : FadeInUp.springify().damping(20).stiffness(280)}
        exiting={theme.motion === 'none' ? undefined : FadeOutUp.duration(180)}
        layout={theme.motion === 'none' ? undefined : LinearTransition.springify()}
        style={[
          styles.cardWrap,
          animatedStyle,
          {
            borderColor: theme.border,
            backgroundColor:
              Platform.OS === 'web'
                ? theme.isDark
                  ? 'rgba(22, 25, 38, 0.96)'
                  : 'rgba(255, 255, 255, 0.96)'
                : 'transparent',
          },
        ]}
      >
        {Platform.OS !== 'web' && (
          <BlurView
            intensity={85}
            tint={theme.isDark ? 'dark' : 'light'}
            style={StyleSheet.absoluteFill}
          />
        )}
        <View
          style={[
            StyleSheet.absoluteFill,
            {
              backgroundColor: theme.isDark
                ? 'rgba(20, 22, 34, 0.82)'
                : 'rgba(255, 255, 255, 0.86)',
            },
          ]}
        />

        {/* Top Accent Glow Bar */}
        <LinearGradient
          colors={meta.bar}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={styles.topBar}
        />

        <View style={styles.row}>
          <View style={styles.medallionWrap}>
            <LinearGradient
              colors={meta.badgeGradient}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.medallion}
            >
              <Icon size={20} color="#FFFFFF" strokeWidth={2.3} />
            </LinearGradient>
            {item.badge ? (
              <View style={styles.proPill}>
                <Text style={styles.proText}>{item.badge}</Text>
              </View>
            ) : null}
          </View>

          <View style={styles.content}>
            <Text
              style={[
                styles.title,
                { color: theme.text, fontFamily: theme.font('700'), fontSize: theme.sp(13) },
              ]}
              numberOfLines={2}
            >
              {item.title}
            </Text>
            {item.description ? (
              <Text
                style={[
                  styles.desc,
                  { color: theme.textSecondary, fontFamily: theme.font('500'), fontSize: theme.sp(11.5) },
                ]}
                numberOfLines={2}
              >
                {item.description}
              </Text>
            ) : null}
          </View>

          {item.actionLabel ? (
            <Pressable
              onPress={() => {
                item.onAction?.();
                dismiss(item.id);
              }}
              style={({ pressed }) => [
                styles.ctaBtn,
                { backgroundColor: meta.ctaBg, opacity: pressed ? 0.85 : 1 },
              ]}
            >
              {item.variant === 'premium' && <Sparkles size={12} color="#FFFFFF" />}
              <Text style={[styles.ctaText, { fontFamily: theme.font('700') }]}>
                {item.actionLabel}
              </Text>
              {item.variant !== 'premium' && <ArrowRight size={12} color="#FFFFFF" />}
            </Pressable>
          ) : null}

          <Pressable
            onPress={() => dismiss(item.id)}
            hitSlop={10}
            style={styles.closeBtn}
            accessibilityLabel="Cerrar alerta"
          >
            <X size={16} color={theme.textMuted} />
          </Pressable>
        </View>
      </Animated.View>
    </GestureDetector>
  );
}

export function AppToastHost() {
  const insets = useSafeAreaInsets();
  const toasts = useToastStore((s) => s.toasts);

  if (toasts.length === 0) return null;

  return (
    <View
      pointerEvents="box-none"
      style={[
        styles.host,
        {
          top: Math.max(insets.top, 12) + 6,
        },
      ]}
    >
      {toasts.map((t) => (
        <ToastRow key={t.id} item={t} />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  host: {
    position: 'absolute',
    left: 14,
    right: 14,
    zIndex: 9999,
    gap: 8,
    alignItems: 'center',
  },
  cardWrap: {
    width: '100%',
    maxWidth: 440,
    borderRadius: 20,
    borderWidth: 1,
    overflow: 'hidden',
    shadowColor: '#1E1B4B',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.18,
    shadowRadius: 22,
    elevation: 12,
  },
  topBar: {
    height: 3,
    width: '100%',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 13,
    paddingVertical: 12,
    gap: 11,
  },
  medallionWrap: {
    position: 'relative',
  },
  medallion: {
    width: 40,
    height: 40,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  proPill: {
    position: 'absolute',
    bottom: -4,
    right: -5,
    backgroundColor: '#0F172A',
    borderRadius: 99,
    paddingHorizontal: 5,
    paddingVertical: 1,
    borderWidth: 1,
    borderColor: '#FBBF24',
  },
  proText: {
    color: '#FDE68A',
    fontSize: 8.5,
    fontWeight: '900',
    letterSpacing: 0.6,
  },
  content: {
    flex: 1,
    gap: 2,
  },
  title: {
    lineHeight: 17,
  },
  desc: {
    lineHeight: 15.5,
  },
  ctaBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 11,
    paddingVertical: 7,
    borderRadius: 99,
  },
  ctaText: {
    color: '#FFFFFF',
    fontSize: 11.5,
  },
  closeBtn: {
    padding: 4,
    borderRadius: 99,
  },
});
