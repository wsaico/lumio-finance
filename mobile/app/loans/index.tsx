import React, { useMemo, useState } from 'react';
import { Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import {
  AlertTriangle,
  ArrowDownLeft,
  ArrowUpRight,
  Calendar,
  CheckCircle2,
  HandCoins,
  Plus,
  TrendingDown,
  User,
} from 'lucide-react-native';
import { useAppTheme } from '@/theme/ThemeProvider';
import { TopAppHeader } from '@/components/navigation/TopAppHeader';
import { CurvedHeroHeader } from '@/components/ui/CurvedHeroHeader';
import { PremiumCard } from '@/components/ui/PremiumCard';
import { AnimatedNumber } from '@/components/ui/AnimatedNumber';
import { SegmentedControl } from '@/components/ui/SegmentedControl';
import { EmptyStateCard } from '@/components/ui/EmptyStateCard';
import { ShimmerSkeleton } from '@/components/ui/ShimmerSkeleton';
import { PremiumPreviewGate } from '@/components/ui/PremiumPreviewGate';
import { CreateLoanModal } from '@/components/loans/CreateLoanModal';
import { LoanPaymentModal } from '@/components/loans/LoanPaymentModal';
import { LoanDetailModal } from '@/components/loans/LoanDetailModal';
import { DebtPayoffPlannerSheet } from '@/components/loans/DebtPayoffPlannerSheet';
import { useAccountsPayable, useAccountsReceivable } from '@/hooks/useLoans';
import { useAccounts } from '@/hooks/useAccounts';
import { useExchangeRates } from '@/hooks/useExchangeRates';
import { useFormat } from '@/hooks/useFormat';
import { useManualRefresh } from '@/hooks/useManualRefresh';
import { alphaHex } from '@/lib/color-math';
import { computeDaysUntilDue } from '@/lib/peru-insights';
import { triggerHaptic } from '@/lib/haptics';
import type { AccountPayable, AccountReceivable } from '@/types/loans';

const STATUS_FILTERS = [
  { id: 'ALL', label: 'Todos' },
  { id: 'PENDING', label: 'Pendientes' },
  { id: 'PARTIAL', label: 'Parciales' },
  { id: 'OVERDUE', label: 'Vencidos' },
  { id: 'SETTLED', label: 'Liquidados' },
] as const;

export default function LoansScreen() {
  const theme = useAppTheme();
  const { formatMaskedMoney, baseCurrency, isBalanceVisible } = useFormat();
  const { convert } = useExchangeRates();

  const [tab, setTab] = useState<'RECEIVABLE' | 'PAYABLE'>('RECEIVABLE');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [createOpen, setCreateOpen] = useState(false);
  const [plannerOpen, setPlannerOpen] = useState(false);
  const [paymentTarget, setPaymentTarget] = useState<AccountReceivable | AccountPayable | null>(null);
  const [detailTarget, setDetailTarget] = useState<AccountReceivable | AccountPayable | null>(null);

  const recQuery = useAccountsReceivable();
  const payQuery = useAccountsPayable();
  const { accounts } = useAccounts();

  const recList = recQuery.data || [];
  const payList = payQuery.data || [];

  const activeDebtsCount = useMemo(() => {
    const activeLoans = payList.filter(
      (p) =>
        !(p.metadata as any)?.isCreditCardMirror &&
        p.status !== 'PAID' &&
        p.status !== 'CANCELLED' &&
        Number(p.outstandingBalance || 0) > 0
    ).length;
    const activeCards = accounts.filter(
      (a) => a.accountType === 'CREDIT_CARD' && Number(a.usedBalance || 0) > 0
    ).length;
    return activeLoans + activeCards;
  }, [payList, accounts]);

  const totals = useMemo(() => {
    const sumOutstanding = (list: (AccountReceivable | AccountPayable)[]) =>
      list.reduce((acc, item) => {
        if (item.status === 'COLLECTED' || item.status === 'PAID' || item.status === 'CANCELLED') {
          return acc;
        }
        return acc + convert(Number(item.outstandingBalance) || 0, item.currencyCode || baseCurrency, baseCurrency);
      }, 0);

    const receivable = sumOutstanding(recList);
    const payable = sumOutstanding(payList);
    return {
      receivable,
      payable,
      net: receivable - payable,
    };
  }, [recList, payList, baseCurrency, convert]);

  const activeList = useMemo(() => {
    const raw = tab === 'RECEIVABLE' ? recList : payList;
    if (statusFilter === 'ALL') return raw;
    if (statusFilter === 'SETTLED') {
      return raw.filter((l) => l.status === 'COLLECTED' || l.status === 'PAID');
    }
    return raw.filter((l) => l.status === statusFilter);
  }, [tab, recList, payList, statusFilter]);

  const isLoading = recQuery.isLoading || payQuery.isLoading;
  const { refreshing: manualRefreshing, onRefresh: handleManualRefresh } = useManualRefresh(() =>
    Promise.all([recQuery.refetch(), payQuery.refetch()])
  );

  return (
    <View style={[styles.screen, { backgroundColor: theme.bg }]}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scroll}
        refreshControl={
          <RefreshControl
            refreshing={manualRefreshing}
            onRefresh={handleManualRefresh}
            tintColor={theme.brand}
          />
        }
      >
        <CurvedHeroHeader>
          <TopAppHeader
            title="Préstamos y Deudas"
            subtitle="Control de cobros y obligaciones"
            showBack
            onHero
            rightSlot={
              <Pressable
                onPress={() => {
                  triggerHaptic('medium');
                  setCreateOpen(true);
                }}
                style={[styles.addBtn, { backgroundColor: theme.coral }]}
              >
                <Plus size={18} color="#FFFFFF" strokeWidth={2.5} />
              </Pressable>
            }
          />

          <View style={styles.heroCenter}>
            <Text style={{ color: 'rgba(255,255,255,0.75)', fontFamily: theme.font('600'), fontSize: theme.sp(12) }}>
              Balance neto de préstamos
            </Text>
            <AnimatedNumber
              value={totals.net}
              currencyCode={baseCurrency}
              hidden={!isBalanceVisible}
              style={{ color: '#FFFFFF', fontFamily: theme.font('800'), fontSize: theme.sp(30) }}
            />

            <View style={styles.heroDuo}>
              <View style={styles.heroMiniBox}>
                <View style={styles.heroMiniHead}>
                  <ArrowDownLeft size={13} color="#34D399" />
                  <Text style={styles.heroMiniLbl}>Por Cobrar</Text>
                </View>
                <Text style={[styles.heroMiniVal, { fontFamily: theme.font('800') }]}>
                  {formatMaskedMoney(totals.receivable)}
                </Text>
              </View>
              <View style={styles.heroMiniBox}>
                <View style={styles.heroMiniHead}>
                  <ArrowUpRight size={13} color="#FFB085" />
                  <Text style={styles.heroMiniLbl}>Por Pagar</Text>
                </View>
                <Text style={[styles.heroMiniVal, { fontFamily: theme.font('800') }]}>
                  {formatMaskedMoney(totals.payable)}
                </Text>
              </View>
            </View>
          </View>
        </CurvedHeroHeader>

        <PremiumPreviewGate moduleName="Préstamos y Deudas">
          <View style={styles.body}>
            {(tab === 'PAYABLE' || activeDebtsCount > 0) && (
              <Pressable
                onPress={() => {
                  triggerHaptic('selection');
                  setPlannerOpen(true);
                }}
              >
                <PremiumCard padding={14} style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                  <View
                    style={[
                      styles.avatar,
                      {
                        backgroundColor: alphaHex(theme.brand, 0.14),
                        borderRadius: theme.iconRadius,
                      },
                    ]}
                  >
                    <TrendingDown size={19} color={theme.brand} />
                  </View>
                  <View style={{ flex: 1, gap: 2 }}>
                    <Text style={{ color: theme.text, fontFamily: theme.font('800'), fontSize: theme.sp(13.5) }}>
                      Plan para salir de deudas
                    </Text>
                    <Text style={{ color: theme.textSecondary, fontFamily: theme.font('500'), fontSize: 11.5 }}>
                      Compara Avalancha vs Bola de Nieve{activeDebtsCount > 0 ? ` (${activeDebtsCount} activas)` : ''}
                    </Text>
                  </View>
                  <View style={[styles.statusPill, { backgroundColor: theme.brandSoft, paddingHorizontal: 10, paddingVertical: 5 }]}>
                    <Text style={{ color: theme.brand, fontFamily: theme.font('800'), fontSize: 11 }}>
                      Simular
                    </Text>
                  </View>
                </PremiumCard>
              </Pressable>
            )}

            <SegmentedControl
              value={tab}
              onChange={(v) => {
                triggerHaptic('selection');
                setTab(v);
              }}
              options={[
                { id: 'RECEIVABLE', label: `Por Cobrar (${recList.length})` },
                { id: 'PAYABLE', label: `Por Pagar (${payList.length})` },
              ]}
            />

            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipRow}>
              {STATUS_FILTERS.map((s) => {
                const active = statusFilter === s.id;
                return (
                  <Pressable
                    key={s.id}
                    onPress={() => setStatusFilter(s.id)}
                    style={[
                      styles.filterChip,
                      {
                        backgroundColor: active ? theme.brand : theme.card,
                        borderColor: active ? theme.brand : theme.border,
                      },
                    ]}
                  >
                    <Text style={{ color: active ? '#FFFFFF' : theme.textSecondary, fontFamily: theme.font('700'), fontSize: theme.sp(11.5) }}>
                      {s.label}
                    </Text>
                  </Pressable>
                );
              })}
            </ScrollView>

            {isLoading ? (
              <View style={{ gap: 12 }}>
                <ShimmerSkeleton height={124} borderRadius={22} />
                <ShimmerSkeleton height={124} borderRadius={22} />
              </View>
            ) : activeList.length === 0 ? (
              <EmptyStateCard
                icon={<HandCoins size={28} color={theme.brand} />}
                title={tab === 'RECEIVABLE' ? 'Sin préstamos por cobrar' : 'Sin deudas por pagar'}
                description="Registra tus préstamos otorgados o recibidos y lleva el control de cada amortización."
                actionLabel={tab === 'RECEIVABLE' ? 'Registrar préstamo' : 'Registrar deuda'}
                onAction={() => setCreateOpen(true)}
              />
            ) : (
              <View style={{ gap: 12 }}>
                {activeList.map((loan) => {
                  const original = Number(loan.originalAmount) || 0;
                  const outstanding = Number(loan.outstandingBalance) || 0;
                  const pct = original > 0 ? Math.min(100, Math.round(((original - outstanding) / original) * 100)) : 0;
                  const isSettled = loan.status === 'COLLECTED' || loan.status === 'PAID' || outstanding <= 0;
                  const daysLeft = !isSettled ? computeDaysUntilDue(loan.dueDate) : null;
                  const isOverdue = loan.status === 'OVERDUE' || (daysLeft !== null && daysLeft < 0);
                  const isDueSoon = daysLeft !== null && daysLeft >= 0 && daysLeft <= 7;
                  const dueReminderText =
                    daysLeft === null
                      ? null
                      : daysLeft < 0
                        ? `Vencido hace ${Math.abs(daysLeft)}d`
                        : daysLeft === 0
                          ? 'Vence hoy'
                          : daysLeft === 1
                            ? 'Vence mañana'
                            : isDueSoon
                              ? `Vence en ${daysLeft}d`
                              : null;
                  const accent =
                    isSettled
                      ? theme.income
                      : isOverdue
                        ? theme.expense
                        : tab === 'RECEIVABLE'
                          ? theme.brand
                          : theme.coral;

                  return (
                    <Pressable key={loan.id} onPress={() => setDetailTarget(loan)}>
                      <PremiumCard padding={16} style={{ gap: 12 }}>
                        <View style={styles.loanTop}>
                          <View style={[styles.avatar, { backgroundColor: alphaHex(accent, 0.14), borderRadius: theme.iconRadius }]}>
                            <User size={19} color={accent} />
                          </View>

                          <View style={{ flex: 1 }}>
                            <Text numberOfLines={1} style={{ color: theme.text, fontFamily: theme.font('800'), fontSize: theme.sp(15) }}>
                              {loan.contactName}
                            </Text>
                            <View style={[styles.metaLine, { flexWrap: 'wrap' }]}>
                              {loan.dueDate ? (
                                <View style={styles.dueBadge}>
                                  <Calendar size={11} color={isOverdue ? theme.expense : theme.textMuted} />
                                  <Text
                                    style={{
                                      color: isOverdue ? theme.expense : theme.textMuted,
                                      fontFamily: theme.font('600'),
                                      fontSize: theme.sp(11),
                                    }}
                                  >
                                    {format(new Date(loan.dueDate), 'd MMM yyyy', { locale: es })}
                                  </Text>
                                </View>
                              ) : null}
                              <View style={[styles.statusPill, { backgroundColor: alphaHex(accent, 0.14) }]}>
                                <Text style={{ color: accent, fontFamily: theme.font('800'), fontSize: 10 }}>
                                  {isSettled ? 'LIQUIDADO' : isOverdue ? 'VENCIDO' : loan.status === 'PARTIAL' ? 'PARCIAL' : 'PENDIENTE'}
                                </Text>
                              </View>
                              {dueReminderText ? (
                                <View
                                  style={[
                                    styles.dueBadge,
                                    styles.statusPill,
                                    {
                                      backgroundColor: isOverdue
                                        ? theme.expenseSoft
                                        : theme.warningSoft,
                                    },
                                  ]}
                                >
                                  <AlertTriangle
                                    size={10}
                                    color={isOverdue ? theme.expense : theme.warning}
                                  />
                                  <Text
                                    style={{
                                      color: isOverdue ? theme.expense : theme.warning,
                                      fontFamily: theme.font('800'),
                                      fontSize: 10,
                                    }}
                                  >
                                    {dueReminderText}
                                  </Text>
                                </View>
                              ) : null}
                            </View>
                          </View>

                          <View style={{ alignItems: 'flex-end' }}>
                            <Text style={{ color: accent, fontFamily: theme.font('800'), fontSize: theme.sp(15.5), fontVariant: ['tabular-nums'] }}>
                              {formatMaskedMoney(outstanding, loan.currencyCode)}
                            </Text>
                            <Text style={{ color: theme.textMuted, fontFamily: theme.font('500'), fontSize: theme.sp(11), fontVariant: ['tabular-nums'] }}>
                              de {formatMaskedMoney(original, loan.currencyCode)}
                            </Text>
                          </View>
                        </View>

                        <View style={[styles.track, { backgroundColor: theme.muted }]}>
                          <View style={{ width: `${pct}%`, height: '100%', backgroundColor: accent, borderRadius: 999 }} />
                        </View>

                        <View style={styles.loanBottom}>
                          <Text style={{ color: theme.textSecondary, fontFamily: theme.font('600'), fontSize: theme.sp(11.5) }}>
                            {pct}% {tab === 'RECEIVABLE' ? 'recuperado' : 'amortizado'}
                          </Text>
                          {!isSettled && (
                            <Pressable
                              onPress={(e) => {
                                e.stopPropagation?.();
                                triggerHaptic('medium');
                                setPaymentTarget(loan);
                              }}
                              style={[styles.payBtn, { backgroundColor: accent }]}
                            >
                              <CheckCircle2 size={13} color="#FFFFFF" />
                              <Text style={{ color: '#FFFFFF', fontFamily: theme.font('800'), fontSize: theme.sp(11.5) }}>
                                {tab === 'RECEIVABLE' ? 'Registrar cobro' : 'Registrar pago'}
                              </Text>
                            </Pressable>
                          )}
                        </View>
                      </PremiumCard>
                    </Pressable>
                  );
                })}
              </View>
            )}
          </View>
        </PremiumPreviewGate>
      </ScrollView>

      <CreateLoanModal open={createOpen} onOpenChange={setCreateOpen} defaultType={tab} />
      <LoanPaymentModal
        open={Boolean(paymentTarget)}
        onOpenChange={(v) => !v && setPaymentTarget(null)}
        loan={paymentTarget}
        mode={tab}
      />
      <LoanDetailModal
        open={Boolean(detailTarget)}
        onOpenChange={(v) => !v && setDetailTarget(null)}
        loan={detailTarget}
        mode={tab}
        onRegisterPayment={() => {
          if (detailTarget) setPaymentTarget(detailTarget);
        }}
      />
      <DebtPayoffPlannerSheet open={plannerOpen} onOpenChange={setPlannerOpen} />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  scroll: { paddingBottom: 42 },
  addBtn: { width: 38, height: 38, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  heroCenter: { marginTop: 14, gap: 6 },
  heroDuo: { flexDirection: 'row', gap: 10, marginTop: 8 },
  heroMiniBox: {
    flex: 1,
    backgroundColor: 'rgba(255,255,255,0.14)',
    borderRadius: 16,
    padding: 11,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.18)',
    gap: 2,
  },
  heroMiniHead: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  heroMiniLbl: { color: 'rgba(255,255,255,0.78)', fontSize: 11, fontWeight: '600' },
  heroMiniVal: { color: '#FFFFFF', fontSize: 15, fontVariant: ['tabular-nums'] },
  body: { padding: 16, gap: 14 },
  chipRow: { gap: 8 },
  filterChip: { paddingHorizontal: 13, paddingVertical: 8, borderRadius: 999, borderWidth: 1 },
  loanTop: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  avatar: { width: 42, height: 42, alignItems: 'center', justifyContent: 'center' },
  metaLine: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 3 },
  dueBadge: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  statusPill: { paddingHorizontal: 7, paddingVertical: 2, borderRadius: 999 },
  track: { height: 7, borderRadius: 999, overflow: 'hidden' },
  loanBottom: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  payBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 12,
  },
});
