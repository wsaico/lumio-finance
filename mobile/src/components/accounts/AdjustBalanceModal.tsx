import React, { useEffect, useState } from 'react';
import { StyleSheet, Text, TextInput, View } from 'react-native';
import { useAppTheme } from '@/theme/ThemeProvider';
import { useAccounts } from '@/hooks/useAccounts';
import { PremiumBottomSheet } from '@/components/ui/PremiumBottomSheet';
import { PremiumButton } from '@/components/ui/PremiumButton';

export function AdjustBalanceModal({
  open,
  onClose,
  account,
}: {
  open: boolean;
  onClose: () => void;
  account: any;
}) {
  const theme = useAppTheme();
  const { adjustBalance } = useAccounts();
  const [val, setVal] = useState('0');
  const [reason, setReason] = useState('');

  useEffect(() => {
    if (open && account) {
      setVal(String(account.initialBalance ?? account.currentBalance ?? 0));
      setReason('');
    }
  }, [open, account]);

  const handleSave = async () => {
    if (!account) return;
    await adjustBalance.mutateAsync({
      id: account.id,
      newInitialBalance: parseFloat(val) || 0,
      reason: reason.trim() || 'Ajuste desde móvil',
    });
    onClose();
  };

  return (
    <PremiumBottomSheet
      open={open}
      onClose={onClose}
      title="Ajustar saldo inicial"
      subtitle={account?.name}
      footer={
        <PremiumButton
          title="Recalcular y guardar"
          onPress={handleSave}
          loading={adjustBalance.isPending}
        />
      }
    >
      <View style={{ gap: 6 }}>
        <Text style={{ color: theme.textMuted, fontFamily: theme.font('800'), fontSize: 11 }}>
          NUEVO SALDO INICIAL ({account?.currencyCode})
        </Text>
        <TextInput
          value={val}
          onChangeText={setVal}
          keyboardType="decimal-pad"
          style={[styles.input, { backgroundColor: theme.muted, borderColor: theme.border, color: theme.text, fontFamily: theme.font('800'), fontSize: 20 }]}
        />
      </View>
      <View style={{ gap: 6 }}>
        <Text style={{ color: theme.textMuted, fontFamily: theme.font('800'), fontSize: 11 }}>
          MOTIVO (OPCIONAL)
        </Text>
        <TextInput
          value={reason}
          onChangeText={setReason}
          placeholder="Conciliación bancaria"
          placeholderTextColor={theme.textMuted}
          style={[styles.input, { backgroundColor: theme.muted, borderColor: theme.border, color: theme.text, fontFamily: theme.font('600') }]}
        />
      </View>
    </PremiumBottomSheet>
  );
}

const styles = StyleSheet.create({
  input: {
    height: 48,
    borderRadius: 15,
    borderWidth: 1,
    paddingHorizontal: 14,
  },
});
