import React, { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { ArrowRightLeft, PiggyBank, Wallet } from 'lucide-react-native';
import { useAppTheme } from '@/theme/ThemeProvider';
import { PremiumBottomSheet } from '@/components/ui/PremiumBottomSheet';
import { PremiumButton } from '@/components/ui/PremiumButton';
import { SegmentedControl } from '@/components/ui/SegmentedControl';
import { useAccounts } from '@/hooks/useAccounts';
import { useAddContribution, useTransferAndContribute, type SavingsGoal } from '@/hooks/useSavingsGoals';
import { useFormat } from '@/hooks/useFormat';
import { alphaHex } from '@/lib/color-math';
import { showAppToast } from '@/stores/toast-store';

export function ContributeModal({
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
  const addContribution = useAddContribution();
  const transferAndContribute = useTransferAndContribute();

  const [mode, setMode] = useState<'DIRECT' | 'TRANSFER'>('DIRECT');
  const [amount, setAmount] = useState('');
  const [fromAccountId, setFromAccountId] = useState('');
  const [notes, setNotes] = useState('');

  useEffect(() => {
    if (!open || !goal) return;
    setMode('DIRECT');
    setAmount('');
    setNotes('');
    const candidate = accounts.find((a) => a.id !== goal.primary_account_id && a.accountType !== 'CREDIT_CARD');
    setFromAccountId(candidate?.id || accounts[0]?.id || '');
  }, [open, goal, accounts]);

  if (!goal) return null;

  const isBusy = addContribution.isPending || transferAndContribute.isPending;

  const handleSubmit = async () => {
    const val = Number(amount.replace(/,/g, '.'));
    if (!Number.isFinite(val) || val <= 0) {
      showAppToast.warning({ title: 'Ingresa un monto válido para aportar' });
      return;
    }

    if (mode === 'TRANSFER') {
      if (!fromAccountId) {
        showAppToast.warning({ title: 'Selecciona la cuenta de origen' });
        return;
      }
      await transferAndContribute.mutateAsync({
        goalId: goal.id,
        amount: val,
        fromAccountId,
        toAccountId: goal.primary_account_id || undefined,
        notes: notes.trim() || undefined,
      });
    } else {
      await addContribution.mutateAsync({
        goalId: goal.id,
        amount: val,
        notes: notes.trim() || undefined,
      });
    }
    onOpenChange(false);
  };

  const quickAmounts = [50, 100, 250, 500];

  return (
    <PremiumBottomSheet
      open={open}
      onClose={() => onOpenChange(false)}
      title="Aportar a tu meta"
      subtitle={goal.name}
      footer={
        <View style={styles.footer}>
          <PremiumButton title="Cancelar" variant="outline" onPress={() => onOpenChange(false)} style={{ flex: 1 }} />
          <PremiumButton
            title="Confirmar aporte"
            variant="coral"
            icon={<PiggyBank size={16} color="#FFFFFF" />}
            loading={isBusy}
            onPress={handleSubmit}
            style={{ flex: 1.5 }}
          />
        </View>
      }
    >
      <View style={styles.form}>
        <SegmentedControl
          value={mode}
          onChange={setMode}
          options={[
            { id: 'DIRECT', label: 'Aporte directo' },
            { id: 'TRANSFER', label: 'Transferir desde cuenta' },
          ]}
        />

        <View>
          <Text style={[styles.label, { color: theme.textSecondary, fontFamily: theme.font('700'), fontSize: theme.sp(12) }]}>
            Monto ({goal.currency})
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
          <View style={styles.quickRow}>
            {quickAmounts.map((q) => (
              <Pressable
                key={q}
                onPress={() => setAmount(String(q))}
                style={[styles.quickChip, { backgroundColor: theme.brandSoft }]}
              >
                <Text style={{ color: theme.brand, fontFamily: theme.font('700'), fontSize: theme.sp(12) }}>
                  +{q}
                </Text>
              </Pressable>
            ))}
          </View>
        </View>

        {mode === 'TRANSFER' && (
          <View>
            <View style={styles.modeInfo}>
              <ArrowRightLeft size={14} color={theme.brand} />
              <Text style={{ color: theme.textSecondary, fontFamily: theme.font('600'), fontSize: theme.sp(12) }}>
                Selecciona la cuenta desde donde transfieres
              </Text>
            </View>
            <View style={styles.accList}>
              {accounts
                .filter((a) => a.accountType !== 'CREDIT_CARD')
                .map((acc) => {
                  const selected = fromAccountId === acc.id;
                  return (
                    <Pressable
                      key={acc.id}
                      onPress={() => setFromAccountId(acc.id)}
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
        )}

        <View>
          <Text style={[styles.label, { color: theme.textSecondary, fontFamily: theme.font('700'), fontSize: theme.sp(12) }]}>
            Nota (opcional)
          </Text>
          <TextInput
            value={notes}
            onChangeText={setNotes}
            placeholder="Ej. Ahorro de quincena"
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
  quickRow: { flexDirection: 'row', justifyContent: 'center', gap: 8, marginTop: 8 },
  quickChip: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 999 },
  modeInfo: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 8 },
  accList: { gap: 8 },
  accRow: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 12, borderRadius: 14, borderWidth: 1 },
});
