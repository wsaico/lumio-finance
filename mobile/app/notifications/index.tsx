import React, { useState } from 'react';
import { FlatList, Pressable, RefreshControl, StyleSheet, Switch, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import {
  AlertTriangle,
  Bell,
  BellOff,
  Calendar,
  CheckCheck,
  Info,
  RefreshCw,
  Trash2,
} from 'lucide-react-native';
import { formatDistanceToNow } from 'date-fns';
import { es } from 'date-fns/locale';
import { useAppTheme } from '@/theme/ThemeProvider';
import { useNotifications, type AppNotification } from '@/hooks/useNotifications';
import { useSettingsStore } from '@/stores/settings-store';
import { CurvedHeroHeader } from '@/components/ui/CurvedHeroHeader';
import { TopAppHeader } from '@/components/navigation/TopAppHeader';
import { EmptyStateCard } from '@/components/ui/EmptyStateCard';
import { PremiumBottomSheet } from '@/components/ui/PremiumBottomSheet';
import { triggerHaptic } from '@/lib/haptics';

const ALERT_PREFS = [
  {
    key: 'subscriptions',
    title: 'Suscripciones por cobrar',
    desc: 'Cobros recurrentes o pagos programados próximos',
  },
  {
    key: 'budgets',
    title: 'Presupuestos al 80% o excedidos',
    desc: 'Avisos cuando una categoría se acerca al límite',
  },
  {
    key: 'shortfall',
    title: 'Riesgo de fin de mes',
    desc: 'Alerta temprana si tu ritmo supera tu liquidez',
  },
  {
    key: 'payments',
    title: 'Fechas de pago próximas',
    desc: 'Vencimientos de préstamos y tarjetas de crédito',
  },
  {
    key: 'unusual_expense',
    title: 'Gasto inusual',
    desc: 'Compras muy por encima de tu promedio habitual',
  },
] as const;

const ROUTE_MAP: Record<string, string> = {
  subscriptions: '/subscriptions',
  transactions: '/(tabs)/transactions',
  budgets: '/budgets',
  loans: '/loans',
  accounts: '/(tabs)/accounts',
  savings: '/savings-goals',
  analysis: '/analysis',
};

export default function NotificationsScreen() {
  const theme = useAppTheme();
  const router = useRouter();
  const [prefsOpen, setPrefsOpen] = useState(false);
  const mutedAlertTypes = useSettingsStore((s) => s.mutedAlertTypes);
  const toggleMutedAlertType = useSettingsStore((s) => s.toggleMutedAlertType);
  const {
    notifications,
    unreadCount,
    isLoading,
    isSyncing,
    syncSmartNotifications,
    markAsRead,
    markAllRead,
    deleteNotification,
  } = useNotifications();

  const handleTap = async (item: AppNotification) => {
    if (!item.is_read) await markAsRead(item.id);
    const mod = item.data?.module;
    if (mod && ROUTE_MAP[mod]) {
      router.push(ROUTE_MAP[mod] as any);
    }
  };

  return (
    <View style={[styles.flex, { backgroundColor: theme.bg }]}>
      <CurvedHeroHeader bottomRadius={28}>
        <TopAppHeader
          showBack
          onHero
          hideDefaultActions
          title="Notificaciones"
          subtitle={`${unreadCount} sin leer · Realtime activo`}
          rightSlot={
            <View style={{ flexDirection: 'row', gap: 6 }}>
              <Pressable
                onPress={() => {
                  triggerHaptic('selection');
                  setPrefsOpen(true);
                }}
                style={styles.heroBtn}
                accessibilityLabel="Preferencias de alertas"
              >
                <BellOff size={17} color="#FFFFFF" />
              </Pressable>
              <Pressable
                onPress={() => {
                  triggerHaptic('light');
                  syncSmartNotifications();
                }}
                style={styles.heroBtn}
                accessibilityLabel="Sincronizar"
              >
                <RefreshCw size={17} color="#FFFFFF" />
              </Pressable>
              {unreadCount > 0 ? (
                <Pressable
                  onPress={() => {
                    triggerHaptic('success');
                    markAllRead();
                  }}
                  style={styles.heroBtn}
                  accessibilityLabel="Marcar todas como leídas"
                >
                  <CheckCheck size={17} color="#FFFFFF" />
                </Pressable>
              ) : null}
            </View>
          }
        />
      </CurvedHeroHeader>

      <FlatList
        data={notifications}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        refreshControl={
          <RefreshControl
            refreshing={isLoading || isSyncing}
            onRefresh={syncSmartNotifications}
            tintColor={theme.brand}
          />
        }
        ListEmptyComponent={
          <EmptyStateCard
            icon={<Bell size={28} color={theme.brand} />}
            title="Sin alertas pendientes"
            description="Te avisaremos aquí cuando venza una suscripción, un préstamo o un presupuesto."
          />
        }
        renderItem={({ item }) => {
          const isWarn = item.type === 'WARNING';
          const isRem = item.type === 'REMINDER';
          const badgeColor = isWarn
            ? theme.warning
            : isRem
              ? theme.coral
              : theme.brand;
          const Icon = isWarn ? AlertTriangle : isRem ? Calendar : Info;

          return (
            <Pressable
              onPress={() => handleTap(item)}
              style={[
                styles.itemCard,
                {
                  backgroundColor: theme.card,
                  borderColor: item.is_read ? theme.border : badgeColor,
                  opacity: item.is_read ? 0.8 : 1,
                },
              ]}
            >
              <View
                style={[
                  styles.iconBox,
                  {
                    backgroundColor: isWarn
                      ? theme.warningSoft
                      : isRem
                        ? theme.coralSoft
                        : theme.brandSoft,
                  },
                ]}
              >
                <Icon size={18} color={badgeColor} />
              </View>
              <View style={{ flex: 1, gap: 3 }}>
                <View style={styles.titleRow}>
                  <Text
                    style={{
                      flex: 1,
                      color: theme.text,
                      fontFamily: theme.font('800'),
                      fontSize: theme.sp(13.5),
                    }}
                    numberOfLines={1}
                  >
                    {item.title}
                  </Text>
                  {!item.is_read ? (
                    <View style={[styles.unreadDot, { backgroundColor: theme.coral }]} />
                  ) : null}
                </View>
                <Text
                  style={{
                    color: theme.textSecondary,
                    fontFamily: theme.font('400'),
                    fontSize: theme.sp(12.5),
                    lineHeight: 17,
                  }}
                >
                  {item.message}
                </Text>
                <Text
                  style={{
                    color: theme.textMuted,
                    fontFamily: theme.font('600'),
                    fontSize: theme.sp(10.5),
                  }}
                >
                  {formatDistanceToNow(new Date(item.created_at), {
                    addSuffix: true,
                    locale: es,
                  })}
                </Text>
              </View>
              <Pressable
                onPress={() => deleteNotification(item.id)}
                hitSlop={8}
                style={{ padding: 6 }}
              >
                <Trash2 size={16} color={theme.textMuted} />
              </Pressable>
            </Pressable>
          );
        }}
      />

      <PremiumBottomSheet
        open={prefsOpen}
        onClose={() => setPrefsOpen(false)}
        title="Preferencias de alertas"
        subtitle="Desactiva una categoría si prefieres silenciarla"
      >
        <View style={{ gap: 10, paddingBottom: 8 }}>
          {ALERT_PREFS.map((pref) => {
            const isEnabled = !mutedAlertTypes.includes(pref.key);
            return (
              <View
                key={pref.key}
                style={[
                  styles.prefRow,
                  { backgroundColor: theme.muted, borderColor: theme.border },
                ]}
              >
                <View style={{ flex: 1, gap: 2 }}>
                  <Text style={{ color: theme.text, fontFamily: theme.font('800'), fontSize: 13 }}>
                    {pref.title}
                  </Text>
                  <Text style={{ color: theme.textSecondary, fontFamily: theme.font('500'), fontSize: 11.5 }}>
                    {pref.desc}
                  </Text>
                </View>
                <Switch
                  value={isEnabled}
                  onValueChange={() => {
                    triggerHaptic('selection');
                    toggleMutedAlertType(pref.key);
                  }}
                  trackColor={{ false: theme.border, true: theme.brand }}
                />
              </View>
            );
          })}
        </View>
      </PremiumBottomSheet>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  heroBtn: {
    width: 38,
    height: 38,
    borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.16)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  list: {
    padding: 16,
    gap: 10,
    paddingBottom: 40,
  },
  itemCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    padding: 14,
    borderRadius: 20,
    borderWidth: 1,
  },
  iconBox: {
    width: 40,
    height: 40,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 99,
  },
  prefRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    padding: 13,
    borderRadius: 16,
    borderWidth: 1,
  },
});
