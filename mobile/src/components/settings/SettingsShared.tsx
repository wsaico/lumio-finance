import React from 'react';
import { Pressable, StyleSheet, Switch, Text, View } from 'react-native';
import { ChevronRight, type LucideIcon } from 'lucide-react-native';
import { useAppTheme } from '@/theme/ThemeProvider';
import { alphaHex } from '@/lib/color-math';
import { triggerHaptic } from '@/lib/haptics';

export function SettingsGroup({
  title,
  children,
}: {
  title?: string;
  children: React.ReactNode;
}) {
  const theme = useAppTheme();
  return (
    <View style={{ gap: 8 }}>
      {title ? (
        <Text
          style={{
            color: theme.textSecondary,
            fontFamily: theme.font('800'),
            fontSize: theme.sp(12),
            paddingHorizontal: 6,
            textTransform: 'uppercase',
            letterSpacing: 0.6,
          }}
        >
          {title}
        </Text>
      ) : null}
      <View
        style={[
          styles.groupBox,
          { backgroundColor: theme.card, borderColor: theme.border },
        ]}
      >
        {children}
      </View>
    </View>
  );
}

export function SettingsRow({
  Icon,
  title,
  description,
  onPress,
  right,
  variant = 'default',
  isLast = false,
}: {
  Icon: LucideIcon;
  title: string;
  description?: string;
  onPress?: () => void;
  right?: React.ReactNode;
  variant?: 'default' | 'danger';
  isLast?: boolean;
}) {
  const theme = useAppTheme();
  const accent = variant === 'danger' ? theme.expense : theme.brand;

  const content = (
    <View
      style={[
        styles.row,
        !isLast && { borderBottomWidth: 1, borderBottomColor: theme.border },
      ]}
    >
      <View
        style={[
          styles.iconBox,
          {
            backgroundColor: alphaHex(accent, 0.12),
            borderRadius: theme.iconRadius,
          },
        ]}
      >
        <Icon size={18} color={accent} />
      </View>
      <View style={{ flex: 1 }}>
        <Text
          style={{
            color: variant === 'danger' ? theme.expense : theme.text,
            fontFamily: theme.font('700'),
            fontSize: theme.sp(14),
          }}
        >
          {title}
        </Text>
        {description ? (
          <Text
            style={{
              color: theme.textMuted,
              fontFamily: theme.font('500'),
              fontSize: theme.sp(11.5),
              marginTop: 1,
            }}
          >
            {description}
          </Text>
        ) : null}
      </View>
      {right ? (
        right
      ) : onPress ? (
        <ChevronRight size={17} color={theme.textMuted} />
      ) : null}
    </View>
  );

  if (onPress) {
    return (
      <Pressable
        onPress={() => {
          triggerHaptic('selection');
          onPress();
        }}
        style={({ pressed }) => ({ opacity: pressed ? 0.72 : 1 })}
      >
        {content}
      </Pressable>
    );
  }
  return content;
}

export function SettingsSwitch({
  value,
  onValueChange,
}: {
  value: boolean;
  onValueChange: (val: boolean) => void;
}) {
  const theme = useAppTheme();
  return (
    <Switch
      value={value}
      onValueChange={(v) => {
        triggerHaptic('selection');
        onValueChange(v);
      }}
      trackColor={{ false: theme.border, true: alphaHex(theme.brand, 0.52) }}
      thumbColor={value ? theme.brand : '#FFFFFF'}
    />
  );
}

const styles = StyleSheet.create({
  groupBox: { borderRadius: 22, borderWidth: 1, overflow: 'hidden' },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 14, paddingVertical: 13 },
  iconBox: { width: 38, height: 38, alignItems: 'center', justifyContent: 'center' },
});
