import React, { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useRouter } from 'expo-router';
import {
  ArrowRightLeft,
  ChevronRight,
  Crown,
  Database,
  Globe,
  Info,
  Palette,
  Search,
  Settings2,
  Tags,
} from 'lucide-react-native';
import { useAppTheme } from '@/theme/ThemeProvider';
import { TopAppHeader } from '@/components/navigation/TopAppHeader';
import { PremiumCard } from '@/components/ui/PremiumCard';
import { useSubscription } from '@/hooks/useSubscription';
import { alphaHex } from '@/lib/color-math';
import { triggerHaptic } from '@/lib/haptics';

const SECTIONS = [
  {
    id: 'general',
    title: 'General y Seguridad',
    description: 'Perfil, PIN 4 dígitos, biometría, widgets y modo demostración',
    keywords: 'perfil avatar pin biometria haptica saldo widgets demo sesion',
    color: '#5B35D5',
    Icon: Settings2,
  },
  {
    id: 'appearance',
    title: 'Apariencia y Tema',
    description: 'Colores 2027, Material You, tipografía, contraste y animaciones',
    keywords: 'tema oscuro claro material you colores fuente escala animaciones zurdo',
    color: '#FF7A33',
    Icon: Palette,
  },
  {
    id: 'transactions',
    title: 'Transacciones y Reglas',
    description: 'Registro rápido, escáner IA Gemini, recurrencia y validaciones',
    keywords: 'transacciones escaner ai gemini recurrente confirmar presupuesto meta',
    color: '#0EA5E9',
    Icon: ArrowRightLeft,
  },
  {
    id: 'localization',
    title: 'Regional, Moneda y Zona',
    description: 'País, moneda principal, zona horaria y formato de números',
    keywords: 'pais moneda pen usd eur zona horaria formato decimales',
    color: '#10B981',
    Icon: Globe,
  },
  {
    id: 'data',
    title: 'Datos, Backups y Drive',
    description: 'Exportar Excel/CSV, respaldo JSON, Google Drive y reinicio',
    keywords: 'csv excel backup json google drive importar reiniciar datos',
    color: '#6366F1',
    Icon: Database,
  },
  {
    id: 'about',
    title: 'Acerca de Lumio',
    description: 'Versión 2027, sincronización de correos y estado del servidor',
    keywords: 'acerca version servidor correos otp soporte',
    color: '#64748B',
    Icon: Info,
  },
];

export default function SettingsIndexScreen() {
  const theme = useAppTheme();
  const router = useRouter();
  const { isTrial, isPremium, trialDaysRemaining, entitlements } = useSubscription();
  const [query, setQuery] = useState('');

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return SECTIONS;
    return SECTIONS.filter(
      (s) =>
        s.title.toLowerCase().includes(q) ||
        s.description.toLowerCase().includes(q) ||
        s.keywords.includes(q)
    );
  }, [query]);

  return (
    <View style={[styles.screen, { backgroundColor: theme.bg }]}>
      <TopAppHeader title="Ajustes" subtitle="Personalización total" showBack />

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>
        {/* Plan Card */}
        <Pressable onPress={() => router.push('/billing' as any)}>
          <PremiumCard variant="hero-violet" padding={18} style={styles.planCard}>
            <View style={styles.planIcon}>
              <Crown size={20} color="#FFB085" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={{ color: '#FFFFFF', fontFamily: theme.font('800'), fontSize: theme.sp(15) }}>
                {isTrial
                  ? `Prueba gratuita · ${trialDaysRemaining} días restantes`
                  : isPremium
                    ? entitlements?.planName || 'Lumio Premium Activo'
                    : 'Plan Básico Gratuito'}
              </Text>
              <Text style={{ color: 'rgba(255,255,255,0.78)', fontFamily: theme.font('500'), fontSize: theme.sp(12) }}>
                Toca para gestionar planes, Yape/Plin y facturación
              </Text>
            </View>
            <ChevronRight size={18} color="#FFFFFF" />
          </PremiumCard>
        </Pressable>

        {/* Search Input */}
        <View style={[styles.searchBox, { backgroundColor: theme.card, borderColor: theme.border }]}>
          <Search size={16} color={theme.textMuted} />
          <TextInput
            value={query}
            onChangeText={setQuery}
            placeholder="Buscar ajuste (PIN, moneda, tema, backup...)"
            placeholderTextColor={theme.textMuted}
            style={{ flex: 1, color: theme.text, fontFamily: theme.font('500'), fontSize: theme.sp(13.5) }}
          />
        </View>

        {/* Shortcut to Categories & Tags */}
        <Pressable
          onPress={() => {
            triggerHaptic('selection');
            router.push('/settings/categories' as any);
          }}
        >
          <PremiumCard padding={15} style={styles.rowCard}>
            <View style={[styles.rowIcon, { backgroundColor: alphaHex(theme.coral, 0.14), borderRadius: theme.iconRadius }]}>
              <Tags size={19} color={theme.coral} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={{ color: theme.text, fontFamily: theme.font('800'), fontSize: theme.sp(14.5) }}>
                Categorías y Etiquetas
              </Text>
              <Text style={{ color: theme.textMuted, fontFamily: theme.font('500'), fontSize: theme.sp(11.5) }}>
                Crea, edita íconos y personaliza rubros de gasto e ingreso
              </Text>
            </View>
            <ChevronRight size={17} color={theme.textMuted} />
          </PremiumCard>
        </Pressable>

        {/* Main 6 Sections */}
        <View style={{ gap: 10 }}>
          {filtered.map((sec) => {
            const Icon = sec.Icon;
            return (
              <Pressable
                key={sec.id}
                onPress={() => {
                  triggerHaptic('selection');
                  router.push(`/settings/${sec.id}` as any);
                }}
                style={({ pressed }) => ({ opacity: pressed ? 0.88 : 1 })}
              >
                <PremiumCard padding={15} style={styles.rowCard}>
                  <View style={[styles.rowIcon, { backgroundColor: alphaHex(sec.color, 0.14), borderRadius: theme.iconRadius }]}>
                    <Icon size={19} color={sec.color} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={{ color: theme.text, fontFamily: theme.font('800'), fontSize: theme.sp(14.5) }}>
                      {sec.title}
                    </Text>
                    <Text style={{ color: theme.textMuted, fontFamily: theme.font('500'), fontSize: theme.sp(11.5), marginTop: 1 }}>
                      {sec.description}
                    </Text>
                  </View>
                  <ChevronRight size={17} color={theme.textMuted} />
                </PremiumCard>
              </Pressable>
            );
          })}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  scroll: { padding: 16, gap: 14, paddingBottom: 44 },
  planCard: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  planIcon: {
    width: 42,
    height: 42,
    borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.18)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderWidth: 1,
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 11,
  },
  rowCard: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  rowIcon: { width: 42, height: 42, alignItems: 'center', justifyContent: 'center' },
});
