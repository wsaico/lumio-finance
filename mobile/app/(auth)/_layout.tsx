import React from 'react';
import { Stack } from 'expo-router';
import { useAppTheme } from '@/theme/ThemeProvider';

export default function AuthLayout() {
  const theme = useAppTheme();
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: theme.bg },
        animation: theme.motion === 'none' ? 'none' : 'slide_from_right',
      }}
    />
  );
}
