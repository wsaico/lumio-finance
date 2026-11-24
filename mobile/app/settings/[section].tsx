import React from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, View } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { useAppTheme } from '@/theme/ThemeProvider';
import { TopAppHeader } from '@/components/navigation/TopAppHeader';
import { GeneralSection } from '@/components/settings/GeneralSection';
import { AppearanceSection } from '@/components/settings/AppearanceSection';
import { TransactionsSection } from '@/components/settings/TransactionsSection';
import { LocalizationSection } from '@/components/settings/LocalizationSection';
import { DataSection } from '@/components/settings/DataSection';
import { AboutSection } from '@/components/settings/AboutSection';

const META: Record<string, { title: string; subtitle: string }> = {
  general: { title: 'General y Seguridad', subtitle: 'Cuenta, PIN, widgets y demostración' },
  appearance: { title: 'Apariencia y Tema', subtitle: 'Colores, fuente y animaciones' },
  transactions: { title: 'Transacciones', subtitle: 'Registro rápido, IA y reglas' },
  localization: { title: 'Regional y Moneda', subtitle: 'País, divisa y zona horaria' },
  data: { title: 'Datos y Backups', subtitle: 'CSV, Excel, JSON y Google Drive' },
  about: { title: 'Acerca de Lumio', subtitle: 'Versión y estado del sistema' },
};

export default function SettingsSectionScreen() {
  const { section } = useLocalSearchParams<{ section: string }>();
  const theme = useAppTheme();
  const key = String(section || 'general');
  const meta = META[key] || META.general;

  return (
    <View style={[styles.screen, { backgroundColor: theme.bg }]}>
      <TopAppHeader title={meta.title} subtitle={meta.subtitle} showBack />

      <KeyboardAvoidingView
        behavior={Platform.OS === 'web' ? undefined : 'padding'}
        style={styles.screen}
      >
        <ScrollView
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={styles.scroll}
        >
          {key === 'general' && <GeneralSection />}
          {key === 'appearance' && <AppearanceSection />}
          {key === 'transactions' && <TransactionsSection />}
          {key === 'localization' && <LocalizationSection />}
          {key === 'data' && <DataSection />}
          {key === 'about' && <AboutSection />}
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  scroll: { padding: 16, paddingBottom: 46 },
});
