import React, { useEffect } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Svg, { Circle } from 'react-native-svg';
import Animated, {
  Easing,
  useAnimatedProps,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { useAppTheme } from '@/theme/ThemeProvider';

const AnimatedCircle = Animated.createAnimatedComponent(Circle);

export function HealthScoreGauge({
  score,
  statusLabel,
  color,
  size = 136,
}: {
  score: number;
  statusLabel: string;
  color?: string;
  size?: number;
}) {
  const theme = useAppTheme();
  const clamped = Math.max(0, Math.min(100, Math.round(score || 0)));
  const strokeWidth = 13;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const activeColor =
    color ||
    (clamped >= 80
      ? theme.income
      : clamped >= 60
        ? theme.brand
        : clamped >= 40
          ? theme.warning
          : theme.expense);

  const anim = useSharedValue(theme.motion === 'none' ? clamped : 0);

  useEffect(() => {
    if (theme.motion === 'none') {
      anim.value = clamped;
    } else {
      anim.value = withTiming(clamped, {
        duration: theme.motion === 'reduced' ? 240 : 750,
        easing: Easing.out(Easing.cubic),
      });
    }
  }, [clamped, theme.motion, anim]);

  const animatedProps = useAnimatedProps(() => ({
    strokeDashoffset: circumference - (anim.value / 100) * circumference,
  }));

  return (
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
        <AnimatedCircle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={activeColor}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={circumference}
          animatedProps={animatedProps}
        />
      </Svg>
      <View style={[StyleSheet.absoluteFill, styles.center]}>
        <Text
          style={{
            color: theme.text,
            fontFamily: theme.font('800'),
            fontSize: theme.sp(30),
            fontVariant: ['tabular-nums'],
            lineHeight: 34,
          }}
        >
          {clamped}
        </Text>
        <Text
          style={{
            color: activeColor,
            fontFamily: theme.font('800'),
            fontSize: theme.sp(11),
            marginTop: 2,
          }}
        >
          {statusLabel}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  center: {
    alignItems: 'center',
    justifyContent: 'center',
  },
});
