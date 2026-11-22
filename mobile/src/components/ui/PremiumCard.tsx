import React from 'react';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useAppTheme } from '@/theme/ThemeProvider';
import { alphaHex } from '@/lib/color-math';

export type CardVariant = 'elevated' | 'outlined' | 'muted' | 'hero-violet' | 'hero-coral';

export function PremiumCard({
  children,
  variant = 'elevated',
  style,
  padding = 18,
}: {
  children: React.ReactNode;
  variant?: CardVariant;
  style?: StyleProp<ViewStyle>;
  padding?: number;
}) {
  const theme = useAppTheme();

  if (variant === 'hero-violet' || variant === 'hero-coral') {
    const colors: [string, string] =
      variant === 'hero-coral'
        ? theme.coralGradient
        : [theme.heroGradient[0], theme.heroGradient[2]];

    return (
      <LinearGradient
        colors={colors}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[
          styles.base,
          {
            padding,
            shadowColor: variant === 'hero-coral' ? theme.coral : theme.brand,
            shadowOpacity: theme.isDark ? 0.28 : 0.24,
            shadowRadius: 20,
            shadowOffset: { width: 0, height: 10 },
            elevation: 8,
            borderWidth: 1,
            borderColor: 'rgba(255,255,255,0.16)',
          },
          style,
        ]}
      >
        {children}
      </LinearGradient>
    );
  }

  return (
    <View
      style={[
        styles.base,
        {
          padding,
          backgroundColor: variant === 'muted' ? theme.muted : theme.card,
          borderWidth: 1,
          borderColor: theme.border,
          shadowColor: variant === 'elevated' && !theme.isDark ? alphaHex(theme.brand, 0.45) : '#000',
          shadowOpacity: variant === 'elevated' ? (theme.isDark ? 0.22 : 0.08) : 0,
          shadowRadius: variant === 'elevated' ? 18 : 0,
          shadowOffset: { width: 0, height: 8 },
          elevation: variant === 'elevated' ? 4 : 0,
        },
        style,
      ]}
    >
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  base: {
    borderRadius: 24,
    overflow: 'hidden',
  },
});
