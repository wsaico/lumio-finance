import React, { useMemo, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { ChevronLeft, ChevronRight, Search, SlidersHorizontal, X } from 'lucide-react-native';
import { useAppTheme } from '@/theme/ThemeProvider';
import { useTransactions } from '@/hooks/useTransactions';
import { useCategories } from '@/hooks/useCategories';
import { useFormat } from '@/hooks/useFormat';
import { CurvedHeroHeader } from '@/components/ui/CurvedHeroHeader';
import { TopAppHeader } from '@/components/navigation/TopAppHeader';
import { AnimatedNumber } from '@/components/ui/AnimatedNumber';
import { CategoryIcon } from '@/components/ui/CategoryIcon';
import { DualSplineAreaChart } from '@/components/charts/DualSplineAreaChart';
import { TransactionListItem } from '@/components/transactions/TransactionListItem';
import { EmptyStateCard } from '@/components/ui/EmptyStateCard';
import { ConfirmAlertModal } from '@/components/alerts/ConfirmAlertModal';
import { triggerHaptic } from '@/lib/haptics';

type TimeGranularity = 'Day' | 'Week' | 'Month' | 'Year';

export default function TransactionsScreen() {
  const theme = useAppTheme();
  const { formatCompactMoney, baseCurrency, isBalanceVisible } = useFormat();
  const { categories } = useCategories();

  const now = new Date();
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [year, setYear] = useState(now.getFullYear());
  const [search, setSearch] = useState('');
  const [selectedType, setSelectedType] = useState<'ALL' | 'EXPENSE' | 'INCOME' | 'TRANSFER'>('ALL');
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(null);
  const [granularity, setGranularity] = useState<TimeGranularity>('Month');
  const [txToDelete, setTxToDelete] = useState<any>(null);

  const {
    transactions,
    isLoading,
    isFetching,
    refetch,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    deleteTransaction,
  } = useTransactions({
    month: granularity === 'Year' ? undefined : month,
    year,
    type: selectedType === 'ALL' ? undefined : selectedType,
    search: search.trim() || undefined,
  });

  const filteredTx = useMemo(() => {
    if (!selectedCategoryId) return transactions;
    return transactions.filter((t: any) => {
      const cId =
        t.expenseCategoryId ||
        t.expense_category_id ||
        t.incomeCategoryId ||
        t.income_category_id;
      return cId === selectedCategoryId;
    });
  }, [transactions, selectedCategoryId]);

  const totalPeriodExpense = useMemo(
    () =>
      filteredTx.reduce((sum: number, t: any) => {
        const typ = t.transactionType || t.transaction_type;
        if (selectedType === 'INCOME') return typ === 'INCOME' ? sum + Math.abs(Number(t.amount || 0)) : sum;
        return typ === 'EXPENSE' ? sum + Math.abs(Number(t.amount || 0)) : sum;
      }, 0),
    [filteredTx, selectedType]
  );

  const waveSeries = useMemo(() => {
    const buckets = new Map<string, number>();
    filteredTx
      .slice()
      .reverse()
      .forEach((t: any) => {
        const d = new Date(t.transactionDate || t.transaction_date || Date.now());
        if (Number.isNaN(d.getTime())) return;
        const key =
          granularity === 'Year'
            ? format(d, 'MMM', { locale: es })
            : format(d, 'dd/MM');
        buckets.set(key, (buckets.get(key) || 0) + Math.abs(Number(t.amount || 0)));
      });
    const arr = Array.from(buckets.entries())
      .slice(-7)
      .map(([label, primary]) => ({ label, primary }));
    return arr.length > 0 ? arr : [{ label: 'Hoy', primary: 0 }];
  }, [filteredTx, granularity]);

  const shiftMonth = (delta: number) => {
    triggerHaptic('selection');
    const d = new Date(year, month - 1 + delta, 1);
    setMonth(d.getMonth() + 1);
    setYear(d.getFullYear());
  };

  const monthLabel = format(new Date(year, month - 1, 1), 'MMMM yyyy', { locale: es });

  const headerComponent = (
    <View style={{ gap: 14, paddingBottom: 6 }}>
      {/* REFERENCE IMAGE 2 HERO HISTORY */}
      <CurvedHeroHeader bottomRadius={34}>
        <TopAppHeader
          onHero
          title="Movimientos"
          subtitle={monthLabel}
        />

        <View style={styles.granRow}>
          {(
            [
              { id: 'Day', label: 'Día' },
              { id: 'Week', label: 'Semana' },
              { id: 'Month', label: 'Mes' },
              { id: 'Year', label: 'Año' },
            ] as const
          ).map((g) => {
            const active = granularity === g.id;
            return (
              <Pressable
                key={g.id}
                onPress={() => {
                  triggerHaptic('selection');
                  setGranularity(g.id);
                }}
                style={styles.granBtn}
              >
                <Text
                  style={{
                    color: active ? theme.coral : 'rgba(255,255,255,0.72)',
                    fontFamily: theme.font(active ? '800' : '600'),
                    fontSize: theme.sp(12.5),
                  }}
                >
                  {g.label}
                </Text>
              </Pressable>
            );
          })}
        </View>

        <View style={styles.heroTotal}>
          <AnimatedNumber
            value={totalPeriodExpense}
            currencyCode={baseCurrency}
            hidden={!isBalanceVisible}
            style={{
              color: '#FFFFFF',
              fontFamily: theme.font('800'),
              fontSize: theme.sp(32),
            }}
          />
        </View>

        <DualSplineAreaChart
          data={waveSeries}
          height={132}
          variant="hero"
          primaryColor={theme.coral}
          primaryLabel={selectedType === 'INCOME' ? 'Ingresos' : 'Flujo'}
          formatValue={(n) => (isBalanceVisible ? formatCompactMoney(n) : '•••')}
        />
      </CurvedHeroHeader>

      {/* MONTH SWITCHER + CATEGORY TILES (Reference Image 2) */}
      <View style={styles.controlsPad}>
        <View style={[styles.monthBar, { backgroundColor: theme.card, borderColor: theme.border }]}>
          <Pressable onPress={() => shiftMonth(-1)} style={styles.monthArrow}>
            <ChevronLeft size={18} color={theme.text} />
          </Pressable>
          <Text
            style={{
              color: theme.text,
              fontFamily: theme.font('800'),
              fontSize: theme.sp(14),
              textTransform: 'capitalize',
            }}
          >
            {monthLabel}
          </Text>
          <Pressable onPress={() => shiftMonth(1)} style={styles.monthArrow}>
            <ChevronRight size={18} color={theme.text} />
          </Pressable>
        </View>

        {/* Horizontal Category Tiles */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ gap: 10, paddingVertical: 2 }}
        >
          <Pressable
            onPress={() => {
              triggerHaptic('selection');
              setSelectedCategoryId(null);
            }}
            style={styles.catTileWrap}
          >
            <View
              style={[
                styles.catSquare,
                {
                  backgroundColor: !selectedCategoryId ? theme.brand : theme.card,
                  borderColor: !selectedCategoryId ? theme.brand : theme.border,
                },
              ]}
            >
              <SlidersHorizontal size={20} color={!selectedCategoryId ? '#FFFFFF' : theme.brand} />
            </View>
            <Text
              numberOfLines={1}
              style={{
                color: !selectedCategoryId ? theme.brand : theme.textMuted,
                fontFamily: theme.font('700'),
                fontSize: 11,
              }}
            >
              Todas
            </Text>
          </Pressable>

          {categories.slice(0, 10).map((cat: any) => {
            const active = selectedCategoryId === cat.id;
            return (
              <Pressable
                key={cat.id}
                onPress={() => {
                  triggerHaptic('selection');
                  setSelectedCategoryId(active ? null : cat.id);
                }}
                style={styles.catTileWrap}
              >
                <View
                  style={[
                    styles.catSquare,
                    {
                      backgroundColor: active ? theme.brand : theme.card,
                      borderColor: active ? theme.brand : theme.border,
                    },
                  ]}
                >
                  <CategoryIcon
                    name={cat.icon}
                    size={20}
                    color={active ? '#FFFFFF' : cat.color || theme.brand}
                  />
                </View>
                <Text
                  numberOfLines={1}
                  style={{
                    color: active ? theme.brand : theme.textMuted,
                    fontFamily: theme.font(active ? '800' : '600'),
                    fontSize: 11,
                    maxWidth: 62,
                  }}
                >
                  {cat.name}
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>

        {/* Search + Type Filter Pills */}
        <View style={[styles.searchBox, { backgroundColor: theme.card, borderColor: theme.border }]}>
          <Search size={16} color={theme.textMuted} />
          <TextInput
            value={search}
            onChangeText={setSearch}
            placeholder="Buscar comercio, nota o categoría..."
            placeholderTextColor={theme.textMuted}
            style={[styles.searchInput, { color: theme.text, fontFamily: theme.font('600'), fontSize: theme.sp(13) }]}
          />
          {search ? (
            <Pressable onPress={() => setSearch('')} hitSlop={8}>
              <X size={15} color={theme.textMuted} />
            </Pressable>
          ) : null}
        </View>

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.typePills}
        >
          {(
            [
              { id: 'ALL', label: 'Todos' },
              { id: 'EXPENSE', label: 'Gastos' },
              { id: 'INCOME', label: 'Ingresos' },
              { id: 'TRANSFER', label: 'Transferencias' },
            ] as const
          ).map((t) => {
            const active = selectedType === t.id;
            return (
              <Pressable
                key={t.id}
                onPress={() => {
                  triggerHaptic('selection');
                  setSelectedType(t.id);
                }}
                style={[
                  styles.typePill,
                  {
                    backgroundColor: active ? theme.brand : theme.card,
                    borderColor: active ? theme.brand : theme.border,
                  },
                ]}
              >
                <Text
                  style={{
                    color: active ? '#FFFFFF' : theme.textSecondary,
                    fontFamily: theme.font('700'),
                    fontSize: 12,
                  }}
                >
                  {t.label}
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>
      </View>
    </View>
  );

  return (
    <View style={[styles.flex, { backgroundColor: theme.bg }]}>
      <FlatList
        data={filteredTx}
        keyExtractor={(item) => item.id}
        ListHeaderComponent={headerComponent}
        contentContainerStyle={{ paddingBottom: 118, gap: 10 }}
        refreshControl={
          <RefreshControl
            refreshing={isFetching && !isFetchingNextPage}
            onRefresh={() => { void refetch(); }}
            tintColor={theme.brand}
          />
        }
        onEndReached={() => {
          if (hasNextPage && !isFetchingNextPage) fetchNextPage();
        }}
        onEndReachedThreshold={0.35}
        renderItem={({ item }) => (
          <View style={{ paddingHorizontal: 16 }}>
            <TransactionListItem tx={item} onDelete={setTxToDelete} />
          </View>
        )}
        ListFooterComponent={
          isFetchingNextPage ? (
            <ActivityIndicator style={{ marginVertical: 16 }} color={theme.brand} />
          ) : undefined
        }
        ListEmptyComponent={
          isLoading ? (
            <ActivityIndicator style={{ marginTop: 28 }} color={theme.brand} />
          ) : (
            <View style={{ paddingHorizontal: 16 }}>
              <EmptyStateCard
                icon={<Search size={26} color={theme.brand} />}
                title="Sin movimientos en este filtro"
                description="Prueba otro mes o toca el botón + para registrar un movimiento."
              />
            </View>
          )
        }
      />

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
  granRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 18,
    marginTop: 12,
  },
  granBtn: { paddingVertical: 4, paddingHorizontal: 6 },
  heroTotal: { alignItems: 'center', marginVertical: 6 },
  controlsPad: { paddingHorizontal: 16, gap: 12 },
  monthBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 18,
    borderWidth: 1,
  },
  monthArrow: { padding: 6 },
  catTileWrap: { alignItems: 'center', gap: 5 },
  catSquare: {
    width: 56,
    height: 56,
    borderRadius: 18,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 14,
    height: 44,
    borderRadius: 16,
    borderWidth: 1,
  },
  searchInput: { flex: 1, height: '100%' },
  typePills: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingRight: 16 },
  typePill: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 99,
    borderWidth: 1,
  },
});
