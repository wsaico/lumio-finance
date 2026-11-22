import React, { useMemo, useState } from 'react';
import { Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import {
  ArrowRightLeft,
  Calendar,
  CheckCircle2,
  Edit3,
  Layers,
  Play,
  Plus,
  Sparkles,
  Target,
  Trash2,
} from 'lucide-react-native';
import { useAppTheme } from '@/theme/ThemeProvider';
import { TopAppHeader } from '@/components/navigation/TopAppHeader';
import { CurvedHeroHeader } from '@/components/ui/CurvedHeroHeader';
import { PremiumCard } from '@/components/ui/PremiumCard';
import { AnimatedNumber } from '@/components/ui/AnimatedNumber';
import { SegmentedControl } from '@/components/ui/SegmentedControl';
import { CategoryIcon } from '@/components/ui/CategoryIcon';
import { EmptyStateCard } from '@/components/ui/EmptyStateCard';
import { ShimmerSkeleton } from '@/components/ui/ShimmerSkeleton';
import { PremiumPreviewGate } from '@/components/ui/PremiumPreviewGate';
import { PremiumButton } from '@/components/ui/PremiumButton';
import { ConfirmAlertModal } from '@/components/alerts/ConfirmAlertModal';
import { IncomeWizardModal } from '@/components/planning/IncomeWizardModal';
import { AllocationModal } from '@/components/planning/AllocationModal';
import { ReallocationModal } from '@/components/planning/ReallocationModal';
import { usePlanningZBB } from '@/hooks/usePlanningZBB';
import { useFormat } from '@/hooks/useFormat';
import { alphaHex } from '@/lib/color-math';
import { triggerHaptic } from '@/lib/haptics';

const PRIORITY_BADGE: Record<number, { label: string; color: string }> = {
  1: { label: 'Esencial', color: '#F43F5E' },
  2: { label: 'Importante', color: '#F59E0B' },
  3: { label: 'Deseable', color: '#5B35D5' },
  4: { label: 'Opcional', color: '#64748B' },
};

export default function PlanningScreen() {
  const theme = useAppTheme();
  const { formatMaskedMoney, baseCurrency, isBalanceVisible } = useFormat();

  const [selectedMonth, setSelectedMonth] = useState<string | undefined>(undefined);
  const [filter, setFilter] = useState<'ALL' | 'EXPENSE' | 'SAVINGS'>('ALL');
  const [incomeOpen, setIncomeOpen] = useState(false);
  const [allocOpen, setAllocOpen] = useState(false);
  const [editingAlloc, setEditingAlloc] = useState<any>(null);
  const [reallocOpen, setReallocOpen] = useState(false);
  const [deleteAlloc, setDeleteAlloc] = useState<any>(null);

  const {
    data,
    history,
    isLoading,
    refetch,
    deleteAllocation,
    activateCycle,
  } = usePlanningZBB(selectedMonth);

  const cycle = data?.cycle;
  const moneyPool = data?.moneyPool;
  const suggestions = data?.suggestions;
  const ruleBreakdown = data?.ruleBreakdown;
  const allocations: any[] = useMemo(() => cycle?.allocations || [], [cycle]);

  const unassignedPen = Number(moneyPool?.pen?.unassigned || 0);
  const unassignedUsd = Number(moneyPool?.usd?.unassigned || 0);
  const isZeroBased =
    Boolean(cycle) && Math.abs(unassignedPen) < 0.01 && Math.abs(unassignedUsd) < 0.01;

  const filteredAllocs = useMemo(() => {
    if (filter === 'ALL') return allocations;
    if (filter === 'SAVINGS') return allocations.filter((a) => Boolean(a.goal_id));
    return allocations.filter((a) => !a.goal_id);
  }, [allocations, filter]);

  const activeRule = useMemo(() => {
    if (!ruleBreakdown) return null;
    const cur = ruleBreakdown.pen?.totalIncome > 0 ? 'PEN' : 'USD';
    const b = cur === 'PEN' ? ruleBreakdown.pen : ruleBreakdown.usd;
    if (!b || b.totalIncome <= 0) return null;
    return { cur, ...b };
  }, [ruleBreakdown]);

  return (
    <View style={[styles.screen, { backgroundColor: theme.bg }]}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scroll}
        refreshControl={
          <RefreshControl
            refreshing={isLoading}
            onRefresh={() => {
              void refetch();
            }}
            tintColor={theme.brand}
          />
        }
      >
        <CurvedHeroHeader>
          <TopAppHeader
            title="Planificación ZBB"
            subtitle={cycle?.cycle_name || 'Presupuesto Base Cero'}
            showBack
            onHero
            rightSlot={
              cycle ? (
                <Pressable
                  onPress={() => setIncomeOpen(true)}
                  style={[styles.heroEditBtn, { backgroundColor: 'rgba(255,255,255,0.18)' }]}
                >
                  <Edit3 size={16} color="#FFFFFF" />
                </Pressable>
              ) : null
            }
          />

          {cycle ? (
            <View style={styles.heroPool}>
              <View style={styles.poolTop}>
                <View>
                  <Text style={{ color: 'rgba(255,255,255,0.75)', fontFamily: theme.font('600'), fontSize: theme.sp(12) }}>
                    Por asignar (Money Pool)
                  </Text>
                  <AnimatedNumber
                    value={baseCurrency === 'USD' ? unassignedUsd : unassignedPen}
                    currencyCode={baseCurrency === 'USD' ? 'USD' : 'PEN'}
                    hidden={!isBalanceVisible}
                    style={{ color: '#FFFFFF', fontFamily: theme.font('800'), fontSize: theme.sp(29) }}
                  />
                </View>

                <View
                  style={[
                    styles.statusPill,
                    {
                      backgroundColor: isZeroBased
                        ? alphaHex('#10B981', 0.25)
                        : alphaHex(theme.coral, 0.35),
                    },
                  ]}
                >
                  {isZeroBased ? (
                    <CheckCircle2 size={13} color="#34D399" />
                  ) : (
                    <Sparkles size={13} color="#FFB085" />
                  )}
                  <Text style={{ color: '#FFFFFF', fontFamily: theme.font('800'), fontSize: 11 }}>
                    {isZeroBased ? 'Base Cero Lograda' : 'Pendiente asignar'}
                  </Text>
                </View>
              </View>

              {(unassignedUsd > 0 && baseCurrency !== 'USD') || (unassignedPen > 0 && baseCurrency === 'USD') ? (
                <Text style={{ color: 'rgba(255,255,255,0.8)', fontFamily: theme.font('600'), fontSize: theme.sp(12) }}>
                  Saldo paralelo por asignar:{' '}
                  {baseCurrency === 'USD'
                    ? formatMaskedMoney(unassignedPen, 'PEN')
                    : formatMaskedMoney(unassignedUsd, 'USD')}
                </Text>
              ) : null}
            </View>
          ) : null}
        </CurvedHeroHeader>

        <PremiumPreviewGate moduleName="Planificación ZBB">
          <View style={styles.body}>
            {history.length > 0 && (
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipRow}>
                <Pressable
                  onPress={() => setSelectedMonth(undefined)}
                  style={[
                    styles.histChip,
                    {
                      backgroundColor: !selectedMonth ? theme.brand : theme.card,
                      borderColor: !selectedMonth ? theme.brand : theme.border,
                    },
                  ]}
                >
                  <Calendar size={12} color={!selectedMonth ? '#FFFFFF' : theme.textMuted} />
                  <Text style={{ color: !selectedMonth ? '#FFFFFF' : theme.text, fontFamily: theme.font('700'), fontSize: theme.sp(11.5) }}>
                    Ciclo actual
                  </Text>
                </Pressable>
                {history.map((h: any) => {
                  const ym = h.period_start?.slice(0, 7);
                  const active = selectedMonth === ym;
                  return (
                    <Pressable
                      key={h.id}
                      onPress={() => setSelectedMonth(ym)}
                      style={[
                        styles.histChip,
                        { backgroundColor: active ? theme.brand : theme.card, borderColor: active ? theme.brand : theme.border },
                      ]}
                    >
                      <Text style={{ color: active ? '#FFFFFF' : theme.textSecondary, fontFamily: theme.font('600'), fontSize: theme.sp(11.5) }}>
                        {h.cycle_name || ym}
                      </Text>
                    </Pressable>
                  );
                })}
              </ScrollView>
            )}

            {isLoading ? (
              <View style={{ gap: 12 }}>
                <ShimmerSkeleton height={130} borderRadius={22} />
                <ShimmerSkeleton height={130} borderRadius={22} />
              </View>
            ) : !cycle ? (
              <EmptyStateCard
                icon={<Layers size={28} color={theme.brand} />}
                title="Inicia tu Planificación Base Cero"
                description="Dale un trabajo al 100% de tus ingresos mensuales y sincronízalos directo con tus Presupuestos."
                actionLabel="Configurar ingresos del mes"
                onAction={() => setIncomeOpen(true)}
              />
            ) : (
              <>
                <View style={styles.actionBar}>
                  <PremiumButton
                    title="Nueva partida"
                    variant="coral"
                    size="sm"
                    icon={<Plus size={15} color="#FFFFFF" />}
                    onPress={() => {
                      setEditingAlloc(null);
                      setAllocOpen(true);
                    }}
                    style={{ flex: 1.2 }}
                  />
                  {allocations.length >= 2 && (
                    <PremiumButton
                      title="Reasignar"
                      variant="outline"
                      size="sm"
                      icon={<ArrowRightLeft size={14} color={theme.brand} />}
                      onPress={() => setReallocOpen(true)}
                      style={{ flex: 1 }}
                    />
                  )}
                  <PremiumButton
                    title={cycle.status === 'active' ? 'Resincronizar' : 'Activar plan'}
                    variant="primary"
                    size="sm"
                    icon={<Play size={14} color="#FFFFFF" />}
                    loading={activateCycle.isPending}
                    onPress={() => {
                      triggerHaptic('medium');
                      activateCycle.mutate(cycle.id);
                    }}
                    style={{ flex: 1.1 }}
                  />
                </View>

                {activeRule && (
                  <PremiumCard padding={15} style={{ gap: 10 }}>
                    <Text style={{ color: theme.text, fontFamily: theme.font('800'), fontSize: theme.sp(14) }}>
                      Equilibrio 50 / 30 / 20 ({activeRule.cur})
                    </Text>
                    <View style={styles.ruleGrid}>
                      {[
                        { label: 'Esenciales', pct: activeRule.essentialsPct, ok: activeRule.essentialsPct <= 55, color: theme.brand },
                        { label: 'Estilo Vida', pct: activeRule.lifestylePct, ok: activeRule.lifestylePct <= 35, color: theme.coral },
                        { label: 'Ahorro', pct: activeRule.savingsPct, ok: activeRule.savingsPct >= 20, color: theme.income },
                      ].map((p) => (
                        <View key={p.label} style={[styles.ruleCell, { backgroundColor: theme.muted }]}>
                          <Text style={{ color: theme.textMuted, fontFamily: theme.font('600'), fontSize: 11 }}>
                            {p.label}
                          </Text>
                          <Text style={{ color: p.ok ? p.color : theme.warning, fontFamily: theme.font('800'), fontSize: 16 }}>
                            {Math.round(Number(p.pct || 0))}%
                          </Text>
                        </View>
                      ))}
                    </View>
                  </PremiumCard>
                )}

                <SegmentedControl
                  value={filter}
                  onChange={setFilter}
                  options={[
                    { id: 'ALL', label: `Todas (${allocations.length})` },
                    { id: 'EXPENSE', label: 'Gastos' },
                    { id: 'SAVINGS', label: 'Ahorro' },
                  ]}
                />

                {filteredAllocs.length === 0 ? (
                  <EmptyStateCard
                    icon={<Plus size={26} color={theme.brand} />}
                    title="Sin partidas asignadas"
                    description="Agrega sobres de gasto o metas de ahorro para acercarte a Base Cero."
                    actionLabel="Agregar partida"
                    onAction={() => {
                      setEditingAlloc(null);
                      setAllocOpen(true);
                    }}
                  />
                ) : (
                  <View style={{ gap: 11 }}>
                    {filteredAllocs.map((item) => {
                      const isUsd = Number(item.allocated_amount_usd || 0) > 0;
                      const cur = isUsd ? 'USD' : 'PEN';
                      const allocated = isUsd
                        ? Number(item.allocated_amount_usd || 0)
                        : Number(item.allocated_amount_pen || 0);
                      const spent = Number(item.actual_spent || 0);
                      const pct = allocated > 0 ? Math.min(100, Math.round((spent / allocated) * 100)) : 0;
                      const isExceeded = !item.goal_id && spent > allocated;
                      const title =
                        item.goal?.name ||
                        item.subcategory?.name ||
                        item.category?.name ||
                        item.justification ||
                        'Partida';
                      const pMeta = PRIORITY_BADGE[Number(item.priority) || 1] || PRIORITY_BADGE[1];
                      const iconColor = item.goal ? theme.income : item.category?.color || theme.brand;

                      return (
                        <PremiumCard key={item.id} padding={15} style={{ gap: 10 }}>
                          <View style={styles.allocTop}>
                            <View style={[styles.allocIcon, { backgroundColor: alphaHex(iconColor, 0.14), borderRadius: theme.iconRadius }]}>
                              {item.goal ? (
                                <Target size={18} color={theme.income} />
                              ) : (
                                <CategoryIcon name={item.category?.icon || 'tags'} size={18} color={iconColor} />
                              )}
                            </View>

                            <View style={{ flex: 1 }}>
                              <View style={styles.allocTitleRow}>
                                <Text numberOfLines={1} style={{ color: theme.text, fontFamily: theme.font('800'), fontSize: theme.sp(14.5), flexShrink: 1 }}>
                                  {title}
                                </Text>
                                <View style={[styles.prioPill, { backgroundColor: alphaHex(pMeta.color, 0.14) }]}>
                                  <Text style={{ color: pMeta.color, fontFamily: theme.font('700'), fontSize: 10 }}>
                                    {pMeta.label}
                                  </Text>
                                </View>
                              </View>
                              {item.justification ? (
                                <Text numberOfLines={1} style={{ color: theme.textMuted, fontFamily: theme.font('500'), fontSize: theme.sp(11.5) }}>
                                  {item.justification}
                                </Text>
                              ) : null}
                            </View>

                            <View style={styles.cardBtns}>
                              <Pressable
                                onPress={() => {
                                  setEditingAlloc(item);
                                  setAllocOpen(true);
                                }}
                                style={[styles.miniBtn, { backgroundColor: theme.muted }]}
                              >
                                <Edit3 size={13} color={theme.textSecondary} />
                              </Pressable>
                              <Pressable
                                onPress={() => setDeleteAlloc(item)}
                                style={[styles.miniBtn, { backgroundColor: alphaHex(theme.expense, 0.12) }]}
                              >
                                <Trash2 size={13} color={theme.expense} />
                              </Pressable>
                            </View>
                          </View>

                          <View style={[styles.track, { backgroundColor: theme.muted }]}>
                            <View
                              style={{
                                width: `${pct}%`,
                                height: '100%',
                                backgroundColor: isExceeded ? theme.expense : iconColor,
                                borderRadius: 999,
                              }}
                            />
                          </View>

                          <View style={styles.allocFoot}>
                            <Text style={{ color: isExceeded ? theme.expense : theme.textSecondary, fontFamily: theme.font('600'), fontSize: theme.sp(12), fontVariant: ['tabular-nums'] }}>
                              Ejecutado: {formatMaskedMoney(spent, cur)} / {formatMaskedMoney(allocated, cur)}
                            </Text>
                            <Text style={{ color: isExceeded ? theme.expense : theme.text, fontFamily: theme.font('800'), fontSize: theme.sp(12) }}>
                              {allocated > 0 ? Math.round((spent / allocated) * 100) : 0}%
                            </Text>
                          </View>
                        </PremiumCard>
                      );
                    })}
                  </View>
                )}
              </>
            )}
          </View>
        </PremiumPreviewGate>
      </ScrollView>

      <IncomeWizardModal
        open={incomeOpen}
        onOpenChange={setIncomeOpen}
        existingCycle={cycle}
        suggestions={suggestions}
      />
      {cycle && (
        <>
          <AllocationModal
            open={allocOpen}
            onOpenChange={setAllocOpen}
            cycleId={cycle.id}
            initialAllocation={editingAlloc}
          />
          <ReallocationModal
            open={reallocOpen}
            onOpenChange={setReallocOpen}
            cycleId={cycle.id}
            allocations={allocations}
          />
        </>
      )}
      <ConfirmAlertModal
        open={Boolean(deleteAlloc)}
        onOpenChange={(v) => !v && setDeleteAlloc(null)}
        variant="danger"
        title="Eliminar partida ZBB"
        description="Se liberará este monto de vuelta a tu Money Pool por asignar."
        confirmLabel="Eliminar"
        isLoading={deleteAllocation.isPending}
        onConfirm={async () => {
          if (deleteAlloc) {
            await deleteAllocation.mutateAsync(deleteAlloc.id);
            setDeleteAlloc(null);
          }
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  scroll: { paddingBottom: 42 },
  heroEditBtn: { width: 36, height: 36, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  heroPool: { marginTop: 14, gap: 8 },
  poolTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10 },
  statusPill: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 11, paddingVertical: 6, borderRadius: 999 },
  body: { padding: 16, gap: 14 },
  chipRow: { gap: 8 },
  histChip: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 999, borderWidth: 1 },
  actionBar: { flexDirection: 'row', gap: 8 },
  ruleGrid: { flexDirection: 'row', gap: 8 },
  ruleCell: { flex: 1, borderRadius: 14, padding: 10, alignItems: 'center', gap: 2 },
  allocTop: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  allocIcon: { width: 38, height: 38, alignItems: 'center', justifyContent: 'center' },
  allocTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  prioPill: { paddingHorizontal: 7, paddingVertical: 2, borderRadius: 999 },
  cardBtns: { flexDirection: 'row', gap: 6 },
  miniBtn: { width: 30, height: 30, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  track: { height: 7, borderRadius: 999, overflow: 'hidden' },
  allocFoot: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
});
