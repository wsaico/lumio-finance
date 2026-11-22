import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Svg, { Circle } from 'react-native-svg';
import { useAppTheme } from '@/theme/ThemeProvider';
import { triggerHaptic } from '@/lib/haptics';

export interface DonutSlice {
  id?: string;
  name: string;
  value: number;
  color: string;
}

export function DonutBreakdownChart({
  slices,
  size = 148,
  strokeWidth = 22,
  centerLabel,
  centerSublabel,
  focusedId,
  onSelectSlice,
  formatValue,
  hideLegend = false,
}: {
  slices: DonutSlice[];
  size?: number;
  strokeWidth?: number;
  centerLabel?: string;
  centerSublabel?: string;
  focusedId?: string | null;
  onSelectSlice?: (slice: DonutSlice) => void;
  formatValue?: (n: number) => string;
  hideLegend?: boolean;
}) {
  const theme = useAppTheme();
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const total = Math.max(
    0,
    slices.reduce((sum, s) => sum + Math.max(0, Number(s.value) || 0), 0)
  );

  let cumulativePct = 0;

  return (
    <View style={styles.container}>
      <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
        <Svg width={size} height={size} style={{ transform: [{ rotate: '-90deg' }] }}>
          <Circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke={theme.muted}
            strokeWidth={strokeWidth}
          />
          {total > 0 &&
            slices.map((slice, idx) => {
              const val = Math.max(0, Number(slice.value) || 0);
              const pct = val / total;
              const segLen = Math.max(0, pct * circumference - 2);
              const dashOffset = -cumulativePct * circumference;
              cumulativePct += pct;
              const isFocused = !focusedId || focusedId === slice.id || focusedId === slice.name;

              return (
                <Circle
                  key={`${slice.name}-${idx}`}
                  cx={size / 2}
                  cy={size / 2}
                  r={radius}
                  fill="none"
                  stroke={slice.color || theme.brand}
                  strokeWidth={focusedId && isFocused ? strokeWidth + 3 : strokeWidth}
                  strokeDasharray={`${segLen} ${circumference}`}
                  strokeDashoffset={dashOffset}
                  strokeLinecap="butt"
                  opacity={isFocused ? 1 : 0.3}
                />
              );
            })}
        </Svg>
        <View style={[StyleSheet.absoluteFill, styles.center]}>
          {centerLabel ? (
            <Text
              numberOfLines={1}
              adjustsFontSizeToFit
              style={[
                styles.centerMain,
                { color: theme.text, fontFamily: theme.font('800'), fontSize: theme.sp(14) },
              ]}
            >
              {centerLabel}
            </Text>
          ) : null}
          {centerSublabel ? (
            <Text
              style={{
                color: theme.textMuted,
                fontFamily: theme.font('600'),
                fontSize: theme.sp(10),
              }}
            >
              {centerSublabel}
            </Text>
          ) : null}
        </View>
      </View>

      {!hideLegend && (
        <View style={styles.legend}>
          {slices.slice(0, 6).map((slice, idx) => {
            const pct = total > 0 ? Math.round((slice.value / total) * 100) : 0;
            const active = focusedId === slice.id || focusedId === slice.name;
            return (
              <Pressable
                key={`${slice.name}-leg-${idx}`}
                onPress={() => {
                  triggerHaptic('selection');
                  onSelectSlice?.(slice);
                }}
                style={[
                  styles.legendRow,
                  {
                    backgroundColor: active ? theme.brandSoft : 'transparent',
                    borderColor: active ? theme.brand : 'transparent',
                  },
                ]}
              >
                <View style={[styles.dot, { backgroundColor: slice.color || theme.brand }]} />
                <Text
                  style={{
                    flex: 1,
                    color: theme.text,
                    fontFamily: theme.font('600'),
                    fontSize: theme.sp(12),
                  }}
                  numberOfLines={1}
                >
                  {slice.name}
                </Text>
                <Text
                  style={{
                    color: theme.textMuted,
                    fontFamily: theme.font('700'),
                    fontSize: theme.sp(11),
                    fontVariant: ['tabular-nums'],
                  }}
                >
                  {pct}%
                </Text>
                {formatValue ? (
                  <Text
                    style={{
                      color: theme.text,
                      fontFamily: theme.font('700'),
                      fontSize: theme.sp(12),
                      fontVariant: ['tabular-nums'],
                      minWidth: 68,
                      textAlign: 'right',
                    }}
                  >
                    {formatValue(slice.value)}
                  </Text>
                ) : null}
              </Pressable>
            );
          })}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    gap: 14,
  },
  center: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 18,
  },
  centerMain: {
    fontVariant: ['tabular-nums'],
    textAlign: 'center',
  },
  legend: {
    width: '100%',
    gap: 4,
  },
  legendRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 12,
    borderWidth: 1,
  },
  dot: {
    width: 9,
    height: 9,
    borderRadius: 99,
  },
});
