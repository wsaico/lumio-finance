import React from 'react';
import {
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import Animated, { FadeIn, SlideInDown } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { X } from 'lucide-react-native';
import { useAppTheme } from '@/theme/ThemeProvider';

export function PremiumBottomSheet({
  open,
  onClose,
  title,
  subtitle,
  children,
  footer,
  maxHeightPct = 0.9,
}: {
  open: boolean;
  onClose: () => void;
  title?: string;
  subtitle?: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
  maxHeightPct?: number;
}) {
  const theme = useAppTheme();
  const insets = useSafeAreaInsets();

  return (
    <Modal visible={open} transparent animationType="none" onRequestClose={onClose}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.root}
      >
        <Animated.View
          entering={theme.motion === 'none' ? undefined : FadeIn.duration(160)}
          style={styles.backdrop}
        >
          <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />
          <Animated.View
            entering={theme.motion === 'none' ? undefined : SlideInDown.springify().damping(24).stiffness(280)}
            style={[
              styles.sheet,
              {
                backgroundColor: theme.card,
                borderColor: theme.border,
                paddingBottom: Math.max(insets.bottom, 16),
                maxHeight: `${Math.round(maxHeightPct * 100)}%` as any,
              },
            ]}
          >
            <View style={styles.handleWrap}>
              <View style={[styles.handle, { backgroundColor: theme.border }]} />
            </View>

            {(title || subtitle) && (
              <View style={[styles.header, { borderBottomColor: theme.border }]}>
                <View style={{ flex: 1 }}>
                  {title ? (
                    <Text
                      style={[
                        styles.title,
                        { color: theme.text, fontFamily: theme.font('800'), fontSize: theme.sp(17) },
                      ]}
                      numberOfLines={1}
                    >
                      {title}
                    </Text>
                  ) : null}
                  {subtitle ? (
                    <Text
                      style={[
                        styles.subtitle,
                        { color: theme.textMuted, fontFamily: theme.font('500'), fontSize: theme.sp(12) },
                      ]}
                      numberOfLines={1}
                    >
                      {subtitle}
                    </Text>
                  ) : null}
                </View>
                <Pressable
                  onPress={onClose}
                  style={[styles.closeBtn, { backgroundColor: theme.muted }]}
                  accessibilityLabel="Cerrar"
                >
                  <X size={17} color={theme.textSecondary} />
                </Pressable>
              </View>
            )}

            <ScrollView
              bounces={false}
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}
              contentContainerStyle={styles.scrollBody}
            >
              {children}
            </ScrollView>

            {footer ? (
              <View style={[styles.footer, { borderTopColor: theme.border }]}>{footer}</View>
            ) : null}
          </Animated.View>
        </Animated.View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(10, 12, 22, 0.55)',
    justifyContent: 'flex-end',
  },
  sheet: {
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
    borderTopWidth: 1,
    borderLeftWidth: 1,
    borderRightWidth: 1,
    overflow: 'hidden',
  },
  handleWrap: {
    paddingTop: 10,
    paddingBottom: 4,
    alignItems: 'center',
  },
  handle: {
    width: 42,
    height: 4.5,
    borderRadius: 99,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderBottomWidth: 1,
    gap: 12,
  },
  title: {
    letterSpacing: -0.3,
  },
  subtitle: {
    marginTop: 1,
  },
  closeBtn: {
    width: 34,
    height: 34,
    borderRadius: 99,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scrollBody: {
    padding: 20,
    gap: 14,
  },
  footer: {
    paddingHorizontal: 20,
    paddingTop: 12,
    borderTopWidth: 1,
  },
});
