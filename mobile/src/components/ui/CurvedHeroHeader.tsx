import React from 'react';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAppTheme } from '@/theme/ThemeProvider';

export function CurvedHeroHeader({
  children,
  gradient,
  style,
  includeTopInset = true,
  bottomRadius = 34,
}: {
  children: React.ReactNode;
  gradient?: [string, string, ...string[]];
  style?: StyleProp<ViewStyle>;
  includeTopInset?: boolean;
  bottomRadius?: number;
}) {
  const theme = useAppTheme();
  const insets = useSafeAreaInsets();
  const colors = gradient || theme.heroGradient;

  return (
    <LinearGradient
      colors={colors}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={[
        styles.container,
        {
          paddingTop: includeTopInset ? Math.max(insets.top, 14) + 8 : 16,
          borderBottomLeftRadius: bottomRadius,
          borderBottomRightRadius: bottomRadius,
          shadowColor: theme.brand,
        },
        style,
      ]}
    >
      {/* Subtle geometric ambient circles matching 2027 fintech style */}
      <View pointerEvents="none" style={styles.orbTopRight} />
      <View pointerEvents="none" style={styles.orbBottomLeft} />
      <View style={styles.inner}>{children}</View>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 18,
    paddingBottom: 24,
    overflow: 'hidden',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.22,
    shadowRadius: 24,
    elevation: 10,
  },
  inner: {
    position: 'relative',
    zIndex: 2,
  },
  orbTopRight: {
    position: 'absolute',
    top: -45,
    right: -30,
    width: 170,
    height: 170,
    borderRadius: 999,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
  },
  orbBottomLeft: {
    position: 'absolute',
    bottom: -60,
    left: -40,
    width: 150,
    height: 150,
    borderRadius: 999,
    backgroundColor: 'rgba(255, 122, 51, 0.14)',
  },
});
