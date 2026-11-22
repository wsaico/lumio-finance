import React, { useMemo, useState } from 'react';
import {
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { ArrowUpDown, Edit3, RefreshCw, Sparkles } from 'lucide-react-native';
import { useAppTheme } from '@/theme/ThemeProvider';
import { TopAppHeader } from '@/components/navigation/TopAppHeader';
import { PremiumCard } from '@/components/ui/PremiumCard';
import { PremiumButton } from '@/components/ui/PremiumButton';
import { PremiumBottomSheet } from '@/components/ui/PremiumBottomSheet';
import { MiniSparkline } from '@/components/charts/MiniSparkline';
import { useExchangeRates } from '@/hooks/useExchangeRates';
import { useSettingsStore } from '@/stores/settings-store';
import { CURRENCIES, getCurrencyName, getCurrencySymbol } from '@/lib/currencies';
import { alphaHex } from '@/lib/color-math';
import { triggerHaptic } from '@/lib/haptics';
import { showAppToast } from '@/stores/toast-store';

export default function ExchangeRatesScreen() {
  const theme = useAppTheme();
  const baseCurrency = useSettingsStore((s) => s.currencyCode) || 'PEN';
  const { rates, isLoading, syncRates, saveManualRate, convert, getRate } = useExchangeRates();

  const [fromCurrency, setFromCurrency] = useState('USD');
  const [toCurrency, setToCurrency] = useState(baseCurrency === 'USD' ? 'PEN' : baseCurrency);
  const [amountStr, setAmountStr] = useState('100');

  const [pickerTarget, setPickerTarget] = useState<'FROM' | 'TO' | null>(null);
  const [manualPair, setManualPair] = useState<{ from: string; to: string; rate: number } | null>(null);
  const [manualRateStr, setManualRateStr] = useState('');

  const inputAmount = Number(amountStr.replace(/,/g, '.')) || 0;
  const converted = convert(inputAmount, fromCurrency, toCurrency);
  const effectiveRate = getRate(fromCurrency, toCurrency).rate;

  const popularPairs = useMemo(() => {
    const targets = ['USD', 'EUR', 'PEN', 'MXN', 'COP', 'CLP', 'BRL', 'GBP'].filter(
      (c) => c !== baseCurrency
    );
    return targets.map((code, idx) => {
      const rate = getRate(baseCurrency, code).rate;
      const inverseRate = getRate(code, baseCurrency).rate;
      const record = rates.find(
        (r) =>
          (r.from_currency === code && r.to_currency === baseCurrency) ||
          (r.from_currency === baseCurrency && r.to_currency === code)
      );
      const sparkBase = inverseRate || rate || 1;
      const spark = [
        sparkBase * 0.992,
        sparkBase * 0.997,
        sparkBase * 0.995,
        sparkBase * 1.003,
        sparkBase * 0.999,
        sparkBase,
      ];
      return {
        code,
        name: getCurrencyName(code),
        symbol: getCurrencySymbol(code),
        inverseRate,
        rate,
        source: record?.source || 'LIVE',
        spark,
        color: idx % 2 === 0 ? theme.coral : theme.brand,
      };
    });
  }, [baseCurrency, getRate, rates, theme.coral, theme.brand]);

  const handleSwap = () => {
    triggerHaptic('selection');
    setFromCurrency(toCurrency);
    setToCurrency(fromCurrency);
  };

  const handleSaveManual = async () => {
    if (!manualPair) return;
    const val = Number(manualRateStr.replace(/,/g, '.'));
    if (!Number.isFinite(val) || val <= 0) {
      showAppToast.warning({ title: 'Ingresa un tipo de cambio positivo válido' });
      return;
    }
    await saveManualRate.mutateAsync({
      from_currency: manualPair.from,
      to_currency: manualPair.to,
      rate: val,
    });
    setManualPair(null);
  };

  return (
    <View style={[styles.screen, { backgroundColor: theme.bg }]}>
      <TopAppHeader
        title="Conversor y Divisas"
        subtitle={`Base: ${baseCurrency}`}
        showBack
        rightSlot={
          <Pressable
            onPress={() => syncRates.mutate({})}
            style={[styles.syncTopBtn, { backgroundColor: theme.brandSoft }]}
          >
            <RefreshCw size={17} color={theme.brand} />
          </Pressable>
        }
      />

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scroll}
        refreshControl={
          <RefreshControl
            refreshing={isLoading || syncRates.isPending}
            onRefresh={() => {
              syncRates.mutate({});
            }}
            tintColor={theme.brand}
          />
        }
      >
        {/* Reference Image 3 Top Converter Card */}
        <PremiumCard padding={20} style={styles.converterCard}>
          <View style={styles.curRow}>
            <Pressable
              onPress={() => setPickerTarget('FROM')}
              style={[styles.curSelector, { backgroundColor: theme.muted }]}
            >
              <Text style={{ color: theme.brand, fontFamily: theme.font('800'), fontSize: theme.sp(18) }}>
                {fromCurrency}
              </Text>
              <Text style={{ color: theme.textMuted, fontFamily: theme.font('500'), fontSize: 11 }}>
                {getCurrencyName(fromCurrency)}
              </Text>
            </Pressable>

            <TextInput
              value={amountStr}
              onChangeText={setAmountStr}
              keyboardType="decimal-pad"
              placeholder="0.00"
              placeholderTextColor={theme.textMuted}
              style={[
                styles.convInput,
                {
                  color: theme.brand,
                  fontFamily: theme.font('800'),
                  fontVariant: ['tabular-nums'],
                },
              ]}
            />
          </View>

          <View style={styles.swapDivider}>
            <View style={[styles.hairline, { backgroundColor: theme.border }]} />
            <View style={[styles.ratePill, { backgroundColor: theme.muted, borderColor: theme.border }]}>
              <Text style={{ color: theme.textSecondary, fontFamily: theme.font('700'), fontSize: 11.5, fontVariant: ['tabular-nums'] }}>
                1 {fromCurrency} = {effectiveRate.toFixed(4)} {toCurrency}
              </Text>
            </View>
            <Pressable
              onPress={handleSwap}
              style={[styles.swapBtn, { backgroundColor: theme.coral }]}
            >
              <ArrowUpDown size={15} color="#FFFFFF" strokeWidth={2.5} />
            </Pressable>
            <View style={[styles.hairline, { backgroundColor: theme.border }]} />
          </View>

          <View style={styles.curRow}>
            <Pressable
              onPress={() => setPickerTarget('TO')}
              style={[styles.curSelector, { backgroundColor: theme.muted }]}
            >
              <Text style={{ color: theme.text, fontFamily: theme.font('800'), fontSize: theme.sp(18) }}>
                {toCurrency}
              </Text>
              <Text style={{ color: theme.textMuted, fontFamily: theme.font('500'), fontSize: 11 }}>
                {getCurrencyName(toCurrency)}
              </Text>
            </Pressable>

            <Text
              numberOfLines={1}
              adjustsFontSizeToFit
              style={{
                flex: 1,
                textAlign: 'right',
                color: theme.text,
                fontFamily: theme.font('800'),
                fontSize: theme.sp(25),
                fontVariant: ['tabular-nums'],
              }}
            >
              +{converted.toFixed(2)}
            </Text>
          </View>

          <PremiumButton
            title="Sincronizar tasas en vivo"
            variant="coral"
            loading={syncRates.isPending}
            icon={<Sparkles size={15} color="#FFFFFF" />}
            onPress={() => syncRates.mutate({})}
            style={{ marginTop: 6 }}
          />
        </PremiumCard>

        {/* Reference Image 3 Violet Courses Section */}
        <PremiumCard variant="hero-violet" padding={18} style={{ gap: 12 }}>
          <View style={styles.violetHeader}>
            <View>
              <Text style={{ color: '#FFFFFF', fontFamily: theme.font('800'), fontSize: theme.sp(16) }}>
                Tasas frente a {baseCurrency}
              </Text>
              <Text style={{ color: 'rgba(255,255,255,0.75)', fontFamily: theme.font('500'), fontSize: theme.sp(11.5) }}>
                Toca cualquier divisa para fijar una tasa manual
              </Text>
            </View>
          </View>

          <View style={{ gap: 10 }}>
            {popularPairs.map((pair) => (
              <Pressable
                key={pair.code}
                onPress={() => {
                  setManualPair({
                    from: pair.code,
                    to: baseCurrency,
                    rate: pair.inverseRate,
                  });
                  setManualRateStr(pair.inverseRate.toFixed(4));
                }}
                style={[styles.pairCard, { backgroundColor: theme.card }]}
              >
                <View style={{ flex: 1 }}>
                  <Text style={{ color: theme.brand, fontFamily: theme.font('800'), fontSize: theme.sp(15) }}>
                    1 {pair.code}
                  </Text>
                  <Text numberOfLines={1} style={{ color: theme.textMuted, fontFamily: theme.font('500'), fontSize: 11.5 }}>
                    {pair.name}
                  </Text>
                </View>

                <MiniSparkline values={pair.spark} width={58} height={24} color={pair.color} />

                <View style={{ alignItems: 'flex-end', minWidth: 92 }}>
                  <View style={styles.rateEditRow}>
                    <Text style={{ color: theme.text, fontFamily: theme.font('800'), fontSize: theme.sp(15), fontVariant: ['tabular-nums'] }}>
                      {pair.inverseRate.toFixed(4)}
                    </Text>
                    <Edit3 size={12} color={theme.textMuted} />
                  </View>
                  <View style={[styles.srcBadge, { backgroundColor: pair.source === 'MANUAL' ? alphaHex(theme.coral, 0.14) : theme.brandSoft }]}>
                    <Text style={{ color: pair.source === 'MANUAL' ? theme.coral : theme.brand, fontFamily: theme.font('800'), fontSize: 9.5 }}>
                      {pair.source === 'MANUAL' ? 'MANUAL' : 'EN VIVO'} · {baseCurrency}
                    </Text>
                  </View>
                </View>
              </Pressable>
            ))}
          </View>
        </PremiumCard>
      </ScrollView>

      {/* Currency Picker Sheet */}
      <PremiumBottomSheet
        open={Boolean(pickerTarget)}
        onClose={() => setPickerTarget(null)}
        title={pickerTarget === 'FROM' ? 'Moneda de origen' : 'Moneda destino'}
      >
        <View style={{ gap: 8, paddingBottom: 16 }}>
          {CURRENCIES.map((c) => {
            const selected =
              pickerTarget === 'FROM' ? fromCurrency === c.code : toCurrency === c.code;
            return (
              <Pressable
                key={c.code}
                onPress={() => {
                  triggerHaptic('selection');
                  if (pickerTarget === 'FROM') setFromCurrency(c.code);
                  else setToCurrency(c.code);
                  setPickerTarget(null);
                }}
                style={[
                  styles.pickerRow,
                  {
                    backgroundColor: selected ? alphaHex(theme.brand, 0.12) : theme.muted,
                    borderColor: selected ? theme.brand : theme.border,
                  },
                ]}
              >
                <Text style={{ color: theme.brand, fontFamily: theme.font('800'), fontSize: 15, width: 48 }}>
                  {c.code}
                </Text>
                <Text style={{ flex: 1, color: theme.text, fontFamily: theme.font('600'), fontSize: 13.5 }}>
                  {c.name}
                </Text>
                <Text style={{ color: theme.textMuted, fontFamily: theme.font('700'), fontSize: 13 }}>
                  {c.symbol}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </PremiumBottomSheet>

      {/* Manual Rate Sheet */}
      <PremiumBottomSheet
        open={Boolean(manualPair)}
        onClose={() => setManualPair(null)}
        title={manualPair ? `Tasa manual ${manualPair.from} -> ${manualPair.to}` : 'Tasa manual'}
        subtitle="Esta tasa personalizada tendrá prioridad al convertir tus saldos"
        footer={
          <View style={styles.sheetFoot}>
            <PremiumButton title="Cancelar" variant="outline" onPress={() => setManualPair(null)} style={{ flex: 1 }} />
            <PremiumButton
              title="Guardar tasa"
              variant="coral"
              loading={saveManualRate.isPending}
              onPress={handleSaveManual}
              style={{ flex: 1.4 }}
            />
          </View>
        }
      >
        <View style={{ gap: 10, paddingBottom: 12 }}>
          <Text style={{ color: theme.textSecondary, fontFamily: theme.font('700'), fontSize: theme.sp(12.5) }}>
            1 {manualPair?.from} equivale a ({manualPair?.to}):
          </Text>
          <TextInput
            value={manualRateStr}
            onChangeText={setManualRateStr}
            keyboardType="decimal-pad"
            style={[
              styles.manualInput,
              { backgroundColor: theme.muted, borderColor: theme.border, color: theme.text, fontFamily: theme.font('800'), fontVariant: ['tabular-nums'] },
            ]}
          />
        </View>
      </PremiumBottomSheet>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  scroll: { padding: 16, gap: 16, paddingBottom: 42 },
  syncTopBtn: { width: 38, height: 38, borderRadius: 13, alignItems: 'center', justifyContent: 'center' },
  converterCard: { gap: 14 },
  curRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  curSelector: { paddingHorizontal: 14, paddingVertical: 10, borderRadius: 16, minWidth: 118 },
  convInput: { flex: 1, textAlign: 'right', fontSize: 27, paddingVertical: 4 },
  swapDivider: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  hairline: { flex: 1, height: 1 },
  ratePill: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 999, borderWidth: 1 },
  swapBtn: { width: 32, height: 32, borderRadius: 999, alignItems: 'center', justifyContent: 'center' },
  violetHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  pairCard: { flexDirection: 'row', alignItems: 'center', gap: 10, borderRadius: 18, padding: 14 },
  rateEditRow: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  srcBadge: { paddingHorizontal: 7, paddingVertical: 2, borderRadius: 999, marginTop: 3 },
  pickerRow: { flexDirection: 'row', alignItems: 'center', padding: 13, borderRadius: 15, borderWidth: 1 },
  sheetFoot: { flexDirection: 'row', gap: 10 },
  manualInput: { borderWidth: 1, borderRadius: 16, paddingHorizontal: 16, paddingVertical: 14, fontSize: 24, textAlign: 'center' },
});
