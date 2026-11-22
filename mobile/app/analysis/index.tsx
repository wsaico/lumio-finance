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
  AlertTriangle,
  ArrowDownLeft,
  ArrowUpRight,
  Calendar,
  CheckCircle2,
  Coffee,
  CreditCard,
  Flame,
  Info,
  Layers,
  Minus,
  Plus,
  Shield,
  Sparkles,
  Target,
  TrendingDown,
  TrendingUp,
  Wallet,
} from 'lucide-react-native';
import { useAppTheme } from '@/theme/ThemeProvider';
import { TopAppHeader } from '@/components/navigation/TopAppHeader';
import { CurvedHeroHeader } from '@/components/ui/CurvedHeroHeader';
import { PremiumCard } from '@/components/ui/PremiumCard';
import { AnimatedNumber } from '@/components/ui/AnimatedNumber';
import { SegmentedControl } from '@/components/ui/SegmentedControl';
import { HealthScoreGauge } from '@/components/charts/HealthScoreGauge';
import { DualSplineAreaChart } from '@/components/charts/DualSplineAreaChart';
import { DonutBreakdownChart } from '@/components/charts/DonutBreakdownChart';
import { CategoryIcon } from '@/components/ui/CategoryIcon';
import { EmptyStateCard } from '@/components/ui/EmptyStateCard';
import { ShimmerSkeleton } from '@/components/ui/ShimmerSkeleton';
import { useFinancialAnalysis } from '@/hooks/useFinancialAnalysis';
import { useAccounts } from '@/hooks/useAccounts';
import { useCategories } from '@/hooks/useCategories';
import { useTransactions } from '@/hooks/useTransactions';
import { useFormat } from '@/hooks/useFormat';
import { useSettingsStore } from '@/stores/settings-store';
import { alphaHex } from '@/lib/color-math';
import { triggerHaptic } from '@/lib/haptics';

const PERIODS = [
  { id: 'this_month', label: 'Este mes' },
  { id: '1m', label: '30 días' },
  { id: '3m', label: '3 meses' },
  { id: '6m', label: '6 meses' },
  { id: '12m', label: '1 año' },
] as const;

type ViewTab = 'RESUMEN' | 'FLUJO' | 'REGLA' | 'PROYECCION';

export default function AnalysisScreen() {
  const theme = useAppTheme();
  const router = useRouter();
  const { formatMaskedMoney, formatCompactMoney, baseCurrency, isBalanceVisible } = useFormat();
  const noSpendTargetDays = useSettingsStore((s) => s.noSpendTargetDays);
  const setNoSpendTargetDays = useSettingsStore((s) => s.setNoSpendTargetDays);

  const [period, setPeriod] = useState<string>('this_month');
  const [type, setType] = useState<'ALL' | 'INCOME' | 'EXPENSE'>('ALL');
  const [accountId, setAccountId] = useState<string>('ALL');
  const [categoryId, setCategoryId] = useState<string>('ALL');
  const [viewTab, setViewTab] = useState<ViewTab>('RESUMEN');
  const [focusedSliceId, setFocusedSliceId] = useState<string | null>(null);

  const { accounts } = useAccounts();
  useCategories();
  const analysis = useFinancialAnalysis({ period, type, accountId, categoryId });
  const txQuery = useTransactions({
    accountId: accountId !== 'ALL' ? accountId : undefined,
    type: type !== 'ALL' ? type : undefined,
  });

  const data = analysis.data;
  const kpis = data?.kpis || {};
  const comparison = data?.comparison || {};
  const trend: any[] = data?.trend || [];
  const categories: any[] = data?.categories || [];
  const budgetRule = data?.budgetRule || {};
  const insights: any[] = data?.insights || [];
  const forecast = data?.forecast || {};
  const antExpenses = data?.antExpenses || {};
  const noSpendDays = antExpenses?.noSpendDays || {};
  const annualizedImpact: any[] = data?.annualizedImpact || [];
  const activeBudgets: any[] = data?.budgets || [];
  const activeLoans: any[] = data?.loans || [];

  const healthScore = Math.round(Number(kpis.healthScore) || 0);
  const scoreLabel =
    healthScore >= 80
      ? 'Excelente'
      : healthScore >= 60
        ? 'Saludable'
        : healthScore >= 40
          ? 'Atención'
          : 'En construcción';

  const splineData = useMemo(() => {
    if (!trend.length) return [{ label: 'Hoy', primary: 0, secondary: 0 }];
    return trend.map((pt: any) => ({
      label: String(pt.name || ''),
      primary: Number(pt.income || 0),
      secondary: Number(pt.expense || 0),
    }));
  }, [trend]);

  const donutSlices = useMemo(
    () =>
      categories.slice(0, 7).map((c: any) => ({
        id: c.id,
        name: c.name,
        value: Number(c.amount || 0),
        color: c.color || theme.brand,
      })),
    [categories, theme.brand]
  );

  const drillDownTxs = useMemo(() => {
    if (!focusedSliceId) return [];
    return (txQuery.transactions || [])
      .filter((tx: any) => {
        if (focusedSliceId === 'uncategorized') {
          return !tx.expense_category_id && !tx.income_category_id;
        }
        return (
          tx.expense_category_id === focusedSliceId ||
          tx.income_category_id === focusedSliceId ||
          tx.subcategory_id === focusedSliceId
        );
      })
      .slice(0, 5);
  }, [focusedSliceId, txQuery.transactions]);

  const rulePillars = useMemo(() => {
    const needs = budgetRule.needs || {};
    const wants = budgetRule.wants || {};
    const savings = budgetRule.savings || {};
    return [
      {
        id: 'needs',
        title: 'Necesidades Esenciales',
        subtitle: 'Vivienda, alimentación, servicios, salud',
        targetPct: 50,
        actualPct: Math.round(Number(needs.percent || 0)),
        amount: Number(needs.amount || 0),
        ok: needs.status !== 'WARNING',
        color: theme.brand,
      },
      {
        id: 'wants',
        title: 'Estilo de Vida y Ocio',
        subtitle: 'Restaurantes, compras y entretenimiento',
        targetPct: 30,
        actualPct: Math.round(Number(wants.percent || 0)),
        amount: Number(wants.amount || 0),
        ok: wants.status !== 'WARNING',
        color: theme.coral,
      },
      {
        id: 'savings',
        title: 'Ahorro y Libertad',
        subtitle: 'Retención neta, metas y amortización',
        targetPct: 20,
        actualPct: Math.round(Number(savings.percent || 0)),
        amount: Number(savings.amount || 0),
        ok: savings.status !== 'WARNING',
        color: theme.income,
      },
    ];
  }, [budgetRule, theme.brand, theme.coral, theme.income]);

  const shortfallRisk: 'SAFE' | 'TIGHT' | 'SHORTFALL' = forecast.shortfallRisk || 'SAFE';
  const riskColor =
    shortfallRisk === 'SHORTFALL'
      ? theme.expense
      : shortfallRisk === 'TIGHT'
        ? theme.warning
        : theme.income;
  const riskLabel =
    shortfallRisk === 'SHORTFALL'
      ? 'Riesgo de quedar corto'
      : shortfallRisk === 'TIGHT'
        ? 'Cierre ajustado'
        : 'En zona segura';

  const topLeaks: any[] = antExpenses.topLeaks || [];
  const topAnt = topLeaks[0];
  const noSpendCount = Number(noSpendDays.countThisMonth || 0);
  const noSpendPct =
    noSpendTargetDays > 0
      ? Math.min(100, Math.round((noSpendCount / noSpendTargetDays) * 100))
      : 0;

  const monthEndCard = (
    <PremiumCard padding={16} style={{ gap: 10 }}>
      <View style={styles.drillTop}>
        <View style={styles.secHeader}>
          <Wallet size={16} color={riskColor} />
          <Text style={{ color: theme.text, fontFamily: theme.font('800'), fontSize: theme.sp(14.5) }}>
            Proyección a fin de mes
          </Text>
        </View>
        <View style={[styles.impactPill, { backgroundColor: alphaHex(riskColor, 0.14) }]}>
          <Text style={{ color: riskColor, fontFamily: theme.font('800'), fontSize: 10.5 }}>
            {riskLabel}
          </Text>
        </View>
      </View>

      <Text style={{ color: theme.textMuted, fontFamily: theme.font('600'), fontSize: theme.sp(12) }}>
        Llegarás a fin de mes con
      </Text>
      <Text
        style={{
          color: shortfallRisk === 'SHORTFALL' ? theme.expense : theme.text,
          fontFamily: theme.font('800'),
          fontSize: theme.sp(26),
          fontVariant: ['tabular-nums'],
        }}
      >
        {formatMaskedMoney(forecast.projectedMonthEndBalance ?? 0)}
      </Text>

      {shortfallRisk === 'SHORTFALL' ? (
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            gap: 8,
            padding: 10,
            borderRadius: 12,
            backgroundColor: alphaHex(theme.expense, 0.1),
          }}
        >
          <AlertTriangle size={15} color={theme.expense} />
          <Text style={{ flex: 1, color: theme.text, fontFamily: theme.font('600'), fontSize: 11.5 }}>
            Podrías quedar corto por {formatMaskedMoney(forecast.shortfallAmount || 0)} si mantienes este ritmo y pagas tus compromisos pendientes.
          </Text>
        </View>
      ) : null}

      {forecast.incomeIsVariable ? (
        <View
          style={{
            padding: 10,
            borderRadius: 12,
            backgroundColor: theme.muted,
            gap: 3,
          }}
        >
          <Text style={{ color: theme.textSecondary, fontFamily: theme.font('700'), fontSize: 11.5 }}>
            Ingresos variables detectados: cálculo conservador sin asumir cobros pendientes.
          </Text>
          {Number(forecast.optimisticMonthEndBalance || 0) >
          Number(forecast.projectedMonthEndBalance || 0) ? (
            <Text style={{ color: theme.textMuted, fontFamily: theme.font('500'), fontSize: 11 }}>
              Con tu ingreso mínimo previo: hasta {formatMaskedMoney(forecast.optimisticMonthEndBalance)}.
            </Text>
          ) : null}
        </View>
      ) : null}

      <View style={styles.kpiGrid}>
        <View style={{ flex: 1 }}>
          <Text style={{ color: theme.textMuted, fontFamily: theme.font('600'), fontSize: 11 }}>
            Pagos fijos pendientes
          </Text>
          <Text style={{ color: theme.text, fontFamily: theme.font('800'), fontSize: 13.5, fontVariant: ['tabular-nums'] }}>
            {formatMaskedMoney(forecast.upcomingFixedBills || 0)}
          </Text>
        </View>
        <View style={{ flex: 1 }}>
          <Text style={{ color: theme.textMuted, fontFamily: theme.font('600'), fontSize: 11 }}>
            Días restantes
          </Text>
          <Text style={{ color: theme.text, fontFamily: theme.font('800'), fontSize: 13.5, fontVariant: ['tabular-nums'] }}>
            {Number(forecast.daysLeftInMonth || 0)} días
          </Text>
        </View>
      </View>
    </PremiumCard>
  );

  const antExpensesCard = (
    <PremiumCard padding={16} style={{ gap: 12 }}>
      <View style={styles.drillTop}>
        <View style={styles.secHeader}>
          <Coffee size={16} color={theme.coral} />
          <Text style={{ color: theme.text, fontFamily: theme.font('800'), fontSize: theme.sp(14.5) }}>
            Detector de Gastos Hormiga
          </Text>
        </View>
        {Number(antExpenses.count || 0) > 0 ? (
          <View style={[styles.impactPill, { backgroundColor: alphaHex(theme.coral, 0.14) }]}>
            <Text style={{ color: theme.coral, fontFamily: theme.font('800'), fontSize: 10.5 }}>
              {antExpenses.count} compras · {Math.round(Number(antExpenses.percentOfExpense || 0))}%
            </Text>
          </View>
        ) : null}
      </View>

      {topLeaks.length === 0 ? (
        <Text style={{ color: theme.textMuted, fontFamily: theme.font('500'), fontSize: 12 }}>
          No detectamos fugas frecuentes menores a {formatMaskedMoney(antExpenses.threshold || 40)} en este período.
        </Text>
      ) : (
        <View style={{ gap: 8 }}>
          <Text style={{ color: theme.textSecondary, fontFamily: theme.font('600'), fontSize: 12 }}>
            Suman{' '}
            <Text style={{ color: theme.coral, fontFamily: theme.font('800') }}>
              {formatMaskedMoney(antExpenses.totalMonthly || 0)}
            </Text>{' '}
            al mes en compras frecuentes de hasta {formatMaskedMoney(antExpenses.threshold || 40)}.
          </Text>

          {topLeaks.map((leak: any, idx: number) => (
            <View key={idx} style={[styles.annualRow, { backgroundColor: theme.muted }]}>
              <View style={[styles.dotColor, { backgroundColor: leak.color || theme.coral }]} />
              <View style={{ flex: 1 }}>
                <Text numberOfLines={1} style={{ color: theme.text, fontFamily: theme.font('700'), fontSize: 13 }}>
                  {leak.name}
                </Text>
                <Text style={{ color: theme.textMuted, fontFamily: theme.font('500'), fontSize: 11 }}>
                  {leak.count}x · prom. {formatMaskedMoney(leak.avgTicket || 0)}
                </Text>
              </View>
              <View style={{ alignItems: 'flex-end' }}>
                <Text style={{ color: theme.coral, fontFamily: theme.font('800'), fontSize: 13, fontVariant: ['tabular-nums'] }}>
                  {formatMaskedMoney(leak.total || 0)}
                </Text>
                <Text style={{ color: theme.textMuted, fontFamily: theme.font('500'), fontSize: 10 }}>
                  {formatMaskedMoney(leak.yearlyProjection || 0)}/año
                </Text>
              </View>
            </View>
          ))}

          {topAnt ? (
            <View style={{ padding: 10, borderRadius: 12, backgroundColor: theme.brandSoft }}>
              <Text style={{ color: theme.brand, fontFamily: theme.font('700'), fontSize: 11.5 }}>
                Sugerencia: si reduces &quot;{topAnt.name}&quot; a la mitad, ahorras {formatMaskedMoney((topAnt.total || 0) / 2)} al mes ({formatMaskedMoney((topAnt.yearlyProjection || 0) / 2)} al año).
              </Text>
            </View>
          ) : null}
        </View>
      )}

      {/* Reto Día sin Gasto */}
      <View style={[styles.drillBox, { borderTopColor: theme.border }]}>
        <View style={styles.drillTop}>
          <View style={styles.secHeader}>
            <Target size={15} color={theme.income} />
            <Text style={{ color: theme.text, fontFamily: theme.font('800'), fontSize: 13 }}>
              Reto Día sin Gasto
            </Text>
          </View>
          <View
            style={[
              styles.impactPill,
              {
                backgroundColor: noSpendDays.todayIsNoSpend ? theme.incomeSoft : theme.muted,
              },
            ]}
          >
            <Text
              style={{
                color: noSpendDays.todayIsNoSpend ? theme.income : theme.textMuted,
                fontFamily: theme.font('800'),
                fontSize: 10,
              }}
            >
              {noSpendDays.todayIsNoSpend ? 'Hoy vas S/. 0' : 'Con gasto hoy'}
            </Text>
          </View>
        </View>

        <View style={styles.drillTop}>
          <Text style={{ color: theme.textSecondary, fontFamily: theme.font('600'), fontSize: 12 }}>
            {noSpendCount} de {noSpendTargetDays} días logrados este mes
          </Text>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <Pressable
              onPress={() => setNoSpendTargetDays(noSpendTargetDays - 1)}
              style={{
                width: 26,
                height: 26,
                borderRadius: 8,
                backgroundColor: theme.muted,
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Minus size={13} color={theme.text} />
            </Pressable>
            <Pressable
              onPress={() => setNoSpendTargetDays(noSpendTargetDays + 1)}
              style={{
                width: 26,
                height: 26,
                borderRadius: 8,
                backgroundColor: theme.muted,
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Plus size={13} color={theme.text} />
            </Pressable>
          </View>
        </View>

        <View style={[styles.ruleTrack, { backgroundColor: theme.muted, height: 7 }]}>
          <View
            style={{
              width: `${noSpendPct}%`,
              height: '100%',
              backgroundColor: theme.income,
              borderRadius: 999,
            }}
          />
        </View>
      </View>
    </PremiumCard>
  );

  return (
    <View style={[styles.screen, { backgroundColor: theme.bg }]}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scroll}
        refreshControl={
          <RefreshControl
            refreshing={analysis.isFetching}
            onRefresh={() => {
              void analysis.refetch();
            }}
            tintColor={theme.brand}
          />
        }
      >
        <CurvedHeroHeader>
          <TopAppHeader
            title="Análisis Experto"
            subtitle="Diagnóstico integral 2027"
            showBack
            onHero
          />

          {analysis.isLoading ? (
            <ShimmerSkeleton height={130} borderRadius={22} style={{ marginTop: 12 }} />
          ) : (
            <View style={styles.heroScoreRow}>
              <View style={[styles.gaugeBox, { backgroundColor: theme.card }]}>
                <HealthScoreGauge score={healthScore} statusLabel={scoreLabel} size={116} />
              </View>
              <View style={{ flex: 1, gap: 6 }}>
                <Text style={{ color: 'rgba(255,255,255,0.75)', fontFamily: theme.font('600'), fontSize: theme.sp(12) }}>
                  Flujo neto del período
                </Text>
                <AnimatedNumber
                  value={Number(kpis.netCashFlow || 0)}
                  currencyCode={baseCurrency}
                  hidden={!isBalanceVisible}
                  style={{ color: '#FFFFFF', fontFamily: theme.font('800'), fontSize: theme.sp(25) }}
                />
                <View style={styles.heroBadgeRow}>
                  <View style={styles.heroMiniBadge}>
                    <Shield size={12} color="#FFFFFF" />
                    <Text style={{ color: '#FFFFFF', fontFamily: theme.font('700'), fontSize: theme.sp(11) }}>
                      Oxígeno: {Number(kpis.runwayMonths || 0).toFixed(1)} meses
                    </Text>
                  </View>
                  <View style={styles.heroMiniBadge}>
                    <Flame size={12} color="#FFB085" />
                    <Text style={{ color: '#FFFFFF', fontFamily: theme.font('700'), fontSize: theme.sp(11) }}>
                      Ahorro: {Math.round(Number(kpis.savingsRate || 0))}%
                    </Text>
                  </View>
                </View>
              </View>
            </View>
          )}
        </CurvedHeroHeader>

        <View style={styles.body}>
          {/* Filter Chips */}
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipRow}>
            {PERIODS.map((p) => {
              const active = period === p.id;
              return (
                <Pressable
                  key={p.id}
                  onPress={() => {
                    triggerHaptic('selection');
                    setPeriod(p.id);
                  }}
                  style={[
                    styles.filterChip,
                    {
                      backgroundColor: active ? theme.brand : theme.card,
                      borderColor: active ? theme.brand : theme.border,
                    },
                  ]}
                >
                  <Calendar size={12} color={active ? '#FFFFFF' : theme.textMuted} />
                  <Text style={{ color: active ? '#FFFFFF' : theme.text, fontFamily: theme.font('700'), fontSize: theme.sp(12) }}>
                    {p.label}
                  </Text>
                </Pressable>
              );
            })}
          </ScrollView>

          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipRow}>
            <Pressable
              onPress={() => setAccountId('ALL')}
              style={[
                styles.filterChip,
                {
                  backgroundColor: accountId === 'ALL' ? alphaHex(theme.coral, 0.14) : theme.card,
                  borderColor: accountId === 'ALL' ? theme.coral : theme.border,
                },
              ]}
            >
              <Wallet size={12} color={accountId === 'ALL' ? theme.coral : theme.textMuted} />
              <Text style={{ color: accountId === 'ALL' ? theme.coral : theme.textSecondary, fontFamily: theme.font('700'), fontSize: theme.sp(11.5) }}>
                Todas las cuentas
              </Text>
            </Pressable>
            {accounts.map((acc) => {
              const active = accountId === acc.id;
              return (
                <Pressable
                  key={acc.id}
                  onPress={() => setAccountId(active ? 'ALL' : acc.id)}
                  style={[
                    styles.filterChip,
                    {
                      backgroundColor: active ? alphaHex(theme.coral, 0.14) : theme.card,
                      borderColor: active ? theme.coral : theme.border,
                    },
                  ]}
                >
                  <Text style={{ color: active ? theme.coral : theme.textSecondary, fontFamily: theme.font('600'), fontSize: theme.sp(11.5) }}>
                    {acc.name}
                  </Text>
                </Pressable>
              );
            })}
          </ScrollView>

          <SegmentedControl
            value={viewTab}
            onChange={setViewTab}
            options={[
              { id: 'RESUMEN', label: 'Resumen' },
              { id: 'FLUJO', label: 'Flujo' },
              { id: 'REGLA', label: '50/30/20' },
              { id: 'PROYECCION', label: 'Proyección' },
            ]}
          />

          {/* KPI Grid + Proyección Fin de Mes + Gastos Hormiga */}
          {viewTab === 'RESUMEN' && (
            <>
              <View style={styles.kpiGrid}>
                <PremiumCard padding={14} style={styles.kpiBox}>
                  <View style={styles.kpiHead}>
                    <View style={[styles.kpiIcon, { backgroundColor: alphaHex(theme.income, 0.14) }]}>
                      <ArrowDownLeft size={15} color={theme.income} />
                    </View>
                    {comparison.incomeChange ? (
                      <Text style={{ color: comparison.incomeChange >= 0 ? theme.income : theme.expense, fontFamily: theme.font('700'), fontSize: 11 }}>
                        {comparison.incomeChange >= 0 ? '+' : ''}
                        {comparison.incomeChange}%
                      </Text>
                    ) : null}
                  </View>
                  <Text style={{ color: theme.textMuted, fontFamily: theme.font('600'), fontSize: theme.sp(11.5) }}>
                    Ingresos
                  </Text>
                  <Text style={{ color: theme.text, fontFamily: theme.font('800'), fontSize: theme.sp(17), fontVariant: ['tabular-nums'] }}>
                    {formatMaskedMoney(kpis.income || 0)}
                  </Text>
                </PremiumCard>

                <PremiumCard padding={14} style={styles.kpiBox}>
                  <View style={styles.kpiHead}>
                    <View style={[styles.kpiIcon, { backgroundColor: alphaHex(theme.coral, 0.16) }]}>
                      <ArrowUpRight size={15} color={theme.coral} />
                    </View>
                    {comparison.expenseChange ? (
                      <Text style={{ color: comparison.expenseChange <= 0 ? theme.income : theme.expense, fontFamily: theme.font('700'), fontSize: 11 }}>
                        {comparison.expenseChange >= 0 ? '+' : ''}
                        {comparison.expenseChange}%
                      </Text>
                    ) : null}
                  </View>
                  <Text style={{ color: theme.textMuted, fontFamily: theme.font('600'), fontSize: theme.sp(11.5) }}>
                    Gastos
                  </Text>
                  <Text style={{ color: theme.text, fontFamily: theme.font('800'), fontSize: theme.sp(17), fontVariant: ['tabular-nums'] }}>
                    {formatMaskedMoney(kpis.expense || 0)}
                  </Text>
                </PremiumCard>

                <PremiumCard padding={14} style={styles.kpiBox}>
                  <View style={styles.kpiHead}>
                    <View style={[styles.kpiIcon, { backgroundColor: theme.brandSoft }]}>
                      <Wallet size={15} color={theme.brand} />
                    </View>
                  </View>
                  <Text style={{ color: theme.textMuted, fontFamily: theme.font('600'), fontSize: theme.sp(11.5) }}>
                    Liquidez total
                  </Text>
                  <Text style={{ color: theme.text, fontFamily: theme.font('800'), fontSize: theme.sp(17), fontVariant: ['tabular-nums'] }}>
                    {formatMaskedMoney(kpis.totalLiquidity || 0)}
                  </Text>
                </PremiumCard>

                <PremiumCard padding={14} style={styles.kpiBox}>
                  <View style={styles.kpiHead}>
                    <View style={[styles.kpiIcon, { backgroundColor: alphaHex(theme.expense, 0.14) }]}>
                      <CreditCard size={15} color={theme.expense} />
                    </View>
                  </View>
                  <Text style={{ color: theme.textMuted, fontFamily: theme.font('600'), fontSize: theme.sp(11.5) }}>
                    Deuda y tarjetas
                  </Text>
                  <Text style={{ color: theme.text, fontFamily: theme.font('800'), fontSize: theme.sp(17), fontVariant: ['tabular-nums'] }}>
                    {formatMaskedMoney(kpis.liabilities || 0)}
                  </Text>
                </PremiumCard>
              </View>

              {monthEndCard}
              {antExpensesCard}

              {/* Insights Section */}
              {insights.length > 0 && (
                <View style={{ gap: 10 }}>
                  <View style={styles.secHeader}>
                    <Sparkles size={15} color={theme.brand} />
                    <Text style={{ color: theme.text, fontFamily: theme.font('800'), fontSize: theme.sp(15) }}>
                      Hallazgos inteligentes
                    </Text>
                  </View>
                  {insights.map((ins: any, i: number) => {
                    const color =
                      ins.type === 'SUCCESS'
                        ? theme.income
                        : ins.type === 'DANGER'
                          ? theme.expense
                          : ins.type === 'WARNING' || ins.type === 'CAUTION'
                            ? theme.warning
                            : theme.brand;
                    const InsIcon =
                      ins.type === 'SUCCESS'
                        ? CheckCircle2
                        : ins.type === 'DANGER' || ins.type === 'WARNING'
                          ? AlertTriangle
                          : Info;
                    return (
                      <PremiumCard key={i} padding={14} style={{ flexDirection: 'row', gap: 12, alignItems: 'flex-start' }}>
                        <View style={[styles.insIcon, { backgroundColor: alphaHex(color, 0.14) }]}>
                          <InsIcon size={17} color={color} />
                        </View>
                        <View style={{ flex: 1, gap: 3 }}>
                          <View style={styles.insTop}>
                            <Text style={{ flex: 1, color: theme.text, fontFamily: theme.font('800'), fontSize: theme.sp(13.5) }}>
                              {ins.title}
                            </Text>
                            <View style={[styles.impactPill, { backgroundColor: alphaHex(color, 0.14) }]}>
                              <Text style={{ color, fontFamily: theme.font('800'), fontSize: 10 }}>
                                {ins.impact}
                              </Text>
                            </View>
                          </View>
                          <Text style={{ color: theme.textSecondary, fontFamily: theme.font('500'), fontSize: theme.sp(12) }}>
                            {ins.message}
                          </Text>
                        </View>
                      </PremiumCard>
                    );
                  })}
                </View>
              )}
            </>
          )}

          {/* Flujo & Categories */}
          {(viewTab === 'RESUMEN' || viewTab === 'FLUJO') && (
            <>
              <PremiumCard padding={16} style={{ gap: 10 }}>
                <View style={styles.secHeader}>
                  <TrendingUp size={16} color={theme.brand} />
                  <Text style={{ flex: 1, color: theme.text, fontFamily: theme.font('800'), fontSize: theme.sp(14.5) }}>
                    Evolución Ingresos vs Gastos
                  </Text>
                </View>
                <DualSplineAreaChart
                  data={splineData}
                  formatValue={(n) => (isBalanceVisible ? formatCompactMoney(n) : '•••')}
                />
              </PremiumCard>

              {viewTab === 'FLUJO' && (
                <SegmentedControl
                  value={type}
                  onChange={setType}
                  options={[
                    { id: 'ALL', label: 'Todos' },
                    { id: 'EXPENSE', label: 'Gastos' },
                    { id: 'INCOME', label: 'Ingresos' },
                  ]}
                />
              )}

              <PremiumCard padding={16} style={{ gap: 12 }}>
                <View style={styles.secHeader}>
                  <Layers size={16} color={theme.coral} />
                  <Text style={{ flex: 1, color: theme.text, fontFamily: theme.font('800'), fontSize: theme.sp(14.5) }}>
                    Desglose por categoría
                  </Text>
                  {focusedSliceId && (
                    <Pressable onPress={() => setFocusedSliceId(null)}>
                      <Text style={{ color: theme.brand, fontFamily: theme.font('700'), fontSize: theme.sp(12) }}>
                        Ver todas
                      </Text>
                    </Pressable>
                  )}
                </View>

                {donutSlices.length === 0 ? (
                  <EmptyStateCard
                    icon={<Layers size={24} color={theme.brand} />}
                    title="Sin gastos categorizados"
                    description="Registra gastos en el período seleccionado para ver el mapa interactivo."
                  />
                ) : (
                  <DonutBreakdownChart
                    slices={donutSlices}
                    centerLabel={
                      isBalanceVisible ? formatCompactMoney(kpis.expense || 0) : '••••'
                    }
                    centerSublabel="Total"
                    focusedId={focusedSliceId}
                    onSelectSlice={(s) =>
                      setFocusedSliceId((prev) => (prev === (s.id || s.name) ? null : s.id || s.name))
                    }
                    formatValue={(n) => (isBalanceVisible ? formatMaskedMoney(n) : '••••••')}
                    hideLegend
                  />
                )}

                {categories.map((cat: any) => {
                  const active = focusedSliceId === cat.id;
                  return (
                    <Pressable
                      key={cat.id}
                      onPress={() =>
                        setFocusedSliceId((prev) => (prev === cat.id ? null : cat.id))
                      }
                      style={[
                        styles.catRow,
                        {
                          backgroundColor: active ? alphaHex(cat.color || theme.brand, 0.1) : theme.muted,
                          borderColor: active ? cat.color || theme.brand : 'transparent',
                        },
                      ]}
                    >
                      <View style={[styles.catBadge, { backgroundColor: cat.color || theme.brand }]}>
                        <CategoryIcon name={cat.icon || 'tags'} size={14} color="#FFFFFF" />
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={{ color: theme.text, fontFamily: theme.font('700'), fontSize: theme.sp(13) }}>
                          {cat.name}
                        </Text>
                        <Text style={{ color: theme.textMuted, fontFamily: theme.font('500'), fontSize: theme.sp(11) }}>
                          {cat.count} mov. · {Math.round(Number(cat.percent || 0))}%
                        </Text>
                      </View>
                      <Text style={{ color: theme.text, fontFamily: theme.font('800'), fontSize: theme.sp(13.5), fontVariant: ['tabular-nums'] }}>
                        {formatMaskedMoney(cat.amount || 0)}
                      </Text>
                    </Pressable>
                  );
                })}

                {focusedSliceId && drillDownTxs.length > 0 && (
                  <View style={[styles.drillBox, { borderTopColor: theme.border }]}>
                    <View style={styles.drillTop}>
                      <Text style={{ color: theme.textSecondary, fontFamily: theme.font('700'), fontSize: theme.sp(12) }}>
                        Movimientos recientes en esta categoría
                      </Text>
                      <Pressable onPress={() => router.push('/(tabs)/transactions' as any)}>
                        <Text style={{ color: theme.brand, fontFamily: theme.font('700'), fontSize: theme.sp(12) }}>
                          Ver historial
                        </Text>
                      </Pressable>
                    </View>
                    {drillDownTxs.map((tx: any) => (
                      <Pressable
                        key={tx.id}
                        onPress={() => router.push(`/transactions/${tx.id}` as any)}
                        style={styles.drillTxRow}
                      >
                        <Text numberOfLines={1} style={{ flex: 1, color: theme.text, fontFamily: theme.font('600'), fontSize: theme.sp(12.5) }}>
                          {tx.description || 'Movimiento'}
                        </Text>
                        <Text style={{ color: theme.text, fontFamily: theme.font('800'), fontSize: theme.sp(12.5), fontVariant: ['tabular-nums'] }}>
                          {formatMaskedMoney(tx.amount, tx.currency_code || baseCurrency)}
                        </Text>
                      </Pressable>
                    ))}
                  </View>
                )}
              </PremiumCard>
            </>
          )}

          {/* Regla 50/30/20 */}
          {viewTab === 'REGLA' && (
            <View style={{ gap: 12 }}>
              <PremiumCard variant="hero-violet" padding={18} style={{ gap: 8 }}>
                <Text style={{ color: 'rgba(255,255,255,0.8)', fontFamily: theme.font('600'), fontSize: theme.sp(12) }}>
                  Equilibrio de ingresos
                </Text>
                <Text style={{ color: '#FFFFFF', fontFamily: theme.font('800'), fontSize: theme.sp(20) }}>
                  Regla 50 / 30 / 20
                </Text>
                <Text style={{ color: 'rgba(255,255,255,0.85)', fontFamily: theme.font('500'), fontSize: theme.sp(12.5) }}>
                  Compara cuánto de tus ingresos va a necesidades fijas, estilo de vida y ahorro o pago de deuda.
                </Text>
              </PremiumCard>

              {rulePillars.map((pillar) => (
                <PremiumCard key={pillar.id} padding={16} style={{ gap: 10 }}>
                  <View style={styles.pillarTop}>
                    <View style={{ flex: 1 }}>
                      <Text style={{ color: theme.text, fontFamily: theme.font('800'), fontSize: theme.sp(14.5) }}>
                        {pillar.title}
                      </Text>
                      <Text style={{ color: theme.textMuted, fontFamily: theme.font('500'), fontSize: theme.sp(11.5) }}>
                        {pillar.subtitle}
                      </Text>
                    </View>
                    <View style={[styles.impactPill, { backgroundColor: alphaHex(pillar.ok ? theme.income : theme.warning, 0.15) }]}>
                      <Text style={{ color: pillar.ok ? theme.income : theme.warning, fontFamily: theme.font('800'), fontSize: 11 }}>
                        {pillar.actualPct}% / {pillar.targetPct}%
                      </Text>
                    </View>
                  </View>

                  <View style={[styles.ruleTrack, { backgroundColor: theme.muted }]}>
                    <View
                      style={{
                        width: `${Math.min(100, pillar.actualPct)}%`,
                        height: '100%',
                        backgroundColor: pillar.ok ? pillar.color : theme.expense,
                        borderRadius: 999,
                      }}
                    />
                  </View>

                  <Text style={{ color: theme.textSecondary, fontFamily: theme.font('700'), fontSize: theme.sp(13), fontVariant: ['tabular-nums'] }}>
                    {formatMaskedMoney(pillar.amount)} en el período
                  </Text>
                </PremiumCard>
              ))}
            </View>
          )}

          {/* Proyección, Hormiga & Fugas Anualizadas */}
          {viewTab === 'PROYECCION' && (
            <View style={{ gap: 12 }}>
              {monthEndCard}
              {antExpensesCard}

              <View style={styles.kpiGrid}>
                <PremiumCard padding={16} style={styles.kpiBox}>
                  <TrendingDown size={18} color={theme.coral} />
                  <Text style={{ color: theme.textMuted, fontFamily: theme.font('600'), fontSize: theme.sp(11.5), marginTop: 6 }}>
                    Cierre de gasto estimado
                  </Text>
                  <Text style={{ color: theme.text, fontFamily: theme.font('800'), fontSize: theme.sp(17), fontVariant: ['tabular-nums'] }}>
                    {formatMaskedMoney(forecast.predictedMonthEndExpense || 0)}
                  </Text>
                </PremiumCard>

                <PremiumCard padding={16} style={styles.kpiBox}>
                  <TrendingUp size={18} color={theme.income} />
                  <Text style={{ color: theme.textMuted, fontFamily: theme.font('600'), fontSize: theme.sp(11.5), marginTop: 6 }}>
                    Ahorro anual proyectado
                  </Text>
                  <Text style={{ color: theme.income, fontFamily: theme.font('800'), fontSize: theme.sp(17), fontVariant: ['tabular-nums'] }}>
                    {formatMaskedMoney(forecast.estimatedYearlySavings || 0)}
                  </Text>
                </PremiumCard>
              </View>

              <PremiumCard padding={16} style={{ gap: 10 }}>
                <Text style={{ color: theme.text, fontFamily: theme.font('800'), fontSize: theme.sp(14.5) }}>
                  Impacto anualizado de tus principales categorías
                </Text>
                {annualizedImpact.length === 0 ? (
                  <Text style={{ color: theme.textMuted, fontFamily: theme.font('500'), fontSize: theme.sp(12.5) }}>
                    Registra gastos para calcular su impacto proyectado a 12 meses.
                  </Text>
                ) : (
                  annualizedImpact.map((item: any) => (
                    <View key={item.id} style={[styles.annualRow, { backgroundColor: theme.muted }]}>
                      <View style={[styles.dotColor, { backgroundColor: item.color || theme.brand }]} />
                      <View style={{ flex: 1 }}>
                        <Text style={{ color: theme.text, fontFamily: theme.font('700'), fontSize: theme.sp(13.5) }}>
                          {item.name}
                        </Text>
                        <Text style={{ color: theme.textMuted, fontFamily: theme.font('500'), fontSize: theme.sp(11) }}>
                          {formatMaskedMoney(item.monthly || 0)} / mes ({Math.round(Number(item.percent || 0))}%)
                        </Text>
                      </View>
                      <Text style={{ color: theme.coral, fontFamily: theme.font('800'), fontSize: theme.sp(13.5), fontVariant: ['tabular-nums'] }}>
                        {formatMaskedMoney(item.yearly || 0)} / año
                      </Text>
                    </View>
                  ))
                )}
              </PremiumCard>

              {activeBudgets.length > 0 && (
                <PremiumCard padding={16} style={{ gap: 10 }}>
                  <View style={styles.drillTop}>
                    <Text style={{ color: theme.text, fontFamily: theme.font('800'), fontSize: theme.sp(14.5) }}>
                      Monitor de presupuestos activos
                    </Text>
                    <Pressable onPress={() => router.push('/budgets' as any)}>
                      <Text style={{ color: theme.brand, fontFamily: theme.font('700'), fontSize: theme.sp(12) }}>
                        Abrir
                      </Text>
                    </Pressable>
                  </View>
                  {activeBudgets.map((b: any) => (
                    <View key={b.id} style={{ gap: 4 }}>
                      <View style={styles.drillTop}>
                        <Text style={{ color: theme.text, fontFamily: theme.font('700'), fontSize: theme.sp(12.5) }}>
                          {b.name}
                        </Text>
                        <Text style={{ color: b.percent >= 100 ? theme.expense : theme.textSecondary, fontFamily: theme.font('800'), fontSize: theme.sp(12) }}>
                          {Math.round(Number(b.percent || 0))}%
                        </Text>
                      </View>
                      <View style={[styles.ruleTrack, { backgroundColor: theme.muted, height: 6 }]}>
                        <View
                          style={{
                            width: `${Math.min(100, Math.round(Number(b.percent || 0)))}%`,
                            height: '100%',
                            backgroundColor: b.percent >= 100 ? theme.expense : b.color || theme.brand,
                            borderRadius: 999,
                          }}
                        />
                      </View>
                    </View>
                  ))}
                </PremiumCard>
              )}

              {activeLoans.length > 0 && (
                <PremiumCard padding={16} style={{ gap: 10 }}>
                  <View style={styles.drillTop}>
                    <Text style={{ color: theme.text, fontFamily: theme.font('800'), fontSize: theme.sp(14.5) }}>
                      Compromisos y préstamos vigentes
                    </Text>
                    <Pressable onPress={() => router.push('/loans' as any)}>
                      <Text style={{ color: theme.brand, fontFamily: theme.font('700'), fontSize: theme.sp(12) }}>
                        Gestionar
                      </Text>
                    </Pressable>
                  </View>
                  {activeLoans.slice(0, 4).map((l: any) => (
                    <View key={l.id} style={styles.drillTop}>
                      <Text style={{ color: theme.text, fontFamily: theme.font('600'), fontSize: theme.sp(13) }}>
                        {l.person} · {l.type === 'LENT' ? 'Por cobrar' : 'Por pagar'}
                      </Text>
                      <Text
                        style={{
                          color: l.type === 'LENT' ? theme.income : theme.expense,
                          fontFamily: theme.font('800'),
                          fontSize: theme.sp(13),
                          fontVariant: ['tabular-nums'],
                        }}
                      >
                        {formatMaskedMoney(l.remaining || 0)}
                      </Text>
                    </View>
                  ))}
                </PremiumCard>
              )}
            </View>
          )}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  scroll: { paddingBottom: 42 },
  heroScoreRow: { flexDirection: 'row', alignItems: 'center', gap: 16, marginTop: 14 },
  gaugeBox: { borderRadius: 24, padding: 8 },
  heroBadgeRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 4 },
  heroMiniBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.16)',
  },
  body: { padding: 16, gap: 14 },
  chipRow: { gap: 8 },
  filterChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
    borderWidth: 1,
  },
  kpiGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  kpiBox: { width: '48.3%', gap: 4 },
  kpiHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 },
  kpiIcon: { width: 32, height: 32, borderRadius: 11, alignItems: 'center', justifyContent: 'center' },
  secHeader: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  insIcon: { width: 34, height: 34, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  insTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  impactPill: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 999 },
  catRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    padding: 11,
    borderRadius: 16,
    borderWidth: 1,
  },
  catBadge: { width: 30, height: 30, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  drillBox: { borderTopWidth: 1, paddingTop: 12, gap: 8 },
  drillTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  drillTxRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10, paddingVertical: 4 },
  pillarTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  ruleTrack: { height: 9, borderRadius: 999, overflow: 'hidden' },
  annualRow: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 12, borderRadius: 14 },
  dotColor: { width: 10, height: 10, borderRadius: 999 },
});
