import React from 'react';
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useAppTheme } from '@/theme/ThemeProvider';
import { triggerHaptic } from '@/lib/haptics';

export function PremiumButton({
  title,
  onPress,
  variant = 'primary',
  icon,
  loading = false,
  disabled = false,
  style,
  size = 'md',
}: {
  title: string;
  onPress: () => void;
  variant?: 'primary' | 'coral' | 'outline' | 'ghost' | 'danger' | 'success';
  icon?: React.ReactNode;
  loading?: boolean;
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
  size?: 'sm' | 'md' | 'lg';
}) {
  const theme = useAppTheme();
  const isDisabled = disabled || loading;
  const height = size === 'sm' ? 38 : size === 'lg' ? 54 : 48;

  const handlePress = () => {
    if (isDisabled) return;
    triggerHaptic('light');
    onPress();
  };

  if (variant === 'primary' || variant === 'coral') {
    const colors: [string, string] =
      variant === 'coral' ? theme.coralGradient : [theme.brandLight, theme.brandDark];
    return (
      <Pressable
        onPress={handlePress}
        disabled={isDisabled}
        style={({ pressed }) => [
          {
            opacity: isDisabled ? 0.55 : pressed ? 0.9 : 1,
            transform: [{ scale: pressed ? 0.985 : 1 }],
          },
          style,
        ]}
      >
        <LinearGradient
          colors={colors}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={[
            styles.btn,
            {
              height,
              borderRadius: height / 2,
              shadowColor: variant === 'coral' ? theme.coral : theme.brand,
              shadowOpacity: 0.25,
              shadowRadius: 12,
              shadowOffset: { width: 0, height: 6 },
              elevation: 4,
            },
          ]}
        >
          {loading ? (
            <ActivityIndicator color="#FFFFFF" size="small" />
          ) : (
            <>
              {icon}
              <Text style={[styles.text, { color: '#FFFFFF', fontFamily: theme.font('700'), fontSize: theme.sp(size === 'sm' ? 12.5 : 14.5) }]}>
                {title}
              </Text>
            </>
          )}
        </LinearGradient>
      </Pressable>
    );
  }

  const bg =
    variant === 'danger'
      ? theme.expense
      : variant === 'success'
        ? theme.income
        : variant === 'outline'
          ? theme.card
          : 'transparent';

  const textColor =
    variant === 'danger' || variant === 'success'
      ? '#FFFFFF'
      : variant === 'outline'
        ? theme.text
        : theme.brand;

  return (
    <Pressable
      onPress={handlePress}
      disabled={isDisabled}
      style={({ pressed }) => [
        styles.btn,
        {
          height,
          borderRadius: height / 2,
          backgroundColor: bg,
          borderWidth: variant === 'outline' ? 1 : 0,
          borderColor: theme.border,
          opacity: isDisabled ? 0.55 : pressed ? 0.85 : 1,
          transform: [{ scale: pressed ? 0.985 : 1 }],
        },
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={textColor} size="small" />
      ) : (
        <>
          {icon}
          <Text style={[styles.text, { color: textColor, fontFamily: theme.font('700'), fontSize: theme.sp(size === 'sm' ? 12.5 : 14.5) }]}>
            {title}
          </Text>
        </>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  btn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingHorizontal: 18,
  },
  text: {
    letterSpacing: -0.2,
  },
});
