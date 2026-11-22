import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useAppTheme } from '@/theme/ThemeProvider';
import { PremiumButton } from './PremiumButton';

export function EmptyStateCard({
  icon,
  title,
  description,
  actionLabel,
  onAction,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
  actionLabel?: string;
  onAction?: () => void;
}) {
  const theme = useAppTheme();

  return (
    <View
      style={[
        styles.wrap,
        { backgroundColor: theme.card, borderColor: theme.border },
      ]}
    >
      <View
        style={[
          styles.iconBox,
          { backgroundColor: theme.brandSoft, borderRadius: theme.iconRadius },
        ]}
      >
        {icon}
      </View>
      <Text
        style={[
          styles.title,
          { color: theme.text, fontFamily: theme.font('800'), fontSize: theme.sp(16) },
        ]}
      >
        {title}
      </Text>
      <Text
        style={[
          styles.desc,
          { color: theme.textSecondary, fontFamily: theme.font('400'), fontSize: theme.sp(13) },
        ]}
      >
        {description}
      </Text>
      {actionLabel && onAction ? (
        <PremiumButton
          title={actionLabel}
          onPress={onAction}
          size="sm"
          style={{ marginTop: 6 }}
        />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    borderRadius: 24,
    borderWidth: 1,
    padding: 26,
    alignItems: 'center',
    gap: 8,
  },
  iconBox: {
    width: 58,
    height: 58,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  title: {
    textAlign: 'center',
  },
  desc: {
    textAlign: 'center',
    lineHeight: 19,
    maxWidth: 290,
  },
});
