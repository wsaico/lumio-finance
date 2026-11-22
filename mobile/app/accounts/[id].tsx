import React, { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { ArrowRightLeft, Pencil, Plus, SlidersHorizontal, Trash2 } from 'lucide-react-native';
import { useAppTheme } from '@/theme/ThemeProvider';
import { useAccounts } from '@/hooks/useAccounts';
import { useTransactions } from '@/hooks/useTransactions';
import { useFormat } from '@/hooks/useFormat';
import { CurvedHeroHeader } from '@/components/ui/CurvedHeroHeader';
import { TopAppHeader } from '@/components/navigation/TopAppHeader';
import { AnimatedNumber } from '@/components/ui/AnimatedNumber';
import { PremiumCard } from '@/components/ui/PremiumCard';
import { DualSplineAreaChart } from '@/components/charts/DualSplineAreaChart';
import { TransactionListItem } from '@/components/transactions/TransactionListItem';
import { AccountFormModal } from '@/components/accounts/AccountFormModal';
import { AdjustBalanceModal } from '@/components/accounts/AdjustBalanceModal';
import { ConfirmAlertModal } from '@/components/alerts/ConfirmAlertModal';

export default function AccountDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const theme = useAppTheme();
  const router = useRouter();
  const { formatMaskedMoney, formatCompactMoney, isBalanceVisible } = useFormat();
  const { accounts, deleteAccount } = useAccounts();
  const { transactions, deleteTransaction } = useTransactions({ accountId: id });

  const account = accounts.find((a) => a.id === id);
  const [editOpen, setEditOpen] = useState(false);
  const [adjustOpen, setAdjustOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [txToDelete, setTxToDelete] = useState<any>(null);

  const isCard = account?.accountType === 'CREDIT_CARD';
  const mainValue = isCard
    ? Math.max(0, Number(account?.creditLimit || 0) - Math.abs(Number(account?.usedBalance || 0)))
    : Number(account?.currentBalance || 0);

  const { totalIncome, totalExpense, chartPoints } = useMemo(() => {
    let inc = 0;
    let exp = 0;
    const pts: { label: string; primary: number; secondary: number }[] = [];
    const sorted = [...transactions].reverse().slice(-7);
    sorted.forEach((t: any, i: number) => {
      const amt = Math.abs(Number(t.amount || 0));
      const typ = t.transactionType || t.transaction_type;
      if (typ === 'INCOME') inc += amt;
      else if (typ === 'EXPENSE') exp += amt;
      pts.push({
        label: `#${i + 1}`,
        primary: typ === 'INCOME' ? amt : 0,
        secondary: typ === 'EXPENSE' ? amt : 0,
      });
    });
    return {
      totalIncome: inc,
      totalExpense: exp,
      chartPoints: pts.length ? pts : [{ label: 'Hoy', primary: 0, secondary: 0 }],
    };
  }, [transactions]);

  if (!account) {
    return (
      <View style={[styles.flex, { backgroundColor: theme.bg, justifyContent: 'center', alignItems: 'center' }]}>
        <Text style={{ color: theme.textMuted, fontFamily: theme.font('700') }}>
          Cuenta no encontrada
        </Text>
      </View>
    );
  }

  return (
    <View style={[styles.flex, { backgroundColor: theme.bg }]}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 40 }}>
        <CurvedHeroHeader bottomRadius={30}>
          <TopAppHeader
            showBack
            onHero
            title={account.name}
            subtitle={`${account.bankName || account.accountType} · ${account.currencyCode}`}
            rightSlot={
              <View style={{ flexDirection: 'row', gap: 6 }}>
                <Pressable onPress={() => setEditOpen(true)} style={styles.heroBtn}>
                  <Pencil size={16} color="#FFFFFF" />
                </Pressable>
                <Pressable onPress={() => setDeleteOpen(true)} style={styles.heroBtn}>
                  <Trash2 size={16} color="#FFD3D8" />
                </Pressable>
              </View>
            }
          />

          <View style={styles.heroCenter}>
            <AnimatedNumber
              value={mainValue}
              currencyCode={account.currencyCode}
              hidden={!isBalanceVisible}
              style={{ color: '#FFFFFF', fontFamily: theme.font('800'), fontSize: theme.sp(32) }}
            />
            <Text style={{ color: 'rgba(255,255,255,0.78)', fontFamily: theme.font('600'), fontSize: 12 }}>
              {isCard ? 'Crédito disponible' : 'Saldo actual'}
            </Text>

            <View style={styles.actionsRow}>
              <Pressable
                onPress={() => router.push(`/transactions/new?accountId=${account.id}` as any)}
                style={styles.heroAction}
              >
                <Plus size={14} color="#FFFFFF" />
                <Text style={styles.heroActionTxt}>Registrar</Text>
              </Pressable>
              {!isCard ? (
                <Pressable onPress={() => setAdjustOpen(true)} style={styles.heroAction}>
                  <SlidersHorizontal size={14} color="#FFFFFF" />
                  <Text style={styles.heroActionTxt}>Ajustar saldo</Text>
                </Pressable>
              ) : (
                <Pressable
                  onPress={() =>
                    router.push(`/transactions/new?type=TRANSFER&toAccountId=${account.id}` as any)
                  }
                  style={styles.heroAction}
                >
                  <ArrowRightLeft size={14} color="#FFFFFF" />
                  <Text style={styles.heroActionTxt}>Pagar tarjeta</Text>
                </Pressable>
              )}
            </View>
          </View>
        </CurvedHeroHeader>

        <View style={styles.content}>
          <View style={styles.twoCol}>
            <PremiumCard style={{ flex: 1 }} padding={14}>
              <Text style={{ color: theme.textMuted, fontFamily: theme.font('600'), fontSize: 11 }}>
                Ingresos recientes
              </Text>
              <Text style={{ color: theme.income, fontFamily: theme.font('800'), fontSize: theme.sp(15.5), fontVariant: ['tabular-nums'], marginTop: 4 }}>
                {formatMaskedMoney(totalIncome, account.currencyCode)}
              </Text>
            </PremiumCard>
            <PremiumCard style={{ flex: 1 }} padding={14}>
              <Text style={{ color: theme.textMuted, fontFamily: theme.font('600'), fontSize: 11 }}>
                Gastos recientes
              </Text>
              <Text style={{ color: theme.expense, fontFamily: theme.font('800'), fontSize: theme.sp(15.5), fontVariant: ['tabular-nums'], marginTop: 4 }}>
                {formatMaskedMoney(totalExpense, account.currencyCode)}
              </Text>
            </PremiumCard>
          </View>

          <PremiumCard padding={16}>
            <Text style={{ color: theme.text, fontFamily: theme.font('800'), fontSize: 14, marginBottom: 8 }}>
              Actividad reciente de la cuenta
            </Text>
            <DualSplineAreaChart
              data={chartPoints}
              primaryColor={theme.income}
              secondaryColor={theme.coral}
              primaryLabel="Entradas"
              secondaryLabel="Salidas"
              formatValue={(n) => (isBalanceVisible ? formatCompactMoney(n, account.currencyCode) : '•••')}
            />
          </PremiumCard>

          <View style={{ gap: 10 }}>
            <Text style={{ color: theme.text, fontFamily: theme.font('800'), fontSize: theme.sp(15.5) }}>
              Movimientos ({transactions.length})
            </Text>
            {transactions.map((tx: any) => (
              <TransactionListItem key={tx.id} tx={tx} onDelete={setTxToDelete} />
            ))}
          </View>
        </View>
      </ScrollView>

      <AccountFormModal open={editOpen} onClose={() => setEditOpen(false)} initialAccount={account} />
      <AdjustBalanceModal open={adjustOpen} onClose={() => setAdjustOpen(false)} account={account} />
      <ConfirmAlertModal
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        variant="danger"
        title="¿Eliminar esta cuenta?"
        description="Se desactivará la cuenta si no tiene bloqueos pendientes."
        confirmLabel="Eliminar"
        onConfirm={async () => {
          await deleteAccount.mutateAsync(account.id);
          router.back();
        }}
      />
      <ConfirmAlertModal
        open={Boolean(txToDelete)}
        onOpenChange={(o) => !o && setTxToDelete(null)}
        variant="danger"
        title="¿Eliminar movimiento?"
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
  heroBtn: {
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.18)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroCenter: { alignItems: 'center', marginTop: 14, gap: 4 },
  actionsRow: { flexDirection: 'row', gap: 10, marginTop: 12 },
  heroAction: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 99,
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.28)',
  },
  heroActionTxt: { color: '#FFFFFF', fontSize: 12.5, fontWeight: '700' },
  content: { padding: 16, gap: 14 },
  twoCol: { flexDirection: 'row', gap: 12 },
});
