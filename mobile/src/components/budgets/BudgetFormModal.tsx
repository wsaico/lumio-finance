import React, { useEffect, useState } from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
} from 'react-native';
import { Check, ChevronDown, ChevronUp, Layers, Sparkles, Tag, Wallet } from 'lucide-react-native';
import { useAppTheme } from '@/theme/ThemeProvider';
import { PremiumBottomSheet } from '@/components/ui/PremiumBottomSheet';
import { PremiumButton } from '@/components/ui/PremiumButton';
import { SegmentedControl } from '@/components/ui/SegmentedControl';
import { CategoryIcon } from '@/components/ui/CategoryIcon';
import { useCategories } from '@/hooks/useCategories';
import { useAccounts } from '@/hooks/useAccounts';
import { useTags } from '@/hooks/useTags';
import { useBudget } from '@/hooks/useBudget';
import { useSettingsStore } from '@/stores/settings-store';
import { CURRENCIES } from '@/lib/currencies';
import { alphaHex } from '@/lib/color-math';
import { triggerHaptic } from '@/lib/haptics';
import { showAppToast } from '@/stores/toast-store';
import type { Budget, BudgetScope, BudgetType, TransactionFilterMode } from '@/types/budget';

const COLOR_SWATCHES = [
  '#5B35D5',
  '#FF7A33',
  '#10B981',
  '#0EA5E9',
  '#EC4899',
  '#F59E0B',
  '#6366F1',
  '#F43F5E',
];

const FILTER_MODES: { id: TransactionFilterMode; label: string }[] = [
  { id: 'DEFAULT', label: 'Estándar' },
  { id: 'LOANED', label: 'Prestado' },
  { id: 'ADDED_TO_GOAL', label: 'Ahorro en metas' },
  { id: 'BALANCE_CORRECTION', label: 'Ajustes de saldo' },
];

export function BudgetFormModal({
  open,
  onOpenChange,
  initialBudget,
  year,
  month,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialBudget?: Budget | null;
  year: number;
  month: number;
}) {
  const theme = useAppTheme();
  const baseCurrency = useSettingsStore((s) => s.currencyCode) || 'PEN';
  const { expense: expenseCategories, income: incomeCategories } = useCategories();
  const { accounts } = useAccounts();
  const { tags } = useTags();
  const { createBudget, updateBudget, budgets } = useBudget(year, month);

  const [name, setName] = useState('');
  const [amount, setAmount] = useState('');
  const [type, setType] = useState<BudgetType>('EXPENSE');
  const [color, setColor] = useState('#5B35D5');
  const [currencyCode, setCurrencyCode] = useState(baseCurrency);
  const [budgetScope, setBudgetScope] = useState<BudgetScope>('GLOBAL');
  const [accountIds, setAccountIds] = useState<string[]>([]);
  const [includeCategories, setIncludeCategories] = useState<string[]>([]);
  const [excludeCategories, setExcludeCategories] = useState<string[]>([]);
  const [includeTags, setIncludeTags] = useState<string[]>([]);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [transactionFilterMode, setTransactionFilterMode] =
    useState<TransactionFilterMode>('DEFAULT');
  const [includeLoaned, setIncludeLoaned] = useState(false);
  const [includeGoalTransactions, setIncludeGoalTransactions] = useState(false);
  const [includeBalanceCorrections, setIncludeBalanceCorrections] = useState(false);
  const [includeFromOtherBudgets, setIncludeFromOtherBudgets] = useState(true);

  useEffect(() => {
    if (!open) return;
    if (initialBudget) {
      setName(initialBudget.name || '');
      setAmount(String(initialBudget.amount || ''));
      setType(initialBudget.type || 'EXPENSE');
      setColor(initialBudget.color || '#5B35D5');
      setCurrencyCode(initialBudget.currencyCode || initialBudget.currency_code || baseCurrency);
      setBudgetScope(initialBudget.budgetScope || 'GLOBAL');
      setAccountIds(initialBudget.accountIds || []);
      setIncludeCategories(
        initialBudget.includeCategories || initialBudget.include_categories || []
      );
      setExcludeCategories(initialBudget.excludeCategories || []);
      setIncludeTags(initialBudget.includeTags || []);
      setTransactionFilterMode(initialBudget.transactionFilterMode || 'DEFAULT');
      setIncludeLoaned(Boolean(initialBudget.includeLoaned));
      setIncludeGoalTransactions(Boolean(initialBudget.includeGoalTransactions));
      setIncludeBalanceCorrections(Boolean(initialBudget.includeBalanceCorrections));
      setIncludeFromOtherBudgets(initialBudget.includeFromOtherBudgets ?? true);
    } else {
      setName('');
      setAmount('');
      setType('EXPENSE');
      setColor(theme.brand);
      setCurrencyCode(baseCurrency);
      setBudgetScope('GLOBAL');
      setAccountIds([]);
      setIncludeCategories([]);
      setExcludeCategories([]);
      setIncludeTags([]);
      setTransactionFilterMode('DEFAULT');
      setIncludeLoaned(false);
      setIncludeGoalTransactions(false);
      setIncludeBalanceCorrections(false);
      setIncludeFromOtherBudgets(true);
      setShowAdvanced(false);
    }
  }, [open, initialBudget, baseCurrency, theme.brand]);

  const categoryPool = type === 'EXPENSE' ? expenseCategories : incomeCategories;
  const isBusy = createBudget.isPending || updateBudget.isPending;

  const toggleItem = (list: string[], id: string, setter: (next: string[]) => void) => {
    triggerHaptic('selection');
    setter(list.includes(id) ? list.filter((x) => x !== id) : [...list, id]);
  };

  const handleSave = async () => {
    const parsedAmount = Number(amount.replace(/,/g, '.'));
    if (!name.trim()) {
      showAppToast.warning({ title: 'Ingresa un nombre para el presupuesto' });
      return;
    }
    if (!Number.isFinite(parsedAmount) || parsedAmount <= 0) {
      showAppToast.warning({ title: 'Ingresa un monto límite válido mayor a cero' });
      return;
    }
    if (budgetScope === 'ACCOUNT' && accountIds.length === 0) {
      showAppToast.warning({ title: 'Selecciona al menos una cuenta' });
      return;
    }

    const payload = {
      name: name.trim(),
      amount: parsedAmount,
      type,
      period: 'MONTHLY' as const,
      color,
      currencyCode,
      budgetYear: year,
      budgetMonth: month,
      budgetScope,
      accountIds: budgetScope === 'ACCOUNT' ? accountIds : [],
      includeCategories,
      excludeCategories,
      includeTags,
      transactionFilterMode,
      includeLoaned,
      includeGoalTransactions,
      includeBalanceCorrections,
      includeFromOtherBudgets,
      excludedBudgetIds: [],
    };

    if (initialBudget?.id) {
      await updateBudget.mutateAsync({ id: initialBudget.id, ...payload });
    } else {
      await createBudget.mutateAsync(payload);
    }
    onOpenChange(false);
  };

  const popularCurrencies = CURRENCIES.slice(0, 6);

  return (
    <PremiumBottomSheet
      open={open}
      onClose={() => onOpenChange(false)}
      title={initialBudget ? 'Editar presupuesto' : 'Nuevo presupuesto'}
      subtitle="Controla límites mensuales por categoría o cuenta"
      footer={
        <View style={styles.footerRow}>
          <PremiumButton
            title="Cancelar"
            variant="outline"
            onPress={() => onOpenChange(false)}
            style={{ flex: 1 }}
          />
          <PremiumButton
            title={initialBudget ? 'Guardar cambios' : 'Crear presupuesto'}
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
          value={type}
          onChange={(v) => {
            triggerHaptic('selection');
            setType(v);
            setIncludeCategories([]);
          }}
          options={[
            { id: 'EXPENSE', label: 'Límite de Gasto' },
            { id: 'SAVINGS', label: 'Meta de Ahorro' },
          ]}
        />

        <View>
          <Text style={[styles.label, { color: theme.textSecondary, fontFamily: theme.font('700'), fontSize: theme.sp(12) }]}>
            Nombre del presupuesto
          </Text>
          <TextInput
            value={name}
            onChangeText={setName}
            placeholder="Ej. Supermercado y Hogar"
            placeholderTextColor={theme.textMuted}
            style={[
              styles.input,
              {
                backgroundColor: theme.muted,
                borderColor: theme.border,
                color: theme.text,
                fontFamily: theme.font('600'),
                fontSize: theme.sp(14.5),
              },
            ]}
          />
        </View>

        <View style={styles.rowGap}>
          <View style={{ flex: 1.2 }}>
            <Text style={[styles.label, { color: theme.textSecondary, fontFamily: theme.font('700'), fontSize: theme.sp(12) }]}>
              Monto límite ({currencyCode})
            </Text>
            <TextInput
              value={amount}
              onChangeText={setAmount}
              keyboardType="decimal-pad"
              placeholder="1500.00"
              placeholderTextColor={theme.textMuted}
              style={[
                styles.input,
                {
                  backgroundColor: theme.muted,
                  borderColor: theme.border,
                  color: theme.text,
                  fontFamily: theme.font('800'),
                  fontSize: theme.sp(17),
                  fontVariant: ['tabular-nums'],
                },
              ]}
            />
          </View>
        </View>

        <View>
          <Text style={[styles.label, { color: theme.textSecondary, fontFamily: theme.font('700'), fontSize: theme.sp(12) }]}>
            Moneda
          </Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipRow}>
            {popularCurrencies.map((c) => {
              const active = currencyCode === c.code;
              return (
                <Pressable
                  key={c.code}
                  onPress={() => {
                    triggerHaptic('selection');
                    setCurrencyCode(c.code);
                  }}
                  style={[
                    styles.pill,
                    {
                      backgroundColor: active ? theme.brand : theme.muted,
                      borderColor: active ? theme.brand : theme.border,
                    },
                  ]}
                >
                  <Text
                    style={{
                      color: active ? '#FFFFFF' : theme.text,
                      fontFamily: theme.font('700'),
                      fontSize: theme.sp(12),
                    }}
                  >
                    {c.symbol} {c.code}
                  </Text>
                </Pressable>
              );
            })}
          </ScrollView>
        </View>

        <View>
          <Text style={[styles.label, { color: theme.textSecondary, fontFamily: theme.font('700'), fontSize: theme.sp(12) }]}>
            Color distintivo
          </Text>
          <View style={styles.swatchRow}>
            {COLOR_SWATCHES.map((hex) => {
              const active = color.toLowerCase() === hex.toLowerCase();
              return (
                <Pressable
                  key={hex}
                  onPress={() => {
                    triggerHaptic('selection');
                    setColor(hex);
                  }}
                  style={[
                    styles.swatch,
                    {
                      backgroundColor: hex,
                      borderColor: active ? theme.text : 'transparent',
                      transform: [{ scale: active ? 1.1 : 1 }],
                    },
                  ]}
                >
                  {active ? <Check size={14} color="#FFFFFF" strokeWidth={3} /> : null}
                </Pressable>
              );
            })}
          </View>
        </View>

        <View>
          <Text style={[styles.label, { color: theme.textSecondary, fontFamily: theme.font('700'), fontSize: theme.sp(12) }]}>
            Alcance de cuentas
          </Text>
          <SegmentedControl
            value={budgetScope}
            onChange={(v) => setBudgetScope(v)}
            options={[
              { id: 'GLOBAL', label: 'Todas las cuentas' },
              { id: 'ACCOUNT', label: 'Cuentas específicas' },
            ]}
          />
          {budgetScope === 'ACCOUNT' && (
            <View style={[styles.chipWrap, { marginTop: 10 }]}>
              {accounts.map((acc) => {
                const selected = accountIds.includes(acc.id);
                return (
                  <Pressable
                    key={acc.id}
                    onPress={() => toggleItem(accountIds, acc.id, setAccountIds)}
                    style={[
                      styles.pill,
                      {
                        backgroundColor: selected ? alphaHex(theme.brand, 0.14) : theme.muted,
                        borderColor: selected ? theme.brand : theme.border,
                      },
                    ]}
                  >
                    <Wallet size={13} color={selected ? theme.brand : theme.textMuted} />
                    <Text
                      style={{
                        color: selected ? theme.brand : theme.text,
                        fontFamily: theme.font('600'),
                        fontSize: theme.sp(12),
                      }}
                    >
                      {acc.name}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          )}
        </View>

        <View>
          <View style={styles.labelBetween}>
            <Text style={[styles.label, { color: theme.textSecondary, fontFamily: theme.font('700'), fontSize: theme.sp(12), marginBottom: 0 }]}>
              Categorías incluidas
            </Text>
            <Text style={{ color: theme.textMuted, fontFamily: theme.font('500'), fontSize: theme.sp(11) }}>
              {includeCategories.length === 0 ? 'Todas' : `${includeCategories.length} selec.`}
            </Text>
          </View>
          <View style={[styles.chipWrap, { marginTop: 8 }]}>
            {categoryPool.map((cat: any) => {
              const selected = includeCategories.includes(cat.id);
              const catColor = cat.color || theme.brand;
              return (
                <Pressable
                  key={cat.id}
                  onPress={() => toggleItem(includeCategories, cat.id, setIncludeCategories)}
                  style={[
                    styles.catChip,
                    {
                      backgroundColor: selected ? alphaHex(catColor, 0.16) : theme.muted,
                      borderColor: selected ? catColor : theme.border,
                    },
                  ]}
                >
                  <View style={[styles.catIconMini, { backgroundColor: catColor }]}>
                    <CategoryIcon name={cat.icon} size={12} color="#FFFFFF" />
                  </View>
                  <Text
                    style={{
                      color: selected ? theme.text : theme.textSecondary,
                      fontFamily: theme.font(selected ? '700' : '600'),
                      fontSize: theme.sp(12),
                    }}
                  >
                    {cat.name}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </View>

        {tags.length > 0 && (
          <View>
            <Text style={[styles.label, { color: theme.textSecondary, fontFamily: theme.font('700'), fontSize: theme.sp(12) }]}>
              Etiquetas incluidas (opcional)
            </Text>
            <View style={styles.chipWrap}>
              {tags.map((t) => {
                const selected = includeTags.includes(t.id);
                return (
                  <Pressable
                    key={t.id}
                    onPress={() => toggleItem(includeTags, t.id, setIncludeTags)}
                    style={[
                      styles.pill,
                      {
                        backgroundColor: selected ? alphaHex(t.color || theme.coral, 0.16) : theme.muted,
                        borderColor: selected ? t.color || theme.coral : theme.border,
                      },
                    ]}
                  >
                    <Tag size={12} color={selected ? t.color || theme.coral : theme.textMuted} />
                    <Text
                      style={{
                        color: selected ? theme.text : theme.textSecondary,
                        fontFamily: theme.font('600'),
                        fontSize: theme.sp(12),
                      }}
                    >
                      {t.name}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </View>
        )}

        <Pressable
          onPress={() => setShowAdvanced((s) => !s)}
          style={[styles.advToggle, { backgroundColor: theme.muted, borderColor: theme.border }]}
        >
          <View style={styles.advLeft}>
            <Layers size={15} color={theme.brand} />
            <Text style={{ color: theme.text, fontFamily: theme.font('700'), fontSize: theme.sp(13) }}>
              Reglas avanzadas de seguimiento
            </Text>
          </View>
          {showAdvanced ? (
            <ChevronUp size={17} color={theme.textMuted} />
          ) : (
            <ChevronDown size={17} color={theme.textMuted} />
          )}
        </Pressable>

        {showAdvanced && (
          <View style={[styles.advCard, { backgroundColor: theme.muted, borderColor: theme.border }]}>
            <Text style={[styles.label, { color: theme.textSecondary, fontFamily: theme.font('700'), fontSize: theme.sp(11.5) }]}>
              Modo de filtro de transacciones
            </Text>
            <View style={styles.chipWrap}>
              {FILTER_MODES.map((m) => {
                const active = transactionFilterMode === m.id;
                return (
                  <Pressable
                    key={m.id}
                    onPress={() => setTransactionFilterMode(m.id)}
                    style={[
                      styles.pill,
                      {
                        backgroundColor: active ? theme.brand : theme.card,
                        borderColor: active ? theme.brand : theme.border,
                      },
                    ]}
                  >
                    <Text
                      style={{
                        color: active ? '#FFFFFF' : theme.textSecondary,
                        fontFamily: theme.font('600'),
                        fontSize: theme.sp(11.5),
                      }}
                    >
                      {m.label}
                    </Text>
                  </Pressable>
                );
              })}
            </View>

            <View style={styles.switchList}>
              <SwitchRow
                label="Incluir movimientos prestados"
                value={includeLoaned}
                onChange={setIncludeLoaned}
              />
              <SwitchRow
                label="Incluir abonos a metas de ahorro"
                value={includeGoalTransactions}
                onChange={setIncludeGoalTransactions}
              />
              <SwitchRow
                label="Incluir ajustes de saldo"
                value={includeBalanceCorrections}
                onChange={setIncludeBalanceCorrections}
              />
              {budgets.length > 0 && (
                <SwitchRow
                  label="Incluir gastos compartidos con otros presupuestos"
                  value={includeFromOtherBudgets}
                  onChange={setIncludeFromOtherBudgets}
                />
              )}
            </View>
          </View>
        )}

        {initialBudget?.isZbbControlled && (
          <View style={[styles.zbbNote, { backgroundColor: alphaHex(theme.brand, 0.1), borderColor: alphaHex(theme.brand, 0.25) }]}>
            <Sparkles size={15} color={theme.brand} />
            <Text style={{ flex: 1, color: theme.textSecondary, fontFamily: theme.font('500'), fontSize: theme.sp(11.5) }}>
              Este presupuesto está vinculado a tu ciclo Presupuesto Base Cero (ZBB).
            </Text>
          </View>
        )}
      </View>
    </PremiumBottomSheet>
  );
}

function SwitchRow({
  label,
  value,
  onChange,
}: {
  label: string;
  value: boolean;
  onChange: (val: boolean) => void;
}) {
  const theme = useAppTheme();
  return (
    <View style={styles.switchRow}>
      <Text style={{ flex: 1, color: theme.text, fontFamily: theme.font('500'), fontSize: theme.sp(12.5) }}>
        {label}
      </Text>
      <Switch
        value={value}
        onValueChange={(v) => {
          triggerHaptic('selection');
          onChange(v);
        }}
        trackColor={{ false: theme.border, true: alphaHex(theme.brand, 0.5) }}
        thumbColor={value ? theme.brand : '#FFFFFF'}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  form: { gap: 16, paddingBottom: 12 },
  footerRow: { flexDirection: 'row', gap: 10 },
  label: { marginBottom: 6 },
  labelBetween: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  input: {
    borderWidth: 1,
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  rowGap: { flexDirection: 'row', gap: 10 },
  chipRow: { gap: 8, paddingVertical: 2 },
  chipWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
    borderWidth: 1,
  },
  swatchRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  swatch: {
    width: 34,
    height: 34,
    borderRadius: 999,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  catChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 14,
    borderWidth: 1,
  },
  catIconMini: {
    width: 22,
    height: 22,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  advToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 13,
    borderRadius: 16,
    borderWidth: 1,
  },
  advLeft: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  advCard: { borderRadius: 18, borderWidth: 1, padding: 14, gap: 12 },
  switchList: { gap: 10, marginTop: 4 },
  switchRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10 },
  zbbNote: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: 12,
    borderRadius: 14,
    borderWidth: 1,
  },
});
