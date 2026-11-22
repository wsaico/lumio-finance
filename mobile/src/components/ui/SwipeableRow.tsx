import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import Animated, {
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import { Pencil, Trash2 } from 'lucide-react-native';
import { useAppTheme } from '@/theme/ThemeProvider';
import { triggerHaptic } from '@/lib/haptics';

export function SwipeableRow({
  children,
  onEdit,
  onDelete,
}: {
  children: React.ReactNode;
  onEdit?: () => void;
  onDelete?: () => void;
}) {
  const theme = useAppTheme();
  const translateX = useSharedValue(0);
  const openWidth = (onEdit ? 56 : 0) + (onDelete ? 56 : 0) + 12;

  const pan = Gesture.Pan()
    .activeOffsetX([-16, 16])
    .failOffsetY([-12, 12])
    .onUpdate((e) => {
      if (!onEdit && !onDelete) return;
      const next = Math.max(-openWidth - 16, Math.min(0, e.translationX));
      translateX.value = next;
    })
    .onEnd((e) => {
      if (!onEdit && !onDelete) return;
      if (e.translationX < -openWidth * 0.45 || e.velocityX < -400) {
        translateX.value = withSpring(-openWidth, { damping: 20, stiffness: 260 });
        runOnJS(triggerHaptic)('selection');
      } else {
        translateX.value = withSpring(0, { damping: 20, stiffness: 260 });
      }
    });

  const fgStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: translateX.value }],
  }));

  const close = () => {
    translateX.value = withSpring(0);
  };

  return (
    <View style={styles.container}>
      {(onEdit || onDelete) && (
        <View style={styles.actionsWrap}>
          {onEdit && (
            <Pressable
              onPress={() => {
                close();
                triggerHaptic('light');
                onEdit();
              }}
              style={[styles.actionBtn, { backgroundColor: theme.brand }]}
              accessibilityLabel="Editar"
            >
              <Pencil size={17} color="#FFFFFF" />
            </Pressable>
          )}
          {onDelete && (
            <Pressable
              onPress={() => {
                close();
                triggerHaptic('warning');
                onDelete();
              }}
              style={[styles.actionBtn, { backgroundColor: theme.expense }]}
              accessibilityLabel="Eliminar"
            >
              <Trash2 size={17} color="#FFFFFF" />
            </Pressable>
          )}
        </View>
      )}
      <GestureDetector gesture={pan}>
        <Animated.View style={fgStyle}>{children}</Animated.View>
      </GestureDetector>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'relative',
    justifyContent: 'center',
  },
  actionsWrap: {
    position: 'absolute',
    right: 6,
    top: 0,
    bottom: 0,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  actionBtn: {
    width: 48,
    height: 48,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
