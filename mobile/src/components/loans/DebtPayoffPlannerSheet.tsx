import React, { useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { CreditCard, HandCoins, ShieldCheck, Sparkles, TrendingDown } from 'lucide-react-native';
import { useAppTheme } from '@/theme/ThemeProvider';
import { PremiumBottomSheet } from '@/components/ui/PremiumBottomSheet';
import { useAccounts } from '@/hooks/useAccounts';
import { useAccountsPayable } from '@/hooks/useLoans';
import { useExchangeRates } from '@/hooks/useExchangeRates';
import { useFormat } from '@/hooks/useFormat';
import { simulateDebtPayoff, type DebtItemInput } from '@/lib/peru-insights';
import { alphaHex } from '@/lib/color-math';
import { triggerHaptic } from '@/lib/haptics';

const EXTRA_CHIPS = [0, 150, 300, 500];

export function DebtPayoffPlannerSheet({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const theme = useAppTheme();
  const { formatMaskedMoney, baseCurrency } = useFormat();
  const { accounts } = useAccounts();
  const { data: payables = [] } = useAccountsPayable();
  const { convert } = useExchangeRates();

  const [extraMonthlyText, setExtraMonthlyText] = useState('200');
  const [defaultCardTeaText, setDefaultCardTeaText] = useState('55');
  const [selectedStrategy, setSelectedStrategy] = useState<'AVALANCHE' | 'SNOWBALL'>('AVALANCHE');

  const extraMonthly = Math.max(0, Number(extraMonthlyText.replace(/,/g, '.')) || 0);
  const fallbackCardTea = Math.max(0, Math.min(200, Number(defaultCardTeaText.replace(/,/g, '.')) || 55));

  const { debtItems, hasCardsWithoutRate } = useMemo(() => {
    const items: DebtItemInput[] = [];
    let cardsMissingTea = false;

    for (const p of payables) {
      if ((p.metadata as any)?.isCreditCardMirror) continue;
      if (p.status === 'PAID' || p.status === 'CANCELLED') continue;
      const rawBal = Number(p.outstandingBalance || 0);
      if (rawBal <= 0) continue;
      const bal = convert(rawBal, p.currencyCode || baseCurrency, baseCurrency);
      const installments = Math.max(1, Number(p.totalInstallments || 6));
      items.push({
        id: `loan-${p.id}`,
        name: p.contactName,
        kind: 'LOAN',
        balance: bal,
        annualRatePct: Math.max(0, Number(p.interestRate || 0)),
        minPayment: Math.max(20, Math.round((bal / installments) * 100) / 100),
        dueDateLabel: p.dueDate,
      });
    }

    for (const acc of accounts) {
      if (acc.accountType !== 'CREDIT_CARD') continue;
      const used = Math.max(0, Number(acc.usedBalance || 0));
      if (used <= 0) continue;
      const bal = convert(used, acc.currencyCode || baseCurrency, baseCurrency);
      const configuredTea = Number(acc.interestRateAnnual || 0);
      if (configuredTea <= 0) cardsMissingTea = true;
      const tea = configuredTea > 0 ? configuredTea : fallbackCardTea;
      const minPct = Math.max(5, Number(acc.minPaymentPercent || 8));
      items.push({
        id: `card-${acc.id}`,
        name: acc.name,
        kind: 'CARD',
        balance: bal,
        annualRatePct: tea,
        minPayment: Math.max(25, Math.round(bal * (minPct / 100) * 100) / 100),
        dueDateLabel: acc.paymentDueDay ? `Día ${acc.paymentDueDay}` : null,
      });
    }

    return { debtItems: items, hasCardsWithoutRate: cardsMissingTea };
  }, [payables, accounts, convert, baseCurrency, fallbackCardTea]);

  const simulation = useMemo(
    () =>
      simulateDebtPayoff({
        debts: debtItems,
        extraMonthlyPayment: extraMonthly,
      }),
    [debtItems, extraMonthly]
  );

  const activeOutcome =
    selectedStrategy === 'AVALANCHE' ? simulation.avalanche : simulation.snowball;

  const formatMonthYear = (iso: string) => {
    try {
      const d = new Date(iso);
      const txt = format(d, 'MMM yyyy', { locale: es }).replace('.', '');
      return txt.charAt(0).toUpperCase() + txt.slice(1);
    } catch {
      return '';
    }
  };

  return (
    <PremiumBottomSheet
      open={open}
      onClose={() => onOpenChange(false)}
      title="Plan para salir de deudas"
      subtitle="Compara Avalancha (mayor interés) vs Bola de Nieve (saldo más pequeño)"
    >
      {debtItems.length === 0 ? (
        <View style={[styles.emptyBox, { backgroundColor: theme.muted, borderColor: theme.border }]}>
          <ShieldCheck size={28} color={theme.income} />
          <Text style={{ color: theme.text, fontFamily: theme.font('800'), fontSize: 15 }}>
            No tienes deudas activas
          </Text>
          <Text style={{ color: theme.textSecondary, fontFamily: theme.font('500'), fontSize: 12.5, textAlign: 'center' }}>
            Cuando tengas tarjetas con saldo usado o préstamos por pagar, simularemos aquí tu fecha exacta de salida.
          </Text>
        </View>
      ) : (
        <View style={{ gap: 14, paddingBottom: 10 }}>
          {/* Total Debt Summary */}
          <View style={[styles.summaryBanner, { backgroundColor: alphaHex(theme.brand, 0.09), borderColor: alphaHex(theme.brand, 0.25) }]}>
            <View>
              <Text style={{ color: theme.textSecondary, fontFamily: theme.font('600'), fontSize: 11.5 }}>
                Deuda total incluida ({debtItems.length})
              </Text>
              <Text style={{ color: theme.text, fontFamily: theme.font('800'), fontSize: 21, fontVariant: ['tabular-nums'] }}>
                {formatMaskedMoney(simulation.totalDebt)}
              </Text>
            </View>
            {simulation.interestSavedWithAvalanche > 0.5 ? (
              <View style={[styles.saveBadge, { backgroundColor: theme.incomeSoft }]}>
                <Sparkles size={12} color={theme.income} />
                <Text style={{ color: theme.income, fontFamily: theme.font('800'), fontSize: 11 }}>
                  Avalancha ahorra {formatMaskedMoney(simulation.interestSavedWithAvalanche)}
                </Text>
              </View>
            ) : null}
          </View>

          {/* Extra Monthly Payment Input + Quick Chips */}
          <View style={{ gap: 8 }}>
            <Text style={{ color: theme.textSecondary, fontFamily: theme.font('700'), fontSize: 12 }}>
              Aporte extra mensual ({baseCurrency})
            </Text>
            <View style={styles.inputRow}>
              <TextInput
                value={extraMonthlyText}
                onChangeText={setExtraMonthlyText}
                keyboardType="decimal-pad"
                placeholder="200"
                placeholderTextColor={theme.textMuted}
                style={[
                  styles.numInput,
                  {
                    backgroundColor: theme.muted,
                    borderColor: theme.border,
                    color: theme.text,
                    fontFamily: theme.font('800'),
                  },
                ]}
              />
              <View style={styles.chipRow}>
                {EXTRA_CHIPS.map((val) => {
                  const active = extraMonthly === val;
                  return (
                    <Pressable
                      key={val}
                      onPress={() => {
                        triggerHaptic('selection');
                        setExtraMonthlyText(String(val));
                      }}
                      style={[
                        styles.chip,
                        {
                          backgroundColor: active ? theme.brand : theme.muted,
                          borderColor: active ? theme.brand : theme.border,
                        },
                      ]}
                    >
                      <Text style={{ color: active ? '#FFFFFF' : theme.textSecondary, fontFamily: theme.font('700'), fontSize: 11.5 }}>
                        +{val}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
            </View>
          </View>

          {hasCardsWithoutRate ? (
            <View style={styles.teaRow}>
              <Text style={{ flex: 1, color: theme.textSecondary, fontFamily: theme.font('600'), fontSize: 12 }}>
                TEA estimada para tarjetas (%)
              </Text>
              <TextInput
                value={defaultCardTeaText}
                onChangeText={setDefaultCardTeaText}
                keyboardType="decimal-pad"
                style={[
                  styles.teaInput,
                  {
                    backgroundColor: theme.muted,
                    borderColor: theme.border,
                    color: theme.text,
                    fontFamily: theme.font('800'),
                  },
                ]}
              />
            </View>
          ) : null}

          {/* Side-by-side comparison cards */}
          <View style={styles.twoCol}>
            {(
              [
                {
                  id: 'AVALANCHE' as const,
                  title: 'Avalancha',
                  sub: 'Mayor tasa primero',
                  outcome: simulation.avalanche,
                  accent: theme.brand,
                },
                {
                  id: 'SNOWBALL' as const,
                  title: 'Bola de Nieve',
                  sub: 'Menor saldo primero',
                  outcome: simulation.snowball,
                  accent: theme.coral,
                },
              ]
            ).map((opt) => {
              const active = selectedStrategy === opt.id;
              return (
                <Pressable
                  key={opt.id}
                  onPress={() => {
                    triggerHaptic('selection');
                    setSelectedStrategy(opt.id);
                  }}
                  style={[
                    styles.strategyCard,
                    {
                      backgroundColor: active ? alphaHex(opt.accent, 0.1) : theme.muted,
                      borderColor: active ? opt.accent : theme.border,
                    },
                  ]}
                >
                  <Text style={{ color: opt.accent, fontFamily: theme.font('800'), fontSize: 13.5 }}>
                    {opt.title}
                  </Text>
                  <Text style={{ color: theme.textMuted, fontFamily: theme.font('500'), fontSize: 10.5 }}>
                    {opt.sub}
                  </Text>
                  <Text style={{ color: theme.text, fontFamily: theme.font('800'), fontSize: 16, marginTop: 6, fontVariant: ['tabular-nums'] }}>
                    {opt.outcome.months} meses
                  </Text>
                  <Text style={{ color: theme.textSecondary, fontFamily: theme.font('600'), fontSize: 11 }}>
                    Libre: {formatMonthYear(opt.outcome.payoffDateIso)}
                  </Text>
                  <Text style={{ color: theme.expense, fontFamily: theme.font('700'), fontSize: 11, marginTop: 2 }}>
                    Interés: {formatMaskedMoney(opt.outcome.totalInterest)}
                  </Text>
                </Pressable>
              );
            })}
          </View>

          {simulation.interestSavedWithAvalanche > 0.5 ? (
            <View style={[styles.tipBanner, { backgroundColor: theme.incomeSoft }]}>
              <TrendingDown size={15} color={theme.income} />
              <Text style={{ flex: 1, color: theme.text, fontFamily: theme.font('700'), fontSize: 11.5 }}>
                Con Avalancha ahorras {formatMaskedMoney(simulation.interestSavedWithAvalanche)} en intereses
                {simulation.monthsSavedWithAvalanche > 0
                  ? ` y terminas ${simulation.monthsSavedWithAvalanche} mes(es) antes.`
                  : '.'}
              </Text>
            </View>
          ) : null}

          {/* Payoff order & dates */}
          <View style={{ gap: 8 }}>
            <Text style={{ color: theme.textSecondary, fontFamily: theme.font('800'), fontSize: 12 }}>
              ORDEN DE LIQUIDACIÓN ({selectedStrategy === 'AVALANCHE' ? 'AVALANCHA' : 'BOLA DE NIEVE'})
            </Text>
            {activeOutcome.schedule.map((item, idx) => (
              <View
                key={item.id}
                style={[styles.schedRow, { backgroundColor: theme.muted, borderColor: theme.border }]}
              >
                <View style={[styles.stepBadge, { backgroundColor: selectedStrategy === 'AVALANCHE' ? theme.brand : theme.coral }]}>
                  <Text style={{ color: '#FFFFFF', fontFamily: theme.font('800'), fontSize: 11 }}>
                    {idx + 1}
                  </Text>
                </View>
                {item.kind === 'CARD' ? (
                  <CreditCard size={15} color={theme.textSecondary} />
                ) : (
                  <HandCoins size={15} color={theme.textSecondary} />
                )}
                <View style={{ flex: 1 }}>
                  <Text numberOfLines={1} style={{ color: theme.text, fontFamily: theme.font('700'), fontSize: 13 }}>
                    {item.name}
                  </Text>
                  <Text style={{ color: theme.textMuted, fontFamily: theme.font('500'), fontSize: 11 }}>
                    {formatMaskedMoney(item.initialBalance)} · TEA {item.annualRatePct}%
                  </Text>
                </View>
                <View style={{ alignItems: 'flex-end' }}>
                  <Text style={{ color: theme.income, fontFamily: theme.font('800'), fontSize: 12 }}>
                    {formatMonthYear(item.payoffDateIso)}
                  </Text>
                  <Text style={{ color: theme.textMuted, fontFamily: theme.font('500'), fontSize: 10.5 }}>
                    Mes {item.payoffMonth} · +{formatMaskedMoney(item.interestPaid)}
                  </Text>
                </View>
              </View>
            ))}
          </View>
        </View>
      )}
    </PremiumBottomSheet>
  );
}

const styles = StyleSheet.create({
  emptyBox: {
    padding: 22,
    borderRadius: 20,
    borderWidth: 1,
    alignItems: 'center',
    gap: 8,
  },
  summaryBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
    padding: 14,
    borderRadius: 18,
    borderWidth: 1,
    flexWrap: 'wrap',
  },
  saveBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 999,
  },
  inputRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  numInput: {
    width: 96,
    height: 40,
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 12,
    fontSize: 15,
    fontVariant: ['tabular-nums'],
  },
  chipRow: { flex: 1, flexDirection: 'row', gap: 6, flexWrap: 'wrap' },
  chip: { paddingHorizontal: 10, paddingVertical: 8, borderRadius: 10, borderWidth: 1 },
  teaRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  teaInput: {
    width: 72,
    height: 36,
    borderRadius: 10,
    borderWidth: 1,
    textAlign: 'center',
    fontSize: 13.5,
  },
  twoCol: { flexDirection: 'row', gap: 10 },
  strategyCard: {
    flex: 1,
    padding: 13,
    borderRadius: 18,
    borderWidth: 1.5,
    gap: 2,
  },
  tipBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: 11,
    borderRadius: 14,
  },
  schedRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 9,
    padding: 11,
    borderRadius: 14,
    borderWidth: 1,
  },
  stepBadge: {
    width: 22,
    height: 22,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
