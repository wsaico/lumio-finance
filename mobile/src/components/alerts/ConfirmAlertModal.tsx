import React, { useState } from 'react';
import {
  ActivityIndicator,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { AlertTriangle, CheckCircle2, Info, Trash2 } from 'lucide-react-native';
import { useAppTheme } from '@/theme/ThemeProvider';
import { alphaHex } from '@/lib/color-math';
import { triggerHaptic } from '@/lib/haptics';

export type ConfirmAlertVariant = 'danger' | 'warning' | 'info' | 'success';

export interface ConfirmAlertModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  variant?: ConfirmAlertVariant;
  title: string;
  description?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  onConfirm: () => void | Promise<void>;
  isLoading?: boolean;
  errorMessage?: string | null;
  children?: React.ReactNode;
}

const VARIANT_CONFIG: Record<
  ConfirmAlertVariant,
  {
    bar: [string, string];
    accent: string;
    Icon: typeof Trash2;
  }
> = {
  danger: { bar: ['#F43F5E', '#E11D48'], accent: '#E11D48', Icon: Trash2 },
  warning: { bar: ['#FBBF24', '#F97316'], accent: '#F59E0B', Icon: AlertTriangle },
  success: { bar: ['#34D399', '#059669'], accent: '#10B981', Icon: CheckCircle2 },
  info: { bar: ['#6C47F5', '#4524B8'], accent: '#5B35D5', Icon: Info },
};

export function ConfirmAlertModal({
  open,
  onOpenChange,
  variant = 'danger',
  title,
  description,
  confirmLabel = 'Confirmar',
  cancelLabel = 'Cancelar',
  onConfirm,
  isLoading = false,
  errorMessage,
  children,
}: ConfirmAlertModalProps) {
  const theme = useAppTheme();
  const [internalLoading, setInternalLoading] = useState(false);
  const loading = Boolean(isLoading || internalLoading);
  const meta = VARIANT_CONFIG[variant];
  const Icon = meta.Icon;
  const barColors: [string, string] =
    variant === 'info' ? [theme.brandLight, theme.brandDark] : meta.bar;
  const accentColor = variant === 'info' ? theme.brand : meta.accent;

  const handleConfirm = async () => {
    if (loading) return;
    triggerHaptic(variant === 'danger' ? 'warning' : 'medium');
    try {
      setInternalLoading(true);
      await onConfirm();
      onOpenChange(false);
    } catch {
      // keep open so caller can show inline error
    } finally {
      setInternalLoading(false);
    }
  };

  return (
    <Modal
      visible={open}
      transparent
      animationType="none"
      onRequestClose={() => {
        if (!loading) onOpenChange(false);
      }}
    >
      <Animated.View
        entering={theme.motion === 'none' ? undefined : FadeIn.duration(160)}
        style={styles.backdrop}
      >
        <Animated.View
          entering={theme.motion === 'none' ? undefined : FadeIn.duration(140)}
          style={[
            styles.card,
            {
              backgroundColor: theme.card,
              borderColor: theme.border,
            },
          ]}
        >
          <LinearGradient
            colors={barColors}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.topBar}
          />

          <View style={styles.body}>
            <View
              style={[
                styles.glow,
                { backgroundColor: alphaHex(accentColor, theme.isDark ? 0.22 : 0.14) },
              ]}
            />
            <View
              style={[
                styles.medallion,
                {
                  backgroundColor: alphaHex(accentColor, 0.13),
                  borderColor: alphaHex(accentColor, 0.28),
                },
              ]}
            >
              <Icon size={26} color={accentColor} strokeWidth={2.2} />
            </View>

            <Text
              style={[
                styles.title,
                { color: theme.text, fontFamily: theme.font('800'), fontSize: theme.sp(18) },
              ]}
            >
              {title}
            </Text>

            {description ? (
              <Text
                style={[
                  styles.desc,
                  { color: theme.textSecondary, fontFamily: theme.font('400'), fontSize: theme.sp(13.5) },
                ]}
              >
                {description}
              </Text>
            ) : null}

            {children ? <View style={{ marginTop: 14, width: '100%' }}>{children}</View> : null}

            {errorMessage ? (
              <View
                style={[
                  styles.errorBox,
                  {
                    backgroundColor: alphaHex('#F43F5E', 0.12),
                    borderColor: alphaHex('#F43F5E', 0.3),
                  },
                ]}
              >
                <Text
                  style={[
                    styles.errorText,
                    { fontFamily: theme.font('600'), fontSize: theme.sp(12) },
                  ]}
                >
                  {errorMessage}
                </Text>
              </View>
            ) : null}
          </View>

          <View style={styles.footer}>
            <Pressable
              disabled={loading}
              onPress={() => onOpenChange(false)}
              style={({ pressed }) => [
                styles.btnCancel,
                {
                  backgroundColor: theme.muted,
                  borderColor: theme.border,
                  opacity: loading ? 0.5 : pressed ? 0.8 : 1,
                },
              ]}
            >
              <Text
                style={[
                  styles.btnText,
                  { color: theme.text, fontFamily: theme.font('700'), fontSize: theme.sp(14) },
                ]}
              >
                {cancelLabel}
              </Text>
            </Pressable>

            <Pressable
              disabled={loading}
              onPress={handleConfirm}
              style={({ pressed }) => [
                styles.btnConfirm,
                {
                  backgroundColor: accentColor,
                  opacity: loading ? 0.7 : pressed ? 0.88 : 1,
                },
              ]}
            >
              {loading ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <Text
                  style={[
                    styles.btnText,
                    { color: '#FFFFFF', fontFamily: theme.font('700'), fontSize: theme.sp(14) },
                  ]}
                >
                  {confirmLabel}
                </Text>
              )}
            </Pressable>
          </View>
        </Animated.View>
      </Animated.View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(10, 12, 22, 0.62)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  card: {
    width: '100%',
    maxWidth: 400,
    borderRadius: 28,
    borderWidth: 1,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 18 },
    shadowOpacity: 0.28,
    shadowRadius: 30,
    elevation: 18,
  },
  topBar: {
    height: 5,
    width: '100%',
  },
  body: {
    paddingHorizontal: 22,
    paddingTop: 24,
    paddingBottom: 18,
    alignItems: 'center',
    position: 'relative',
  },
  glow: {
    position: 'absolute',
    top: -32,
    width: 160,
    height: 96,
    borderRadius: 99,
  },
  medallion: {
    width: 58,
    height: 58,
    borderRadius: 20,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
  },
  title: {
    textAlign: 'center',
    lineHeight: 23,
  },
  desc: {
    marginTop: 7,
    textAlign: 'center',
    lineHeight: 20,
  },
  errorBox: {
    marginTop: 12,
    paddingHorizontal: 12,
    paddingVertical: 9,
    borderRadius: 14,
    borderWidth: 1,
    width: '100%',
  },
  errorText: {
    color: '#E11D48',
    textAlign: 'center',
  },
  footer: {
    flexDirection: 'row',
    gap: 10,
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  btnCancel: {
    flex: 1,
    height: 46,
    borderRadius: 16,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  btnConfirm: {
    flex: 1,
    height: 46,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  btnText: {
    letterSpacing: -0.2,
  },
});
