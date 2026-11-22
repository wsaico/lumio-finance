import React, { useEffect, useRef } from 'react';
import {
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useAppTheme } from '@/theme/ThemeProvider';
import { alphaHex } from '@/lib/color-math';
import { triggerHaptic } from '@/lib/haptics';

export const WHEEL_ITEM_HEIGHT = 44;
const VISIBLE_ROWS = 5;
const WHEEL_HEIGHT = WHEEL_ITEM_HEIGHT * VISIBLE_ROWS;
const PAD_HEIGHT = WHEEL_ITEM_HEIGHT * 2;

export interface WheelOption<T extends string | number> {
  value: T;
  label: string;
}

export function IosWheelColumn<T extends string | number>({
  options,
  value,
  onChange,
  width,
  flex,
}: {
  options: WheelOption<T>[];
  value: T;
  onChange: (next: T) => void;
  width?: number;
  flex?: number;
}) {
  const theme = useAppTheme();
  const scrollRef = useRef<React.ComponentRef<typeof ScrollView> | null>(null);
  const selectedIndex = Math.max(
    0,
    options.findIndex((o) => o.value === value)
  );
  const lastIndexRef = useRef(selectedIndex);

  useEffect(() => {
    lastIndexRef.current = selectedIndex;
    const y = selectedIndex * WHEEL_ITEM_HEIGHT;
    const timer = setTimeout(() => {
      scrollRef.current?.scrollTo({ y, animated: false });
    }, 20);
    return () => clearTimeout(timer);
  }, [selectedIndex, options.length]);

  const commitOffset = (offsetY: number) => {
    const idx = Math.max(
      0,
      Math.min(options.length - 1, Math.round(offsetY / WHEEL_ITEM_HEIGHT))
    );
    if (idx !== lastIndexRef.current) {
      lastIndexRef.current = idx;
      triggerHaptic('selection');
      onChange(options[idx].value);
    }
  };

  const handleMomentumEnd = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    commitOffset(e.nativeEvent.contentOffset.y);
  };

  const handleScrollEndDrag = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    if (Platform.OS === 'web') {
      commitOffset(e.nativeEvent.contentOffset.y);
    }
  };

  const selectIndex = (idx: number) => {
    const clamped = Math.max(0, Math.min(options.length - 1, idx));
    lastIndexRef.current = clamped;
    triggerHaptic('selection');
    onChange(options[clamped].value);
    scrollRef.current?.scrollTo({ y: clamped * WHEEL_ITEM_HEIGHT, animated: true });
  };

  const fadeBg = theme.card;

  return (
    <View
      style={[
        styles.columnWrap,
        {
          height: WHEEL_HEIGHT,
          width,
          flex: flex ?? (width ? undefined : 1),
        },
      ]}
    >
      {/* Centered iOS selection highlight band */}
      <View
        pointerEvents="none"
        style={[
          styles.centerBand,
          {
            top: PAD_HEIGHT,
            height: WHEEL_ITEM_HEIGHT,
            backgroundColor: alphaHex(theme.brand, theme.isDark ? 0.2 : 0.1),
            borderColor: alphaHex(theme.brand, 0.26),
          },
        ]}
      />

      <ScrollView
        ref={scrollRef}
        showsVerticalScrollIndicator={false}
        snapToInterval={WHEEL_ITEM_HEIGHT}
        decelerationRate="fast"
        nestedScrollEnabled
        onMomentumScrollEnd={handleMomentumEnd}
        onScrollEndDrag={handleScrollEndDrag}
        contentContainerStyle={{
          paddingTop: PAD_HEIGHT,
          paddingBottom: PAD_HEIGHT,
        }}
      >
        {options.map((opt, idx) => {
          const dist = Math.abs(idx - selectedIndex);
          const isSelected = dist === 0;
          const opacity = dist === 0 ? 1 : dist === 1 ? 0.52 : 0.22;
          const scale = dist === 0 ? 1.06 : dist === 1 ? 0.94 : 0.85;
          return (
            <Pressable
              key={`${String(opt.value)}-${idx}`}
              onPress={() => selectIndex(idx)}
              style={[styles.itemRow, { height: WHEEL_ITEM_HEIGHT }]}
            >
              <Text
                numberOfLines={1}
                style={{
                  color: isSelected ? theme.text : theme.textSecondary,
                  fontFamily: theme.font(isSelected ? '800' : '600'),
                  fontSize: theme.sp(isSelected ? 19 : 16),
                  fontVariant: ['tabular-nums'],
                  opacity,
                  transform: [{ scale }],
                }}
              >
                {opt.label}
              </Text>
            </Pressable>
          );
        })}
      </ScrollView>

      {/* Top & Bottom iOS drum fade masks */}
      <LinearGradient
        pointerEvents="none"
        colors={[fadeBg, alphaHex(fadeBg, 0.82), alphaHex(fadeBg, 0)]}
        style={[styles.fadeMask, { top: 0, height: PAD_HEIGHT - 6 }]}
      />
      <LinearGradient
        pointerEvents="none"
        colors={[alphaHex(fadeBg, 0), alphaHex(fadeBg, 0.82), fadeBg]}
        style={[styles.fadeMask, { bottom: 0, height: PAD_HEIGHT - 6 }]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  columnWrap: {
    position: 'relative',
    overflow: 'hidden',
  },
  centerBand: {
    position: 'absolute',
    left: 4,
    right: 4,
    borderRadius: 14,
    borderWidth: 1,
  },
  itemRow: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 6,
  },
  fadeMask: {
    position: 'absolute',
    left: 0,
    right: 0,
  },
});
