import React, { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { useAppTheme } from '@/theme/ThemeProvider';
import { getDefaultEntityForCountry } from '@/lib/banks';
import { useAccounts } from '@/hooks/useAccounts';
import { useSettingsStore } from '@/stores/settings-store';
import { PremiumBottomSheet } from '@/components/ui/PremiumBottomSheet';
import { PremiumButton } from '@/components/ui/PremiumButton';
import { PremiumCurrencyPicker } from '@/components/ui/PremiumCurrencyPicker';
import { PremiumEntityPicker } from '@/components/ui/PremiumEntityPicker';
import { showAppToast } from '@/stores/toast-store';

const ACCOUNT_TYPES = [
  { id: 'BANK', label: 'Banco' },
  { id: 'DIGITAL', label: 'Billetera' },
  { id: 'CASH', label: 'Efectivo' },
  { id: 'CREDIT_CARD', label: 'Tarjeta Crédito' },
  { id: 'INVESTMENT', label: 'Inversión' },
] as const;

export function AccountFormModal({
  open,
  onClose,
  initialAccount,
  defaultType = 'BANK',
}: {
  open: boolean;
  onClose: () => void;
  initialAccount?: any;
  defaultType?: 'CASH' | 'BANK' | 'DIGITAL' | 'CREDIT_CARD' | 'INVESTMENT';
}) {
  const theme = useAppTheme();
  const countryCode = useSettingsStore((s) => s.countryCode) || 'PE';
  const defaultCurrency = useSettingsStore((s) => s.currencyCode) || 'PEN';
  const { createAccount, updateAccount } = useAccounts();

  const [name, setName] = useState('');
  const [type, setType] = useState<'CASH' | 'BANK' | 'DIGITAL' | 'CREDIT_CARD' | 'INVESTMENT'>('BANK');
  const [currency, setCurrency] = useState(defaultCurrency);
  const [balance, setBalance] = useState('0');
  const [bankName, setBankName] = useState('');
  const [color, setColor] = useState('#5B35D5');
  const [hasCustomEntity, setHasCustomEntity] = useState(false);
  const [creditLimit, setCreditLimit] = useState('5000');
  const [usedBalance, setUsedBalance] = useState('0');
  const [lastFour, setLastFour] = useState('');
  const [closingDay, setClosingDay] = useState('25');
  const [paymentDueDay, setPaymentDueDay] = useState('10');

  useEffect(() => {
    if (!open) return;
    if (initialAccount) {
      const initType = initialAccount.accountType || 'BANK';
      const fallbackEntity = getDefaultEntityForCountry(countryCode, initType);
      setName(initialAccount.name || '');
      setType(initType);
      setCurrency(initialAccount.currencyCode || defaultCurrency);
      setBalance(String(initialAccount.initialBalance ?? initialAccount.currentBalance ?? 0));
      setBankName(initialAccount.bankName || fallbackEntity.name);
      setColor(initialAccount.color || fallbackEntity.color);
      setHasCustomEntity(true);
      setCreditLimit(String(initialAccount.creditLimit ?? 5000));
      setUsedBalance(String(initialAccount.usedBalance ?? 0));
      setLastFour(initialAccount.lastFourDigits || '');
      setClosingDay(String(initialAccount.closingDay ?? 25));
      setPaymentDueDay(String(initialAccount.paymentDueDay ?? 10));
    } else {
      const fallbackEntity = getDefaultEntityForCountry(countryCode, defaultType);
      setName('');
      setType(defaultType);
      setCurrency(defaultCurrency);
      setBalance('0');
      setBankName(defaultType === 'CASH' ? 'Efectivo' : fallbackEntity.name);
      setColor(defaultType === 'CASH' ? '#10B981' : fallbackEntity.color);
      setHasCustomEntity(false);
      setCreditLimit('5000');
      setUsedBalance('0');
      setLastFour('');
      setClosingDay('25');
      setPaymentDueDay('10');
    }
  }, [open, initialAccount, defaultType, defaultCurrency, countryCode]);

  const handleTypeChange = (
    nextType: 'CASH' | 'BANK' | 'DIGITAL' | 'CREDIT_CARD' | 'INVESTMENT'
  ) => {
    setType(nextType);
    if (!initialAccount && !hasCustomEntity) {
      if (nextType === 'CASH') {
        setBankName('Efectivo');
        setColor('#10B981');
      } else {
        const suggested = getDefaultEntityForCountry(countryCode, nextType);
        setBankName(suggested.name);
        setColor(suggested.color);
      }
    }
  };

  const isCard = type === 'CREDIT_CARD';
  const saving = createAccount.isPending || updateAccount.isPending;

  const handleSave = async () => {
    if (!name.trim()) {
      showAppToast.warning({ title: 'Ingresa un nombre para la cuenta' });
      return;
    }
    const payload: Record<string, any> = {
      name: name.trim(),
      type,
      currency,
      color,
      icon: isCard ? 'credit-card' : type === 'CASH' ? 'banknote' : 'wallet',
      bankName: type === 'CASH' ? 'Efectivo' : bankName.trim() || 'Cuenta',
    };

    if (isCard) {
      payload.creditLimit = Math.max(0, parseFloat(creditLimit) || 0);
      payload.usedBalance = Math.max(0, parseFloat(usedBalance) || 0);
      payload.lastFourDigits = lastFour.slice(0, 4) || undefined;
      payload.closingDay = Math.min(31, Math.max(1, parseInt(closingDay, 10) || 25));
      payload.paymentDueDay = Math.min(31, Math.max(1, parseInt(paymentDueDay, 10) || 10));
    } else if (!initialAccount) {
      payload.balance = parseFloat(balance) || 0;
    }

    try {
      if (initialAccount) {
        await updateAccount.mutateAsync({ id: initialAccount.id, data: payload });
      } else {
        await createAccount.mutateAsync(payload);
      }
      onClose();
    } catch {
      // toast handled in hook
    }
  };

  return (
    <PremiumBottomSheet
      open={open}
      onClose={onClose}
      title={initialAccount ? 'Editar cuenta' : 'Nueva cuenta o tarjeta'}
      footer={
        <PremiumButton
          title={initialAccount ? 'Guardar cambios' : 'Crear cuenta'}
          onPress={handleSave}
          loading={saving}
        />
      }
    >
      <View style={{ gap: 6 }}>
        <Text style={{ color: theme.textMuted, fontFamily: theme.font('800'), fontSize: 11 }}>
          TIPO DE CUENTA
        </Text>
        <View style={styles.wrapRow}>
          {ACCOUNT_TYPES.map((t) => (
            <Pressable
              key={t.id}
              onPress={() => handleTypeChange(t.id)}
              style={[
                styles.chip,
                {
                  backgroundColor: type === t.id ? theme.brand : theme.muted,
                  borderColor: type === t.id ? theme.brand : theme.border,
                },
              ]}
            >
              <Text style={{ color: type === t.id ? '#FFFFFF' : theme.text, fontFamily: theme.font('700'), fontSize: 12 }}>
                {t.label}
              </Text>
            </Pressable>
          ))}
        </View>
      </View>

      <View style={{ gap: 6 }}>
        <Text style={{ color: theme.textMuted, fontFamily: theme.font('800'), fontSize: 11 }}>
          NOMBRE
        </Text>
        <TextInput
          value={name}
          onChangeText={setName}
          placeholder={
            type === 'DIGITAL'
              ? 'Ej. Yape Principal, PayPal...'
              : isCard
                ? 'Ej. Visa Signature, Mastercard...'
                : type === 'CASH'
                  ? 'Ej. Billetera, Caja Chica...'
                  : 'Ej. Cuenta Sueldo, Ahorros...'
          }
          placeholderTextColor={theme.textMuted}
          style={[styles.input, { backgroundColor: theme.muted, borderColor: theme.border, color: theme.text, fontFamily: theme.font('700') }]}
        />
      </View>

      {type !== 'CASH' ? (
        <PremiumEntityPicker
          entityName={bankName}
          entityColor={color}
          accountType={type}
          onSelect={(nextName, nextColor) => {
            setBankName(nextName);
            setColor(nextColor);
            setHasCustomEntity(true);
          }}
        />
      ) : null}

      <PremiumCurrencyPicker
        label="Moneda de la cuenta"
        value={currency}
        onChange={setCurrency}
      />

      {isCard ? (
        <View style={{ gap: 10 }}>
          <View style={styles.twoCol}>
            <View style={{ flex: 1, gap: 5 }}>
              <Text style={{ color: theme.textMuted, fontFamily: theme.font('800'), fontSize: 10.5 }}>
                LÍNEA DE CRÉDITO
              </Text>
              <TextInput
                value={creditLimit}
                onChangeText={setCreditLimit}
                keyboardType="decimal-pad"
                style={[styles.input, { backgroundColor: theme.muted, borderColor: theme.border, color: theme.text, fontFamily: theme.font('700') }]}
              />
            </View>
            <View style={{ flex: 1, gap: 5 }}>
              <Text style={{ color: theme.textMuted, fontFamily: theme.font('800'), fontSize: 10.5 }}>
                DEUDA ACTUAL
              </Text>
              <TextInput
                value={usedBalance}
                onChangeText={setUsedBalance}
                keyboardType="decimal-pad"
                style={[styles.input, { backgroundColor: theme.muted, borderColor: theme.border, color: theme.text, fontFamily: theme.font('700') }]}
              />
            </View>
          </View>

          <View style={styles.twoCol}>
            <View style={{ flex: 1, gap: 5 }}>
              <Text style={{ color: theme.textMuted, fontFamily: theme.font('800'), fontSize: 10.5 }}>
                ÚLTIMOS 4 DÍGITOS
              </Text>
              <TextInput
                value={lastFour}
                onChangeText={setLastFour}
                keyboardType="number-pad"
                maxLength={4}
                placeholder="4512"
                placeholderTextColor={theme.textMuted}
                style={[styles.input, { backgroundColor: theme.muted, borderColor: theme.border, color: theme.text, fontFamily: theme.font('700') }]}
              />
            </View>
            <View style={{ flex: 1, gap: 5 }}>
              <Text style={{ color: theme.textMuted, fontFamily: theme.font('800'), fontSize: 10.5 }}>
                DÍA DE PAGO
              </Text>
              <TextInput
                value={paymentDueDay}
                onChangeText={setPaymentDueDay}
                keyboardType="number-pad"
                maxLength={2}
                style={[styles.input, { backgroundColor: theme.muted, borderColor: theme.border, color: theme.text, fontFamily: theme.font('700') }]}
              />
            </View>
          </View>
        </View>
      ) : !initialAccount ? (
        <View style={{ gap: 6 }}>
          <Text style={{ color: theme.textMuted, fontFamily: theme.font('800'), fontSize: 11 }}>
            SALDO INICIAL ({currency})
          </Text>
          <TextInput
            value={balance}
            onChangeText={setBalance}
            keyboardType="decimal-pad"
            style={[styles.input, { backgroundColor: theme.muted, borderColor: theme.border, color: theme.text, fontFamily: theme.font('800'), fontSize: 18 }]}
          />
        </View>
      ) : null}
    </PremiumBottomSheet>
  );
}

const styles = StyleSheet.create({
  wrapRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 7 },
  chip: {
    paddingHorizontal: 11,
    paddingVertical: 7,
    borderRadius: 99,
    borderWidth: 1,
  },
  input: {
    height: 46,
    borderRadius: 15,
    borderWidth: 1,
    paddingHorizontal: 13,
    fontSize: 14,
  },
  twoCol: { flexDirection: 'row', gap: 10 },
});
