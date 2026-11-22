import React, { createContext, useContext, useMemo } from 'react';
import { useColorScheme } from 'react-native';
import { useSettingsStore, type IconStyle, type MotionMode } from '@/stores/settings-store';
import { CORAL_ACCENT, CORAL_ACCENT_END, resolveRNFontFamily } from '@/lib/appearance';
import { alphaHex, darkenHex, lightenHex, mixHex } from '@/lib/color-math';

export interface LumioTheme {
  isDark: boolean;
  brand: string;
  brandLight: string;
  brandDark: string;
  brandSoft: string;
  heroGradient: [string, string, string];
  coral: string;
  coralEnd: string;
  coralSoft: string;
  coralGradient: [string, string];
  bg: string;
  card: string;
  elevated: string;
  muted: string;
  border: string;
  text: string;
  textSecondary: string;
  textMuted: string;
  income: string;
  incomeSoft: string;
  expense: string;
  expenseSoft: string;
  transfer: string;
  transferSoft: string;
  warning: string;
  warningSoft: string;
  iconStyle: IconStyle;
  iconRadius: number;
  fontFamily: string;
  fontScale: number;
  motion: MotionMode;
  highContrast: boolean;
  materialYou: boolean;
  sp: (size: number) => number;
  font: (weight?: '400' | '500' | '600' | '700' | '800') => string;
}

const ThemeContext = createContext<LumioTheme | null>(null);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const systemScheme = useColorScheme();
  const {
    themeMode,
    accentColor,
    materialYou,
    highContrast,
    iconStyle,
    fontFamily,
    fontScale,
    motionMode,
  } = useSettingsStore();

  const theme = useMemo<LumioTheme>(() => {
    const isDark =
      themeMode === 'dark' || (themeMode === 'system' && systemScheme === 'dark');
    const brand = accentColor || '#5B35D5';
    const brandLight = lightenHex(brand, 0.22);
    const brandDark = darkenHex(brand, 0.24);
    const brandSoft = alphaHex(brand, isDark ? 0.2 : 0.11);

    const heroGradient: [string, string, string] = isDark
      ? [mixHex(brand, '#121320', 0.48), mixHex(brand, '#0F101B', 0.36), '#141624']
      : [lightenHex(brand, 0.1), brand, darkenHex(brand, 0.18)];

    const baseBg = isDark ? '#0D0F17' : '#F5F6FB';
    const baseCard = isDark ? '#161926' : '#FFFFFF';
    const baseElevated = isDark ? '#1E2235' : '#FFFFFF';
    const baseMuted = isDark ? '#202437' : '#ECEFF8';

    const bg = materialYou
      ? mixHex(brand, baseBg, isDark ? 0.11 : 0.055)
      : baseBg;
    const card = materialYou
      ? mixHex(brand, baseCard, isDark ? 0.08 : 0.025)
      : baseCard;
    const elevated = materialYou
      ? mixHex(brand, baseElevated, isDark ? 0.1 : 0.035)
      : baseElevated;
    const muted = materialYou
      ? mixHex(brand, baseMuted, isDark ? 0.15 : 0.085)
      : baseMuted;

    const border = highContrast
      ? isDark
        ? 'rgba(255,255,255,0.24)'
        : '#CBD5E1'
      : materialYou
        ? alphaHex(brand, isDark ? 0.28 : 0.18)
        : isDark
          ? 'rgba(255,255,255,0.08)'
          : alphaHex(brand, 0.09);

    const text = highContrast
      ? isDark
        ? '#FFFFFF'
        : '#09090B'
      : isDark
        ? '#F8FAFC'
        : '#18192B';

    const textSecondary = highContrast
      ? isDark
        ? '#E2E8F0'
        : '#1E293B'
      : isDark
        ? '#CBD5E1'
        : '#475569';

    const textMuted = highContrast
      ? isDark
        ? '#CBD5E1'
        : '#334155'
      : isDark
        ? '#94A3B8'
        : '#7C829B';

    const iconRadius =
      iconStyle === 'circle' ? 999 : iconStyle === 'soft' ? 10 : 16;

    const scaleFactor = (fontScale || 100) / 100;

    return {
      isDark,
      brand,
      brandLight,
      brandDark,
      brandSoft,
      heroGradient,
      coral: CORAL_ACCENT,
      coralEnd: CORAL_ACCENT_END,
      coralSoft: alphaHex(CORAL_ACCENT, isDark ? 0.2 : 0.12),
      coralGradient: [CORAL_ACCENT, CORAL_ACCENT_END],
      bg,
      card,
      elevated,
      muted,
      border,
      text,
      textSecondary,
      textMuted,
      income: '#10B981',
      incomeSoft: alphaHex('#10B981', isDark ? 0.18 : 0.11),
      expense: '#F43F5E',
      expenseSoft: alphaHex('#F43F5E', isDark ? 0.18 : 0.11),
      transfer: '#6366F1',
      transferSoft: alphaHex('#6366F1', isDark ? 0.18 : 0.11),
      warning: '#F59E0B',
      warningSoft: alphaHex('#F59E0B', isDark ? 0.18 : 0.12),
      iconStyle,
      iconRadius,
      fontFamily,
      fontScale,
      motion: motionMode,
      highContrast,
      materialYou,
      sp: (size: number) => Math.round(size * scaleFactor * 10) / 10,
      font: (weight = '600') => resolveRNFontFamily(fontFamily, weight),
    };
  }, [
    themeMode,
    systemScheme,
    accentColor,
    materialYou,
    highContrast,
    iconStyle,
    fontFamily,
    fontScale,
    motionMode,
  ]);

  return <ThemeContext.Provider value={theme}>{children}</ThemeContext.Provider>;
}

export function useAppTheme(): LumioTheme {
  const ctx = useContext(ThemeContext);
  if (!ctx) {
    throw new Error('useAppTheme must be used inside ThemeProvider');
  }
  return ctx;
}
