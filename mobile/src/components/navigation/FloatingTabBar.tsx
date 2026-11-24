import React, { useState } from 'react';
import { Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { useRouter, usePathname } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, {
  FadeIn,
  FadeOut,
  useAnimatedStyle,
  withSpring,
  ZoomIn,
  ZoomOut,
} from 'react-native-reanimated';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import {
  ArrowRightLeft,
  Camera,
  LayoutDashboard,
  LayoutGrid,
  Plus,
  TrendingDown,
  TrendingUp,
  Wallet,
} from 'lucide-react-native';
import { useAppTheme } from '@/theme/ThemeProvider';
import { useSettingsStore } from '@/stores/settings-store';
import { triggerHaptic } from '@/lib/haptics';

const LEFT_TABS = [
  { key: 'index', label: 'Inicio', href: '/(tabs)', match: '/', Icon: LayoutDashboard },
  { key: 'transactions', label: 'Movimientos', href: '/(tabs)/transactions', match: '/transactions', Icon: ArrowRightLeft },
] as const;

const RIGHT_TABS = [
  { key: 'accounts', label: 'Cuentas', href: '/(tabs)/accounts', match: '/accounts', Icon: Wallet },
  { key: 'explore', label: 'Explorar', href: '/(tabs)/explore', match: '/explore', Icon: LayoutGrid },
] as const;

const SPEED_DIAL = [
  {
    label: 'Gasto',
    href: '/transactions/new?type=EXPENSE',
    color: '#F43F5E',
    Icon: TrendingDown,
    left: 4,
    bottom: 80,
  },
  {
    label: 'Ingreso',
    href: '/transactions/new?type=INCOME',
    color: '#10B981',
    Icon: TrendingUp,
    left: 74,
    bottom: 146,
  },
  {
    label: 'Transferir',
    href: '/transactions/new?type=TRANSFER',
    color: '#6366F1',
    Icon: ArrowRightLeft,
    left: 164,
    bottom: 146,
  },
  {
    label: 'Escanear',
    href: '/transactions/new?type=EXPENSE&scan=1',
    color: '#FF7A33',
    Icon: Camera,
    left: 234,
    bottom: 80,
  },
] as const;

export function FloatingTabBar() {
  const theme = useAppTheme();
  const router = useRouter();
  const pathname = usePathname();
  const insets = useSafeAreaInsets();
  const leftHandedMode = useSettingsStore((s) => s.leftHandedMode);
  const [quickOpen, setQuickOpen] = useState(false);

  const plusIconStyle = useAnimatedStyle(() => ({
    transform: [
      {
        rotate:
          theme.motion === 'none'
            ? quickOpen
              ? '45deg'
              : '0deg'
            : withSpring(quickOpen ? '45deg' : '0deg', { damping: 16, stiffness: 260 }),
      },
    ],
  }), [quickOpen, theme.motion]);

  const isRouteActive = (match: string) => {
    if (match === '/') {
      return pathname === '/' || pathname === '/(tabs)' || pathname === '/index';
    }
    return pathname?.startsWith(match);
  };

  const orderedLeft = leftHandedMode ? [...RIGHT_TABS].reverse() : LEFT_TABS;
  const orderedRight = leftHandedMode ? [...LEFT_TABS].reverse() : RIGHT_TABS;

  const renderTab = (tab: (typeof LEFT_TABS)[number] | (typeof RIGHT_TABS)[number]) => {
    const active = isRouteActive(tab.match);
    const Icon = tab.Icon;
    return (
      <Pressable
        key={tab.key}
        onPress={() => {
          setQuickOpen(false);
          triggerHaptic('selection');
          router.push(tab.href as any);
        }}
        style={styles.tabBtn}
      >
        <View
          style={[
            styles.iconPill,
            active && { backgroundColor: theme.brandSoft },
          ]}
        >
          <Icon
            size={20}
            color={active ? theme.brand : theme.textMuted}
            strokeWidth={active ? 2.5 : 1.9}
          />
        </View>
        <Text
          numberOfLines={1}
          style={{
            color: active ? theme.brand : theme.textMuted,
            fontFamily: theme.font(active ? '800' : '600'),
            fontSize: 10.5,
          }}
        >
          {tab.label}
        </Text>
      </Pressable>
    );
  };

  return (
    <>
      {quickOpen ? (
        <Animated.View
          entering={FadeIn.duration(150)}
          exiting={FadeOut.duration(120)}
          style={styles.backdrop}
        >
          <Pressable style={StyleSheet.absoluteFill} onPress={() => setQuickOpen(false)} />
        </Animated.View>
      ) : null}

      <View
        pointerEvents="box-none"
        style={[
          styles.wrapper,
          { paddingBottom: Math.max(insets.bottom, 10) },
        ]}
      >
        <View
          style={[
            styles.bar,
            {
              borderColor: theme.border,
              backgroundColor:
                Platform.OS === 'web'
                  ? theme.isDark
                    ? 'rgba(22, 25, 38, 0.94)'
                    : 'rgba(255, 255, 255, 0.94)'
                  : 'transparent',
            },
          ]}
        >
          {Platform.OS !== 'web' && (
            <BlurView
              intensity={90}
              tint={theme.isDark ? 'dark' : 'light'}
              style={StyleSheet.absoluteFill}
            />
          )}
          <View
            style={[
              StyleSheet.absoluteFill,
              {
                backgroundColor: theme.isDark
                  ? 'rgba(20, 23, 36, 0.78)'
                  : 'rgba(255, 255, 255, 0.85)',
              },
            ]}
          />

          <View style={styles.tabsRow}>
            {orderedLeft.map(renderTab)}
            <View style={styles.fabSpacer} />
            {orderedRight.map(renderTab)}
          </View>
        </View>

        {/* Central Elevated Quick-Add FAB */}
        <View
          pointerEvents="box-none"
          style={[
            styles.fabAnchor,
            { bottom: Math.max(insets.bottom, 10) + 18 },
          ]}
        >
          <Pressable
            onPress={() => {
              triggerHaptic('medium');
              setQuickOpen((v) => !v);
            }}
            accessibilityLabel="Abrir registro rápido"
            style={({ pressed }) => [
              styles.fabOuter,
              {
                borderColor: theme.bg,
                transform: [{ scale: pressed ? 0.93 : 1 }],
              },
            ]}
          >
            <LinearGradient
              colors={quickOpen ? theme.coralGradient : [theme.brandLight, theme.brandDark]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.fabGradient}
            >
              <Animated.View style={plusIconStyle}>
                <Plus size={28} color="#FFFFFF" strokeWidth={2.8} />
              </Animated.View>
            </LinearGradient>
          </Pressable>
        </View>
      </View>

      {/* Full-screen overlay for Radial Speed-Dial so Android never clips touches and Reanimated ZoomIn never resets position */}
      {quickOpen ? (
        <View pointerEvents="box-none" style={styles.dialOverlay}>
          <View
            pointerEvents="box-none"
            style={[
              styles.dialStage,
              { marginBottom: Math.max(insets.bottom, 10) + 18 },
            ]}
          >
            {SPEED_DIAL.map((item, idx) => {
              const Icon = item.Icon;
              return (
                <View
                  key={item.label}
                  pointerEvents="box-none"
                  style={[
                    styles.dialItem,
                    {
                      left: item.left,
                      bottom: item.bottom,
                    },
                  ]}
                >
                  <Animated.View
                    entering={
                      theme.motion === 'none'
                        ? undefined
                        : ZoomIn.delay(idx * 35).springify().damping(18)
                    }
                    exiting={theme.motion === 'none' ? undefined : ZoomOut.duration(120)}
                  >
                    <Pressable
                      onPress={() => {
                        setQuickOpen(false);
                        triggerHaptic('medium');
                        router.push(item.href as any);
                      }}
                      style={styles.dialBtnWrap}
                    >
                      <View
                        style={[
                          styles.dialCircle,
                          { backgroundColor: item.color, shadowColor: item.color },
                        ]}
                      >
                        <Icon size={21} color="#FFFFFF" strokeWidth={2.3} />
                      </View>
                      <View
                        style={[
                          styles.dialLabelPill,
                          { backgroundColor: theme.card, borderColor: theme.border },
                        ]}
                      >
                        <Text
                          numberOfLines={1}
                          style={{
                            color: theme.text,
                            fontFamily: theme.font('800'),
                            fontSize: 10.5,
                          }}
                        >
                          {item.label}
                        </Text>
                      </View>
                    </Pressable>
                  </Animated.View>
                </View>
              );
            })}
          </View>
        </View>
      ) : null}
    </>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    backgroundColor: 'rgba(10, 12, 22, 0.5)',
    zIndex: 40,
  },
  wrapper: {
    position: 'absolute',
    left: 14,
    right: 14,
    bottom: 0,
    zIndex: 50,
    alignItems: 'center',
  },
  bar: {
    width: '100%',
    maxWidth: 460,
    height: 66,
    borderRadius: 28,
    borderWidth: 1,
    overflow: 'hidden',
    shadowColor: '#1E1B4B',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.14,
    shadowRadius: 22,
    elevation: 14,
  },
  tabsRow: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 6,
  },
  tabBtn: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
    paddingVertical: 4,
  },
  iconPill: {
    width: 44,
    height: 30,
    borderRadius: 99,
    alignItems: 'center',
    justifyContent: 'center',
  },
  fabSpacer: {
    width: 70,
  },
  fabAnchor: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 60,
  },
  fabOuter: {
    width: 62,
    height: 62,
    borderRadius: 99,
    borderWidth: 4,
    overflow: 'hidden',
    shadowColor: '#5B35D5',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.35,
    shadowRadius: 16,
    elevation: 16,
  },
  fabGradient: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dialOverlay: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    justifyContent: 'flex-end',
    alignItems: 'center',
    zIndex: 70,
  },
  dialStage: {
    position: 'relative',
    width: 320,
    height: 230,
  },
  dialItem: {
    position: 'absolute',
    width: 82,
    alignItems: 'center',
  },
  dialBtnWrap: {
    alignItems: 'center',
    gap: 4,
  },
  dialCircle: {
    width: 50,
    height: 50,
    borderRadius: 99,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.35)',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 12,
    elevation: 10,
  },
  dialLabelPill: {
    paddingHorizontal: 9,
    paddingVertical: 3,
    borderRadius: 99,
    borderWidth: 1,
  },
});
