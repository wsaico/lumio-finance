import React, { useEffect, useRef, useState } from 'react';
import { Text, type StyleProp, type TextStyle } from 'react-native';
import { useAppTheme } from '@/theme/ThemeProvider';
import { formatMoneyValue } from '@/lib/format';
import { useSettingsStore } from '@/stores/settings-store';

export function AnimatedNumber({
  value,
  currencyCode,
  hidden = false,
  prefix = '',
  suffix = '',
  style,
  numberOfLines = 1,
}: {
  value: number;
  currencyCode?: string;
  hidden?: boolean;
  prefix?: string;
  suffix?: string;
  style?: StyleProp<TextStyle>;
  numberOfLines?: number;
}) {
  const theme = useAppTheme();
  const numberFormat = useSettingsStore((s) => s.numberFormat);
  const [displayValue, setDisplayValue] = useState(value);
  const prevRef = useRef(value);

  useEffect(() => {
    const startVal = prevRef.current;
    const endVal = Number.isFinite(value) ? value : 0;
    prevRef.current = endVal;

    if (theme.motion === 'none' || Math.abs(endVal - startVal) < 0.01) {
      setDisplayValue(endVal);
      return;
    }

    const duration = theme.motion === 'reduced' ? 180 : 480;
    const startTime = Date.now();
    let rafId = 0;

    const tick = () => {
      const elapsed = Date.now() - startTime;
      const progress = Math.min(1, elapsed / duration);
      // Cubic ease-out
      const eased = 1 - Math.pow(1 - progress, 3);
      setDisplayValue(startVal + (endVal - startVal) * eased);
      if (progress < 1) {
        rafId = requestAnimationFrame(tick);
      }
    };

    rafId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafId);
  }, [value, theme.motion]);

  const formatted = hidden
    ? '••••••'
    : currencyCode
      ? `${prefix}${formatMoneyValue(displayValue, currencyCode, numberFormat)}${suffix}`
      : `${prefix}${Math.round(displayValue).toLocaleString('en-US')}${suffix}`;

  return (
    <Text
      numberOfLines={numberOfLines}
      adjustsFontSizeToFit
      style={[{ fontVariant: ['tabular-nums'] }, style]}
    >
      {formatted}
    </Text>
  );
}
