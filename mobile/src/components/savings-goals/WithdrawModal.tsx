import React, { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { ArrowUpRight, Wallet } from 'lucide-react-native';
import { useAppTheme } from '@/theme/ThemeProvider';
import { PremiumBottomSheet } from '@/components/ui/PremiumBottomSheet';
import { PremiumButton } from '@/components/ui/PremiumButton';
import { useAccounts } from '@/hooks/useAccounts';
import { useWithdrawSavings, type SavingsGoal } from '@/hooks/useSavingsGoals';
import { useFormat } from '@/hooks/useFormat';
import { alphaHex } from '@/lib/color-math';
import { showAppToast } from '@/stores/toast-store';

export function WithdrawModal({
  open,
  onOpenChange,
  goal,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  goal: SavingsGoal | null;
}) {
  const theme = useAppTheme();
  const { formatMaskedMoney } = useFormat();
  const { accounts } = useAccounts();
  const withdrawSavings = useWithdrawSavings();

  const [amount, setAmount] = useState('');
  const [toAccountId, setToAccountId] = useState('');
  const [notes, setNotes] = useState('');

  useEffect(() => {
    if (!open || !goal) return;
    setAmount('');
    setNotes('');
    const dest = accounts.find((a) => a.accountType !== 'CREDIT_CARD');
    setToAccountId(dest?.id || '');
  }, [open, goal, accounts]);

  if (!goal) return null;

  const available = Number(goal.current_amount) || 0;

  const handleWithdraw = async () => {
    const val = Number(amount.replace(/,/g, '.'));
    if (!Number.isFinite(val) || val <= 0) {
      showAppToast.warning({ title: 'Ingresa un monto válido a retirar' });
      return;
    }
    if (val > available) {
      showAppToast.warning({ title: 'El retiro excede el saldo acumulado en esta meta' });
      return;
    }
    if (!toAccountId) {
      showAppToast.warning({ title: 'Selecciona la cuenta destino' });
      return;
    }

    await withdrawSavings.mutateAsync({
      goalId: goal.id,
      amount: val,
      fromAccountId: goal.primary_account_id || undefined,
      toAccountId,
      notes: notes.trim() || undefined,
    });
    onOpenChange(false);
  };

  return (
    <PremiumBottomSheet
      open={open}
      onClose={() => onOpenChange(false)}
      title="Retirar fondos de meta"
      subtitle={`Disponible: ${formatMaskedMoney(available, goal.currency)}`}
      footer={
        <View style={styles.footer}>
          <PremiumButton title="Cancelar" variant="outline" onPress={() => onOpenChange(false)} style={{ flex: 1 }} />
          <PremiumButton
            title="Retirar fondos"
            variant="primary"
            icon={<ArrowUpRight size={16} color="#FFFFFF" />}
            loading={withdrawSavings.isPending}
            onPress={handleWithdraw}
            style={{ flex: 1.5 }}
          />
        </View>
      }
    >
      <View style={styles.form}>
        <View>
          <Text style={[styles.label, { color: theme.textSecondary, fontFamily: theme.font('700'), fontSize: theme.sp(12) }]}>
            Monto a retirar ({goal.currency})
          </Text>
          <TextInput
            value={amount}
            onChangeText={setAmount}
            keyboardType="decimal-pad"
            placeholder="0.00"
            placeholderTextColor={theme.textMuted}
            style={[
              styles.amountInput,
              {
                backgroundColor: theme.muted,
                borderColor: theme.border,
                color: theme.text,
                fontFamily: theme.font('800'),
                fontVariant: ['tabular-nums'],
              },
            ]}
          />
        </View>

        <View>
          <Text style={[styles.label, { color: theme.textSecondary, fontFamily: theme.font('700'), fontSize: theme.sp(12) }]}>
            Cuenta destino
          </Text>
          <View style={styles.accList}>
            {accounts
              .filter((a) => a.accountType !== 'CREDIT_CARD')
              .map((acc) => {
                const selected = toAccountId === acc.id;
                return (
                  <Pressable
                    key={acc.id}
                    onPress={() => setToAccountId(acc.id)}
                    style={[
                      styles.accRow,
                      {
                        backgroundColor: selected ? alphaHex(theme.brand, 0.12) : theme.muted,
                        borderColor: selected ? theme.brand : theme.border,
                      },
                    ]}
                  >
                    <Wallet size={15} color={selected ? theme.brand : theme.textMuted} />
                    <Text style={{ flex: 1, color: theme.text, fontFamily: theme.font('700'), fontSize: theme.sp(13) }}>
                      {acc.name}
                    </Text>
                    <Text style={{ color: theme.textSecondary, fontFamily: theme.font('600'), fontSize: theme.sp(12) }}>
                      {formatMaskedMoney(acc.currentBalance, acc.currencyCode)}
                    </Text>
                  </Pressable>
                );
              })}
          </View>
        </View>

        <View>
          <Text style={[styles.label, { color: theme.textSecondary, fontFamily: theme.font('700'), fontSize: theme.sp(12) }]}>
            Motivo del retiro (opcional)
          </Text>
          <TextInput
            value={notes}
            onChangeText={setNotes}
            placeholder="Ej. Uso planificado de la meta"
            placeholderTextColor={theme.textMuted}
            style={[
              styles.input,
              { backgroundColor: theme.muted, borderColor: theme.border, color: theme.text, fontFamily: theme.font('500'), fontSize: theme.sp(13.5) },
            ]}
          />
        </View>
      </View>
    </PremiumBottomSheet>
  );
}

const styles = StyleSheet.create({
  form: { gap: 15, paddingBottom: 10 },
  footer: { flexDirection: 'row', gap: 10 },
  label: { marginBottom: 6 },
  amountInput: { borderWidth: 1, borderRadius: 18, paddingHorizontal: 16, paddingVertical: 14, fontSize: 26, textAlign: 'center' },
  input: { borderWidth: 1, borderRadius: 16, paddingHorizontal: 14, paddingVertical: 12 },
  accList: { gap: 8 },
  accRow: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 12, borderRadius: 14, borderWidth: 1 },
});
