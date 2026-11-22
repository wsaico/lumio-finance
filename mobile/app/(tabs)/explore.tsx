import React from 'react';
import { Image, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import {
  Activity,
  ArrowLeftRight,
  Bell,
  Crown,
  FileSpreadsheet,
  HandCoins,
  Layers,
  PieChart,
  PiggyBank,
  Repeat,
  Settings,
  Tags,
} from 'lucide-react-native';
import { useAppTheme } from '@/theme/ThemeProvider';
import { CurvedHeroHeader } from '@/components/ui/CurvedHeroHeader';
import { PremiumCard } from '@/components/ui/PremiumCard';
import { useUser } from '@/hooks/useUser';
import { useSubscription } from '@/hooks/useSubscription';
import { alphaHex } from '@/lib/color-math';
import { triggerHaptic } from '@/lib/haptics';

interface HubModule {
  title: string;
  subtitle: string;
  href: string;
  color: string;
  Icon: typeof PieChart;
}

export default function ExploreScreen() {
  const theme = useAppTheme();
  const router = useRouter();
  const { profile } = useUser();
  const { isTrial, isPremium, trialDaysRemaining, entitlements } = useSubscription();

  const planBadge = isTrial
    ? `Prueba · ${trialDaysRemaining}d restantes`
    : isPremium
      ? entitlements?.planName || 'Lumio Premium'
      : 'Plan Básico';

  const sections: { title: string; items: HubModule[] }[] = [
    {
      title: 'Inteligencia y Control',
      items: [
        { title: 'Análisis Experto', subtitle: 'Salud financiera y 50/30/20', href: '/analysis', color: theme.brand, Icon: Activity },
        { title: 'Presupuestos', subtitle: 'Límites por categoría', href: '/budgets', color: theme.coral, Icon: PieChart },
        { title: 'Planificación ZBB', subtitle: 'Base Cero mensual', href: '/planning', color: '#6366F1', Icon: Layers },
        { title: 'Reportes', subtitle: 'Excel, PDF y CSV', href: '/reports', color: theme.income, Icon: FileSpreadsheet },
      ],
    },
    {
      title: 'Patrimonio y Compromisos',
      items: [
        { title: 'Metas de Ahorro', subtitle: 'Fondos y objetivos', href: '/savings-goals', color: '#0EA5E9', Icon: PiggyBank },
        { title: 'Suscripciones', subtitle: 'Pagos recurrentes', href: '/subscriptions', color: theme.coral, Icon: Repeat },
        { title: 'Préstamos', subtitle: 'Por cobrar y pagar', href: '/loans', color: theme.brand, Icon: HandCoins },
        { title: 'Divisas', subtitle: 'Conversor en vivo', href: '/exchange-rates', color: '#8B5CF6', Icon: ArrowLeftRight },
      ],
    },
    {
      title: 'Sistema y Personalización',
      items: [
        { title: 'Categorías y Tags', subtitle: 'Organiza tus rubros', href: '/settings/categories', color: theme.coral, Icon: Tags },
        { title: 'Notificaciones', subtitle: 'Alertas en tiempo real', href: '/notifications', color: theme.brand, Icon: Bell },
        { title: 'Planes y Pagos', subtitle: 'Suscripción Premium', href: '/billing', color: '#F59E0B', Icon: Crown },
        { title: 'Ajustes', subtitle: 'Tema, PIN, respaldo', href: '/settings', color: '#64748B', Icon: Settings },
      ],
    },
  ];

  return (
    <View style={[styles.screen, { backgroundColor: theme.bg }]}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>
        <CurvedHeroHeader>
          <View style={styles.profileRow}>
            {profile?.avatar_url ? (
              <Image source={{ uri: profile.avatar_url }} style={styles.avatar} />
            ) : (
              <View style={styles.avatarFallback}>
                <Text style={{ color: '#FFFFFF', fontFamily: theme.font('800'), fontSize: 20 }}>
                  {(profile?.full_name || 'L').slice(0, 1).toUpperCase()}
                </Text>
              </View>
            )}
            <View style={{ flex: 1 }}>
              <Text numberOfLines={1} style={{ color: '#FFFFFF', fontFamily: theme.font('800'), fontSize: theme.sp(19) }}>
                {profile?.full_name || 'Usuario Lumio'}
              </Text>
              <Text numberOfLines={1} style={{ color: 'rgba(255,255,255,0.75)', fontFamily: theme.font('500'), fontSize: theme.sp(12) }}>
                {profile?.email || ''}
              </Text>
            </View>
            <Pressable
              onPress={() => router.push('/settings' as any)}
              style={styles.gearBtn}
            >
              <Settings size={18} color="#FFFFFF" />
            </Pressable>
          </View>

          <Pressable
            onPress={() => router.push('/billing' as any)}
            style={styles.planBanner}
          >
            <Crown size={16} color="#FFB085" />
            <Text style={{ flex: 1, color: '#FFFFFF', fontFamily: theme.font('700'), fontSize: theme.sp(12.5) }}>
              {planBadge}
            </Text>
            <Text style={{ color: '#FFB085', fontFamily: theme.font('800'), fontSize: theme.sp(11.5) }}>
              Gestionar
            </Text>
          </Pressable>
        </CurvedHeroHeader>

        <View style={styles.body}>
          {sections.map((sec) => (
            <View key={sec.title} style={{ gap: 10 }}>
              <Text style={{ color: theme.textSecondary, fontFamily: theme.font('800'), fontSize: theme.sp(13), paddingLeft: 4 }}>
                {sec.title}
              </Text>
              <View style={styles.grid}>
                {sec.items.map((item) => {
                  const Icon = item.Icon;
                  return (
                    <Pressable
                      key={item.href}
                      onPress={() => {
                        triggerHaptic('selection');
                        router.push(item.href as any);
                      }}
                      style={({ pressed }) => [
                        styles.gridItem,
                        { opacity: pressed ? 0.9 : 1, transform: [{ scale: pressed ? 0.98 : 1 }] },
                      ]}
                    >
                      <PremiumCard padding={15} style={styles.tileCard}>
                        <View
                          style={[
                            styles.tileIcon,
                            {
                              backgroundColor: alphaHex(item.color, 0.14),
                              borderRadius: theme.iconRadius,
                            },
                          ]}
                        >
                          <Icon size={21} color={item.color} />
                        </View>
                        <Text numberOfLines={1} style={{ color: theme.text, fontFamily: theme.font('800'), fontSize: theme.sp(14), marginTop: 10 }}>
                          {item.title}
                        </Text>
                        <Text numberOfLines={1} style={{ color: theme.textMuted, fontFamily: theme.font('500'), fontSize: theme.sp(11.5), marginTop: 2 }}>
                          {item.subtitle}
                        </Text>
                      </PremiumCard>
                    </Pressable>
                  );
                })}
              </View>
            </View>
          ))}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  scroll: { paddingBottom: 118 },
  profileRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  avatar: { width: 50, height: 50, borderRadius: 25, borderWidth: 2, borderColor: 'rgba(255,255,255,0.4)' },
  avatarFallback: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  gearBtn: {
    width: 38,
    height: 38,
    borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.16)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  planBanner: {
    marginTop: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 14,
    paddingVertical: 11,
    borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.14)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.18)',
  },
  body: { padding: 16, gap: 18 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  gridItem: { width: '48.3%' },
  tileCard: { minHeight: 112 },
  tileIcon: { width: 42, height: 42, alignItems: 'center', justifyContent: 'center' },
});
