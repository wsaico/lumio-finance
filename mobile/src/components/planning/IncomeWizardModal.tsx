import React, { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { Calculator, Copy, Plus, Sparkles, Trash2 } from 'lucide-react-native';
import { useAppTheme } from '@/theme/ThemeProvider';
import { PremiumBottomSheet } from '@/components/ui/PremiumBottomSheet';
import { PremiumButton } from '@/components/ui/PremiumButton';
import { usePlanningZBB } from '@/hooks/usePlanningZBB';
import { useSettingsStore } from '@/stores/settings-store';
import { useFormat } from '@/hooks/useFormat';
import { alphaHex } from '@/lib/color-math';
import { showAppToast } from '@/stores/toast-store';

interface IncomeSourceItem {
  id: string;
  name: string;
  amount: string;
  currency: 'PEN' | 'USD';
}

export function IncomeWizardModal({
  open,
  onOpenChange,
  existingCycle,
  suggestions,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  existingCycle?: any;
  suggestions?: {
    previousCycle?: { id: string; cycle_name: string } | null;
    suggestedIncomePEN?: number;
    suggestedIncomeUSD?: number;
  };
}) {
  const theme = useAppTheme();
  const { formatMoney } = useFormat();
  const baseCurrency = useSettingsStore((s) => s.currencyCode) === 'USD' ? 'USD' : 'PEN';
  const { createCycle, updateCycleIncome } = usePlanningZBB();

  const [sources, setSources] = useState<IncomeSourceItem[]>([]);
  const [autoFillFrom, setAutoFillFrom] = useState<'blank' | 'previous_cycle' | 'previous_spending'>('blank');

  useEffect(() => {
    if (!open) return;
    const saved = existingCycle?.income_breakdown;
    if (Array.isArray(saved) && saved.length > 0) {
      setSources(
        saved.map((s: any, idx: number) => ({
          id: s.id || String(idx + 1),
          name: String(s.name || 'Ingreso'),
          amount: String(s.amount || ''),
          currency: s.currency === 'USD' ? 'USD' : 'PEN',
        }))
      );
    } else if (existingCycle) {
      const list: IncomeSourceItem[] = [];
      if (Number(existingCycle.total_income_pen || 0) > 0) {
        list.push({ id: 'pen-1', name: 'Ingresos Soles', amount: String(existingCycle.total_income_pen), currency: 'PEN' });
      }
      if (Number(existingCycle.total_income_usd || 0) > 0) {
        list.push({ id: 'usd-1', name: 'Ingresos Dólares', amount: String(existingCycle.total_income_usd), currency: 'USD' });
      }
      setSources(
        list.length > 0
          ? list
          : [{ id: '1', name: 'Sueldo Principal', amount: '', currency: baseCurrency }]
      );
    } else {
      setSources([{ id: '1', name: 'Sueldo Principal', amount: '', currency: baseCurrency }]);
      setAutoFillFrom(suggestions?.previousCycle ? 'previous_cycle' : 'blank');
    }
  }, [open, existingCycle, baseCurrency, suggestions?.previousCycle]);

  const totalPEN = sources
    .filter((s) => s.currency === 'PEN')
    .reduce((sum, s) => sum + (Number(s.amount.replace(/,/g, '.')) || 0), 0);
  const totalUSD = sources
    .filter((s) => s.currency === 'USD')
    .reduce((sum, s) => sum + (Number(s.amount.replace(/,/g, '.')) || 0), 0);

  const isBusy = createCycle.isPending || updateCycleIncome.isPending;

  const handleSave = async () => {
    const cleanSources = sources.filter(
      (s) => s.name.trim() && Number(s.amount.replace(/,/g, '.')) > 0
    );
    if (totalPEN <= 0 && totalUSD <= 0) {
      showAppToast.warning({ title: 'Ingresa al menos un monto de ingreso mayor a cero' });
      return;
    }

    const now = new Date();
    const start = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`;
    const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
    const end = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;
    const rawMonth = format(now, 'MMMM yyyy', { locale: es });
    const monthName = rawMonth.charAt(0).toUpperCase() + rawMonth.slice(1);

    const payload = {
      id: existingCycle?.id,
      incomePEN: Math.round(totalPEN * 100) / 100,
      incomeUSD: Math.round(totalUSD * 100) / 100,
      incomeBreakdown: cleanSources.map((s) => ({
        ...s,
        amount: Number(s.amount.replace(/,/g, '.')),
      })),
      autoFillFrom: !existingCycle && autoFillFrom !== 'blank' ? autoFillFrom : undefined,
      period: existingCycle ? undefined : { start, end, name: monthName },
    };

    if (existingCycle?.id) {
      await updateCycleIncome.mutateAsync(payload);
    } else {
      await createCycle.mutateAsync(payload);
    }
    onOpenChange(false);
  };

  return (
    <PremiumBottomSheet
      open={open}
      onClose={() => onOpenChange(false)}
      title={existingCycle ? 'Editar ingresos del ciclo' : 'Iniciar planificación mensual'}
      subtitle="Define tus fuentes de ingreso esperadas para asignar el 100%"
      footer={
        <View style={styles.footer}>
          <PremiumButton title="Cancelar" variant="outline" onPress={() => onOpenChange(false)} style={{ flex: 1 }} />
          <PremiumButton
            title={existingCycle ? 'Actualizar ingresos' : 'Comenzar plan'}
            variant="coral"
            loading={isBusy}
            onPress={handleSave}
            style={{ flex: 1.5 }}
          />
        </View>
      }
    >
      <View style={styles.body}>
        {!existingCycle && (
          <View style={styles.autoBox}>
            <Text style={[styles.label, { color: theme.textSecondary, fontFamily: theme.font('700'), fontSize: theme.sp(12) }]}>
              Plantilla inicial
            </Text>
            <View style={styles.chipWrap}>
              {[
                { id: 'blank', label: 'En blanco', Icon: Calculator },
                ...(suggestions?.previousCycle
                  ? [{ id: 'previous_cycle', label: 'Clonar ciclo previo', Icon: Copy }]
                  : []),
                { id: 'previous_spending', label: 'Basado en gastos previos', Icon: Sparkles },
              ].map((opt) => {
                const active = autoFillFrom === opt.id;
                const Icon = opt.Icon;
                return (
                  <Pressable
                    key={opt.id}
                    onPress={() => setAutoFillFrom(opt.id as any)}
                    style={[
                      styles.pill,
                      { backgroundColor: active ? theme.brand : theme.muted, borderColor: active ? theme.brand : theme.border },
                    ]}
                  >
                    <Icon size={13} color={active ? '#FFFFFF' : theme.textMuted} />
                    <Text style={{ color: active ? '#FFFFFF' : theme.text, fontFamily: theme.font('600'), fontSize: theme.sp(11.5) }}>
                      {opt.label}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </View>
        )}

        {(suggestions?.suggestedIncomePEN || 0) > 0 && !existingCycle && (
          <Pressable
            onPress={() =>
              setSources([
                {
                  id: 'sugg-1',
                  name: 'Ingresos detectados',
                  amount: String(Math.round(suggestions!.suggestedIncomePEN!)),
                  currency: 'PEN',
                },
              ])
            }
            style={[styles.suggBanner, { backgroundColor: alphaHex(theme.brand, 0.1), borderColor: alphaHex(theme.brand, 0.25) }]}
          >
            <Sparkles size={15} color={theme.brand} />
            <Text style={{ flex: 1, color: theme.textSecondary, fontFamily: theme.font('600'), fontSize: theme.sp(12) }}>
              Sugerencia del mes previo: {formatMoney(suggestions!.suggestedIncomePEN!, 'PEN')} · Toca para aplicar
            </Text>
          </Pressable>
        )}

        <View style={{ gap: 10 }}>
          {sources.map((src, idx) => (
            <View
              key={src.id}
              style={[styles.sourceCard, { backgroundColor: theme.muted, borderColor: theme.border }]}
            >
              <View style={styles.sourceTop}>
                <TextInput
                  value={src.name}
                  onChangeText={(t) =>
                    setSources((prev) => prev.map((x, i) => (i === idx ? { ...x, name: t } : x)))
                  }
                  placeholder="Fuente (Ej. Salario, Freelance)"
                  placeholderTextColor={theme.textMuted}
                  style={{ flex: 1, color: theme.text, fontFamily: theme.font('700'), fontSize: theme.sp(13.5) }}
                />
                {sources.length > 1 && (
                  <Pressable onPress={() => setSources((prev) => prev.filter((_, i) => i !== idx))}>
                    <Trash2 size={15} color={theme.expense} />
                  </Pressable>
                )}
              </View>

              <View style={styles.sourceBottom}>
                <TextInput
                  value={src.amount}
                  onChangeText={(t) =>
                    setSources((prev) => prev.map((x, i) => (i === idx ? { ...x, amount: t } : x)))
                  }
                  keyboardType="decimal-pad"
                  placeholder="0.00"
                  placeholderTextColor={theme.textMuted}
                  style={[
                    styles.sourceAmount,
                    {
                      backgroundColor: theme.card,
                      borderColor: theme.border,
                      color: theme.text,
                      fontFamily: theme.font('800'),
                      fontVariant: ['tabular-nums'],
                    },
                  ]}
                />
                <View style={styles.currSwitch}>
                  {(['PEN', 'USD'] as const).map((c) => {
                    const active = src.currency === c;
                    return (
                      <Pressable
                        key={c}
                        onPress={() =>
                          setSources((prev) => prev.map((x, i) => (i === idx ? { ...x, currency: c } : x)))
                        }
                        style={[
                          styles.currBtn,
                          { backgroundColor: active ? theme.brand : theme.card },
                        ]}
                      >
                        <Text style={{ color: active ? '#FFFFFF' : theme.textSecondary, fontFamily: theme.font('800'), fontSize: 11.5 }}>
                          {c}
                        </Text>
                      </Pressable>
                    );
                  })}
                </View>
              </View>
            </View>
          ))}
        </View>

        <Pressable
          onPress={() =>
            setSources((prev) => [
              ...prev,
              { id: String(Date.now()), name: '', amount: '', currency: baseCurrency },
            ])
          }
          style={[styles.addSrcBtn, { borderColor: theme.brand }]}
        >
          <Plus size={15} color={theme.brand} />
          <Text style={{ color: theme.brand, fontFamily: theme.font('700'), fontSize: theme.sp(13) }}>
            Agregar otra fuente de ingreso
          </Text>
        </Pressable>

        <View style={[styles.summaryStrip, { backgroundColor: theme.brandSoft }]}>
          <Text style={{ color: theme.brand, fontFamily: theme.font('700'), fontSize: theme.sp(12.5) }}>
            Total planificado:
          </Text>
          <Text style={{ color: theme.brand, fontFamily: theme.font('800'), fontSize: theme.sp(14), fontVariant: ['tabular-nums'] }}>
            {[totalPEN > 0 ? formatMoney(totalPEN, 'PEN') : null, totalUSD > 0 ? formatMoney(totalUSD, 'USD') : null]
              .filter(Boolean)
              .join(' · ') || formatMoney(0, baseCurrency)}
          </Text>
        </View>
      </View>
    </PremiumBottomSheet>
  );
}

const styles = StyleSheet.create({
  body: { gap: 14, paddingBottom: 10 },
  footer: { flexDirection: 'row', gap: 10 },
  autoBox: { gap: 6 },
  label: {},
  chipWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  pill: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 11, paddingVertical: 7, borderRadius: 999, borderWidth: 1 },
  suggBanner: { flexDirection: 'row', alignItems: 'center', gap: 8, padding: 11, borderRadius: 14, borderWidth: 1 },
  sourceCard: { borderRadius: 18, borderWidth: 1, padding: 12, gap: 8 },
  sourceTop: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  sourceBottom: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  sourceAmount: { flex: 1, borderRadius: 12, borderWidth: 1, paddingHorizontal: 12, paddingVertical: 9, fontSize: 16 },
  currSwitch: { flexDirection: 'row', gap: 4 },
  currBtn: { paddingHorizontal: 11, paddingVertical: 10, borderRadius: 10 },
  addSrcBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 11, borderRadius: 14, borderWidth: 1, borderStyle: 'dashed' },
  summaryStrip: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 13, borderRadius: 14 },
});
