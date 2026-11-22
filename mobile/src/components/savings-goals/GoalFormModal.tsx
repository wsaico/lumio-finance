import React, { useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { Check, Flag, Plane, Shield, ShoppingBag, Sparkles, TrendingUp, Wallet } from 'lucide-react-native';
import { addMonths } from 'date-fns';
import { useAppTheme } from '@/theme/ThemeProvider';
import { PremiumBottomSheet } from '@/components/ui/PremiumBottomSheet';
import { PremiumButton } from '@/components/ui/PremiumButton';
import { PremiumDatePicker } from '@/components/ui/PremiumDatePicker';
import { useAccounts } from '@/hooks/useAccounts';
import { useCreateSavingsGoal, useUpdateSavingsGoal, type SavingsGoal } from '@/hooks/useSavingsGoals';
import { useSettingsStore } from '@/stores/settings-store';
import { CURRENCIES } from '@/lib/currencies';
import { alphaHex } from '@/lib/color-math';
import { triggerHaptic } from '@/lib/haptics';
import { showAppToast } from '@/stores/toast-store';

const GOAL_TYPES = [
  { id: 'EMERGENCY', label: 'Emergencia', Icon: Shield },
  { id: 'TRAVEL', label: 'Viaje', Icon: Plane },
  { id: 'PURCHASE', label: 'Compra', Icon: ShoppingBag },
  { id: 'INVESTMENT', label: 'Inversión', Icon: TrendingUp },
  { id: 'OTHER', label: 'Otro', Icon: Sparkles },
] as const;

const PRIORITIES = [
  { id: 'HIGH', label: 'Alta', color: '#F43F5E' },
  { id: 'MEDIUM', label: 'Media', color: '#F59E0B' },
  { id: 'LOW', label: 'Baja', color: '#10B981' },
] as const;

const COLORS = ['#5B35D5', '#FF7A33', '#10B981', '#0EA5E9', '#EC4899', '#F59E0B'];

export interface GoalFormPreset {
  name?: string;
  goalType?: string;
  targetAmount?: number;
  priority?: 'HIGH' | 'MEDIUM' | 'LOW';
  color?: string;
  description?: string;
}

export function GoalFormModal({
  open,
  onOpenChange,
  initialGoal,
  preset,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialGoal?: SavingsGoal | null;
  preset?: GoalFormPreset | null;
}) {
  const theme = useAppTheme();
  const baseCurrency = useSettingsStore((s) => s.currencyCode) || 'PEN';
  const { accounts } = useAccounts();
  const createGoal = useCreateSavingsGoal();
  const updateGoal = useUpdateSavingsGoal();

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [goalType, setGoalType] = useState<string>('OTHER');
  const [priority, setPriority] = useState<'HIGH' | 'MEDIUM' | 'LOW'>('MEDIUM');
  const [targetAmount, setTargetAmount] = useState('');
  const [currency, setCurrency] = useState(baseCurrency);
  const [primaryAccountId, setPrimaryAccountId] = useState<string>('');
  const [targetDate, setTargetDate] = useState<Date>(() => addMonths(new Date(), 6));
  const [color, setColor] = useState('#5B35D5');

  useEffect(() => {
    if (!open) return;
    if (initialGoal) {
      setName(initialGoal.name || '');
      setDescription(initialGoal.description || '');
      setGoalType(initialGoal.goal_type || 'OTHER');
      setPriority((initialGoal.priority as any) || 'MEDIUM');
      setTargetAmount(String(initialGoal.target_amount || ''));
      setCurrency(initialGoal.currency || baseCurrency);
      setPrimaryAccountId(initialGoal.primary_account_id || accounts[0]?.id || '');
      setTargetDate(
        initialGoal.target_date ? new Date(initialGoal.target_date) : addMonths(new Date(), 6)
      );
      setColor(initialGoal.color || '#5B35D5');
    } else {
      setName(preset?.name || '');
      setDescription(preset?.description || '');
      setGoalType(preset?.goalType || 'OTHER');
      setPriority(preset?.priority || 'MEDIUM');
      setTargetAmount(preset?.targetAmount ? String(preset.targetAmount) : '');
      setCurrency(baseCurrency);
      setPrimaryAccountId(accounts[0]?.id || '');
      setTargetDate(addMonths(new Date(), 6));
      setColor(preset?.color || theme.brand);
    }
  }, [open, initialGoal, preset, baseCurrency, accounts, theme.brand]);

  const isBusy = createGoal.isPending || updateGoal.isPending;

  const handleSave = async () => {
    const parsedTarget = Number(targetAmount.replace(/,/g, '.'));
    if (!name.trim()) {
      showAppToast.warning({ title: 'Ingresa un nombre para la meta' });
      return;
    }
    if (!Number.isFinite(parsedTarget) || parsedTarget <= 0) {
      showAppToast.warning({ title: 'Ingresa un monto objetivo válido' });
      return;
    }
    if (!primaryAccountId) {
      showAppToast.warning({ title: 'Selecciona una cuenta vinculada a la meta' });
      return;
    }
    if (targetDate.getTime() <= Date.now()) {
      showAppToast.warning({ title: 'La fecha límite debe ser posterior a hoy' });
      return;
    }

    const iconMap: Record<string, string> = {
      EMERGENCY: 'shield',
      TRAVEL: 'plane',
      PURCHASE: 'shopping-bag',
      INVESTMENT: 'trending-up',
      OTHER: 'target',
    };

    const payload = {
      name: name.trim(),
      description: description.trim() || undefined,
      goalType,
      priority,
      targetAmount: parsedTarget,
      currency,
      primaryAccountId,
      targetDate: targetDate.toISOString(),
      icon: iconMap[goalType] || 'target',
      color,
    };

    if (initialGoal?.id) {
      await updateGoal.mutateAsync({ id: initialGoal.id, ...payload });
    } else {
      await createGoal.mutateAsync(payload);
    }
    onOpenChange(false);
  };

  return (
    <PremiumBottomSheet
      open={open}
      onClose={() => onOpenChange(false)}
      title={initialGoal ? 'Editar meta de ahorro' : 'Nueva meta de ahorro'}
      subtitle="Define un objetivo claro y recibe aportes desde tus cuentas"
      footer={
        <View style={styles.footerRow}>
          <PremiumButton title="Cancelar" variant="outline" onPress={() => onOpenChange(false)} style={{ flex: 1 }} />
          <PremiumButton
            title={initialGoal ? 'Guardar cambios' : 'Crear meta'}
            variant="coral"
            loading={isBusy}
            onPress={handleSave}
            style={{ flex: 1.4 }}
          />
        </View>
      }
    >
      <View style={styles.form}>
        <View>
          <Text style={[styles.label, { color: theme.textSecondary, fontFamily: theme.font('700'), fontSize: theme.sp(12) }]}>
            Nombre de la meta
          </Text>
          <TextInput
            value={name}
            onChangeText={setName}
            placeholder="Ej. Fondo de emergencia 6 meses"
            placeholderTextColor={theme.textMuted}
            style={[
              styles.input,
              { backgroundColor: theme.muted, borderColor: theme.border, color: theme.text, fontFamily: theme.font('600'), fontSize: theme.sp(14.5) },
            ]}
          />
        </View>

        <View>
          <Text style={[styles.label, { color: theme.textSecondary, fontFamily: theme.font('700'), fontSize: theme.sp(12) }]}>
            Tipo de meta
          </Text>
          <View style={styles.chipWrap}>
            {GOAL_TYPES.map((g) => {
              const active = goalType === g.id;
              const Icon = g.Icon;
              return (
                <Pressable
                  key={g.id}
                  onPress={() => {
                    triggerHaptic('selection');
                    setGoalType(g.id);
                  }}
                  style={[
                    styles.pill,
                    {
                      backgroundColor: active ? alphaHex(theme.brand, 0.14) : theme.muted,
                      borderColor: active ? theme.brand : theme.border,
                    },
                  ]}
                >
                  <Icon size={14} color={active ? theme.brand : theme.textMuted} />
                  <Text style={{ color: active ? theme.brand : theme.text, fontFamily: theme.font('700'), fontSize: theme.sp(12) }}>
                    {g.label}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </View>

        <View>
          <Text style={[styles.label, { color: theme.textSecondary, fontFamily: theme.font('700'), fontSize: theme.sp(12) }]}>
            Monto objetivo ({currency})
          </Text>
          <TextInput
            value={targetAmount}
            onChangeText={setTargetAmount}
            keyboardType="decimal-pad"
            placeholder="5000.00"
            placeholderTextColor={theme.textMuted}
            style={[
              styles.input,
              {
                backgroundColor: theme.muted,
                borderColor: theme.border,
                color: theme.text,
                fontFamily: theme.font('800'),
                fontSize: theme.sp(18),
                fontVariant: ['tabular-nums'],
              },
            ]}
          />
        </View>

        <View>
          <Text style={[styles.label, { color: theme.textSecondary, fontFamily: theme.font('700'), fontSize: theme.sp(12) }]}>
            Moneda
          </Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipRow}>
            {CURRENCIES.slice(0, 6).map((c) => {
              const active = currency === c.code;
              return (
                <Pressable
                  key={c.code}
                  onPress={() => setCurrency(c.code)}
                  style={[
                    styles.pill,
                    { backgroundColor: active ? theme.brand : theme.muted, borderColor: active ? theme.brand : theme.border },
                  ]}
                >
                  <Text style={{ color: active ? '#FFFFFF' : theme.text, fontFamily: theme.font('700'), fontSize: theme.sp(12) }}>
                    {c.symbol} {c.code}
                  </Text>
                </Pressable>
              );
            })}
          </ScrollView>
        </View>

        <View>
          <Text style={[styles.label, { color: theme.textSecondary, fontFamily: theme.font('700'), fontSize: theme.sp(12) }]}>
            Cuenta principal vinculada
          </Text>
          <View style={styles.chipWrap}>
            {accounts.map((acc) => {
              const active = primaryAccountId === acc.id;
              return (
                <Pressable
                  key={acc.id}
                  onPress={() => setPrimaryAccountId(acc.id)}
                  style={[
                    styles.pill,
                    { backgroundColor: active ? alphaHex(theme.brand, 0.14) : theme.muted, borderColor: active ? theme.brand : theme.border },
                  ]}
                >
                  <Wallet size={13} color={active ? theme.brand : theme.textMuted} />
                  <Text style={{ color: active ? theme.brand : theme.text, fontFamily: theme.font('600'), fontSize: theme.sp(12) }}>
                    {acc.name}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </View>

        <PremiumDatePicker label="Fecha objetivo" value={targetDate} onChange={setTargetDate} variant="hero" />

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
                    styles.pill,
                    { backgroundColor: active ? alphaHex(p.color, 0.16) : theme.muted, borderColor: active ? p.color : theme.border },
                  ]}
                >
                  <Flag size={13} color={active ? p.color : theme.textMuted} />
                  <Text style={{ color: active ? p.color : theme.textSecondary, fontFamily: theme.font('700'), fontSize: theme.sp(12) }}>
                    {p.label}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </View>

        <View>
          <Text style={[styles.label, { color: theme.textSecondary, fontFamily: theme.font('700'), fontSize: theme.sp(12) }]}>
            Color
          </Text>
          <View style={styles.swatchRow}>
            {COLORS.map((hex) => {
              const active = color.toLowerCase() === hex.toLowerCase();
              return (
                <Pressable
                  key={hex}
                  onPress={() => setColor(hex)}
                  style={[styles.swatch, { backgroundColor: hex, borderColor: active ? theme.text : 'transparent' }]}
                >
                  {active ? <Check size={14} color="#FFFFFF" strokeWidth={3} /> : null}
                </Pressable>
              );
            })}
          </View>
        </View>

        <View>
          <Text style={[styles.label, { color: theme.textSecondary, fontFamily: theme.font('700'), fontSize: theme.sp(12) }]}>
            Motivación o notas (opcional)
          </Text>
          <TextInput
            value={description}
            onChangeText={setDescription}
            placeholder="Describe el propósito de esta meta"
            placeholderTextColor={theme.textMuted}
            multiline
            style={[
              styles.input,
              { minHeight: 72, backgroundColor: theme.muted, borderColor: theme.border, color: theme.text, fontFamily: theme.font('500'), fontSize: theme.sp(13.5) },
            ]}
          />
        </View>
      </View>
    </PremiumBottomSheet>
  );
}

const styles = StyleSheet.create({
  form: { gap: 15, paddingBottom: 10 },
  footerRow: { flexDirection: 'row', gap: 10 },
  label: { marginBottom: 6 },
  input: { borderWidth: 1, borderRadius: 16, paddingHorizontal: 14, paddingVertical: 12 },
  chipRow: { gap: 8, paddingVertical: 2 },
  chipWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  pill: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 999, borderWidth: 1 },
  swatchRow: { flexDirection: 'row', gap: 10 },
  swatch: { width: 32, height: 32, borderRadius: 999, borderWidth: 2, alignItems: 'center', justifyContent: 'center' },
});
