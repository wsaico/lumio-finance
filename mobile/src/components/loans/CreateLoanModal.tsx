import React, { useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { addMonths } from 'date-fns';
import { ArrowDownLeft, ArrowUpRight, Percent, User } from 'lucide-react-native';
import { useAppTheme } from '@/theme/ThemeProvider';
import { PremiumBottomSheet } from '@/components/ui/PremiumBottomSheet';
import { PremiumButton } from '@/components/ui/PremiumButton';
import { PremiumAccountPicker } from '@/components/ui/PremiumAccountPicker';
import { PremiumCurrencyPicker } from '@/components/ui/PremiumCurrencyPicker';
import { SegmentedControl } from '@/components/ui/SegmentedControl';
import { PremiumDatePicker } from '@/components/ui/PremiumDatePicker';
import { BalancePreviewBanner } from '@/components/alerts/BalancePreviewBanner';
import { useAccounts } from '@/hooks/useAccounts';
import { useCreateAccountPayable, useCreateAccountReceivable } from '@/hooks/useLoans';
import { useSettingsStore } from '@/stores/settings-store';
import { alphaHex } from '@/lib/color-math';
import { showAppToast } from '@/stores/toast-store';

export function CreateLoanModal({
  open,
  onOpenChange,
  defaultType = 'RECEIVABLE',
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  defaultType?: 'RECEIVABLE' | 'PAYABLE';
}) {
  const theme = useAppTheme();
  const baseCurrency = useSettingsStore((s) => s.currencyCode) || 'PEN';
  const { accounts } = useAccounts();
  const createReceivable = useCreateAccountReceivable();
  const createPayable = useCreateAccountPayable();

  const [step, setStep] = useState<'basics' | 'schedule'>('basics');
  const [loanType, setLoanType] = useState<'RECEIVABLE' | 'PAYABLE'>(defaultType);
  const [contactName, setContactName] = useState('');
  const [contactEmail, setContactEmail] = useState('');
  const [contactPhone, setContactPhone] = useState('');
  const [amount, setAmount] = useState('');
  const [currencyCode, setCurrencyCode] = useState(baseCurrency);
  const [accountId, setAccountId] = useState('');
  const [dueDate, setDueDate] = useState<Date>(() => addMonths(new Date(), 1));
  const [interestRate, setInterestRate] = useState('0');
  const [interestType, setInterestType] = useState<'SIMPLE' | 'COMPOUND'>('SIMPLE');
  const [paymentFrequency, setPaymentFrequency] = useState<
    'MONTHLY' | 'WEEKLY' | 'BIWEEKLY' | 'SINGLE'
  >('MONTHLY');
  const [totalInstallments, setTotalInstallments] = useState('1');
  const [notes, setNotes] = useState('');

  useEffect(() => {
    if (!open) return;
    setStep('basics');
    setLoanType(defaultType);
    setContactName('');
    setContactEmail('');
    setContactPhone('');
    setAmount('');
    setCurrencyCode(baseCurrency);
    const liquid = accounts.find((a) => a.accountType !== 'CREDIT_CARD');
    setAccountId(liquid?.id || accounts[0]?.id || '');
    setDueDate(addMonths(new Date(), 1));
    setInterestRate('0');
    setInterestType('SIMPLE');
    setPaymentFrequency('MONTHLY');
    setTotalInstallments('1');
    setNotes('');
  }, [open, defaultType, baseCurrency, accounts]);

  const parsedAmount = Number(amount.replace(/,/g, '.')) || 0;
  const selectedAccount = accounts.find((a) => a.id === accountId);
  const isBusy = createReceivable.isPending || createPayable.isPending;

  const handleSave = async () => {
    if (!contactName.trim()) {
      showAppToast.warning({ title: 'Ingresa el nombre del contacto o entidad' });
      return;
    }
    if (parsedAmount <= 0) {
      showAppToast.warning({ title: 'Ingresa un monto positivo' });
      return;
    }
    if (!accountId) {
      showAppToast.warning({ title: 'Selecciona la cuenta asociada' });
      return;
    }

    const payload = {
      contactName: contactName.trim(),
      contactEmail: contactEmail.trim() || undefined,
      contactPhone: contactPhone.trim() || undefined,
      amount: parsedAmount,
      currencyCode,
      accountId,
      dueDate: dueDate.toISOString().slice(0, 10),
      interestRate: Math.max(0, Math.min(100, Number(interestRate) || 0)),
      interestType,
      paymentFrequency,
      totalInstallments: Math.max(1, Math.round(Number(totalInstallments) || 1)),
      notes: notes.trim() || undefined,
    };

    if (loanType === 'RECEIVABLE') {
      await createReceivable.mutateAsync(payload);
    } else {
      await createPayable.mutateAsync(payload);
    }
    onOpenChange(false);
  };

  return (
    <PremiumBottomSheet
      open={open}
      onClose={() => onOpenChange(false)}
      title={loanType === 'RECEIVABLE' ? 'Nuevo préstamo otorgado' : 'Nueva deuda por pagar'}
      subtitle="Impacta automáticamente el saldo de tu cuenta"
      footer={
        <View style={styles.footer}>
          {step === 'schedule' ? (
            <PremiumButton title="Atrás" variant="outline" onPress={() => setStep('basics')} style={{ flex: 1 }} />
          ) : (
            <PremiumButton title="Cancelar" variant="outline" onPress={() => onOpenChange(false)} style={{ flex: 1 }} />
          )}
          {step === 'basics' ? (
            <PremiumButton
              title="Continuar"
              variant="coral"
              onPress={() => {
                if (!contactName.trim() || parsedAmount <= 0) {
                  showAppToast.warning({ title: 'Completa el contacto y monto primero' });
                  return;
                }
                setStep('schedule');
              }}
              style={{ flex: 1.4 }}
            />
          ) : (
            <PremiumButton
              title="Registrar"
              variant="coral"
              loading={isBusy}
              onPress={handleSave}
              style={{ flex: 1.4 }}
            />
          )}
        </View>
      }
    >
      <View style={styles.form}>
        <SegmentedControl
          value={loanType}
          onChange={setLoanType}
          options={[
            { id: 'RECEIVABLE', label: 'Por Cobrar (Presté)' },
            { id: 'PAYABLE', label: 'Por Pagar (Debo)' },
          ]}
        />

        {step === 'basics' ? (
          <>
            <View>
              <Text style={[styles.label, { color: theme.textSecondary, fontFamily: theme.font('700'), fontSize: theme.sp(12) }]}>
                Contacto o institución
              </Text>
              <View style={[styles.inputWrap, { backgroundColor: theme.muted, borderColor: theme.border }]}>
                <User size={16} color={theme.textMuted} />
                <TextInput
                  value={contactName}
                  onChangeText={setContactName}
                  placeholder={loanType === 'RECEIVABLE' ? 'Ej. Carlos Mendoza' : 'Ej. Banco BCP / Juan'}
                  placeholderTextColor={theme.textMuted}
                  style={[styles.innerInput, { color: theme.text, fontFamily: theme.font('600'), fontSize: theme.sp(14.5) }]}
                />
              </View>
            </View>

            <View>
              <Text style={[styles.label, { color: theme.textSecondary, fontFamily: theme.font('700'), fontSize: theme.sp(12) }]}>
                Monto ({currencyCode})
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

            <PremiumCurrencyPicker
              label="Moneda"
              value={currencyCode}
              onChange={setCurrencyCode}
            />

            <PremiumAccountPicker
              accounts={accounts}
              selectedId={accountId}
              onSelectSingle={setAccountId}
              label={loanType === 'RECEIVABLE' ? 'Cuenta desde donde entregas' : 'Cuenta que recibe el dinero'}
            />

            {loanType === 'RECEIVABLE' && selectedAccount && parsedAmount > 0 && (
              <BalancePreviewBanner
                account={selectedAccount}
                amount={parsedAmount}
                type="EXPENSE"
              />
            )}
          </>
        ) : (
          <>
            <PremiumDatePicker label="Fecha límite de vencimiento" value={dueDate} onChange={setDueDate} variant="hero" />

            <View style={styles.row2}>
              <View style={{ flex: 1 }}>
                <Text style={[styles.label, { color: theme.textSecondary, fontFamily: theme.font('700'), fontSize: theme.sp(12) }]}>
                  Interés (%)
                </Text>
                <View style={[styles.inputWrap, { backgroundColor: theme.muted, borderColor: theme.border }]}>
                  <Percent size={15} color={theme.textMuted} />
                  <TextInput
                    value={interestRate}
                    onChangeText={setInterestRate}
                    keyboardType="decimal-pad"
                    style={[styles.innerInput, { color: theme.text, fontFamily: theme.font('700'), fontVariant: ['tabular-nums'] }]}
                  />
                </View>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.label, { color: theme.textSecondary, fontFamily: theme.font('700'), fontSize: theme.sp(12) }]}>
                  N° de cuotas
                </Text>
                <TextInput
                  value={totalInstallments}
                  onChangeText={setTotalInstallments}
                  keyboardType="number-pad"
                  style={[styles.input, { backgroundColor: theme.muted, borderColor: theme.border, color: theme.text, fontFamily: theme.font('700'), fontVariant: ['tabular-nums'] }]}
                />
              </View>
            </View>

            <View>
              <Text style={[styles.label, { color: theme.textSecondary, fontFamily: theme.font('700'), fontSize: theme.sp(12) }]}>
                Tipo de interés
              </Text>
              <SegmentedControl
                value={interestType}
                onChange={setInterestType}
                options={[
                  { id: 'SIMPLE', label: 'Simple' },
                  { id: 'COMPOUND', label: 'Compuesto' },
                ]}
              />
            </View>

            <View>
              <Text style={[styles.label, { color: theme.textSecondary, fontFamily: theme.font('700'), fontSize: theme.sp(12) }]}>
                Frecuencia de cuotas
              </Text>
              <View style={styles.chipWrap}>
                {[
                  { id: 'MONTHLY', label: 'Mensual' },
                  { id: 'BIWEEKLY', label: 'Quincenal' },
                  { id: 'WEEKLY', label: 'Semanal' },
                  { id: 'SINGLE', label: 'Pago único' },
                ].map((f) => {
                  const active = paymentFrequency === f.id;
                  return (
                    <Pressable
                      key={f.id}
                      onPress={() => setPaymentFrequency(f.id as any)}
                      style={[
                        styles.pill,
                        { backgroundColor: active ? theme.brand : theme.muted, borderColor: active ? theme.brand : theme.border },
                      ]}
                    >
                      <Text style={{ color: active ? '#FFFFFF' : theme.text, fontFamily: theme.font('700'), fontSize: theme.sp(12) }}>
                        {f.label}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
            </View>

            <View>
              <Text style={[styles.label, { color: theme.textSecondary, fontFamily: theme.font('700'), fontSize: theme.sp(12) }]}>
                Correo o teléfono del contacto (opcional)
              </Text>
              <TextInput
                value={contactEmail}
                onChangeText={setContactEmail}
                keyboardType="email-address"
                autoCapitalize="none"
                placeholder="correo@ejemplo.com"
                placeholderTextColor={theme.textMuted}
                style={[styles.input, { backgroundColor: theme.muted, borderColor: theme.border, color: theme.text, fontFamily: theme.font('500') }]}
              />
            </View>

            <View>
              <Text style={[styles.label, { color: theme.textSecondary, fontFamily: theme.font('700'), fontSize: theme.sp(12) }]}>
                Notas (opcional)
              </Text>
              <TextInput
                value={notes}
                onChangeText={setNotes}
                placeholder="Detalles del acuerdo"
                placeholderTextColor={theme.textMuted}
                multiline
                style={[styles.input, { minHeight: 68, backgroundColor: theme.muted, borderColor: theme.border, color: theme.text, fontFamily: theme.font('500') }]}
              />
            </View>
          </>
        )}

        <View style={[styles.typeHint, { backgroundColor: alphaHex(loanType === 'RECEIVABLE' ? theme.income : theme.coral, 0.1) }]}>
          {loanType === 'RECEIVABLE' ? (
            <ArrowUpRight size={15} color={theme.income} />
          ) : (
            <ArrowDownLeft size={15} color={theme.coral} />
          )}
          <Text style={{ flex: 1, color: theme.textSecondary, fontFamily: theme.font('500'), fontSize: theme.sp(11.5) }}>
            {loanType === 'RECEIVABLE'
              ? 'Se descontará de la cuenta seleccionada y se registrará como activo por cobrar.'
              : 'Se acreditará en la cuenta elegida y se controlará como obligación por pagar.'}
          </Text>
        </View>
      </View>
    </PremiumBottomSheet>
  );
}

const styles = StyleSheet.create({
  form: { gap: 14, paddingBottom: 10 },
  footer: { flexDirection: 'row', gap: 10 },
  label: { marginBottom: 6 },
  inputWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderWidth: 1,
    borderRadius: 16,
    paddingHorizontal: 14,
  },
  innerInput: { flex: 1, paddingVertical: 12 },
  input: { borderWidth: 1, borderRadius: 16, paddingHorizontal: 14, paddingVertical: 12 },
  amountInput: { borderWidth: 1, borderRadius: 18, paddingHorizontal: 16, paddingVertical: 14, fontSize: 25, textAlign: 'center' },
  chipRow: { gap: 8 },
  chipWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  pill: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 999, borderWidth: 1 },
  row2: { flexDirection: 'row', gap: 10 },
  typeHint: { flexDirection: 'row', alignItems: 'center', gap: 8, padding: 11, borderRadius: 14 },
});
