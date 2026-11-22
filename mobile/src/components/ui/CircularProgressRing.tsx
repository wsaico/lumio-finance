import React, { useEffect } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Svg, { Circle } from 'react-native-svg';
import Animated, {
  useAnimatedProps,
  useSharedValue,
  withTiming,
  Easing,
} from 'react-native-reanimated';
import { useAppTheme } from '@/theme/ThemeProvider';

const AnimatedCircle = Animated.createAnimatedComponent(Circle);

export function CircularProgressRing({
  progress,
  size = 68,
  strokeWidth = 7,
  color,
  trackColor,
  label,
  labelColor,
  sublabel,
}: {
  progress: number;
  size?: number;
  strokeWidth?: number;
  color?: string;
  trackColor?: string;
  label?: string;
  labelColor?: string;
  sublabel?: string;
}) {
  const theme = useAppTheme();
  const clamped = Math.max(0, Math.min(100, Number(progress) || 0));
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const activeColor = color || theme.brand;
  const bgTrack = trackColor || (theme.isDark ? 'rgba(255,255,255,0.12)' : 'rgba(91,53,213,0.12)');

  const animProgress = useSharedValue(theme.motion === 'none' ? clamped : 0);

  useEffect(() => {
    if (theme.motion === 'none') {
      animProgress.value = clamped;
    } else {
      animProgress.value = withTiming(clamped, {
        duration: theme.motion === 'reduced' ? 220 : 650,
        easing: Easing.out(Easing.cubic),
      });
    }
  }, [clamped, theme.motion, animProgress]);

  const animatedProps = useAnimatedProps(() => ({
    strokeDashoffset: circumference - (animProgress.value / 100) * circumference,
  }));

  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
      <Svg width={size} height={size} style={{ transform: [{ rotate: '-90deg' }] }}>
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={bgTrack}
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
          style={[
            styles.label,
            {
              color: labelColor || theme.text,
              fontFamily: theme.font('800'),
              fontSize: size >= 90 ? theme.sp(18) : theme.sp(12.5),
            },
          ]}
        >
          {label ?? `${Math.round(clamped)}%`}
        </Text>
        {sublabel ? (
          <Text
            style={[
              styles.sublabel,
              {
                color: labelColor ? 'rgba(255,255,255,0.78)' : theme.textMuted,
                fontFamily: theme.font('600'),
                fontSize: theme.sp(9.5),
              },
            ]}
          >
            {sublabel}
          </Text>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  center: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  label: {
    fontVariant: ['tabular-nums'],
  },
  sublabel: {
    marginTop: 1,
  },
});
