import React, { useState } from 'react';
import {
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Banknote, Building2, Plus, Smartphone, TrendingUp, Wallet } from 'lucide-react-native';
import { useAppTheme } from '@/theme/ThemeProvider';
import { useAccounts } from '@/hooks/useAccounts';
import { useFormat } from '@/hooks/useFormat';
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

export default function AccountsScreen() {
  const theme = useAppTheme();
  const router = useRouter();
  const { formatMaskedMoney, baseCurrency, isBalanceVisible } = useFormat();
  const {
    accounts,
    liquidBalanceConverted,
    totalCreditDebtConverted,
    netWorthConverted,
    isLoading,
    refetch,
  } = useAccounts();

  const [modalOpen, setModalOpen] = useState(false);
  const creditCards = accounts.filter((a) => a.accountType === 'CREDIT_CARD');
  const regularAccounts = accounts.filter((a) => a.accountType !== 'CREDIT_CARD');

  return (
    <View style={[styles.flex, { backgroundColor: theme.bg }]}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 118 }}
        refreshControl={
          <RefreshControl refreshing={isLoading} onRefresh={() => { void refetch(); }} tintColor={theme.brand} />
        }
      >
        <CurvedHeroHeader bottomRadius={34}>
          <TopAppHeader
            onHero
            title="Mis Cuentas"
            subtitle="Consolidado multimoneda"
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
          {/* Reference Image 5: My Cards Carousel */}
          <View style={{ gap: 10 }}>
            <View style={styles.sectionHeader}>
              <Text style={{ color: theme.text, fontFamily: theme.font('800'), fontSize: theme.sp(16) }}>
                Mis Tarjetas ({creditCards.length})
              </Text>
              <Pressable onPress={() => setModalOpen(true)}>
                <Text style={{ color: theme.brand, fontFamily: theme.font('800'), fontSize: 12.5 }}>
                  + Agregar
                </Text>
              </Pressable>
            </View>

            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={{ gap: 12, paddingRight: 16 }}
            >
              {creditCards.map((card) => (
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
                  onPress={() => setModalOpen(true)}
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
            <Text style={{ color: theme.text, fontFamily: theme.font('800'), fontSize: theme.sp(16) }}>
              Efectivo, Bancos y Billeteras ({regularAccounts.length})
            </Text>

            {regularAccounts.length === 0 && creditCards.length === 0 ? (
              <EmptyStateCard
                icon={<Wallet size={28} color={theme.brand} />}
                title="Aún no tienes cuentas"
                description="Crea tu primera cuenta de banco, efectivo o billetera para comenzar."
                actionLabel="Crear cuenta"
                onAction={() => setModalOpen(true)}
              />
            ) : (
              regularAccounts.map((acc) => {
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

      <AccountFormModal open={modalOpen} onClose={() => setModalOpen(false)} />
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  addHeroBtn: {
    width: 38,
    height: 38,
    borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.2)',
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
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
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
