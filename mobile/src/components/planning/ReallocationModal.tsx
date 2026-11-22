import React, { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { ArrowRightLeft } from 'lucide-react-native';
import { useAppTheme } from '@/theme/ThemeProvider';
import { PremiumBottomSheet } from '@/components/ui/PremiumBottomSheet';
import { PremiumButton } from '@/components/ui/PremiumButton';
import { usePlanningZBB } from '@/hooks/usePlanningZBB';
import { useFormat } from '@/hooks/useFormat';
import { alphaHex } from '@/lib/color-math';
import { showAppToast } from '@/stores/toast-store';

export function ReallocationModal({
  open,
  onOpenChange,
  cycleId,
  allocations,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  cycleId: string;
  allocations: any[];
}) {
  const theme = useAppTheme();
  const { formatMoney } = useFormat();
  const { reallocate } = usePlanningZBB();

  const [fromId, setFromId] = useState('');
  const [toId, setToId] = useState('');
  const [amount, setAmount] = useState('');

  useEffect(() => {
    if (!open || allocations.length < 2) return;
    setFromId(allocations[0]?.id || '');
    setToId(allocations[1]?.id || '');
    setAmount('');
  }, [open, allocations]);

  const getTitle = (a: any) =>
    a?.goal?.name || a?.subcategory?.name || a?.category?.name || a?.justification || 'Partida';
  const getAmt = (a: any) =>
    Number(a?.allocated_amount_usd || 0) > 0
      ? Number(a.allocated_amount_usd)
      : Number(a?.allocated_amount_pen || 0);
  const getCur = (a: any) => (Number(a?.allocated_amount_usd || 0) > 0 ? 'USD' : 'PEN');

  const fromItem = allocations.find((a) => a.id === fromId);
  const maxAmt = fromItem ? getAmt(fromItem) : 0;

  const handleConfirm = async () => {
    const val = Number(amount.replace(/,/g, '.'));
    if (!fromId || !toId || fromId === toId) {
      showAppToast.warning({ title: 'Elige dos partidas diferentes' });
      return;
    }
    if (!Number.isFinite(val) || val <= 0 || val > maxAmt) {
      showAppToast.warning({ title: 'Monto inválido o superior al saldo del origen' });
      return;
    }

    await reallocate.mutateAsync({ cycleId, fromId, toId, amount: val });
    onOpenChange(false);
  };

  return (
    <PremiumBottomSheet
      open={open}
      onClose={() => onOpenChange(false)}
      title="Reasignar fondos entre sobres"
      subtitle="Mueve presupuesto sin alterar tu regla Base Cero"
      footer={
        <View style={styles.footer}>
          <PremiumButton title="Cancelar" variant="outline" onPress={() => onOpenChange(false)} style={{ flex: 1 }} />
          <PremiumButton
            title="Mover fondos"
            variant="coral"
            icon={<ArrowRightLeft size={15} color="#FFFFFF" />}
            loading={reallocate.isPending}
            onPress={handleConfirm}
            style={{ flex: 1.5 }}
          />
        </View>
      }
    >
      <View style={styles.form}>
        <View>
          <Text style={[styles.label, { color: theme.textSecondary, fontFamily: theme.font('700'), fontSize: theme.sp(12) }]}>
            Desde (Origen)
          </Text>
          <View style={styles.list}>
            {allocations.map((a) => {
              const selected = fromId === a.id;
              return (
                <Pressable
                  key={`from-${a.id}`}
                  onPress={() => setFromId(a.id)}
                  style={[
                    styles.row,
                    { backgroundColor: selected ? alphaHex(theme.coral, 0.12) : theme.muted, borderColor: selected ? theme.coral : theme.border },
                  ]}
                >
                  <Text style={{ flex: 1, color: theme.text, fontFamily: theme.font('700'), fontSize: theme.sp(13) }}>
                    {getTitle(a)}
                  </Text>
                  <Text style={{ color: theme.textSecondary, fontFamily: theme.font('700'), fontSize: theme.sp(12.5) }}>
                    {formatMoney(getAmt(a), getCur(a))}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </View>

        <View>
          <Text style={[styles.label, { color: theme.textSecondary, fontFamily: theme.font('700'), fontSize: theme.sp(12) }]}>
            Hacia (Destino)
          </Text>
          <View style={styles.list}>
            {allocations
              .filter((a) => a.id !== fromId)
              .map((a) => {
                const selected = toId === a.id;
                return (
                  <Pressable
                    key={`to-${a.id}`}
                    onPress={() => setToId(a.id)}
                    style={[
                      styles.row,
                      { backgroundColor: selected ? alphaHex(theme.brand, 0.12) : theme.muted, borderColor: selected ? theme.brand : theme.border },
                    ]}
                  >
                    <Text style={{ flex: 1, color: theme.text, fontFamily: theme.font('700'), fontSize: theme.sp(13) }}>
                      {getTitle(a)}
                    </Text>
                    <Text style={{ color: theme.textSecondary, fontFamily: theme.font('700'), fontSize: theme.sp(12.5) }}>
                      {formatMoney(getAmt(a), getCur(a))}
                    </Text>
                  </Pressable>
                );
              })}
          </View>
        </View>

        <View>
          <Text style={[styles.label, { color: theme.textSecondary, fontFamily: theme.font('700'), fontSize: theme.sp(12) }]}>
            Monto a transferir (máx {fromItem ? formatMoney(maxAmt, getCur(fromItem)) : '0'})
          </Text>
          <TextInput
            value={amount}
            onChangeText={setAmount}
            keyboardType="decimal-pad"
            placeholder="0.00"
            placeholderTextColor={theme.textMuted}
            style={[
              styles.input,
              { backgroundColor: theme.muted, borderColor: theme.border, color: theme.text, fontFamily: theme.font('800'), fontVariant: ['tabular-nums'] },
            ]}
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
  list: { gap: 6 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 11, borderRadius: 14, borderWidth: 1 },
  input: { borderWidth: 1, borderRadius: 16, paddingHorizontal: 14, paddingVertical: 12, fontSize: 20, textAlign: 'center' },
});
