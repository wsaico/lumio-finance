import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useAppTheme } from '@/theme/ThemeProvider';
import { formatMoneyValue } from '@/lib/format';
import { useSettingsStore } from '@/stores/settings-store';

export function BalancePreviewBanner({
  account,
  amount,
  type,
}: {
  account: any;
  amount: number;
  type: 'EXPENSE' | 'INCOME' | 'TRANSFER';
}) {
  const theme = useAppTheme();
  const numberFormat = useSettingsStore((s) => s.numberFormat);
  if (!account) return null;

  const isCard = account.accountType === 'CREDIT_CARD';
  const creditLimit = Math.max(0, Number(account.creditLimit ?? 0));
  const usedBalance = Math.abs(Number(account.usedBalance ?? 0));
  const currentBal = isCard
    ? Math.max(0, creditLimit - usedBalance)
    : Number(account.currentBalance ?? account.balance ?? 0);

  const delta = Number(amount || 0);
  const projected = isCard
    ? type === 'INCOME'
      ? Math.min(creditLimit, currentBal + delta)
      : currentBal - delta
    : type === 'INCOME'
      ? currentBal + delta
      : currentBal - delta;

  const isNegative = projected < 0;

  return (
    <View
      style={[
        styles.wrap,
        { backgroundColor: theme.muted, borderColor: theme.border },
      ]}
    >
      <View style={styles.col}>
        <Text
          style={[
            styles.label,
            { color: theme.textMuted, fontFamily: theme.font('700'), fontSize: theme.sp(10) },
          ]}
        >
          {isCard ? 'CRÉDITO DISPONIBLE' : 'SALDO ACTUAL'}
        </Text>
        <Text
          style={[
            styles.val,
            { color: theme.text, fontFamily: theme.font('700'), fontSize: theme.sp(13) },
          ]}
        >
          {formatMoneyValue(currentBal, account.currencyCode, numberFormat)}
        </Text>
      </View>

      <View style={[styles.col, { alignItems: 'flex-end' }]}>
        <Text
          style={[
            styles.label,
            { color: theme.textMuted, fontFamily: theme.font('700'), fontSize: theme.sp(10) },
          ]}
        >
          PROYECTADO
        </Text>
        <View style={styles.rowRight}>
          <Text
            style={[
              styles.val,
              {
                color: isNegative ? theme.expense : theme.brand,
                fontFamily: theme.font('800'),
                fontSize: theme.sp(13.5),
              },
            ]}
          >
            {formatMoneyValue(projected, account.currencyCode, numberFormat)}
          </Text>
          {isCard && isNegative ? (
            <View style={[styles.badge, { backgroundColor: theme.expenseSoft }]}>
              <Text style={[styles.badgeText, { color: theme.expense, fontFamily: theme.font('700') }]}>
                Excede
              </Text>
            </View>
          ) : null}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 14,
    paddingVertical: 11,
    borderRadius: 16,
    borderWidth: 1,
    gap: 10,
  },
  col: {
    gap: 2,
  },
  label: {
    letterSpacing: 0.6,
  },
  val: {
    fontVariant: ['tabular-nums'],
  },
  rowRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  badge: {
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 99,
  },
  badgeText: {
    fontSize: 10,
  },
});
