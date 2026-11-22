import React, { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { Target } from 'lucide-react-native';
import { useAppTheme } from '@/theme/ThemeProvider';
import { PremiumBottomSheet } from '@/components/ui/PremiumBottomSheet';
import { PremiumButton } from '@/components/ui/PremiumButton';
import { SegmentedControl } from '@/components/ui/SegmentedControl';
import { CategoryIcon } from '@/components/ui/CategoryIcon';
import { useCategories } from '@/hooks/useCategories';
import { useSavingsGoals } from '@/hooks/useSavingsGoals';
import { usePlanningZBB } from '@/hooks/usePlanningZBB';
import { useSettingsStore } from '@/stores/settings-store';
import { alphaHex } from '@/lib/color-math';
import { showAppToast } from '@/stores/toast-store';

const PRIORITIES = [
  { id: 1, label: '1 · Esencial', color: '#F43F5E' },
  { id: 2, label: '2 · Importante', color: '#F59E0B' },
  { id: 3, label: '3 · Deseable', color: '#5B35D5' },
  { id: 4, label: '4 · Opcional', color: '#64748B' },
];

const FREQUENCIES = [
  { id: 'monthly', label: 'Mensual', mult: 1 },
  { id: 'biweekly', label: 'Quincenal', mult: 2 },
  { id: 'weekly', label: 'Semanal', mult: 4.33 },
  { id: 'daily', label: 'Diario', mult: 30 },
] as const;

export function AllocationModal({
  open,
  onOpenChange,
  cycleId,
  initialAllocation,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  cycleId: string;
  initialAllocation?: any;
}) {
  const theme = useAppTheme();
  const baseCurrency = useSettingsStore((s) => s.currencyCode) === 'USD' ? 'USD' : 'PEN';
  const { expense: expenseCategories } = useCategories();
  const goalsQuery = useSavingsGoals('ACTIVE');
  const { createAllocation, updateAllocation } = usePlanningZBB();

  const [tab, setTab] = useState<'expenses' | 'savings'>('expenses');
  const [categoryId, setCategoryId] = useState('');
  const [goalId, setGoalId] = useState('');
  const [amount, setAmount] = useState('');
  const [currency, setCurrency] = useState<'PEN' | 'USD'>(baseCurrency);
  const [priority, setPriority] = useState(1);
  const [frequency, setFrequency] = useState<'monthly' | 'biweekly' | 'weekly' | 'daily'>('monthly');
  const [justification, setJustification] = useState('');

  useEffect(() => {
    if (!open) return;
    if (initialAllocation) {
      const isSav = Boolean(initialAllocation.goal_id);
      setTab(isSav ? 'savings' : 'expenses');
      setCategoryId(initialAllocation.category_id || '');
      setGoalId(initialAllocation.goal_id || '');
      const isUsd = Number(initialAllocation.allocated_amount_usd || 0) > 0;
      setCurrency(isUsd ? 'USD' : 'PEN');
      setAmount(
        String(
          isUsd
            ? initialAllocation.allocated_amount_usd || ''
            : initialAllocation.allocated_amount_pen || ''
        )
      );
      setPriority(Number(initialAllocation.priority) || 1);
      setFrequency('monthly');
      setJustification(initialAllocation.justification || '');
    } else {
      setTab('expenses');
      setCategoryId(expenseCategories[0]?.id || '');
      setGoalId(goalsQuery.data?.[0]?.id || '');
      setAmount('');
      setCurrency(baseCurrency);
      setPriority(1);
      setFrequency('monthly');
      setJustification('');
    }
  }, [open, initialAllocation, expenseCategories, goalsQuery.data, baseCurrency]);

  const activeGoals = goalsQuery.data || [];
  const rawVal = Number(amount.replace(/,/g, '.')) || 0;
  const freqMult = FREQUENCIES.find((f) => f.id === frequency)?.mult || 1;
  const monthlyAmount = Math.round(rawVal * freqMult * 100) / 100;
  const isBusy = createAllocation.isPending || updateAllocation.isPending;

  const handleSave = async () => {
    if (monthlyAmount <= 0) {
      showAppToast.warning({ title: 'Ingresa un monto positivo' });
      return;
    }
    if (tab === 'expenses' && !categoryId) {
      showAppToast.warning({ title: 'Selecciona una categoría' });
      return;
    }
    if (tab === 'savings' && !goalId) {
      showAppToast.warning({ title: 'Selecciona una meta de ahorro' });
      return;
    }

    let finalJust = justification.trim();
    if (!finalJust) {
      if (tab === 'expenses') {
        const cat = expenseCategories.find((c: any) => c.id === categoryId);
        finalJust = `Planificado: ${cat?.name || 'Gasto'}`;
      } else {
        const goal = activeGoals.find((g) => g.id === goalId);
        finalJust = `Ahorro: ${goal?.name || 'Meta'}`;
      }
    }

    const payload: any = {
      cycleId,
      categoryId: tab === 'expenses' ? categoryId : null,
      subcategoryId: null,
      goalId: tab === 'savings' ? goalId : null,
      amount: monthlyAmount,
      currency,
      justification: finalJust,
      priority,
    };

    if (initialAllocation?.id) {
      await updateAllocation.mutateAsync({ id: initialAllocation.id, ...payload });
    } else {
      await createAllocation.mutateAsync(payload);
    }
    onOpenChange(false);
  };

  return (
    <PremiumBottomSheet
      open={open}
      onClose={() => onOpenChange(false)}
      title={initialAllocation ? 'Editar sobre ZBB' : 'Asignar nueva partida'}
      subtitle="Asigna cada moneda a un propósito explícito"
      footer={
        <View style={styles.footer}>
          <PremiumButton title="Cancelar" variant="outline" onPress={() => onOpenChange(false)} style={{ flex: 1 }} />
          <PremiumButton
            title={initialAllocation ? 'Guardar' : 'Asignar sobre'}
            variant="coral"
            loading={isBusy}
            onPress={handleSave}
            style={{ flex: 1.5 }}
          />
        </View>
      }
    >
      <View style={styles.form}>
        <SegmentedControl
          value={tab}
          onChange={(t) => {
            setTab(t);
            if (t === 'savings') setPriority(2);
          }}
          options={[
            { id: 'expenses', label: 'Categoría de Gasto' },
            { id: 'savings', label: 'Meta de Ahorro' },
          ]}
        />

        {tab === 'expenses' ? (
          <View>
            <Text style={[styles.label, { color: theme.textSecondary, fontFamily: theme.font('700'), fontSize: theme.sp(12) }]}>
              Categoría
            </Text>
            <View style={styles.chipWrap}>
              {expenseCategories.map((cat: any) => {
                const active = categoryId === cat.id;
                const cColor = cat.color || theme.brand;
                return (
                  <Pressable
                    key={cat.id}
                    onPress={() => setCategoryId(cat.id)}
                    style={[
                      styles.catPill,
                      {
                        backgroundColor: active ? alphaHex(cColor, 0.16) : theme.muted,
                        borderColor: active ? cColor : theme.border,
                      },
                    ]}
                  >
                    <CategoryIcon name={cat.icon} size={13} color={active ? cColor : theme.textMuted} />
                    <Text style={{ color: theme.text, fontFamily: theme.font(active ? '700' : '600'), fontSize: theme.sp(12) }}>
                      {cat.name}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </View>
        ) : (
          <View>
            <Text style={[styles.label, { color: theme.textSecondary, fontFamily: theme.font('700'), fontSize: theme.sp(12) }]}>
              Meta activa
            </Text>
            {activeGoals.length === 0 ? (
              <Text style={{ color: theme.textMuted, fontFamily: theme.font('500'), fontSize: theme.sp(12.5) }}>
                No tienes metas activas aún.
              </Text>
            ) : (
              <View style={styles.chipWrap}>
                {activeGoals.map((g) => {
                  const active = goalId === g.id;
                  return (
                    <Pressable
                      key={g.id}
                      onPress={() => setGoalId(g.id)}
                      style={[
                        styles.catPill,
                        {
                          backgroundColor: active ? alphaHex(theme.income, 0.15) : theme.muted,
                          borderColor: active ? theme.income : theme.border,
                        },
                      ]}
                    >
                      <Target size={13} color={active ? theme.income : theme.textMuted} />
                      <Text style={{ color: theme.text, fontFamily: theme.font('700'), fontSize: theme.sp(12) }}>
                        {g.name}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
            )}
          </View>
        )}

        <View style={styles.row2}>
          <View style={{ flex: 1 }}>
            <Text style={[styles.label, { color: theme.textSecondary, fontFamily: theme.font('700'), fontSize: theme.sp(12) }]}>
              Monto ({currency})
            </Text>
            <TextInput
              value={amount}
              onChangeText={setAmount}
              keyboardType="decimal-pad"
              placeholder="0.00"
              placeholderTextColor={theme.textMuted}
              style={[
                styles.amountInput,
                { backgroundColor: theme.muted, borderColor: theme.border, color: theme.text, fontFamily: theme.font('800'), fontVariant: ['tabular-nums'] },
              ]}
            />
          </View>
          <View style={styles.currCol}>
            {(['PEN', 'USD'] as const).map((c) => {
              const active = currency === c;
              return (
                <Pressable
                  key={c}
                  onPress={() => setCurrency(c)}
                  style={[styles.currBtn, { backgroundColor: active ? theme.brand : theme.muted }]}
                >
                  <Text style={{ color: active ? '#FFFFFF' : theme.textSecondary, fontFamily: theme.font('800'), fontSize: 12 }}>
                    {c}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </View>

        <View>
          <Text style={[styles.label, { color: theme.textSecondary, fontFamily: theme.font('700'), fontSize: theme.sp(12) }]}>
            Frecuencia {frequency !== 'monthly' && monthlyAmount > 0 ? `(equivale a ${monthlyAmount}/mes)` : ''}
          </Text>
          <View style={styles.chipWrap}>
            {FREQUENCIES.map((f) => {
              const active = frequency === f.id;
              return (
                <Pressable
                  key={f.id}
                  onPress={() => setFrequency(f.id)}
                  style={[styles.catPill, { backgroundColor: active ? theme.brand : theme.muted, borderColor: active ? theme.brand : theme.border }]}
                >
                  <Text style={{ color: active ? '#FFFFFF' : theme.textSecondary, fontFamily: theme.font('700'), fontSize: theme.sp(11.5) }}>
                    {f.label}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </View>

        <View>
          <Text style={[styles.label, { color: theme.textSecondary, fontFamily: theme.font('700'), fontSize: theme.sp(12) }]}>
            Prioridad
          </Text>
          <View style={styles.chipWrap}>
            {PRIORITIES.map((p) => {
              const active = priority === p.id;
              return (
                <Pressable
                  key={p.id}
                  onPress={() => setPriority(p.id)}
                  style={[
                    styles.catPill,
                    { backgroundColor: active ? alphaHex(p.color, 0.16) : theme.muted, borderColor: active ? p.color : theme.border },
                  ]}
                >
                  <Text style={{ color: active ? p.color : theme.textSecondary, fontFamily: theme.font('700'), fontSize: theme.sp(11.5) }}>
                    {p.label}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </View>

        <View>
          <Text style={[styles.label, { color: theme.textSecondary, fontFamily: theme.font('700'), fontSize: theme.sp(12) }]}>
            Justificación breve (opcional)
          </Text>
          <TextInput
            value={justification}
            onChangeText={setJustification}
            placeholder="Ej. Mercado semanal de casa"
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
  chipWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  catPill: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 11, paddingVertical: 8, borderRadius: 14, borderWidth: 1 },
  row2: { flexDirection: 'row', alignItems: 'flex-end', gap: 10 },
  amountInput: { borderWidth: 1, borderRadius: 16, paddingHorizontal: 14, paddingVertical: 12, fontSize: 20 },
  currCol: { flexDirection: 'row', gap: 6 },
  currBtn: { paddingHorizontal: 14, paddingVertical: 14, borderRadius: 14 },
  input: { borderWidth: 1, borderRadius: 16, paddingHorizontal: 14, paddingVertical: 12 },
});
