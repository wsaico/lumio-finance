import React from 'react';
import { StyleSheet, View } from 'react-native';
import { Tabs } from 'expo-router';
import { FloatingTabBar } from '@/components/navigation/FloatingTabBar';
import { useAppTheme } from '@/theme/ThemeProvider';

export default function TabsLayout() {
  const theme = useAppTheme();

  return (
    <View style={[styles.flex, { backgroundColor: theme.bg }]}>
      <Tabs
        screenOptions={{
          headerShown: false,
          sceneStyle: { backgroundColor: theme.bg },
        }}
        tabBar={() => <FloatingTabBar />}
      >
        <Tabs.Screen name="index" options={{ title: 'Inicio' }} />
        <Tabs.Screen name="transactions" options={{ title: 'Movimientos' }} />
        <Tabs.Screen name="accounts" options={{ title: 'Cuentas' }} />
        <Tabs.Screen name="explore" options={{ title: 'Explorar' }} />
      </Tabs>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
});
