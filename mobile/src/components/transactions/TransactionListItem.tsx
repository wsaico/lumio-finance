import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { ArrowRightLeft, Repeat } from 'lucide-react-native';
import { useAppTheme } from '@/theme/ThemeProvider';
import { useFormat } from '@/hooks/useFormat';
import { useSettingsStore } from '@/stores/settings-store';
import { CategoryIcon } from '@/components/ui/CategoryIcon';
import { SwipeableRow } from '@/components/ui/SwipeableRow';
import { alphaHex } from '@/lib/color-math';

export function TransactionListItem({
  tx,
  onPress,
  onDelete,
  showSwipe = true,
}: {
  tx: any;
  onPress?: () => void;
  onDelete?: (tx: any) => void;
  showSwipe?: boolean;
}) {
  const theme = useAppTheme();
  const router = useRouter();
  const { formatMaskedMoney } = useFormat();
  const density = useSettingsStore((s) => s.txListDensity);
  const amountStyle = useSettingsStore((s) => s.txAmountTotalStyle);

  const txType = (tx.transactionType || tx.transaction_type || 'EXPENSE') as
    | 'EXPENSE'
    | 'INCOME'
    | 'TRANSFER';
  const isIncome = txType === 'INCOME';
  const isTransfer = txType === 'TRANSFER';

  const cat = tx.expenseCategory || tx.expense_category || tx.incomeCategory || tx.income_category;
  const sub = tx.subcategory;
  const accName = tx.account?.name || tx.accountName || 'Cuenta';
  const currency = tx.currencyCode || tx.currency_code || tx.account?.currency_code || 'PEN';
  const amount = Math.abs(Number(tx.amount || 0));
  const dateRaw = tx.transactionDate || tx.transaction_date || tx.date;
  const parsedDate = dateRaw ? new Date(dateRaw) : new Date();
  const dateLabel = Number.isNaN(parsedDate.getTime())
    ? ''
    : format(parsedDate, 'd MMM · HH:mm', { locale: es });

  const iconBg = isTransfer
    ? theme.transfer
    : cat?.color || (isIncome ? theme.income : theme.brand);

  const amountColor =
    amountStyle === 'neutral'
      ? theme.text
      : isIncome
        ? theme.income
        : isTransfer
          ? theme.transfer
          : theme.expense;

  const sign = isIncome ? '+' : isTransfer ? '' : '-';
  const compact = density === 'compact';
  const isScheduledMode = ['SUBSCRIPTION', 'RECURRING', 'UPCOMING'].includes(tx.metadata?.mode);

  const handlePress = () => {
    if (onPress) onPress();
    else router.push(`/transactions/${tx.id}` as any);
  };

  const row = (
    <Pressable
      onPress={handlePress}
      style={({ pressed }) => [
        styles.card,
        {
          backgroundColor: theme.card,
          borderColor: theme.border,
          paddingVertical: compact ? 10 : 13,
          paddingHorizontal: compact ? 12 : 14,
          opacity: pressed ? 0.92 : 1,
        },
      ]}
    >
      <View
        style={[
          styles.iconBox,
          {
            width: compact ? 38 : 44,
            height: compact ? 38 : 44,
            borderRadius: theme.iconRadius,
            backgroundColor: alphaHex(iconBg, theme.isDark ? 0.22 : 0.13),
          },
        ]}
      >
        {isTransfer ? (
          <ArrowRightLeft size={compact ? 17 : 19} color={iconBg} />
        ) : (
          <CategoryIcon name={cat?.icon} size={compact ? 17 : 19} color={iconBg} />
        )}
      </View>

      <View style={styles.mid}>
        <View style={styles.topLine}>
          <Text
            numberOfLines={1}
            style={{
              flex: 1,
              color: theme.text,
              fontFamily: theme.font('700'),
              fontSize: theme.sp(compact ? 13 : 14),
            }}
          >
            {tx.description || cat?.name || 'Movimiento'}
          </Text>
          {isScheduledMode ? (
            <View style={[styles.modePill, { backgroundColor: theme.brandSoft }]}>
              <Repeat size={10} color={theme.brand} />
            </View>
          ) : null}
        </View>

        <Text
          numberOfLines={1}
          style={{
            color: theme.textMuted,
            fontFamily: theme.font('500'),
            fontSize: theme.sp(compact ? 10.5 : 11.5),
          }}
        >
          {sub?.name ? `${cat?.name} · ${sub.name}` : cat?.name || accName}
          {dateLabel ? ` · ${dateLabel}` : ''}
        </Text>
      </View>

      <View style={styles.right}>
        <Text
          numberOfLines={1}
          style={[
            styles.amount,
            {
              color: amountColor,
              fontFamily: theme.font('800'),
              fontSize: theme.sp(compact ? 13.5 : 14.5),
            },
          ]}
        >
          {`${sign}${formatMaskedMoney(amount, currency)}`}
        </Text>
        <Text
          numberOfLines={1}
          style={{
            color: theme.textMuted,
            fontFamily: theme.font('600'),
            fontSize: theme.sp(10),
          }}
        >
          {accName}
        </Text>
      </View>
    </Pressable>
  );

  if (!showSwipe) return row;

  return (
    <SwipeableRow
      onEdit={handlePress}
      onDelete={onDelete ? () => onDelete(tx) : undefined}
    >
      {row}
    </SwipeableRow>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderRadius: 20,
    borderWidth: 1,
  },
  iconBox: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  mid: {
    flex: 1,
    gap: 2,
    minWidth: 0,
  },
  topLine: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  modePill: {
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 99,
  },
  right: {
    alignItems: 'flex-end',
    gap: 2,
    maxWidth: 130,
  },
  amount: {
    fontVariant: ['tabular-nums'],
  },
});
