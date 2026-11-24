import React, { useCallback, useMemo, useState } from 'react';
import {
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import {
  AlertTriangle,
  ArrowUpRight,
  BarChart3,
  CalendarClock,
  PieChart as PieChartIcon,
  Receipt,
  RefreshCw,
  Sparkles,
  TrendingDown,
  TrendingUp,
  WifiOff,
} from 'lucide-react-native';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { useAppTheme } from '@/theme/ThemeProvider';
import { useDashboardData } from '@/hooks/useDashboardData';
import { useAccounts } from '@/hooks/useAccounts';
import { useTransactions } from '@/hooks/useTransactions';
import { useSavingsGoals } from '@/hooks/useSavingsGoals';
import { useBudget } from '@/hooks/useBudget';
import { useSubscriptions } from '@/hooks/useSubscriptions';
import { useAccountsPayable } from '@/hooks/useLoans';
import { useExchangeRates } from '@/hooks/useExchangeRates';
import { useOfflineSync } from '@/hooks/useOfflineSync';
import { useUser } from '@/hooks/useUser';
import { useFormat } from '@/hooks/useFormat';
import { useManualRefresh } from '@/hooks/useManualRefresh';
import { useSettingsStore } from '@/stores/settings-store';
import { computeSafeToSpendToday } from '@/lib/peru-insights';
import { alphaHex } from '@/lib/color-math';
import { CurvedHeroHeader } from '@/components/ui/CurvedHeroHeader';
import { TopAppHeader } from '@/components/navigation/TopAppHeader';
import { AnimatedNumber } from '@/components/ui/AnimatedNumber';
import { PremiumCard } from '@/components/ui/PremiumCard';
import { CircularProgressRing } from '@/components/ui/CircularProgressRing';
import { DashboardSkeletonView } from '@/components/ui/ShimmerSkeleton';
import { DualSplineAreaChart } from '@/components/charts/DualSplineAreaChart';
import { GroupedBudgetBarChart } from '@/components/charts/GroupedBudgetBarChart';
import { MiniSparkline } from '@/components/charts/MiniSparkline';
import { TransactionListItem } from '@/components/transactions/TransactionListItem';
import { ConfirmAlertModal } from '@/components/alerts/ConfirmAlertModal';
import { triggerHaptic } from '@/lib/haptics';

let lastHomeFocusRefreshAt = 0;

export default function DashboardScreen() {
  const theme = useAppTheme();
  const router = useRouter();
  const { profile } = useUser();
  const { formatMaskedMoney, formatCompactMoney, baseCurrency, isBalanceVisible } = useFormat();
  const homeWidgets = useSettingsStore((s) => s.homeWidgets);

  const now = new Date();
  const { data, isLoading, refetch } = useDashboardData();
  const { totalBalanceConverted, accounts: fullAccounts, refetch: refetchAccounts } = useAccounts();
  const { transactions, deleteTransaction, refetch: refetchTx } = useTransactions({});
  const { data: goals = [] } = useSavingsGoals('ACTIVE');
  const { budgets, refetch: refetchBudgets } = useBudget(now.getFullYear(), now.getMonth() + 1);
  const { items: subscriptions, refetch: refetchSubs } = useSubscriptions();
  const payablesQuery = useAccountsPayable();
  const { convert } = useExchangeRates();
  const { isOffline, pendingCount, isSyncing, flushQueue } = useOfflineSync(false);

  const [heroTab, setHeroTab] = useState<'income' | 'expense'>('income');
  const [chartType, setChartType] = useState<'spline' | 'bars'>('bars');
  const [txToDelete, setTxToDelete] = useState<any>(null);

  const metrics = data?.metrics || {
    availableMoney: 0,
    totalIncome: 0,
    totalExpense: 0,
    netFlow: 0,
    savingsRate: 0,
    transactionsCount: 0,
    dailyIncomeAvg: 0,
    dailyExpenseAvg: 0,
  };
  const history = data?.history || [];
  const budgetAlerts = data?.budgetAlerts || [];
  const healthScore = Math.round(data?.healthScore || 0);
  const netWorth = totalBalanceConverted || metrics.availableMoney || 0;

  const currHist = history[history.length - 1];
  const prevHist = history[history.length - 2];
  const incomeDelta =
    prevHist && prevHist.income > 0
      ? Math.round(((metrics.totalIncome - prevHist.income) / prevHist.income) * 100)
      : 0;
  const expenseDelta =
    prevHist && prevHist.expense > 0
      ? Math.round(((metrics.totalExpense - prevHist.expense) / prevHist.expense) * 100)
      : 0;

  const topGoal = goals[0];
  const primaryAccount = fullAccounts[0];
  const savingsPct = Math.max(
    0,
    Math.min(100, Math.round(metrics.totalIncome > 0 ? metrics.savingsRate : healthScore))
  );

  const splineData = useMemo(
    () =>
      (history.length > 0 ? history : [{ month: 'Mes', income: 0, expense: 0, balance: 0 }]).map(
        (h) => ({
          label: h.month,
          primary: h.income,
          secondary: h.expense,
        })
      ),
    [history]
  );

  const barData = useMemo(
    () =>
      (history.length > 0 ? history : [{ month: 'Mes', income: 0, expense: 0 }]).map((h) => ({
        label: h.month,
        cost: h.expense,
        budget: h.income,
      })),
    [history]
  );

  const todayIso = useMemo(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  }, []);

  const todayExpenses = useMemo(() => {
    let sum = 0;
    for (const tx of transactions || []) {
      const txType = tx?.transactionType || tx?.type;
      if (txType !== 'EXPENSE') continue;
      const rawDate = tx?.transactionDate || tx?.transaction_date || tx?.date;
      if (!rawDate) continue;
      const d = new Date(rawDate);
      const localDay = Number.isNaN(d.getTime())
        ? String(rawDate).slice(0, 10)
        : `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
      if (localDay === todayIso) {
        const curr = tx?.account?.currencyCode || tx?.currencyCode || tx?.currency || baseCurrency;
        sum += convert(Number(tx?.amount || 0), curr, baseCurrency);
      }
    }
    return sum;
  }, [transactions, todayIso, convert, baseCurrency]);

  const safeToday = useMemo(
    () =>
      computeSafeToSpendToday({
        accounts: fullAccounts,
        budgets,
        subscriptions,
        payables: payablesQuery.data || [],
        baseCurrency,
        convert,
        todayExpenses,
      }),
    [fullAccounts, budgets, subscriptions, payablesQuery.data, baseCurrency, convert, todayExpenses]
  );

  const refreshAllHomeData = useCallback(async () => {
    await Promise.all([
      refetch(),
      refetchAccounts(),
      refetchTx(),
      refetchBudgets(),
      refetchSubs(),
      payablesQuery.refetch(),
    ]);
  }, [refetch, refetchAccounts, refetchTx, refetchBudgets, refetchSubs, payablesQuery]);

  useFocusEffect(
    useCallback(() => {
      const nowMs = Date.now();
      if (nowMs - lastHomeFocusRefreshAt < 35_000) return;
      lastHomeFocusRefreshAt = nowMs;
      void refreshAllHomeData();
    }, [refreshAllHomeData])
  );

  const { refreshing: manualRefreshing, onRefresh } = useManualRefresh(refreshAllHomeData);

  if (isLoading && !data) {
    return (
      <View style={[styles.flex, { backgroundColor: theme.bg }]}>
        <DashboardSkeletonView />
      </View>
    );
  }

  return (
    <View style={[styles.flex, { backgroundColor: theme.bg }]}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 118 }}
        refreshControl={
          <RefreshControl
            refreshing={manualRefreshing}
            onRefresh={onRefresh}
            tintColor={theme.brand}
          />
        }
      >
        {/* CURVED VIOLET HERO HEADER (Reference Image 1 + Lumio Smart Stats) */}
        <CurvedHeroHeader bottomRadius={34}>
          <TopAppHeader
            onHero
            title={`Hola, ${(profile?.full_name || 'Usuario').split(' ')[0]}`}
            subtitle={format(new Date(), "d 'de' MMMM · HH:mm", { locale: es })}
          />

          <View style={styles.heroCenter}>
            <AnimatedNumber
              value={netWorth}
              currencyCode={baseCurrency}
              hidden={!isBalanceVisible}
              style={{
                color: '#FFFFFF',
                fontFamily: theme.font('800'),
                fontSize: theme.sp(36),
                letterSpacing: -0.8,
              }}
            />
            <Text style={{ color: 'rgba(255,255,255,0.78)', fontFamily: theme.font('600'), fontSize: theme.sp(12.5) }}>
              Patrimonio Disponible Total
            </Text>

            <View style={styles.heroSwitchRow}>
              <Pressable
                onPress={() => {
                  triggerHaptic('selection');
                  setHeroTab('income');
                }}
                style={[styles.heroSwitchPill, heroTab === 'income' && styles.heroSwitchActive]}
              >
                <TrendingUp size={13} color="#34D399" />
                <Text style={{ color: '#FFFFFF', fontFamily: theme.font('700'), fontSize: 12 }}>
                  Ingresos · {formatMaskedMoney(metrics.totalIncome)}
                </Text>
              </Pressable>

              <Pressable
                onPress={() => {
                  triggerHaptic('selection');
                  setHeroTab('expense');
                }}
                style={[styles.heroSwitchPill, heroTab === 'expense' && styles.heroSwitchActive]}
              >
                <TrendingDown size={13} color="#FF8F4D" />
                <Text style={{ color: '#FFFFFF', fontFamily: theme.font('700'), fontSize: 12 }}>
                  Gastos · {formatMaskedMoney(metrics.totalExpense)}
                </Text>
              </Pressable>
            </View>
          </View>
        </CurvedHeroHeader>

        <View style={styles.content}>
          {/* Offline / Pending Sync Banner */}
          {isOffline || pendingCount > 0 ? (
            <Pressable
              onPress={() => {
                triggerHaptic('selection');
                void flushQueue(true);
              }}
              style={[
                styles.demoBanner,
                {
                  backgroundColor: isOffline
                    ? alphaHex(theme.warning, 0.14)
                    : alphaHex(theme.brand, 0.1),
                  borderColor: isOffline ? theme.warning : theme.brand,
                },
              ]}
            >
              {isOffline ? (
                <WifiOff size={16} color={theme.warning} />
              ) : (
                <RefreshCw size={16} color={theme.brand} />
              )}
              <Text style={{ flex: 1, color: theme.text, fontFamily: theme.font('700'), fontSize: 12 }}>
                {isOffline
                  ? `Sin conexión${pendingCount > 0 ? ` · ${pendingCount} movimiento(s) en cola` : '. Puedes registrar movimientos offline.'}`
                  : isSyncing
                    ? `Sincronizando ${pendingCount} movimiento(s)...`
                    : `${pendingCount} movimiento(s) por sincronizar · Toca para enviar`}
              </Text>
              {!isOffline && pendingCount > 0 ? (
                <Text style={{ color: theme.brand, fontFamily: theme.font('800'), fontSize: 11.5 }}>
                  Sincronizar
                </Text>
              ) : null}
            </Pressable>
          ) : null}

          {/* Demo Mode Banner */}
          {profile?.demo_mode_active ? (
            <Pressable
              onPress={() => router.push('/settings/general' as any)}
              style={[
                styles.demoBanner,
                { backgroundColor: theme.warningSoft, borderColor: theme.warning },
              ]}
            >
              <Sparkles size={16} color={theme.warning} />
              <Text style={{ flex: 1, color: theme.text, fontFamily: theme.font('700'), fontSize: 12 }}>
                Modo Demostración activo con datos de ejemplo. Toca para administrar en Ajustes.
              </Text>
              <ArrowUpRight size={15} color={theme.warning} />
            </Pressable>
          ) : null}

          {/* LIBRE PARA GASTAR HOY */}
          <Pressable
            onPress={() => {
              triggerHaptic('selection');
              router.push('/analysis' as any);
            }}
          >
            <PremiumCard variant="elevated" padding={16} style={{ gap: 10 }}>
              <View style={styles.sectionHeader}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 7 }}>
                  <CalendarClock
                    size={16}
                    color={
                      safeToday.status === 'DANGER'
                        ? theme.expense
                        : safeToday.status === 'TIGHT'
                          ? theme.warning
                          : theme.income
                    }
                  />
                  <Text style={{ color: theme.text, fontFamily: theme.font('800'), fontSize: theme.sp(14.5) }}>
                    Libre para gastar hoy
                  </Text>
                </View>
                <View
                  style={[
                    styles.deltaBadge,
                    {
                      backgroundColor:
                        safeToday.status === 'DANGER'
                          ? theme.expenseSoft
                          : safeToday.status === 'TIGHT'
                            ? theme.warningSoft
                            : theme.incomeSoft,
                    },
                  ]}
                >
                  <Text
                    style={{
                      color:
                        safeToday.status === 'DANGER'
                          ? theme.expense
                          : safeToday.status === 'TIGHT'
                            ? theme.warning
                            : theme.income,
                      fontFamily: theme.font('800'),
                      fontSize: 10.5,
                    }}
                  >
                    {safeToday.status === 'DANGER'
                      ? 'Sin margen'
                      : safeToday.status === 'TIGHT'
                        ? 'Ajustado'
                        : 'Seguro'}
                  </Text>
                </View>
              </View>

              <View style={styles.sectionHeader}>
                <Text
                  style={{
                    color:
                      safeToday.status === 'DANGER'
                        ? theme.expense
                        : theme.text,
                    fontFamily: theme.font('800'),
                    fontSize: theme.sp(26),
                    fontVariant: ['tabular-nums'],
                  }}
                >
                  {formatMaskedMoney(safeToday.dailySafeAmount)}
                </Text>
                <Text style={{ color: theme.textMuted, fontFamily: theme.font('600'), fontSize: 12 }}>
                  restante hoy
                </Text>
              </View>

              {safeToday.todaySpent > 0 ? (
                <View style={{ flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 6, marginVertical: 3 }}>
                  <View
                    style={{
                      backgroundColor: alphaHex(theme.expense, 0.12),
                      paddingHorizontal: 8,
                      paddingVertical: 2,
                      borderRadius: 6,
                    }}
                  >
                    <Text style={{ color: theme.expense, fontFamily: theme.font('700'), fontSize: 11 }}>
                      Gastado hoy: {formatMaskedMoney(safeToday.todaySpent)}
                    </Text>
                  </View>
                  <Text style={{ color: theme.textMuted, fontFamily: theme.font('500'), fontSize: 11 }}>
                    Cupo diario: {formatMaskedMoney(safeToday.dailyQuota)}
                  </Text>
                </View>
              ) : null}

              <Text style={{ color: theme.textSecondary, fontFamily: theme.font('500'), fontSize: 11.5 }}>
                {safeToday.hasBudgetPool
                  ? `Presupuesto disponible: ${formatMaskedMoney(safeToday.monthlyPool)} para ${safeToday.daysRemaining}d del mes`
                  : `Liquidez disponible: ${formatMaskedMoney(safeToday.monthlyPool)} para ${safeToday.daysRemaining}d del mes`}
                {safeToday.reservedUpcoming > 0
                  ? ` · ${formatMaskedMoney(safeToday.reservedUpcoming)} reservados para ${safeToday.upcomingCount} pago(s)`
                  : ''}
              </Text>
            </PremiumCard>
          </Pressable>

          {/* REFERENCE IMAGE 1 FEATURED CARDS: White Ring Card + Coral-Orange Cushion/Goal Card */}
          <View style={styles.featuredStack}>
            <Pressable onPress={() => router.push('/(tabs)/accounts')}>
              <PremiumCard variant="elevated" padding={16}>
                <View style={styles.ringCardRow}>
                  <CircularProgressRing
                    progress={savingsPct}
                    size={68}
                    strokeWidth={7}
                    color={theme.brand}
                    label={`${savingsPct}%`}
                  />
                  <View style={{ flex: 1, gap: 4 }}>
                    <Text style={{ color: theme.brand, fontFamily: theme.font('800'), fontSize: theme.sp(15) }}>
                      {primaryAccount?.name || 'Cuenta Principal'}
                    </Text>
                    <View style={styles.twoColMini}>
                      <View>
                        <Text style={{ color: theme.textMuted, fontFamily: theme.font('600'), fontSize: 10.5 }}>
                          Flujo Neto
                        </Text>
                        <Text style={{ color: theme.text, fontFamily: theme.font('800'), fontSize: 13.5, fontVariant: ['tabular-nums'] }}>
                          {formatMaskedMoney(metrics.netFlow)}
                        </Text>
                      </View>
                      <View>
                        <Text style={{ color: theme.textMuted, fontFamily: theme.font('600'), fontSize: 10.5 }}>
                          Saldo cuenta
                        </Text>
                        <Text style={{ color: theme.income, fontFamily: theme.font('800'), fontSize: 13.5, fontVariant: ['tabular-nums'] }}>
                          {primaryAccount
                            ? formatMaskedMoney(primaryAccount.currentBalance, primaryAccount.currencyCode)
                            : formatMaskedMoney(netWorth)}
                        </Text>
                      </View>
                    </View>
                  </View>
                </View>
              </PremiumCard>
            </Pressable>

            <Pressable
              onPress={() =>
                router.push(
                  (topGoal ? `/savings-goals/${topGoal.id}` : '/savings-goals') as any
                )
              }
            >
              <PremiumCard variant="hero-coral" padding={16}>
                <View style={styles.ringCardRow}>
                  <CircularProgressRing
                    progress={topGoal ? Math.round(topGoal.progress || 0) : healthScore}
                    size={68}
                    strokeWidth={7}
                    color="#FFFFFF"
                    trackColor="rgba(255,255,255,0.28)"
                    label={`${topGoal ? Math.round(topGoal.progress || 0) : healthScore}%`}
                    labelColor="#FFFFFF"
                  />
                  <View style={{ flex: 1, gap: 4 }}>
                    <Text style={{ color: '#FFFFFF', fontFamily: theme.font('800'), fontSize: theme.sp(15) }}>
                      {topGoal ? topGoal.name : 'Colchón Financiero'}
                    </Text>
                    <View style={styles.twoColMini}>
                      <View>
                        <Text style={{ color: 'rgba(255,255,255,0.8)', fontFamily: theme.font('600'), fontSize: 10.5 }}>
                          {topGoal ? 'Ahorrado' : 'Salud Financiera'}
                        </Text>
                        <Text style={{ color: '#FFFFFF', fontFamily: theme.font('800'), fontSize: 13.5, fontVariant: ['tabular-nums'] }}>
                          {topGoal
                            ? formatMaskedMoney(topGoal.current_amount, topGoal.currency)
                            : `${healthScore} / 100`}
                        </Text>
                      </View>
                      <View>
                        <Text style={{ color: 'rgba(255,255,255,0.8)', fontFamily: theme.font('600'), fontSize: 10.5 }}>
                          {topGoal ? 'Objetivo' : 'Gasto diario'}
                        </Text>
                        <Text style={{ color: '#FFFFFF', fontFamily: theme.font('800'), fontSize: 13.5, fontVariant: ['tabular-nums'] }}>
                          {topGoal
                            ? formatMaskedMoney(topGoal.target_amount, topGoal.currency)
                            : formatMaskedMoney(metrics.dailyExpenseAvg || 0)}
                        </Text>
                      </View>
                    </View>
                  </View>
                </View>
              </PremiumCard>
            </Pressable>
          </View>

          {/* 4 KPI SPARKLINE GRID */}
          {homeWidgets.kpis !== false ? (
            <View style={styles.kpiGrid}>
              <PremiumCard style={styles.kpiCard} padding={14}>
                <Text style={{ color: theme.textMuted, fontFamily: theme.font('600'), fontSize: 11 }}>
                  Ingresos Mes
                </Text>
                <Text
                  numberOfLines={1}
                  adjustsFontSizeToFit
                  style={{ color: theme.text, fontFamily: theme.font('800'), fontSize: theme.sp(16.5), fontVariant: ['tabular-nums'], marginVertical: 4 }}
                >
                  {formatMaskedMoney(metrics.totalIncome)}
                </Text>
                <View style={styles.kpiBottom}>
                  <View style={[styles.deltaBadge, { backgroundColor: theme.incomeSoft }]}>
                    <Text style={{ color: theme.income, fontFamily: theme.font('800'), fontSize: 10 }}>
                      {incomeDelta >= 0 ? `+${incomeDelta}%` : `${incomeDelta}%`}
                    </Text>
                  </View>
                  <MiniSparkline values={history.map((h) => h.income)} color={theme.income} />
                </View>
              </PremiumCard>

              <PremiumCard style={styles.kpiCard} padding={14}>
                <Text style={{ color: theme.textMuted, fontFamily: theme.font('600'), fontSize: 11 }}>
                  Gastos Mes
                </Text>
                <Text
                  numberOfLines={1}
                  adjustsFontSizeToFit
                  style={{ color: theme.text, fontFamily: theme.font('800'), fontSize: theme.sp(16.5), fontVariant: ['tabular-nums'], marginVertical: 4 }}
                >
                  {formatMaskedMoney(metrics.totalExpense)}
                </Text>
                <View style={styles.kpiBottom}>
                  <View
                    style={[
                      styles.deltaBadge,
                      { backgroundColor: expenseDelta <= 0 ? theme.incomeSoft : theme.expenseSoft },
                    ]}
                  >
                    <Text
                      style={{
                        color: expenseDelta <= 0 ? theme.income : theme.expense,
                        fontFamily: theme.font('800'),
                        fontSize: 10,
                      }}
                    >
                      {expenseDelta > 0 ? `+${expenseDelta}%` : `${expenseDelta}%`}
                    </Text>
                  </View>
                  <MiniSparkline values={history.map((h) => h.expense)} color={theme.coral} />
                </View>
              </PremiumCard>
            </View>
          ) : null}

          {/* INTERACTIVE ANALYTICS CHART (6 MONTHS) */}
          {homeWidgets.charts !== false ? (
            <PremiumCard padding={16} style={{ gap: 12 }}>
              <View style={styles.sectionHeader}>
                <View>
                  <Text style={{ color: theme.text, fontFamily: theme.font('800'), fontSize: theme.sp(15.5) }}>
                    Ingresos vs. Gastos
                  </Text>
                  <Text style={{ color: theme.textMuted, fontFamily: theme.font('500'), fontSize: 11.5 }}>
                    Evolución últimos 6 meses
                  </Text>
                </View>
                <View style={styles.chartToggleRow}>
                  <Pressable
                    onPress={() => setChartType(chartType === 'bars' ? 'spline' : 'bars')}
                    style={[styles.pillMini, { backgroundColor: theme.brandSoft }]}
                  >
                    <BarChart3 size={13} color={theme.brand} />
                    <Text style={{ color: theme.brand, fontFamily: theme.font('700'), fontSize: 11 }}>
                      {chartType === 'bars' ? 'Curva' : 'Barras'}
                    </Text>
                  </Pressable>
                  <Pressable onPress={() => router.push('/analysis' as any)}>
                    <Text style={{ color: theme.brand, fontFamily: theme.font('800'), fontSize: 12 }}>
                      Análisis
                    </Text>
                  </Pressable>
                </View>
              </View>

              {chartType === 'bars' ? (
                <GroupedBudgetBarChart
                  data={barData}
                  costLabel="Gastos"
                  budgetLabel="Ingresos"
                  costColor={theme.coral}
                  budgetColor={theme.brand}
                  formatValue={(n) => (isBalanceVisible ? formatCompactMoney(n) : '•••')}
                />
              ) : (
                <DualSplineAreaChart
                  data={splineData}
                  primaryLabel="Ingresos"
                  secondaryLabel="Gastos"
                  primaryColor={theme.brand}
                  secondaryColor={theme.coral}
                  formatValue={(n) => (isBalanceVisible ? formatCompactMoney(n) : '•••')}
                />
              )}
            </PremiumCard>
          ) : null}

          {/* QUICK METRIC BRAND TILES */}
          {homeWidgets.budgets !== false ? (
            <View style={styles.kpiGrid}>
              <Pressable style={styles.kpiCard} onPress={() => router.push('/(tabs)/transactions')}>
                <PremiumCard variant="hero-violet" padding={15}>
                  <View style={styles.tileIcon}>
                    <Receipt size={17} color="#FFFFFF" />
                  </View>
                  <Text style={{ color: '#FFFFFF', fontFamily: theme.font('800'), fontSize: theme.sp(22), fontVariant: ['tabular-nums'], marginTop: 10 }}>
                    {metrics.transactionsCount}
                  </Text>
                  <View style={styles.tileFoot}>
                    <Text style={{ color: 'rgba(255,255,255,0.85)', fontFamily: theme.font('600'), fontSize: 11.5 }}>
                      Movimientos mes
                    </Text>
                    <ArrowUpRight size={15} color="#FFFFFF" />
                  </View>
                </PremiumCard>
              </Pressable>

              <Pressable style={styles.kpiCard} onPress={() => router.push('/budgets' as any)}>
                <PremiumCard variant="hero-coral" padding={15}>
                  <View style={styles.tileIcon}>
                    <PieChartIcon size={17} color="#FFFFFF" />
                  </View>
                  <Text style={{ color: '#FFFFFF', fontFamily: theme.font('800'), fontSize: theme.sp(22), fontVariant: ['tabular-nums'], marginTop: 10 }}>
                    {data?.budget ? `${Math.round(data.budget.usagePercentage)}%` : '0%'}
                  </Text>
                  <View style={styles.tileFoot}>
                    <Text style={{ color: 'rgba(255,255,255,0.88)', fontFamily: theme.font('600'), fontSize: 11.5 }}>
                      Uso presupuesto
                    </Text>
                    <ArrowUpRight size={15} color="#FFFFFF" />
                  </View>
                </PremiumCard>
              </Pressable>
            </View>
          ) : null}

          {/* BUDGET ALERTS */}
          {budgetAlerts.length > 0 ? (
            <PremiumCard padding={14} style={{ gap: 8 }}>
              <View style={styles.sectionHeader}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                  <AlertTriangle size={15} color={theme.warning} />
                  <Text style={{ color: theme.text, fontFamily: theme.font('800'), fontSize: 13.5 }}>
                    Alertas de presupuesto
                  </Text>
                </View>
                <Pressable onPress={() => router.push('/budgets' as any)}>
                  <Text style={{ color: theme.brand, fontFamily: theme.font('700'), fontSize: 12 }}>
                    Ver todos
                  </Text>
                </Pressable>
              </View>
              {budgetAlerts.slice(0, 3).map((b, i) => (
                <View key={i} style={[styles.alertRow, { backgroundColor: theme.muted }]}>
                  <Text style={{ flex: 1, color: theme.text, fontFamily: theme.font('700'), fontSize: 12.5 }}>
                    {b.name}
                  </Text>
                  <Text
                    style={{
                      color: b.percent >= 100 ? theme.expense : theme.warning,
                      fontFamily: theme.font('800'),
                      fontSize: 12,
                      fontVariant: ['tabular-nums'],
                    }}
                  >
                    {Math.round(b.percent)}%
                  </Text>
                </View>
              ))}
            </PremiumCard>
          ) : null}

          {/* RECENT TRANSACTIONS */}
          {homeWidgets.recentTx !== false ? (
            <View style={{ gap: 10 }}>
              <View style={styles.sectionHeader}>
                <Text style={{ color: theme.text, fontFamily: theme.font('800'), fontSize: theme.sp(16) }}>
                  Transacciones recientes
                </Text>
                <Pressable onPress={() => router.push('/(tabs)/transactions')}>
                  <Text style={{ color: theme.brand, fontFamily: theme.font('800'), fontSize: 12.5 }}>
                    Ver todas
                  </Text>
                </Pressable>
              </View>

              {transactions.slice(0, 5).map((tx: any) => (
                <TransactionListItem key={tx.id} tx={tx} onDelete={setTxToDelete} />
              ))}
            </View>
          ) : null}
        </View>
      </ScrollView>

      <ConfirmAlertModal
        open={Boolean(txToDelete)}
        onOpenChange={(o) => !o && setTxToDelete(null)}
        variant="danger"
        title="¿Eliminar transacción?"
        description="El saldo de tu cuenta se ajustará automáticamente."
        confirmLabel="Eliminar"
        onConfirm={async () => {
          if (txToDelete) await deleteTransaction.mutateAsync(txToDelete.id);
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  heroCenter: {
    alignItems: 'center',
    marginTop: 14,
    gap: 4,
  },
  heroSwitchRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 12,
    flexWrap: 'wrap',
    justifyContent: 'center',
  },
  heroSwitchPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 99,
    backgroundColor: 'rgba(255,255,255,0.12)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.18)',
  },
  heroSwitchActive: {
    backgroundColor: 'rgba(255,255,255,0.24)',
    borderColor: 'rgba(255,255,255,0.38)',
  },
  content: {
    padding: 16,
    gap: 14,
  },
  demoBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 9,
    padding: 12,
    borderRadius: 18,
    borderWidth: 1,
  },
  featuredStack: {
    gap: 12,
  },
  ringCardRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  twoColMini: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
    marginTop: 2,
  },
  kpiGrid: {
    flexDirection: 'row',
    gap: 12,
  },
  kpiCard: {
    flex: 1,
  },
  kpiBottom: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 4,
  },
  deltaBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 99,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  chartToggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  pillMini: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 9,
    paddingVertical: 5,
    borderRadius: 99,
  },
  tileIcon: {
    width: 34,
    height: 34,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.22)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  tileFoot: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 4,
  },
  alertRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    paddingVertical: 9,
    borderRadius: 13,
  },
});
