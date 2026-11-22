import React, { useMemo, useState } from 'react';
import {
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useRouter } from 'expo-router';
import {
  Calendar,
  Check,
  Clock,
  FastForward,
  Plus,
  Repeat,
  SkipForward,
  Sparkles,
  Trash2,
} from 'lucide-react-native';
import { format, isToday, isTomorrow, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';
import { useAppTheme } from '@/theme/ThemeProvider';
import { TopAppHeader } from '@/components/navigation/TopAppHeader';
import { CurvedHeroHeader } from '@/components/ui/CurvedHeroHeader';
import { PremiumCard } from '@/components/ui/PremiumCard';
import { AnimatedNumber } from '@/components/ui/AnimatedNumber';
import { SegmentedControl } from '@/components/ui/SegmentedControl';
import { CategoryIcon } from '@/components/ui/CategoryIcon';
import { EmptyStateCard } from '@/components/ui/EmptyStateCard';
import { ShimmerSkeleton } from '@/components/ui/ShimmerSkeleton';
import { ConfirmAlertModal } from '@/components/alerts/ConfirmAlertModal';
import { useSubscriptions, type ScheduledItem } from '@/hooks/useSubscriptions';
import { useExchangeRates } from '@/hooks/useExchangeRates';
import { useFormat } from '@/hooks/useFormat';
import { alphaHex } from '@/lib/color-math';
import { triggerHaptic } from '@/lib/haptics';

type FilterTab = 'ALL' | 'SUBSCRIPTION' | 'UPCOMING';

export default function SubscriptionsScreen() {
  const theme = useAppTheme();
  const router = useRouter();
  const { formatMaskedMoney, baseCurrency, isBalanceVisible } = useFormat();
  const { convert } = useExchangeRates();
  const { items, isLoading, refetch, executeAction } = useSubscriptions();

  const [filter, setFilter] = useState<FilterTab>('ALL');
  const [confirmState, setConfirmState] = useState<{
    action: 'pay' | 'skip' | 'delete';
    item: ScheduledItem;
  } | null>(null);

  const filtered = useMemo(() => {
    if (filter === 'ALL') return items;
    if (filter === 'SUBSCRIPTION') {
      return items.filter((i) => i.mode === 'SUBSCRIPTION' || i.mode === 'RECURRING');
    }
    return items.filter((i) => i.mode === 'UPCOMING');
  }, [items, filter]);

  const metrics = useMemo(() => {
    let monthlyTotal = 0;
    let totalUpcoming = 0;
    for (const item of items) {
      if (item.transactionType !== 'EXPENSE') continue;
      monthlyTotal += convert(Number(item.monthlyEquivalent) || 0, item.currencyCode || baseCurrency, baseCurrency);
      totalUpcoming += convert(Number(item.amount) || 0, item.currencyCode || baseCurrency, baseCurrency);
    }
    return {
      monthlyTotal,
      annualProjection: monthlyTotal * 12,
      totalUpcoming,
    };
  }, [items, convert, baseCurrency]);

  const groupedByDate = useMemo(() => {
    const map = new Map<string, ScheduledItem[]>();
    const sorted = [...filtered].sort(
      (a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime()
    );
    for (const item of sorted) {
      const key = item.dueDate ? item.dueDate.slice(0, 10) : 'Sin fecha';
      const arr = map.get(key) || [];
      arr.push(item);
      map.set(key, arr);
    }
    return Array.from(map.entries());
  }, [filtered]);

  const formatDateHeading = (isoDate: string) => {
    try {
      const d = parseISO(isoDate);
      if (isToday(d)) return 'Hoy · Vence hoy';
      if (isTomorrow(d)) return 'Mañana';
      return format(d, "EEEE d 'de' MMMM", { locale: es });
    } catch {
      return isoDate;
    }
  };

  return (
    <View style={[styles.screen, { backgroundColor: theme.bg }]}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scroll}
        refreshControl={<RefreshControl refreshing={isLoading} onRefresh={() => { void refetch(); }} tintColor={theme.brand} />}
      >
        <CurvedHeroHeader>
          <TopAppHeader
            title="Suscripciones"
            subtitle="Pagos recurrentes y próximos"
            showBack
            onHero
            rightSlot={
              <Pressable
                onPress={() => router.push('/transactions/new?type=EXPENSE&mode=SUBSCRIPTION' as any)}
                style={[styles.heroAddBtn, { backgroundColor: theme.coral }]}
              >
                <Plus size={18} color="#FFFFFF" strokeWidth={2.5} />
              </Pressable>
            }
          />

          <View style={styles.heroStats}>
            <View style={{ flex: 1 }}>
              <Text style={{ color: 'rgba(255,255,255,0.72)', fontFamily: theme.font('600'), fontSize: theme.sp(12) }}>
                Carga mensual estimada
              </Text>
              <AnimatedNumber
                value={metrics.monthlyTotal}
                currencyCode={baseCurrency}
                hidden={!isBalanceVisible}
                style={{ color: '#FFFFFF', fontFamily: theme.font('800'), fontSize: theme.sp(30) }}
              />
            </View>
            <View style={styles.heroBadges}>
              <View style={styles.heroMiniPill}>
                <Text style={{ color: 'rgba(255,255,255,0.72)', fontFamily: theme.font('600'), fontSize: theme.sp(10) }}>
                  Proyección anual
                </Text>
                <Text style={{ color: '#FFFFFF', fontFamily: theme.font('800'), fontSize: theme.sp(13), fontVariant: ['tabular-nums'] }}>
                  {formatMaskedMoney(metrics.annualProjection)}
                </Text>
              </View>
            </View>
          </View>
        </CurvedHeroHeader>

        <View style={styles.body}>
          <SegmentedControl
            value={filter}
            onChange={setFilter}
            options={[
              { id: 'ALL', label: `Todos (${items.length})` },
              { id: 'SUBSCRIPTION', label: 'Recurrentes' },
              { id: 'UPCOMING', label: 'Programados' },
            ]}
          />

          {isLoading ? (
            <View style={{ gap: 12 }}>
              <ShimmerSkeleton height={110} borderRadius={22} />
              <ShimmerSkeleton height={110} borderRadius={22} />
            </View>
          ) : groupedByDate.length === 0 ? (
            <EmptyStateCard
              icon={<Repeat size={28} color={theme.brand} />}
              title="Sin suscripciones o pagos programados"
              description="Al registrar un movimiento puedes programar frecuencia mensual, semanal o suscripción automática."
              actionLabel="Programar pago"
              onAction={() => router.push('/transactions/new?type=EXPENSE&mode=SUBSCRIPTION' as any)}
            />
          ) : (
            <View style={{ gap: 18 }}>
              {groupedByDate.map(([dateKey, dayItems]) => (
                <View key={dateKey} style={{ gap: 10 }}>
                  <View style={styles.dateHeader}>
                    <Calendar size={13} color={theme.brand} />
                    <Text
                      style={{
                        color: theme.textSecondary,
                        fontFamily: theme.font('700'),
                        fontSize: theme.sp(12),
                        textTransform: 'capitalize',
                      }}
                    >
                      {formatDateHeading(dateKey)}
                    </Text>
                  </View>

                  {dayItems.map((item) => {
                    const isIncome = item.transactionType === 'INCOME';
                    const accent = item.categoryColor || (isIncome ? theme.income : theme.brand);
                    const dueMs = new Date(item.dueDate).getTime();
                    const overdue = dueMs < Date.now() - 86400000;

                    return (
                      <PremiumCard key={`${item.source}-${item.id}`} padding={16} style={styles.itemCard}>
                        <View style={styles.itemTop}>
                          <View
                            style={[
                              styles.itemIcon,
                              {
                                backgroundColor: alphaHex(accent, 0.14),
                                borderRadius: theme.iconRadius,
                              },
                            ]}
                          >
                            <CategoryIcon name={item.categoryIcon || 'repeat'} size={20} color={accent} />
                          </View>

                          <View style={{ flex: 1 }}>
                            <Text
                              numberOfLines={1}
                              style={{ color: theme.text, fontFamily: theme.font('800'), fontSize: theme.sp(15) }}
                            >
                              {item.title}
                            </Text>
                            <View style={styles.metaRow}>
                              <Text style={{ color: theme.textMuted, fontFamily: theme.font('600'), fontSize: theme.sp(11.5) }}>
                                {item.accountName} · {item.frequency}
                              </Text>
                              {item.executionMethod === 'AUTO' ? (
                                <View style={[styles.autoPill, { backgroundColor: alphaHex(theme.income, 0.14) }]}>
                                  <Sparkles size={10} color={theme.income} />
                                  <Text style={{ color: theme.income, fontFamily: theme.font('700'), fontSize: 10 }}>
                                    AUTO
                                  </Text>
                                </View>
                              ) : (
                                <View
                                  style={[
                                    styles.autoPill,
                                    { backgroundColor: alphaHex(overdue ? theme.expense : theme.coral, 0.14) },
                                  ]}
                                >
                                  <Clock size={10} color={overdue ? theme.expense : theme.coral} />
                                  <Text
                                    style={{
                                      color: overdue ? theme.expense : theme.coral,
                                      fontFamily: theme.font('700'),
                                      fontSize: 10,
                                    }}
                                  >
                                    {overdue ? 'VENCIDO' : 'MANUAL'}
                                  </Text>
                                </View>
                              )}
                            </View>
                          </View>

                          <Text
                            style={{
                              color: isIncome ? theme.income : theme.text,
                              fontFamily: theme.font('800'),
                              fontSize: theme.sp(15.5),
                              fontVariant: ['tabular-nums'],
                            }}
                          >
                            {isIncome ? '+' : '-'}
                            {formatMaskedMoney(item.amount, item.currencyCode)}
                          </Text>
                        </View>

                        <View style={styles.actionRow}>
                          <Pressable
                            onPress={() => {
                              triggerHaptic('medium');
                              setConfirmState({ action: 'pay', item });
                            }}
                            style={[styles.actionBtn, { backgroundColor: theme.brand, flex: 1.4 }]}
                          >
                            <Check size={14} color="#FFFFFF" strokeWidth={2.5} />
                            <Text style={{ color: '#FFFFFF', fontFamily: theme.font('700'), fontSize: theme.sp(12) }}>
                              {isIncome ? '¿Depositar?' : '¿Pagar?'}
                            </Text>
                          </Pressable>

                          <Pressable
                            onPress={() => {
                              triggerHaptic('light');
                              setConfirmState({ action: 'skip', item });
                            }}
                            style={[
                              styles.actionBtn,
                              { backgroundColor: theme.muted, borderColor: theme.border, borderWidth: 1, flex: 1 },
                            ]}
                          >
                            <SkipForward size={14} color={theme.textSecondary} />
                            <Text style={{ color: theme.textSecondary, fontFamily: theme.font('700'), fontSize: theme.sp(12) }}>
                              Omitir
                            </Text>
                          </Pressable>

                          <Pressable
                            onPress={() => {
                              triggerHaptic('warning');
                              setConfirmState({ action: 'delete', item });
                            }}
                            style={[styles.iconActionBtn, { backgroundColor: alphaHex(theme.expense, 0.12) }]}
                          >
                            <Trash2 size={15} color={theme.expense} />
                          </Pressable>
                        </View>
                      </PremiumCard>
                    );
                  })}
                </View>
              ))}
            </View>
          )}
        </View>
      </ScrollView>

      <ConfirmAlertModal
        open={Boolean(confirmState)}
        onOpenChange={(v) => !v && setConfirmState(null)}
        variant={
          confirmState?.action === 'delete'
            ? 'danger'
            : confirmState?.action === 'skip'
              ? 'warning'
              : 'success'
        }
        title={
          confirmState?.action === 'pay'
            ? confirmState.item.transactionType === 'INCOME'
              ? 'Confirmar depósito programado'
              : 'Confirmar pago programado'
            : confirmState?.action === 'skip'
              ? 'Omitir este ciclo'
              : 'Eliminar programación'
        }
        description={
          confirmState
            ? confirmState.action === 'pay'
              ? `Se registrará "${confirmState.item.title}" por ${formatMaskedMoney(
                  confirmState.item.amount,
                  confirmState.item.currencyCode
                )} en ${confirmState.item.accountName}.`
              : confirmState.action === 'skip'
                ? `Se saltará la fecha actual de "${confirmState.item.title}" y avanzará al siguiente ciclo.`
                : `Se detendrá y eliminará "${confirmState.item.title}" de tus próximos pagos.`
            : ''
        }
        confirmLabel={
          confirmState?.action === 'pay'
            ? 'Confirmar ahora'
            : confirmState?.action === 'skip'
              ? 'Omitir ciclo'
              : 'Eliminar'
        }
        isLoading={executeAction.isPending}
        onConfirm={async () => {
          if (!confirmState) return;
          await executeAction.mutateAsync({
            action: confirmState.action,
            id: confirmState.item.id,
            source: confirmState.item.source,
          });
          setConfirmState(null);
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  scroll: { paddingBottom: 42 },
  heroAddBtn: {
    width: 38,
    height: 38,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroStats: { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', marginTop: 12, gap: 10 },
  heroBadges: { alignItems: 'flex-end' },
  heroMiniPill: {
    backgroundColor: 'rgba(255,255,255,0.14)',
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.18)',
  },
  body: { padding: 16, gap: 14 },
  dateHeader: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 4 },
  itemCard: { gap: 12 },
  itemTop: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  itemIcon: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 2, flexWrap: 'wrap' },
  autoPill: { flexDirection: 'row', alignItems: 'center', gap: 3, paddingHorizontal: 7, paddingVertical: 2, borderRadius: 999 },
  actionRow: { flexDirection: 'row', gap: 8, alignItems: 'center' },
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    height: 38,
    borderRadius: 13,
  },
  iconActionBtn: {
    width: 38,
    height: 38,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
