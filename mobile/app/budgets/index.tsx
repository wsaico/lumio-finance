import React, { useMemo, useState } from 'react';
import {
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import {
  Award,
  ChevronLeft,
  ChevronRight,
  Edit3,
  Layers,
  PieChart,
  Plus,
  Sparkles,
  Trash2,
} from 'lucide-react-native';
import { useAppTheme } from '@/theme/ThemeProvider';
import { TopAppHeader } from '@/components/navigation/TopAppHeader';
import { PremiumCard } from '@/components/ui/PremiumCard';
import { AnimatedNumber } from '@/components/ui/AnimatedNumber';
import { SegmentedControl } from '@/components/ui/SegmentedControl';
import { GroupedBudgetBarChart } from '@/components/charts/GroupedBudgetBarChart';
import { CategoryIcon } from '@/components/ui/CategoryIcon';
import { EmptyStateCard } from '@/components/ui/EmptyStateCard';
import { ShimmerSkeleton } from '@/components/ui/ShimmerSkeleton';
import { PremiumPreviewGate } from '@/components/ui/PremiumPreviewGate';
import { ConfirmAlertModal } from '@/components/alerts/ConfirmAlertModal';
import { BudgetFormModal } from '@/components/budgets/BudgetFormModal';
import { useBudget } from '@/hooks/useBudget';
import { useCategories } from '@/hooks/useCategories';
import { useExchangeRates } from '@/hooks/useExchangeRates';
import { useFormat } from '@/hooks/useFormat';
import { useFinancialAnalysis } from '@/hooks/useFinancialAnalysis';
import { useSettingsStore } from '@/stores/settings-store';
import { alphaHex } from '@/lib/color-math';
import { triggerHaptic } from '@/lib/haptics';
import type { Budget } from '@/types/budget';

const MONTH_NAMES = [
  'Enero',
  'Febrero',
  'Marzo',
  'Abril',
  'Mayo',
  'Junio',
  'Julio',
  'Agosto',
  'Septiembre',
  'Octubre',
  'Noviembre',
  'Diciembre',
];

export default function BudgetsScreen() {
  const theme = useAppTheme();
  const { formatMaskedMoney, formatCompactMoney, baseCurrency, isBalanceVisible } = useFormat();
  const { convert } = useExchangeRates();
  const { all: allCategories } = useCategories();
  const budgetTotalType = useSettingsStore((s) => s.budgetTotalType);
  const progressBarStyle = useSettingsStore((s) => s.progressBarStyle);

  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [chartWindow, setChartWindow] = useState<'month' | '6m'>('month');
  const [filterType, setFilterType] = useState<'ALL' | 'EXPENSE' | 'SAVINGS'>('ALL');
  const [modalOpen, setModalOpen] = useState(false);
  const [editingBudget, setEditingBudget] = useState<Budget | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Budget | null>(null);

  const { budgets, isLoading, refetch, deleteBudget } = useBudget(year, month, { activeOnly: true });
  const analysisQuery = useFinancialAnalysis({
    period: '6m',
    type: 'EXPENSE',
    accountId: 'ALL',
    categoryId: 'ALL',
  });

  const shiftMonth = (delta: number) => {
    triggerHaptic('selection');
    const d = new Date(year, month - 1 + delta, 1);
    setYear(d.getFullYear());
    setMonth(d.getMonth() + 1);
  };

  const filteredBudgets = useMemo(() => {
    const base =
      filterType === 'ALL' ? budgets : budgets.filter((b) => b.type === filterType);
    return [...base].sort((a, b) => {
      const pA = a.stats?.percentage ?? (Number(a.amount) > 0 ? ((a.spent || 0) / Number(a.amount)) * 100 : 0);
      const pB = b.stats?.percentage ?? (Number(b.amount) > 0 ? ((b.spent || 0) / Number(b.amount)) * 100 : 0);
      return pB - pA;
    });
  }, [budgets, filterType]);

  const totals = useMemo(() => {
    let totalLimit = 0;
    let totalSpent = 0;
    for (const b of budgets) {
      if (b.type !== 'EXPENSE') continue;
      const cur = b.currencyCode || b.currency_code || baseCurrency;
      const limit = Number(b.amount) || 0;
      const spent = Number(b.stats?.spent ?? b.spent ?? 0);
      totalLimit += convert(limit, cur, baseCurrency);
      totalSpent += convert(spent, cur, baseCurrency);
    }
    const remaining = Math.max(0, totalLimit - totalSpent);
    const overage = Math.max(0, totalSpent - totalLimit);
    const pct = totalLimit > 0 ? (totalSpent / totalLimit) * 100 : 0;
    return { totalLimit, totalSpent, remaining, overage, pct };
  }, [budgets, baseCurrency, convert]);

  const chartData = useMemo(() => {
    if (chartWindow === 'month' && filteredBudgets.length > 0) {
      return filteredBudgets.slice(0, 6).map((b) => {
        const cur = b.currencyCode || b.currency_code || baseCurrency;
        return {
          label: b.name.slice(0, 6),
          budget: convert(Number(b.amount) || 0, cur, baseCurrency),
          cost: convert(Number(b.stats?.spent ?? b.spent ?? 0), cur, baseCurrency),
        };
      });
    }
    const trend: any[] = analysisQuery.data?.trend || [];
    if (trend.length > 0) {
      return trend.slice(-6).map((pt: any) => ({
        label: String(pt.name || pt.label || pt.month || '').slice(0, 5),
        cost: Number(pt.expense ?? pt.amount ?? 0),
        budget: Math.max(totals.totalLimit, Number(pt.income ?? pt.expense ?? 0)),
      }));
    }
    return MONTH_NAMES.slice(Math.max(0, month - 6), month).map((m, i) => ({
      label: m.slice(0, 3),
      cost: i === Math.min(5, month - 1) ? totals.totalSpent : 0,
      budget: totals.totalLimit,
    }));
  }, [chartWindow, filteredBudgets, analysisQuery.data, totals, baseCurrency, convert, month]);

  const categoryMap = useMemo(() => {
    const m = new Map<string, any>();
    for (const c of allCategories) m.set(c.id, c);
    return m;
  }, [allCategories]);

  const goalStatus =
    totals.totalLimit === 0
      ? { title: 'Crea tu primer presupuesto', subtitle: 'Establece un tope mensual inteligente', bg: theme.coralGradient }
      : totals.pct <= 85
        ? { title: 'Meta Mensual · Bajo control', subtitle: `${Math.round(totals.pct)}% utilizado · Vas excelente`, bg: theme.coralGradient }
        : totals.pct <= 100
          ? { title: 'Meta Mensual · Zona de atención', subtitle: `${Math.round(totals.pct)}% utilizado · Cuida el ritmo`, bg: ['#F59E0B', '#D97706'] as [string, string] }
          : { title: 'Presupuesto excedido', subtitle: `Superado en ${formatMaskedMoney(totals.overage)}`, bg: ['#F43F5E', '#E11D48'] as [string, string] };

  const progressRadius =
    progressBarStyle === 'gradient' ? 999 : progressBarStyle === 'segmented' ? 4 : 6;
  const progressHeight =
    progressBarStyle === 'gradient' ? 10 : progressBarStyle === 'segmented' ? 9 : 7;

  return (
    <View style={[styles.screen, { backgroundColor: theme.bg }]}>
      <TopAppHeader
        title="Presupuestos"
        subtitle={`${MONTH_NAMES[month - 1]} ${year}`}
        showBack
        rightSlot={
          <Pressable
            onPress={() => {
              triggerHaptic('medium');
              setEditingBudget(null);
              setModalOpen(true);
            }}
            style={[styles.addBtn, { backgroundColor: theme.coral }]}
          >
            <Plus size={18} color="#FFFFFF" strokeWidth={2.6} />
          </Pressable>
        }
      />

      <PremiumPreviewGate moduleName="Presupuestos">
        <ScrollView
          contentContainerStyle={styles.scroll}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={isLoading}
              onRefresh={() => {
                refetch();
                analysisQuery.refetch();
              }}
              tintColor={theme.brand}
            />
          }
        >
          {/* Period Switcher + Chart Mode (Reference Image 2 Top Card) */}
          <View style={styles.monthBar}>
            <Pressable
              onPress={() => shiftMonth(-1)}
              style={[styles.monthNavBtn, { backgroundColor: theme.card, borderColor: theme.border }]}
            >
              <ChevronLeft size={18} color={theme.text} />
            </Pressable>
            <View style={styles.monthCenter}>
              <Text style={{ color: theme.text, fontFamily: theme.font('800'), fontSize: theme.sp(15) }}>
                {MONTH_NAMES[month - 1]} {year}
              </Text>
              <Text style={{ color: theme.textMuted, fontFamily: theme.font('500'), fontSize: theme.sp(11) }}>
                {budgets.length} {budgets.length === 1 ? 'presupuesto activo' : 'presupuestos activos'}
              </Text>
            </View>
            <Pressable
              onPress={() => shiftMonth(1)}
              style={[styles.monthNavBtn, { backgroundColor: theme.card, borderColor: theme.border }]}
            >
              <ChevronRight size={18} color={theme.text} />
            </Pressable>
          </View>

          <PremiumCard style={styles.chartCard} padding={16}>
            <View style={styles.chartTopRow}>
              <Text style={{ color: theme.text, fontFamily: theme.font('800'), fontSize: theme.sp(14) }}>
                Comparativa Gasto vs Presupuesto
              </Text>
              <View style={styles.modePills}>
                {(['month', '6m'] as const).map((m) => {
                  const active = chartWindow === m;
                  return (
                    <Pressable
                      key={m}
                      onPress={() => setChartWindow(m)}
                      style={[
                        styles.modeChip,
                        { backgroundColor: active ? alphaHex(theme.coral, 0.16) : theme.muted },
                      ]}
                    >
                      <Text
                        style={{
                          color: active ? theme.coral : theme.textMuted,
                          fontFamily: theme.font('700'),
                          fontSize: theme.sp(11),
                        }}
                      >
                        {m === 'month' ? 'Categorías' : '6 Meses'}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
            </View>
            <GroupedBudgetBarChart
              data={chartData}
              formatValue={(n) => (isBalanceVisible ? formatCompactMoney(n) : '•••')}
            />
          </PremiumCard>

          {/* Deep Royal Violet Summary Card matching Reference Image 2 */}
          <PremiumCard variant="hero-violet" style={styles.heroCard} padding={20}>
            <View style={styles.heroHeaderRow}>
              <View style={styles.heroBadge}>
                <PieChart size={14} color="#FFFFFF" />
                <Text style={{ color: '#FFFFFF', fontFamily: theme.font('700'), fontSize: theme.sp(12) }}>
                  {MONTH_NAMES[month - 1]}
                </Text>
              </View>
              <Text style={{ color: 'rgba(255,255,255,0.75)', fontFamily: theme.font('600'), fontSize: theme.sp(12) }}>
                {baseCurrency}
              </Text>
            </View>

            <View style={styles.metricRow}>
              <Text style={styles.metricLabel}>Presupuesto</Text>
              <AnimatedNumber
                value={totals.totalLimit}
                currencyCode={baseCurrency}
                hidden={!isBalanceVisible}
                style={[styles.metricValue, { fontFamily: theme.font('800') }]}
              />
            </View>
            <View style={[styles.divider, { backgroundColor: 'rgba(255,255,255,0.14)' }]} />

            <View style={styles.metricRow}>
              <Text style={[styles.metricLabel, { color: '#FFB085' }]}>Gastado</Text>
              <AnimatedNumber
                value={totals.totalSpent}
                currencyCode={baseCurrency}
                hidden={!isBalanceVisible}
                style={[styles.metricValue, { color: '#FFB085', fontFamily: theme.font('800') }]}
              />
            </View>
            <View style={[styles.divider, { backgroundColor: 'rgba(255,255,255,0.14)' }]} />

            <View style={styles.metricRow}>
              <Text style={styles.metricLabel}>Disponible</Text>
              <AnimatedNumber
                value={totals.remaining}
                currencyCode={baseCurrency}
                hidden={!isBalanceVisible}
                style={[styles.metricValue, { fontFamily: theme.font('800') }]}
              />
            </View>

            <Pressable
              onPress={() => {
                setEditingBudget(null);
                setModalOpen(true);
              }}
              style={{ marginTop: 14 }}
            >
              <LinearGradient
                colors={goalStatus.bg}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.coralGoalPill}
              >
                <View style={styles.coralGoalIcon}>
                  <Award size={18} color="#FFFFFF" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={{ color: '#FFFFFF', fontFamily: theme.font('800'), fontSize: theme.sp(13) }}>
                    {goalStatus.title}
                  </Text>
                  <Text style={{ color: 'rgba(255,255,255,0.88)', fontFamily: theme.font('500'), fontSize: theme.sp(11) }}>
                    {goalStatus.subtitle}
                  </Text>
                </View>
              </LinearGradient>
            </Pressable>
          </PremiumCard>

          {/* Filter Control */}
          <SegmentedControl
            value={filterType}
            onChange={setFilterType}
            options={[
              { id: 'ALL', label: 'Todos' },
              { id: 'EXPENSE', label: 'Gastos' },
              { id: 'SAVINGS', label: 'Ahorro' },
            ]}
          />

          {/* Budget Cards */}
          {isLoading ? (
            <View style={{ gap: 12 }}>
              <ShimmerSkeleton height={116} borderRadius={22} />
              <ShimmerSkeleton height={116} borderRadius={22} />
            </View>
          ) : filteredBudgets.length === 0 ? (
            <EmptyStateCard
              icon={<Layers size={28} color={theme.brand} />}
              title="Sin presupuestos en este mes"
              description="Organiza límites claros por categoría para prevenir excesos con alertas en tiempo real."
              actionLabel="Crear presupuesto"
              onAction={() => {
                setEditingBudget(null);
                setModalOpen(true);
              }}
            />
          ) : (
            <View style={{ gap: 12 }}>
              {filteredBudgets.map((b) => {
                const cur = b.currencyCode || b.currency_code || baseCurrency;
                const limit = Number(b.amount) || 0;
                const spent = Number(b.stats?.spent ?? b.spent ?? 0);
                const rem = Math.max(0, limit - spent);
                const pct = limit > 0 ? (spent / limit) * 100 : 0;
                const barColor =
                  pct > 100 ? theme.expense : pct >= 85 ? theme.warning : b.color || theme.brand;
                const catIds = b.includeCategories || b.include_categories || [];
                const firstCat = catIds.length > 0 ? categoryMap.get(catIds[0]) : null;

                return (
                  <PremiumCard key={b.id} style={styles.budgetCard} padding={16}>
                    <View style={styles.budgetTop}>
                      <View
                        style={[
                          styles.budgetIcon,
                          {
                            backgroundColor: alphaHex(b.color || theme.brand, 0.14),
                            borderRadius: theme.iconRadius,
                          },
                        ]}
                      >
                        <CategoryIcon
                          name={firstCat?.icon || 'pie-chart'}
                          size={20}
                          color={b.color || theme.brand}
                        />
                      </View>

                      <View style={{ flex: 1 }}>
                        <View style={styles.nameRow}>
                          <Text
                            numberOfLines={1}
                            style={{ color: theme.text, fontFamily: theme.font('800'), fontSize: theme.sp(15), flexShrink: 1 }}
                          >
                            {b.name}
                          </Text>
                          {b.isZbbControlled && (
                            <View style={[styles.zbbPill, { backgroundColor: theme.brandSoft }]}>
                              <Sparkles size={10} color={theme.brand} />
                              <Text style={{ color: theme.brand, fontFamily: theme.font('800'), fontSize: 10 }}>
                                ZBB
                              </Text>
                            </View>
                          )}
                        </View>
                        <Text style={{ color: theme.textMuted, fontFamily: theme.font('500'), fontSize: theme.sp(11.5) }}>
                          {catIds.length > 0
                            ? `${catIds.length} ${catIds.length === 1 ? 'categoría' : 'categorías'}`
                            : 'Todas las categorías'}{' '}
                          · {b.budgetScope === 'ACCOUNT' ? `${b.accountIds?.length || 0} cuentas` : 'Global'}
                        </Text>
                      </View>

                      <View style={styles.cardActions}>
                        <Pressable
                          onPress={() => {
                            setEditingBudget(b);
                            setModalOpen(true);
                          }}
                          style={[styles.miniBtn, { backgroundColor: theme.muted }]}
                        >
                          <Edit3 size={14} color={theme.textSecondary} />
                        </Pressable>
                        <Pressable
                          onPress={() => setDeleteTarget(b)}
                          style={[styles.miniBtn, { backgroundColor: alphaHex(theme.expense, 0.12) }]}
                        >
                          <Trash2 size={14} color={theme.expense} />
                        </Pressable>
                      </View>
                    </View>

                    <View style={[styles.progressTrack, { backgroundColor: theme.muted, height: progressHeight, borderRadius: progressRadius }]}>
                      {progressBarStyle === 'gradient' ? (
                        <LinearGradient
                          colors={[barColor, theme.coral]}
                          start={{ x: 0, y: 0 }}
                          end={{ x: 1, y: 0 }}
                          style={[
                            styles.progressFill,
                            {
                              width: `${Math.min(100, Math.round(pct))}%`,
                              borderRadius: progressRadius,
                            },
                          ]}
                        />
                      ) : (
                        <View
                          style={[
                            styles.progressFill,
                            {
                              width: `${Math.min(100, Math.round(pct))}%`,
                              backgroundColor: barColor,
                              borderRadius: progressRadius,
                            },
                          ]}
                        />
                      )}
                    </View>

                    <View style={styles.budgetFooter}>
                      <Text style={{ color: theme.textSecondary, fontFamily: theme.font('600'), fontSize: theme.sp(12), fontVariant: ['tabular-nums'] }}>
                        {budgetTotalType === 'spent'
                          ? `${formatMaskedMoney(spent, cur)} de ${formatMaskedMoney(limit, cur)}`
                          : spent > limit
                            ? `Excedido por ${formatMaskedMoney(spent - limit, cur)}`
                            : `Quedan ${formatMaskedMoney(rem, cur)} de ${formatMaskedMoney(limit, cur)}`}
                      </Text>
                      <Text style={{ color: barColor, fontFamily: theme.font('800'), fontSize: theme.sp(12.5), fontVariant: ['tabular-nums'] }}>
                        {Math.round(pct)}%
                      </Text>
                    </View>
                  </PremiumCard>
                );
              })}
            </View>
          )}
        </ScrollView>
      </PremiumPreviewGate>

      <BudgetFormModal
        open={modalOpen}
        onOpenChange={setModalOpen}
        initialBudget={editingBudget}
        year={year}
        month={month}
      />

      <ConfirmAlertModal
        open={Boolean(deleteTarget)}
        onOpenChange={(v) => !v && setDeleteTarget(null)}
        variant="danger"
        title="Eliminar presupuesto"
        description={
          deleteTarget
            ? `¿Seguro que deseas eliminar "${deleteTarget.name}"? Tus transacciones no se borrarán.`
            : ''
        }
        confirmLabel="Eliminar"
        isLoading={deleteBudget.isPending}
        onConfirm={async () => {
          if (deleteTarget) {
            await deleteBudget.mutateAsync(deleteTarget.id);
            setDeleteTarget(null);
          }
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  scroll: { padding: 16, gap: 14, paddingBottom: 40 },
  addBtn: {
    width: 38,
    height: 38,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  monthBar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10 },
  monthNavBtn: {
    width: 40,
    height: 40,
    borderRadius: 14,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  monthCenter: { alignItems: 'center' },
  chartCard: {},
  chartTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  modePills: { flexDirection: 'row', gap: 6 },
  modeChip: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 999 },
  heroCard: {},
  heroHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 14,
  },
  heroBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.16)',
  },
  metricRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 6,
  },
  metricLabel: { color: 'rgba(255,255,255,0.85)', fontSize: 14, fontWeight: '600' },
  metricValue: { color: '#FFFFFF', fontSize: 19 },
  divider: { height: 1 },
  coralGoalPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderRadius: 18,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  coralGoalIcon: {
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  budgetCard: { gap: 12 },
  budgetTop: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  budgetIcon: { width: 42, height: 42, alignItems: 'center', justifyContent: 'center' },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  zbbPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 999,
  },
  cardActions: { flexDirection: 'row', gap: 6 },
  miniBtn: { width: 30, height: 30, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  progressTrack: { width: '100%', overflow: 'hidden' },
  progressFill: { height: '100%' },
  budgetFooter: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
});
