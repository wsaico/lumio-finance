import React, { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { Check } from 'lucide-react-native';
import { useAppTheme } from '@/theme/ThemeProvider';
import { PremiumBottomSheet } from '@/components/ui/PremiumBottomSheet';
import { PremiumButton } from '@/components/ui/PremiumButton';
import { PremiumAccountPicker } from '@/components/ui/PremiumAccountPicker';
import { useAccounts } from '@/hooks/useAccounts';
import { useUpdateAccountPayable, useUpdateAccountReceivable } from '@/hooks/useLoans';
import { useFormat } from '@/hooks/useFormat';
import { alphaHex } from '@/lib/color-math';
import { showAppToast } from '@/stores/toast-store';
import type { AccountPayable, AccountReceivable, PaymentMethod } from '@/types/loans';

const METHODS: { id: PaymentMethod; label: string }[] = [
  { id: 'TRANSFER', label: 'Transferencia' },
  { id: 'CASH', label: 'Efectivo' },
  { id: 'CARD', label: 'Tarjeta' },
  { id: 'CHECK', label: 'Cheque' },
  { id: 'OTHER', label: 'Otro' },
];

export function LoanPaymentModal({
  open,
  onOpenChange,
  loan,
  mode,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  loan: (AccountReceivable | AccountPayable) | null;
  mode: 'RECEIVABLE' | 'PAYABLE';
}) {
  const theme = useAppTheme();
  const { formatMaskedMoney } = useFormat();
  const { accounts } = useAccounts();
  const updateReceivable = useUpdateAccountReceivable();
  const updatePayable = useUpdateAccountPayable();

  const [paymentAmount, setPaymentAmount] = useState('');
  const [accountId, setAccountId] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('TRANSFER');
  const [notes, setNotes] = useState('');

  useEffect(() => {
    if (!open || !loan) return;
    const outstanding = Number(loan.outstandingBalance) || 0;
    const installments = Math.max(1, Number(loan.totalInstallments) || 1);
    const suggested = installments > 1 ? Math.min(outstanding, outstanding / installments) : outstanding;
    setPaymentAmount(suggested > 0 ? suggested.toFixed(2) : '');
    const liquid = accounts.find((a) => a.accountType !== 'CREDIT_CARD');
    setAccountId(liquid?.id || accounts[0]?.id || '');
    setPaymentMethod('TRANSFER');
    setNotes('');
  }, [open, loan, accounts]);

  if (!loan) return null;

  const outstanding = Number(loan.outstandingBalance) || 0;
  const isBusy = updateReceivable.isPending || updatePayable.isPending;

  const handleConfirm = async () => {
    const val = Number(paymentAmount.replace(/,/g, '.'));
    if (!Number.isFinite(val) || val <= 0) {
      showAppToast.warning({ title: 'Ingresa un monto válido' });
      return;
    }
    if (!accountId) {
      showAppToast.warning({ title: 'Selecciona la cuenta' });
      return;
    }

    const payload = {
      id: loan.id,
      paymentAmount: val,
      accountId,
      paymentMethod,
      notes: notes.trim() || undefined,
    };

    if (mode === 'RECEIVABLE') {
      await updateReceivable.mutateAsync(payload);
    } else {
      await updatePayable.mutateAsync(payload);
    }
    onOpenChange(false);
  };

  return (
    <PremiumBottomSheet
      open={open}
      onClose={() => onOpenChange(false)}
      title={mode === 'RECEIVABLE' ? 'Registrar cobro' : 'Registrar pago'}
      subtitle={`${loan.contactName} · Pendiente: ${formatMaskedMoney(outstanding, loan.currencyCode)}`}
      footer={
        <View style={styles.footer}>
          <PremiumButton title="Cancelar" variant="outline" onPress={() => onOpenChange(false)} style={{ flex: 1 }} />
          <PremiumButton
            title={mode === 'RECEIVABLE' ? 'Confirmar cobro' : 'Confirmar pago'}
            variant="coral"
            icon={<Check size={16} color="#FFFFFF" />}
            loading={isBusy}
            onPress={handleConfirm}
            style={{ flex: 1.5 }}
          />
        </View>
      }
    >
      <View style={styles.form}>
        <View>
          <Text style={[styles.label, { color: theme.textSecondary, fontFamily: theme.font('700'), fontSize: theme.sp(12) }]}>
            Monto ({loan.currencyCode})
          </Text>
          <TextInput
            value={paymentAmount}
            onChangeText={setPaymentAmount}
            keyboardType="decimal-pad"
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
            <Pressable
              onPress={() => setPaymentAmount((outstanding * 0.5).toFixed(2))}
              style={[styles.quickBtn, { backgroundColor: theme.brandSoft }]}
            >
              <Text style={{ color: theme.brand, fontFamily: theme.font('700'), fontSize: theme.sp(11.5) }}>
                50% ({formatMaskedMoney(outstanding * 0.5, loan.currencyCode)})
              </Text>
            </Pressable>
            <Pressable
              onPress={() => setPaymentAmount(outstanding.toFixed(2))}
              style={[styles.quickBtn, { backgroundColor: alphaHex(theme.coral, 0.14) }]}
            >
              <Text style={{ color: theme.coral, fontFamily: theme.font('700'), fontSize: theme.sp(11.5) }}>
                Liquidar total
              </Text>
            </Pressable>
          </View>
        </View>

        <PremiumAccountPicker
          accounts={accounts}
          selectedId={accountId}
          onSelectSingle={setAccountId}
          label={mode === 'RECEIVABLE' ? 'Cuenta que recibe' : 'Cuenta que paga'}
        />

        <View>
          <Text style={[styles.label, { color: theme.textSecondary, fontFamily: theme.font('700'), fontSize: theme.sp(12) }]}>
            Método de pago
          </Text>
          <View style={styles.chipWrap}>
            {METHODS.map((m) => {
              const active = paymentMethod === m.id;
              return (
                <Pressable
                  key={m.id}
                  onPress={() => setPaymentMethod(m.id)}
                  style={[
                    styles.pill,
                    { backgroundColor: active ? theme.brand : theme.muted, borderColor: active ? theme.brand : theme.border },
                  ]}
                >
                  <Text style={{ color: active ? '#FFFFFF' : theme.text, fontFamily: theme.font('600'), fontSize: theme.sp(12) }}>
                    {m.label}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </View>

        <View>
          <Text style={[styles.label, { color: theme.textSecondary, fontFamily: theme.font('700'), fontSize: theme.sp(12) }]}>
            Referencia o nota (opcional)
          </Text>
          <TextInput
            value={notes}
            onChangeText={setNotes}
            placeholder="Ej. Cuota #1"
            placeholderTextColor={theme.textMuted}
            style={[styles.input, { backgroundColor: theme.muted, borderColor: theme.border, color: theme.text, fontFamily: theme.font('500') }]}
          />
        </View>
      </View>
    </PremiumBottomSheet>
  );
}

const styles = StyleSheet.create({
  form: { gap: 14, paddingBottom: 10 },
  footer: { flexDirection: 'row', gap: 10 },
  label: { marginBottom: 6 },
  amountInput: { borderWidth: 1, borderRadius: 18, paddingHorizontal: 16, paddingVertical: 14, fontSize: 25, textAlign: 'center' },
  quickRow: { flexDirection: 'row', justifyContent: 'center', gap: 8, marginTop: 8 },
  quickBtn: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 999 },
  accList: { gap: 8 },
  accRow: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 12, borderRadius: 14, borderWidth: 1 },
  chipWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  pill: { paddingHorizontal: 12, paddingVertical: 7, borderRadius: 999, borderWidth: 1 },
  input: { borderWidth: 1, borderRadius: 16, paddingHorizontal: 14, paddingVertical: 12 },
});
