import React, { useEffect, useMemo, useState } from 'react';
import { Pressable, RefreshControl, ScrollView, StyleSheet, Switch, Text, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import {
  ArrowUpRight,
  Calendar,
  CheckCircle2,
  Edit3,
  Flame,
  PiggyBank,
  Plus,
  RefreshCw,
  Shield,
  Sparkles,
  Trash2,
} from 'lucide-react-native';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { useAppTheme } from '@/theme/ThemeProvider';
import { TopAppHeader } from '@/components/navigation/TopAppHeader';
import { CurvedHeroHeader } from '@/components/ui/CurvedHeroHeader';
import { PremiumCard } from '@/components/ui/PremiumCard';
import { AnimatedNumber } from '@/components/ui/AnimatedNumber';
import { CircularProgressRing } from '@/components/ui/CircularProgressRing';
import { SegmentedControl } from '@/components/ui/SegmentedControl';
import { CategoryIcon } from '@/components/ui/CategoryIcon';
import { EmptyStateCard } from '@/components/ui/EmptyStateCard';
import { ShimmerSkeleton } from '@/components/ui/ShimmerSkeleton';
import { PremiumPreviewGate } from '@/components/ui/PremiumPreviewGate';
import { ConfirmAlertModal } from '@/components/alerts/ConfirmAlertModal';
import { GoalFormModal, type GoalFormPreset } from '@/components/savings-goals/GoalFormModal';
import { ContributeModal } from '@/components/savings-goals/ContributeModal';
import { WithdrawModal } from '@/components/savings-goals/WithdrawModal';
import { ExtraIncomeAssistantModal } from '@/components/savings-goals/ExtraIncomeAssistantModal';
import {
  useDeleteSavingsGoal,
  useSavingsGoals,
  useSavingsGoalsAnalytics,
  useSyncSavingsGoal,
  type SavingsGoal,
} from '@/hooks/useSavingsGoals';
import { useDashboardData } from '@/hooks/useDashboardData';
import { useExchangeRates } from '@/hooks/useExchangeRates';
import { useFormat } from '@/hooks/useFormat';
import { useSettingsStore } from '@/stores/settings-store';
import { alphaHex } from '@/lib/color-math';
import { triggerHaptic } from '@/lib/haptics';

const PAY_FIRST_PCTS = [5, 10, 15, 20];

export default function SavingsGoalsScreen() {
  const theme = useAppTheme();
  const router = useRouter();
  const params = useLocalSearchParams<{ extraIncome?: string; label?: string }>();
  const { formatMaskedMoney, baseCurrency, isBalanceVisible } = useFormat();
  const { convert } = useExchangeRates();
  const goalTotalType = useSettingsStore((s) => s.goalTotalType);
  const payYourselfFirstEnabled = useSettingsStore((s) => s.payYourselfFirstEnabled);
  const setPayYourselfFirstEnabled = useSettingsStore((s) => s.setPayYourselfFirstEnabled);
  const payYourselfFirstPct = useSettingsStore((s) => s.payYourselfFirstPct);
  const setPayYourselfFirstPct = useSettingsStore((s) => s.setPayYourselfFirstPct);
  const payYourselfFirstGoalId = useSettingsStore((s) => s.payYourselfFirstGoalId);
  const setPayYourselfFirstGoalId = useSettingsStore((s) => s.setPayYourselfFirstGoalId);

  const [statusTab, setStatusTab] = useState<'ALL' | 'ACTIVE' | 'COMPLETED'>('ALL');
  const [formOpen, setFormOpen] = useState(false);
  const [formPreset, setFormPreset] = useState<GoalFormPreset | null>(null);
  const [editingGoal, setEditingGoal] = useState<SavingsGoal | null>(null);
  const [contributeGoal, setContributeGoal] = useState<SavingsGoal | null>(null);
  const [withdrawGoal, setWithdrawGoal] = useState<SavingsGoal | null>(null);
  const [deleteGoalTarget, setDeleteGoalTarget] = useState<SavingsGoal | null>(null);
  const [assistantOpen, setAssistantOpen] = useState(false);

  const goalsQuery = useSavingsGoals(statusTab === 'ALL' ? undefined : statusTab);
  const analyticsQuery = useSavingsGoalsAnalytics();
  const { data: dashData } = useDashboardData();
  const deleteGoal = useDeleteSavingsGoal();
  const syncGoal = useSyncSavingsGoal();

  const goals = goalsQuery.data || [];
  const activeGoals = useMemo(
    () => goals.filter((g) => g.status === 'ACTIVE'),
    [goals]
  );

  useEffect(() => {
    if (params.extraIncome && Number(params.extraIncome) > 0) {
      setAssistantOpen(true);
    }
  }, [params.extraIncome]);

  useEffect(() => {
    if (!payYourselfFirstGoalId && activeGoals.length > 0) {
      setPayYourselfFirstGoalId(activeGoals[0].id);
    }
  }, [payYourselfFirstGoalId, activeGoals, setPayYourselfFirstGoalId]);

  const hasEmergencyGoal = useMemo(
    () =>
      goals.some(
        (g) =>
          g.status !== 'CANCELLED' &&
          (g.goal_type === 'EMERGENCY' || /emergencia/i.test(g.name || ''))
      ),
    [goals]
  );

  const suggestedEmergencyTarget = useMemo(() => {
    const hist = dashData?.history || [];
    const expMonths = hist.map((h) => Number(h.expense || 0)).filter((v) => v > 0);
    const avgMonthly =
      expMonths.length > 0
        ? expMonths.reduce((s, v) => s + v, 0) / expMonths.length
        : Number(dashData?.metrics?.totalExpense || 0);
    const base = avgMonthly > 0 ? avgMonthly * 3 : 3000;
    return Math.max(1500, Math.round(base / 100) * 100);
  }, [dashData]);

  const totals = useMemo(() => {
    let saved = 0;
    let target = 0;
    let activeCount = 0;
    let completedCount = 0;
    for (const g of goals) {
      const cur = g.currency || baseCurrency;
      saved += convert(Number(g.current_amount) || 0, cur, baseCurrency);
      target += convert(Number(g.target_amount) || 0, cur, baseCurrency);
      if (g.status === 'COMPLETED') completedCount++;
      else if (g.status === 'ACTIVE') activeCount++;
    }
    return {
      saved: analyticsQuery.data?.totalSaved ?? saved,
      target,
      activeCount: analyticsQuery.data?.activeGoals ?? activeCount,
      completedCount: analyticsQuery.data?.completedGoals ?? completedCount,
      avgProgress: target > 0 ? Math.round((saved / target) * 100) : Math.round(analyticsQuery.data?.avgProgress || 0),
    };
  }, [goals, analyticsQuery.data, baseCurrency, convert]);

  return (
    <View style={[styles.screen, { backgroundColor: theme.bg }]}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scroll}
        refreshControl={
          <RefreshControl
            refreshing={goalsQuery.isLoading}
            onRefresh={() => {
              goalsQuery.refetch();
              analyticsQuery.refetch();
            }}
            tintColor={theme.brand}
          />
        }
      >
        <CurvedHeroHeader>
          <TopAppHeader
            title="Metas de Ahorro"
            subtitle="Construye tu patrimonio paso a paso"
            showBack
            onHero
            rightSlot={
              <Pressable
                onPress={() => {
                  triggerHaptic('medium');
                  setEditingGoal(null);
                  setFormPreset(null);
                  setFormOpen(true);
                }}
                style={[styles.addBtn, { backgroundColor: theme.coral }]}
              >
                <Plus size={18} color="#FFFFFF" strokeWidth={2.5} />
              </Pressable>
            }
          />

          <View style={styles.heroCenter}>
            <CircularProgressRing
              progress={totals.avgProgress}
              size={84}
              strokeWidth={8}
              color={theme.coral}
              trackColor="rgba(255,255,255,0.18)"
              label={`${totals.avgProgress}%`}
              labelColor="#FFFFFF"
            />
            <View style={{ flex: 1 }}>
              <Text style={{ color: 'rgba(255,255,255,0.75)', fontFamily: theme.font('600'), fontSize: theme.sp(12) }}>
                Total ahorrado en metas
              </Text>
              <AnimatedNumber
                value={totals.saved}
                currencyCode={baseCurrency}
                hidden={!isBalanceVisible}
                style={{ color: '#FFFFFF', fontFamily: theme.font('800'), fontSize: theme.sp(28) }}
              />
              <Text style={{ color: 'rgba(255,255,255,0.8)', fontFamily: theme.font('600'), fontSize: theme.sp(12), marginTop: 2 }}>
                {totals.activeCount} activas · {totals.completedCount} completadas
              </Text>
            </View>
          </View>
        </CurvedHeroHeader>

        <PremiumPreviewGate moduleName="Metas de Ahorro">
          <View style={styles.body}>
            <SegmentedControl
              value={statusTab}
              onChange={setStatusTab}
              options={[
                { id: 'ALL', label: 'Todas' },
                { id: 'ACTIVE', label: 'Activas' },
                { id: 'COMPLETED', label: 'Logradas' },
              ]}
            />

            {/* Fondo de emergencia sugerido (3x gastos mensuales) */}
            {!goalsQuery.isLoading && !hasEmergencyGoal ? (
              <PremiumCard padding={14} style={{ gap: 10 }}>
                <View style={styles.titleRow}>
                  <View style={[styles.iconBtn, { backgroundColor: alphaHex(theme.brand, 0.14) }]}>
                    <Shield size={17} color={theme.brand} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={{ color: theme.text, fontFamily: theme.font('800'), fontSize: theme.sp(13.5) }}>
                      Fondo de emergencia sugerido
                    </Text>
                    <Text style={{ color: theme.textSecondary, fontFamily: theme.font('500'), fontSize: 11.5 }}>
                      Meta recomendada (3 meses de gastos): {formatMaskedMoney(suggestedEmergencyTarget)}
                    </Text>
                  </View>
                  <Pressable
                    onPress={() => {
                      triggerHaptic('selection');
                      setEditingGoal(null);
                      setFormPreset({
                        name: 'Fondo de emergencia',
                        goalType: 'EMERGENCY',
                        targetAmount: suggestedEmergencyTarget,
                        priority: 'HIGH',
                        color: '#5B35D5',
                        description: 'Respaldo equivalente a 3 meses de gastos esenciales.',
                      });
                      setFormOpen(true);
                    }}
                    style={[styles.pillBtn, { backgroundColor: theme.brand }]}
                  >
                    <Text style={{ color: '#FFFFFF', fontFamily: theme.font('800'), fontSize: 11.5 }}>
                      Crear fondo
                    </Text>
                  </Pressable>
                </View>
              </PremiumCard>
            ) : null}

            {/* Asistente Grati, CTS e ingresos extra */}
            <Pressable
              onPress={() => {
                triggerHaptic('selection');
                setAssistantOpen(true);
              }}
            >
              <PremiumCard padding={14} style={{ flexDirection: 'row', alignItems: 'center', gap: 11 }}>
                <View style={[styles.iconBtn, { backgroundColor: alphaHex(theme.coral, 0.14) }]}>
                  <Sparkles size={17} color={theme.coral} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={{ color: theme.text, fontFamily: theme.font('800'), fontSize: theme.sp(13.5) }}>
                    Asistente Grati, CTS o Extra
                  </Text>
                  <Text style={{ color: theme.textSecondary, fontFamily: theme.font('500'), fontSize: 11.5 }}>
                    Reparte ingresos extra entre deuda, emergencia y metas
                  </Text>
                </View>
                <View style={[styles.pillBtn, { backgroundColor: alphaHex(theme.coral, 0.14) }]}>
                  <Text style={{ color: theme.coral, fontFamily: theme.font('800'), fontSize: 11 }}>
                    Repartir
                  </Text>
                </View>
              </PremiumCard>
            </Pressable>

            {/* Regla Págate Primero */}
            <PremiumCard padding={14} style={{ gap: 10 }}>
              <View style={styles.titleRow}>
                <View style={[styles.iconBtn, { backgroundColor: alphaHex(theme.income, 0.14) }]}>
                  <PiggyBank size={17} color={theme.income} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={{ color: theme.text, fontFamily: theme.font('800'), fontSize: theme.sp(13.5) }}>
                    Págate primero ({payYourselfFirstPct}%)
                  </Text>
                  <Text style={{ color: theme.textSecondary, fontFamily: theme.font('500'), fontSize: 11 }}>
                    Aparta automáticamente un porcentaje al registrar un ingreso
                  </Text>
                </View>
                <Switch
                  value={payYourselfFirstEnabled}
                  onValueChange={(v) => {
                    triggerHaptic('selection');
                    setPayYourselfFirstEnabled(v);
                  }}
                  trackColor={{ false: theme.border, true: theme.income }}
                />
              </View>

              {payYourselfFirstEnabled ? (
                <View style={{ gap: 8 }}>
                  <View style={{ flexDirection: 'row', gap: 6, flexWrap: 'wrap' }}>
                    {PAY_FIRST_PCTS.map((p) => {
                      const active = payYourselfFirstPct === p;
                      return (
                        <Pressable
                          key={p}
                          onPress={() => setPayYourselfFirstPct(p)}
                          style={[
                            styles.pctChip,
                            {
                              backgroundColor: active ? theme.income : theme.muted,
                              borderColor: active ? theme.income : theme.border,
                            },
                          ]}
                        >
                          <Text style={{ color: active ? '#FFFFFF' : theme.textSecondary, fontFamily: theme.font('800'), fontSize: 11.5 }}>
                            {p}%
                          </Text>
                        </Pressable>
                      );
                    })}
                  </View>

                  {activeGoals.length > 0 ? (
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 7 }}>
                      {activeGoals.map((g) => {
                        const active = payYourselfFirstGoalId === g.id;
                        return (
                          <Pressable
                            key={`pf-${g.id}`}
                            onPress={() => setPayYourselfFirstGoalId(g.id)}
                            style={[
                              styles.pctChip,
                              {
                                backgroundColor: active ? theme.incomeSoft : theme.muted,
                                borderColor: active ? theme.income : theme.border,
                              },
                            ]}
                          >
                            <Text style={{ color: active ? theme.income : theme.textSecondary, fontFamily: theme.font('700'), fontSize: 11.5 }}>
                              {g.name}
                            </Text>
                          </Pressable>
                        );
                      })}
                    </ScrollView>
                  ) : null}
                </View>
              ) : null}
            </PremiumCard>

            {goalsQuery.isLoading ? (
              <View style={{ gap: 12 }}>
                <ShimmerSkeleton height={150} borderRadius={24} />
                <ShimmerSkeleton height={150} borderRadius={24} />
              </View>
            ) : goals.length === 0 ? (
              <EmptyStateCard
                icon={<PiggyBank size={28} color={theme.brand} />}
                title="Sin metas registradas"
                description="Crea una meta de viaje, fondo de emergencia o compra con fecha límite e hitos inteligentes."
                actionLabel="Crear primera meta"
                onAction={() => {
                  setEditingGoal(null);
                  setFormPreset(null);
                  setFormOpen(true);
                }}
              />
            ) : (
              <View style={{ gap: 14 }}>
                {goals.map((g, idx) => {
                  const target = Number(g.target_amount) || 0;
                  const saved = Number(g.current_amount) || 0;
                  const remaining = Math.max(0, target - saved);
                  const pct = target > 0 ? Math.min(100, Math.round((saved / target) * 100)) : 0;
                  const accent = g.color || (idx % 2 === 1 ? theme.coral : theme.brand);
                  const isFeatured = idx === 1 && g.status === 'ACTIVE';

                  return (
                    <Pressable
                      key={g.id}
                      onPress={() => router.push(`/savings-goals/${g.id}` as any)}
                    >
                      <PremiumCard
                        variant={isFeatured ? 'hero-coral' : 'elevated'}
                        padding={18}
                        style={{ gap: 14 }}
                      >
                        <View style={styles.goalTop}>
                          <CircularProgressRing
                            progress={pct}
                            size={64}
                            strokeWidth={6}
                            color={isFeatured ? '#FFFFFF' : accent}
                            trackColor={isFeatured ? 'rgba(255,255,255,0.24)' : alphaHex(accent, 0.16)}
                            label={`${pct}%`}
                            labelColor={isFeatured ? '#FFFFFF' : theme.text}
                          />

                          <View style={{ flex: 1 }}>
                            <View style={styles.titleRow}>
                              <CategoryIcon
                                name={g.icon || 'target'}
                                size={15}
                                color={isFeatured ? '#FFFFFF' : accent}
                              />
                              <Text
                                numberOfLines={1}
                                style={{
                                  flex: 1,
                                  color: isFeatured ? '#FFFFFF' : theme.text,
                                  fontFamily: theme.font('800'),
                                  fontSize: theme.sp(15.5),
                                }}
                              >
                                {g.name}
                              </Text>
                              {g.status === 'COMPLETED' && (
                                <View style={[styles.donePill, { backgroundColor: alphaHex('#10B981', 0.18) }]}>
                                  <CheckCircle2 size={12} color="#10B981" />
                                  <Text style={{ color: '#10B981', fontFamily: theme.font('800'), fontSize: 10 }}>
                                    LOGRADA
                                  </Text>
                                </View>
                              )}
                            </View>

                            <Text
                              style={{
                                color: isFeatured ? 'rgba(255,255,255,0.9)' : theme.textSecondary,
                                fontFamily: theme.font('700'),
                                fontSize: theme.sp(13),
                                fontVariant: ['tabular-nums'],
                                marginTop: 4,
                              }}
                            >
                              {goalTotalType === 'remaining'
                                ? `Faltan ${formatMaskedMoney(remaining, g.currency)} de ${formatMaskedMoney(target, g.currency)}`
                                : `${formatMaskedMoney(saved, g.currency)} / ${formatMaskedMoney(target, g.currency)}`}
                            </Text>

                            <View style={styles.metaLine}>
                              {g.target_date && (
                                <View style={styles.metaChip}>
                                  <Calendar size={11} color={isFeatured ? 'rgba(255,255,255,0.8)' : theme.textMuted} />
                                  <Text
                                    style={{
                                      color: isFeatured ? 'rgba(255,255,255,0.8)' : theme.textMuted,
                                      fontFamily: theme.font('600'),
                                      fontSize: theme.sp(11),
                                    }}
                                  >
                                    {format(new Date(g.target_date), "d MMM yyyy", { locale: es })}
                                  </Text>
                                </View>
                              )}
                              {g.isOnTrack === false && g.status === 'ACTIVE' && (
                                <View style={styles.metaChip}>
                                  <Flame size={11} color={isFeatured ? '#FFFFFF' : theme.coral} />
                                  <Text
                                    style={{
                                      color: isFeatured ? '#FFFFFF' : theme.coral,
                                      fontFamily: theme.font('700'),
                                      fontSize: theme.sp(11),
                                    }}
                                  >
                                    Acelerar ritmo
                                  </Text>
                                </View>
                              )}
                            </View>
                          </View>
                        </View>

                        <View style={styles.actionsRow}>
                          <Pressable
                            onPress={(e) => {
                              e.stopPropagation?.();
                              triggerHaptic('medium');
                              setContributeGoal(g);
                            }}
                            style={[
                              styles.primaryAction,
                              { backgroundColor: isFeatured ? '#FFFFFF' : accent },
                            ]}
                          >
                            <Plus size={14} color={isFeatured ? theme.coral : '#FFFFFF'} strokeWidth={2.6} />
                            <Text
                              style={{
                                color: isFeatured ? theme.coral : '#FFFFFF',
                                fontFamily: theme.font('800'),
                                fontSize: theme.sp(12.5),
                              }}
                            >
                              Aportar
                            </Text>
                          </Pressable>

                          <Pressable
                            onPress={(e) => {
                              e.stopPropagation?.();
                              setWithdrawGoal(g);
                            }}
                            style={[
                              styles.secAction,
                              {
                                backgroundColor: isFeatured ? 'rgba(255,255,255,0.18)' : theme.muted,
                              },
                            ]}
                          >
                            <ArrowUpRight size={14} color={isFeatured ? '#FFFFFF' : theme.textSecondary} />
                            <Text
                              style={{
                                color: isFeatured ? '#FFFFFF' : theme.textSecondary,
                                fontFamily: theme.font('700'),
                                fontSize: theme.sp(12),
                              }}
                            >
                              Retirar
                            </Text>
                          </Pressable>

                          <Pressable
                            onPress={(e) => {
                              e.stopPropagation?.();
                              syncGoal.mutate(g.id);
                            }}
                            style={[
                              styles.iconBtn,
                              { backgroundColor: isFeatured ? 'rgba(255,255,255,0.18)' : theme.muted },
                            ]}
                          >
                            <RefreshCw size={14} color={isFeatured ? '#FFFFFF' : theme.textSecondary} />
                          </Pressable>

                          <Pressable
                            onPress={(e) => {
                              e.stopPropagation?.();
                              setEditingGoal(g);
                              setFormPreset(null);
                              setFormOpen(true);
                            }}
                            style={[
                              styles.iconBtn,
                              { backgroundColor: isFeatured ? 'rgba(255,255,255,0.18)' : theme.muted },
                            ]}
                          >
                            <Edit3 size={14} color={isFeatured ? '#FFFFFF' : theme.textSecondary} />
                          </Pressable>

                          <Pressable
                            onPress={(e) => {
                              e.stopPropagation?.();
                              setDeleteGoalTarget(g);
                            }}
                            style={[
                              styles.iconBtn,
                              {
                                backgroundColor: isFeatured
                                  ? 'rgba(255,255,255,0.18)'
                                  : alphaHex(theme.expense, 0.12),
                              },
                            ]}
                          >
                            <Trash2 size={14} color={isFeatured ? '#FFFFFF' : theme.expense} />
                          </Pressable>
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

      <GoalFormModal
        open={formOpen}
        onOpenChange={setFormOpen}
        initialGoal={editingGoal}
        preset={formPreset}
      />
      <ExtraIncomeAssistantModal
        open={assistantOpen}
        onOpenChange={setAssistantOpen}
        goals={goals}
        initialAmount={params.extraIncome}
        initialLabel={params.label}
      />
      <ContributeModal
        open={Boolean(contributeGoal)}
        onOpenChange={(v) => !v && setContributeGoal(null)}
        goal={contributeGoal}
      />
      <WithdrawModal
        open={Boolean(withdrawGoal)}
        onOpenChange={(v) => !v && setWithdrawGoal(null)}
        goal={withdrawGoal}
      />
      <ConfirmAlertModal
        open={Boolean(deleteGoalTarget)}
        onOpenChange={(v) => !v && setDeleteGoalTarget(null)}
        variant="danger"
        title="Eliminar meta de ahorro"
        description={
          deleteGoalTarget
            ? `¿Seguro que deseas eliminar "${deleteGoalTarget.name}"? Los aportes históricos ya impactaron tus saldos.`
            : ''
        }
        confirmLabel="Eliminar"
        isLoading={deleteGoal.isPending}
        onConfirm={async () => {
          if (deleteGoalTarget) {
            await deleteGoal.mutateAsync(deleteGoalTarget.id);
            setDeleteGoalTarget(null);
          }
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  scroll: { paddingBottom: 42 },
  addBtn: { width: 38, height: 38, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  heroCenter: { flexDirection: 'row', alignItems: 'center', gap: 16, marginTop: 14 },
  body: { padding: 16, gap: 14 },
  goalTop: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  donePill: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 999 },
  metaLine: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 5 },
  metaChip: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  actionsRow: { flexDirection: 'row', alignItems: 'center', gap: 7 },
  primaryAction: {
    flex: 1.3,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
    height: 36,
    borderRadius: 12,
  },
  secAction: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
    height: 36,
    borderRadius: 12,
  },
  iconBtn: { width: 36, height: 36, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  pillBtn: { paddingHorizontal: 11, paddingVertical: 7, borderRadius: 11 },
  pctChip: { paddingHorizontal: 11, paddingVertical: 6, borderRadius: 999, borderWidth: 1 },
});
