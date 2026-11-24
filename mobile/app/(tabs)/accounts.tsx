import React, { useMemo, useState } from 'react';
import {
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useRouter } from 'expo-router';
import {
  Banknote,
  Building2,
  Plus,
  Search,
  Smartphone,
  TrendingUp,
  Wallet,
  X,
} from 'lucide-react-native';
import { useAppTheme } from '@/theme/ThemeProvider';
import { useAccounts } from '@/hooks/useAccounts';
import { useFormat } from '@/hooks/useFormat';
import { useManualRefresh } from '@/hooks/useManualRefresh';
import { CurvedHeroHeader } from '@/components/ui/CurvedHeroHeader';
import { TopAppHeader } from '@/components/navigation/TopAppHeader';
import { AnimatedNumber } from '@/components/ui/AnimatedNumber';
import { PremiumCard } from '@/components/ui/PremiumCard';
import { EmptyStateCard } from '@/components/ui/EmptyStateCard';
import { CreditCardVisual } from '@/components/accounts/CreditCardVisual';
import { AccountFormModal } from '@/components/accounts/AccountFormModal';
import { alphaHex } from '@/lib/color-math';
import { triggerHaptic } from '@/lib/haptics';

const TYPE_ICONS: Record<string, typeof Wallet> = {
  CASH: Banknote,
  BANK: Building2,
  DIGITAL: Smartphone,
  INVESTMENT: TrendingUp,
};

const REGULAR_FILTERS = [
  { id: 'ALL', label: 'Todas' },
  { id: 'BANK', label: 'Bancos' },
  { id: 'DIGITAL', label: 'Billeteras' },
  { id: 'CASH', label: 'Efectivo' },
  { id: 'INVESTMENT', label: 'Inversión' },
] as const;

export default function AccountsScreen() {
  const theme = useAppTheme();
  const router = useRouter();
  const { formatMaskedMoney, baseCurrency, isBalanceVisible } = useFormat();
  const {
    accounts,
    liquidBalanceConverted,
    totalCreditDebtConverted,
    netWorthConverted,
    refetch,
  } = useAccounts();

  const { refreshing, onRefresh } = useManualRefresh(refetch);

  const [modalOpen, setModalOpen] = useState(false);
  const [defaultModalType, setDefaultModalType] = useState<
    'CASH' | 'BANK' | 'DIGITAL' | 'CREDIT_CARD' | 'INVESTMENT'
  >('BANK');
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState<string>('ALL');

  const creditCards = accounts.filter((a) => a.accountType === 'CREDIT_CARD');
  const regularAccounts = accounts.filter((a) => a.accountType !== 'CREDIT_CARD');

  const filteredRegular = useMemo(() => {
    const q = search.trim().toLowerCase();
    return regularAccounts.filter((acc) => {
      if (typeFilter !== 'ALL' && acc.accountType !== typeFilter) return false;
      if (!q) return true;
      return (
        String(acc.name || '').toLowerCase().includes(q) ||
        String(acc.bankName || '').toLowerCase().includes(q) ||
        String(acc.currencyCode || '').toLowerCase().includes(q)
      );
    });
  }, [regularAccounts, search, typeFilter]);

  const filteredCards = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return creditCards;
    return creditCards.filter(
      (c) =>
        String(c.name || '').toLowerCase().includes(q) ||
        String(c.bankName || '').toLowerCase().includes(q) ||
        String(c.currencyCode || '').toLowerCase().includes(q)
    );
  }, [creditCards, search]);

  const openCreateModal = (
    type: 'CASH' | 'BANK' | 'DIGITAL' | 'CREDIT_CARD' | 'INVESTMENT' = 'BANK'
  ) => {
    triggerHaptic('medium');
    setDefaultModalType(type);
    setModalOpen(true);
  };

  return (
    <View style={[styles.flex, { backgroundColor: theme.bg }]}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 118 }}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={theme.brand} />
        }
      >
        <CurvedHeroHeader bottomRadius={34}>
          <TopAppHeader
            onHero
            title="Mis Cuentas"
            subtitle="Consolidado multimoneda"
            rightSlot={
              <Pressable
                onPress={() => openCreateModal('BANK')}
                style={[styles.addHeroBtn, { backgroundColor: theme.coral }]}
                accessibilityLabel="Nueva cuenta o tarjeta"
              >
                <Plus size={18} color="#FFFFFF" strokeWidth={2.6} />
              </Pressable>
            }
          />

          <View style={styles.heroCenter}>
            <AnimatedNumber
              value={netWorthConverted}
              currencyCode={baseCurrency}
              hidden={!isBalanceVisible}
              style={{ color: '#FFFFFF', fontFamily: theme.font('800'), fontSize: theme.sp(32) }}
            />
            <Text style={{ color: 'rgba(255,255,255,0.78)', fontFamily: theme.font('600'), fontSize: 12 }}>
              Patrimonio Neto Convertido
            </Text>

            <View style={styles.metricsRow}>
              <View style={styles.metricPill}>
                <Text style={styles.metricLabel}>Liquidez</Text>
                <Text style={styles.metricVal}>{formatMaskedMoney(liquidBalanceConverted)}</Text>
              </View>
              <View style={styles.metricPill}>
                <Text style={styles.metricLabel}>Deuda Tarjetas</Text>
                <Text style={[styles.metricVal, { color: '#FFD3B6' }]}>
                  {formatMaskedMoney(totalCreditDebtConverted)}
                </Text>
              </View>
            </View>
          </View>
        </CurvedHeroHeader>

        <View style={styles.content}>
          {/* Search & Quick Add Bar when user has several accounts */}
          {accounts.length > 3 ? (
            <View style={{ gap: 10 }}>
              <View
                style={[
                  styles.searchBox,
                  { backgroundColor: theme.card, borderColor: theme.border },
                ]}
              >
                <Search size={16} color={theme.textMuted} />
                <TextInput
                  value={search}
                  onChangeText={setSearch}
                  placeholder="Buscar cuenta, banco o moneda..."
                  placeholderTextColor={theme.textMuted}
                  style={[
                    styles.searchInput,
                    { color: theme.text, fontFamily: theme.font('600'), fontSize: theme.sp(13) },
                  ]}
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
                contentContainerStyle={{ gap: 7 }}
              >
                {REGULAR_FILTERS.map((f) => {
                  const active = typeFilter === f.id;
                  return (
                    <Pressable
                      key={f.id}
                      onPress={() => {
                        triggerHaptic('selection');
                        setTypeFilter(f.id);
                      }}
                      style={[
                        styles.filterChip,
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
                        {f.label}
                      </Text>
                    </Pressable>
                  );
                })}
              </ScrollView>
            </View>
          ) : null}

          {/* My Cards Carousel */}
          <View style={{ gap: 10 }}>
            <View style={styles.sectionHeader}>
              <Text style={{ color: theme.text, fontFamily: theme.font('800'), fontSize: theme.sp(16) }}>
                Mis Tarjetas ({filteredCards.length})
              </Text>
              <Pressable
                onPress={() => openCreateModal('CREDIT_CARD')}
                style={[
                  styles.sectionAddBtn,
                  { backgroundColor: theme.brandSoft, borderColor: alphaHex(theme.brand, 0.25) },
                ]}
              >
                <Plus size={14} color={theme.brand} strokeWidth={2.5} />
                <Text style={{ color: theme.brand, fontFamily: theme.font('800'), fontSize: 12 }}>
                  Agregar tarjeta
                </Text>
              </Pressable>
            </View>

            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={{ gap: 12, paddingRight: 16 }}
            >
              {filteredCards.map((card) => (
                <CreditCardVisual
                  key={card.id}
                  account={card}
                  onPress={() => router.push(`/accounts/${card.id}` as any)}
                  onPayPress={() =>
                    router.push(`/transactions/new?type=TRANSFER&toAccountId=${card.id}` as any)
                  }
                />
              ))}
              {creditCards.length === 0 ? (
                <Pressable
                  onPress={() => openCreateModal('CREDIT_CARD')}
                  style={[
                    styles.plusTile,
                    {
                      width: 260,
                      flexDirection: 'row',
                      gap: 10,
                      backgroundColor: theme.brandSoft,
                      borderColor: theme.border,
                      borderStyle: 'dashed',
                    },
                  ]}
                >
                  <Plus size={22} color={theme.brand} />
                  <Text style={{ color: theme.brand, fontFamily: theme.font('800'), fontSize: 13.5 }}>
                    Agregar tarjeta de crédito
                  </Text>
                </Pressable>
              ) : null}
            </ScrollView>
          </View>

          {/* Regular Accounts List */}
          <View style={{ gap: 10 }}>
            <View style={styles.sectionHeader}>
              <Text style={{ color: theme.text, fontFamily: theme.font('800'), fontSize: theme.sp(16), flex: 1 }}>
                Cuentas y Billeteras ({filteredRegular.length})
              </Text>
              <Pressable
                onPress={() => openCreateModal('BANK')}
                style={[styles.sectionAddBtn, { backgroundColor: theme.coral }]}
              >
                <Plus size={14} color="#FFFFFF" strokeWidth={2.5} />
                <Text style={{ color: '#FFFFFF', fontFamily: theme.font('800'), fontSize: 12 }}>
                  Nueva cuenta
                </Text>
              </Pressable>
            </View>

            {regularAccounts.length === 0 && creditCards.length === 0 ? (
              <EmptyStateCard
                icon={<Wallet size={28} color={theme.brand} />}
                title="Aún no tienes cuentas"
                description="Crea tu primera cuenta de banco, efectivo o billetera para comenzar."
                actionLabel="Crear cuenta"
                onAction={() => openCreateModal('BANK')}
              />
            ) : filteredRegular.length === 0 ? (
              <EmptyStateCard
                icon={<Search size={26} color={theme.brand} />}
                title="Sin resultados en este filtro"
                description="Prueba con otro término o limpia el filtro actual."
              />
            ) : (
              filteredRegular.map((acc) => {
                const Icon = TYPE_ICONS[acc.accountType] || Wallet;
                const accColor = acc.color || theme.brand;
                return (
                  <Pressable
                    key={acc.id}
                    onPress={() => router.push(`/accounts/${acc.id}` as any)}
                  >
                    <PremiumCard padding={14}>
                      <View style={styles.accRow}>
                        <View
                          style={[
                            styles.accIcon,
                            {
                              backgroundColor: alphaHex(accColor, theme.isDark ? 0.24 : 0.14),
                              borderRadius: theme.iconRadius,
                            },
                          ]}
                        >
                          <Icon size={20} color={accColor} />
                        </View>
                        <View style={{ flex: 1 }}>
                          <Text style={{ color: theme.text, fontFamily: theme.font('800'), fontSize: theme.sp(14.5) }}>
                            {acc.name}
                          </Text>
                          <Text style={{ color: theme.textMuted, fontFamily: theme.font('600'), fontSize: 11.5 }}>
                            {acc.bankName || acc.accountType} · {acc.currencyCode}
                          </Text>
                        </View>
                        <Text
                          style={{
                            color: Number(acc.currentBalance) >= 0 ? theme.text : theme.expense,
                            fontFamily: theme.font('800'),
                            fontSize: theme.sp(15.5),
                            fontVariant: ['tabular-nums'],
                          }}
                        >
                          {formatMaskedMoney(acc.currentBalance, acc.currencyCode)}
                        </Text>
                      </View>
                    </PremiumCard>
                  </Pressable>
                );
              })
            )}
          </View>
        </View>
      </ScrollView>

      <AccountFormModal
        open={modalOpen}
        defaultType={defaultModalType}
        onClose={() => setModalOpen(false)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  addHeroBtn: {
    width: 38,
    height: 38,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroCenter: { alignItems: 'center', marginTop: 14, gap: 4 },
  metricsRow: { flexDirection: 'row', gap: 10, marginTop: 12 },
  metricPill: {
    flex: 1,
    backgroundColor: 'rgba(255,255,255,0.14)',
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 9,
    alignItems: 'center',
  },
  metricLabel: { color: 'rgba(255,255,255,0.75)', fontSize: 10.5, fontWeight: '600' },
  metricVal: { color: '#FFFFFF', fontSize: 14, fontWeight: '800', fontVariant: ['tabular-nums'], marginTop: 2 },
  content: { padding: 16, gap: 18 },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderWidth: 1,
    borderRadius: 16,
    paddingHorizontal: 13,
    paddingVertical: 9,
  },
  searchInput: { flex: 1, paddingVertical: 2 },
  filterChip: {
    paddingHorizontal: 13,
    paddingVertical: 7,
    borderRadius: 999,
    borderWidth: 1,
  },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 8 },
  sectionAddBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 11,
    paddingVertical: 7,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  plusTile: {
    width: 68,
    height: 174,
    borderRadius: 24,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  accRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  accIcon: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
});
