import React, { useState } from 'react';
import { Pressable, StyleSheet, Text, View, type LayoutChangeEvent } from 'react-native';
import Animated, { useAnimatedStyle, withSpring } from 'react-native-reanimated';
import { useAppTheme } from '@/theme/ThemeProvider';
import { triggerHaptic } from '@/lib/haptics';

export interface SegmentOption<T extends string> {
  id: T;
  label: string;
}

export function SegmentedControl<T extends string>({
  options,
  value,
  onChange,
  variant = 'surface',
}: {
  options: readonly SegmentOption<T>[];
  value: T;
  onChange: (next: T) => void;
  variant?: 'surface' | 'hero';
}) {
  const theme = useAppTheme();
  const [width, setWidth] = useState(0);
  const activeIdx = Math.max(0, options.findIndex((o) => o.id === value));
  const pillW = width > 0 ? (width - 8) / options.length : 0;

  const pillStyle = useAnimatedStyle(() => {
    const x = activeIdx * pillW;
    return {
      transform: [
        {
          translateX:
            theme.motion === 'none'
              ? x
              : withSpring(x, { damping: 22, stiffness: 320 }),
        },
      ],
    };
  }, [activeIdx, pillW, theme.motion]);

  const onLayout = (e: LayoutChangeEvent) => {
    setWidth(e.nativeEvent.layout.width);
  };

  const isHero = variant === 'hero';

  return (
    <View
      onLayout={onLayout}
      style={[
        styles.container,
        {
          backgroundColor: isHero ? 'rgba(0,0,0,0.18)' : theme.muted,
          borderColor: isHero ? 'rgba(255,255,255,0.12)' : theme.border,
        },
      ]}
    >
      {pillW > 0 && (
        <Animated.View
          style={[
            styles.activePill,
            pillStyle,
            {
              width: pillW,
              backgroundColor: isHero ? 'rgba(255,255,255,0.22)' : theme.card,
            },
          ]}
        />
      )}
      {options.map((opt) => {
        const active = opt.id === value;
        return (
          <Pressable
            key={opt.id}
            onPress={() => {
              if (opt.id !== value) {
                triggerHaptic('selection');
                onChange(opt.id);
              }
            }}
            style={styles.option}
          >
            <Text
              numberOfLines={1}
              style={[
                styles.label,
                {
                  color: isHero
                    ? active
                      ? '#FFFFFF'
                      : 'rgba(255,255,255,0.7)'
                    : active
                      ? theme.brand
                      : theme.textMuted,
                  fontFamily: theme.font(active ? '700' : '600'),
                  fontSize: theme.sp(12.5),
                },
              ]}
            >
              {opt.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    borderRadius: 99,
    padding: 4,
    borderWidth: 1,
    position: 'relative',
  },
  activePill: {
    position: 'absolute',
    top: 4,
    bottom: 4,
    left: 4,
    borderRadius: 99,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 2,
  },
  option: {
    flex: 1,
    paddingVertical: 8,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1,
  },
  label: {
    letterSpacing: -0.1,
  },
});
