import React, { useEffect, useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useRouter } from 'expo-router';
import { HandCoins, Minus, PiggyBank, Plus, Shield, Sparkles } from 'lucide-react-native';
import { useAppTheme } from '@/theme/ThemeProvider';
import { PremiumBottomSheet } from '@/components/ui/PremiumBottomSheet';
import { PremiumButton } from '@/components/ui/PremiumButton';
import { useAccounts } from '@/hooks/useAccounts';
import { useAccountsPayable } from '@/hooks/useLoans';
import { useAddContribution, type SavingsGoal } from '@/hooks/useSavingsGoals';
import { useFormat } from '@/hooks/useFormat';
import { alphaHex } from '@/lib/color-math';
import { triggerHaptic } from '@/lib/haptics';
import { showAppToast } from '@/stores/toast-store';

const ORIGINS = ['Gratificación', 'CTS', 'Bono / Extra'] as const;

export function ExtraIncomeAssistantModal({
  open,
  onOpenChange,
  goals,
  initialAmount,
  initialLabel,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  goals: SavingsGoal[];
  initialAmount?: string;
  initialLabel?: string;
}) {
  const theme = useAppTheme();
  const router = useRouter();
  const { formatMaskedMoney, baseCurrency } = useFormat();
  const { accounts } = useAccounts();
  const { data: payables = [] } = useAccountsPayable();
  const addContribution = useAddContribution();

  const activeGoals = useMemo(
    () => goals.filter((g) => g.status === 'ACTIVE'),
    [goals]
  );

  const hasActiveDebt = useMemo(() => {
    const activeLoan = payables.some(
      (p) =>
        !(p.metadata as any)?.isCreditCardMirror &&
        p.status !== 'PAID' &&
        p.status !== 'CANCELLED' &&
        Number(p.outstandingBalance || 0) > 0
    );
    const activeCard = accounts.some(
      (a) => a.accountType === 'CREDIT_CARD' && Number(a.usedBalance || 0) > 0
    );
    return activeLoan || activeCard;
  }, [payables, accounts]);

  const [originLabel, setOriginLabel] = useState<string>('Gratificación');
  const [amountText, setAmountText] = useState<string>('1500');
  const [pcts, setPcts] = useState<{ debt: number; emergency: number; savings: number }>({
    debt: 50,
    emergency: 30,
    savings: 20,
  });
  const [emergencyGoalId, setEmergencyGoalId] = useState<string>('');
  const [savingsGoalId, setSavingsGoalId] = useState<string>('');
  const [isApplying, setIsApplying] = useState(false);

  useEffect(() => {
    if (!open) return;
    setOriginLabel(initialLabel?.trim() || 'Gratificación');
    setAmountText(initialAmount && Number(initialAmount) > 0 ? String(initialAmount) : '1500');
    setPcts(
      hasActiveDebt
        ? { debt: 50, emergency: 30, savings: 20 }
        : { debt: 0, emergency: 50, savings: 50 }
    );

    const emGoal =
      activeGoals.find(
        (g) => g.goal_type === 'EMERGENCY' || /emergencia/i.test(g.name || '')
      ) || activeGoals[0];
    const savGoal =
      activeGoals.find((g) => g.id !== emGoal?.id) || emGoal;
    setEmergencyGoalId(emGoal?.id || '');
    setSavingsGoalId(savGoal?.id || '');
  }, [open, initialAmount, initialLabel, hasActiveDebt, activeGoals]);

  const totalAmount = Math.max(0, Number(amountText.replace(/,/g, '.')) || 0);
  const debtAmount = Math.round(totalAmount * (pcts.debt / 100) * 100) / 100;
  const emergencyAmount = Math.round(totalAmount * (pcts.emergency / 100) * 100) / 100;
  const savingsAmount = Math.round((totalAmount - debtAmount - emergencyAmount) * 100) / 100;

  const adjustPct = (key: 'debt' | 'emergency' | 'savings', delta: number) => {
    triggerHaptic('selection');
    setPcts((prev) => {
      const nextVal = Math.max(0, Math.min(100, prev[key] + delta));
      const actualDelta = nextVal - prev[key];
      if (actualDelta === 0) return prev;

      const others = (['debt', 'emergency', 'savings'] as const).filter((k) => k !== key);
      const copy = { ...prev, [key]: nextVal };
      let remainingDiff = -actualDelta;

      // Rebalance against the other two buckets so the sum remains strictly 100%
      for (const ok of others) {
        if (remainingDiff === 0) break;
        const proposed = copy[ok] + remainingDiff;
        const clamped = Math.max(0, Math.min(100, proposed));
        remainingDiff -= clamped - copy[ok];
        copy[ok] = clamped;
      }
      return copy;
    });
  };

  const handleApplyToGoals = async () => {
    if (totalAmount <= 0) {
      showAppToast.warning({ title: 'Ingresa un monto válido' });
      return;
    }

    const canContribEm = emergencyAmount > 0 && Boolean(emergencyGoalId);
    const canContribSav = savingsAmount > 0 && Boolean(savingsGoalId);

    if (!canContribEm && !canContribSav) {
      if (debtAmount > 0) {
        onOpenChange(false);
        router.push('/loans' as any);
        return;
      }
      showAppToast.warning({ title: 'Crea primero al menos una meta activa' });
      return;
    }

    setIsApplying(true);
    try {
      let applied = 0;
      if (canContribEm && canContribSav && emergencyGoalId === savingsGoalId) {
        await addContribution.mutateAsync({
          goalId: emergencyGoalId,
          amount: Math.round((emergencyAmount + savingsAmount) * 100) / 100,
          notes: `Reparto ${originLabel} (Emergencia + Meta)`,
        });
        applied += 1;
      } else {
        if (canContribEm) {
          await addContribution.mutateAsync({
            goalId: emergencyGoalId,
            amount: emergencyAmount,
            notes: `Reparto ${originLabel} · Fondo de emergencia`,
          });
          applied += 1;
        }
        if (canContribSav) {
          await addContribution.mutateAsync({
            goalId: savingsGoalId,
            amount: savingsAmount,
            notes: `Reparto ${originLabel} · Meta de ahorro`,
          });
          applied += 1;
        }
      }

      if (applied > 0) {
        showAppToast.success({
          title: 'Reparto aplicado a tus metas',
          description:
            debtAmount > 0
              ? `Recuerda abonar ${formatMaskedMoney(debtAmount)} a tus deudas.`
              : undefined,
        });
      }
      onOpenChange(false);
    } finally {
      setIsApplying(false);
    }
  };

  const buckets = [
    {
      key: 'debt' as const,
      label: 'Pago de deudas',
      pct: pcts.debt,
      amount: debtAmount,
      color: theme.expense,
      Icon: HandCoins,
    },
    {
      key: 'emergency' as const,
      label: 'Fondo de emergencia',
      pct: pcts.emergency,
      amount: emergencyAmount,
      color: theme.brand,
      Icon: Shield,
    },
    {
      key: 'savings' as const,
      label: 'Metas de ahorro',
      pct: pcts.savings,
      amount: savingsAmount,
      color: theme.income,
      Icon: PiggyBank,
    },
  ];

  return (
    <PremiumBottomSheet
      open={open}
      onClose={() => onOpenChange(false)}
      title="Asistente Grati, CTS y Extras"
      subtitle="Reparte tu ingreso extraordinario con porcentajes editables"
      footer={
        <View style={styles.footerRow}>
          {debtAmount > 0 ? (
            <PremiumButton
              title="Ir a Deudas"
              variant="outline"
              onPress={() => {
                onOpenChange(false);
                router.push('/loans' as any);
              }}
              style={{ flex: 0.8 }}
            />
          ) : (
            <PremiumButton
              title="Cerrar"
              variant="outline"
              onPress={() => onOpenChange(false)}
              style={{ flex: 0.7 }}
            />
          )}
          <PremiumButton
            title="Aplicar a mis metas"
            variant="coral"
            loading={isApplying}
            onPress={handleApplyToGoals}
            style={{ flex: 1.4 }}
          />
        </View>
      }
    >
      <View style={{ gap: 14, paddingBottom: 8 }}>
        {/* Origen */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
          {ORIGINS.map((orig) => {
            const active = originLabel === orig;
            return (
              <Pressable
                key={orig}
                onPress={() => setOriginLabel(orig)}
                style={[
                  styles.pill,
                  {
                    backgroundColor: active ? theme.brand : theme.muted,
                    borderColor: active ? theme.brand : theme.border,
                  },
                ]}
              >
                <Sparkles size={12} color={active ? '#FFFFFF' : theme.brand} />
                <Text style={{ color: active ? '#FFFFFF' : theme.text, fontFamily: theme.font('700'), fontSize: 12 }}>
                  {orig}
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>

        {/* Monto */}
        <View style={{ gap: 6 }}>
          <Text style={{ color: theme.textSecondary, fontFamily: theme.font('700'), fontSize: 12 }}>
            Monto recibido ({baseCurrency})
          </Text>
          <TextInput
            value={amountText}
            onChangeText={setAmountText}
            keyboardType="decimal-pad"
            placeholder="1500"
            placeholderTextColor={theme.textMuted}
            style={[
              styles.input,
              {
                backgroundColor: theme.muted,
                borderColor: theme.border,
                color: theme.text,
                fontFamily: theme.font('800'),
                fontSize: 20,
              },
            ]}
          />
        </View>

        {/* Porcentajes */}
        <View style={{ gap: 8 }}>
          {buckets.map((b) => {
            const BIcon = b.Icon;
            return (
              <View
                key={b.key}
                style={[
                  styles.bucketCard,
                  { backgroundColor: theme.muted, borderColor: theme.border },
                ]}
              >
                <View style={[styles.bucketIcon, { backgroundColor: alphaHex(b.color, 0.14) }]}>
                  <BIcon size={16} color={b.color} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={{ color: theme.text, fontFamily: theme.font('700'), fontSize: 13 }}>
                    {b.label}
                  </Text>
                  <Text style={{ color: b.color, fontFamily: theme.font('800'), fontSize: 14, fontVariant: ['tabular-nums'] }}>
                    {formatMaskedMoney(b.amount)} ({b.pct}%)
                  </Text>
                </View>
                <View style={styles.stepRow}>
                  <Pressable
                    onPress={() => adjustPct(b.key, -5)}
                    style={[styles.stepBtn, { backgroundColor: theme.card, borderColor: theme.border }]}
                  >
                    <Minus size={13} color={theme.text} />
                  </Pressable>
                  <Pressable
                    onPress={() => adjustPct(b.key, 5)}
                    style={[styles.stepBtn, { backgroundColor: theme.card, borderColor: theme.border }]}
                  >
                    <Plus size={13} color={theme.text} />
                  </Pressable>
                </View>
              </View>
            );
          })}
        </View>

        {/* Selectores de metas destino */}
        {activeGoals.length > 0 ? (
          <View style={{ gap: 8 }}>
            {emergencyAmount > 0 ? (
              <View style={{ gap: 5 }}>
                <Text style={{ color: theme.textMuted, fontFamily: theme.font('700'), fontSize: 11.5 }}>
                  Meta destino para Emergencia:
                </Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 7 }}>
                  {activeGoals.map((g) => {
                    const active = emergencyGoalId === g.id;
                    return (
                      <Pressable
                        key={`em-${g.id}`}
                        onPress={() => setEmergencyGoalId(g.id)}
                        style={[
                          styles.pill,
                          {
                            backgroundColor: active ? theme.brandSoft : theme.muted,
                            borderColor: active ? theme.brand : theme.border,
                          },
                        ]}
                      >
                        <Text style={{ color: active ? theme.brand : theme.textSecondary, fontFamily: theme.font('700'), fontSize: 11.5 }}>
                          {g.name}
                        </Text>
                      </Pressable>
                    );
                  })}
                </ScrollView>
              </View>
            ) : null}

            {savingsAmount > 0 ? (
              <View style={{ gap: 5 }}>
                <Text style={{ color: theme.textMuted, fontFamily: theme.font('700'), fontSize: 11.5 }}>
                  Meta destino para Ahorro:
                </Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 7 }}>
                  {activeGoals.map((g) => {
                    const active = savingsGoalId === g.id;
                    return (
                      <Pressable
                        key={`sav-${g.id}`}
                        onPress={() => setSavingsGoalId(g.id)}
                        style={[
                          styles.pill,
                          {
                            backgroundColor: active ? theme.incomeSoft : theme.muted,
                            borderColor: active ? theme.income : theme.border,
                          },
                        ]}
                      >
                        <Text style={{ color: active ? theme.income : theme.textSecondary, fontFamily: theme.font('700'), fontSize: 11.5 }}>
                          {g.name}
                        </Text>
                      </Pressable>
                    );
                  })}
                </ScrollView>
              </View>
            ) : null}
          </View>
        ) : null}
      </View>
    </PremiumBottomSheet>
  );
}

const styles = StyleSheet.create({
  footerRow: { flexDirection: 'row', gap: 10 },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
    borderWidth: 1,
  },
  input: {
    borderWidth: 1,
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 11,
    fontVariant: ['tabular-nums'],
  },
  bucketCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    padding: 12,
    borderRadius: 16,
    borderWidth: 1,
  },
  bucketIcon: {
    width: 34,
    height: 34,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepRow: { flexDirection: 'row', gap: 6 },
  stepBtn: {
    width: 30,
    height: 30,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
