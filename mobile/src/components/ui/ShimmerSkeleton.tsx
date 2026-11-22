import React, { useEffect } from 'react';
import { StyleSheet, View, type DimensionValue, type StyleProp, type ViewStyle } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import { useAppTheme } from '@/theme/ThemeProvider';

export function ShimmerSkeleton({
  width = '100%',
  height = 20,
  borderRadius = 16,
  style,
}: {
  width?: DimensionValue;
  height?: number;
  borderRadius?: number;
  style?: StyleProp<ViewStyle>;
}) {
  const theme = useAppTheme();
  const opacity = useSharedValue(0.45);

  useEffect(() => {
    if (theme.motion === 'none') return;
    opacity.value = withRepeat(
      withSequence(withTiming(0.85, { duration: 700 }), withTiming(0.4, { duration: 700 })),
      -1,
      true
    );
  }, [theme.motion, opacity]);

  const animStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
  }));

  return (
    <Animated.View
      style={[
        {
          width,
          height,
          borderRadius,
          backgroundColor: theme.muted,
        },
        animStyle,
        style,
      ]}
    />
  );
}

export function DashboardSkeletonView() {
  return (
    <View style={styles.col}>
      <ShimmerSkeleton height={165} borderRadius={32} />
      <View style={styles.row}>
        <ShimmerSkeleton width="48%" height={120} borderRadius={22} />
        <ShimmerSkeleton width="48%" height={120} borderRadius={22} />
      </View>
      <ShimmerSkeleton height={210} borderRadius={24} />
      <ShimmerSkeleton height={130} borderRadius={24} />
    </View>
  );
}

const styles = StyleSheet.create({
  col: { gap: 14, padding: 16 },
  row: { flexDirection: 'row', justifyContent: 'space-between', gap: 12 },
});
