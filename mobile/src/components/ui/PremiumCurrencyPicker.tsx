import React, { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { Check, Globe, Search, X } from 'lucide-react-native';
import { useAppTheme } from '@/theme/ThemeProvider';
import { useSettingsStore } from '@/stores/settings-store';
import {
  getAllCurrenciesOrdered,
  getQuickCurrenciesForUser,
  type CurrencyInfo,
} from '@/lib/currencies';
import { getRegionByCountry } from '@/lib/regions';
import { PremiumBottomSheet } from './PremiumBottomSheet';
import { alphaHex } from '@/lib/color-math';
import { triggerHaptic } from '@/lib/haptics';

export function PremiumCurrencyPicker({
  value,
  onChange,
  label = 'Moneda',
}: {
  value: string;
  onChange: (code: string) => void;
  label?: string;
}) {
  const theme = useAppTheme();
  const countryCode = useSettingsStore((s) => s.countryCode) || 'PE';
  const baseCurrency = useSettingsStore((s) => s.currencyCode) || 'PEN';
  const region = getRegionByCountry(countryCode);

  const [sheetOpen, setSheetOpen] = useState(false);
  const [search, setSearch] = useState('');

  const quickList = useMemo(
    () => getQuickCurrenciesForUser(countryCode, baseCurrency, value),
    [countryCode, baseCurrency, value]
  );

  const orderedAll = useMemo(
    () => getAllCurrenciesOrdered(countryCode, baseCurrency),
    [countryCode, baseCurrency]
  );

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return orderedAll;
    return orderedAll.filter(
      (c) =>
        c.code.toLowerCase().includes(q) ||
        c.name.toLowerCase().includes(q) ||
        c.region.toLowerCase().includes(q) ||
        c.symbol.toLowerCase().includes(q)
    );
  }, [orderedAll, search]);

  const handleSelect = (item: CurrencyInfo) => {
    triggerHaptic('selection');
    onChange(item.code);
    setSheetOpen(false);
    setSearch('');
  };

  return (
    <View>
      <View style={styles.labelRow}>
        <Text
          style={{
            color: theme.textSecondary,
            fontFamily: theme.font('700'),
            fontSize: theme.sp(12),
          }}
        >
          {label}
        </Text>
        <Text
          style={{
            color: theme.textMuted,
            fontFamily: theme.font('500'),
            fontSize: theme.sp(10.5),
          }}
        >
          Sugeridas para {region.name}
        </Text>
      </View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.chipRow}
      >
        {quickList.map((c) => {
          const active = value === c.code;
          return (
            <Pressable
              key={c.code}
              onPress={() => {
                triggerHaptic('selection');
                onChange(c.code);
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

        <Pressable
          onPress={() => {
            triggerHaptic('selection');
            setSheetOpen(true);
          }}
          style={[
            styles.pill,
            {
              backgroundColor: theme.card,
              borderColor: theme.border,
              borderStyle: 'dashed',
            },
          ]}
        >
          <Globe size={13} color={theme.brand} />
          <Text
            style={{
              color: theme.brand,
              fontFamily: theme.font('700'),
              fontSize: theme.sp(12),
            }}
          >
            Otra...
          </Text>
        </Pressable>
      </ScrollView>

      <PremiumBottomSheet
        open={sheetOpen}
        onClose={() => {
          setSheetOpen(false);
          setSearch('');
        }}
        title="Elegir moneda"
        subtitle={`Monedas principales de ${region.name} primero`}
      >
        <View style={{ gap: 12, paddingBottom: 14 }}>
          <View
            style={[
              styles.searchBox,
              { backgroundColor: theme.muted, borderColor: theme.border },
            ]}
          >
            <Search size={16} color={theme.textMuted} />
            <TextInput
              value={search}
              onChangeText={setSearch}
              placeholder="Buscar moneda o país (ej. PEN, USD, EUR)..."
              placeholderTextColor={theme.textMuted}
              style={[
                styles.searchInput,
                { color: theme.text, fontFamily: theme.font('600'), fontSize: theme.sp(13.5) },
              ]}
            />
            {search ? (
              <Pressable onPress={() => setSearch('')} hitSlop={8}>
                <X size={15} color={theme.textMuted} />
              </Pressable>
            ) : null}
          </View>

          <View style={{ gap: 8 }}>
            {filtered.map((c) => {
              const active = value === c.code;
              return (
                <Pressable
                  key={c.code}
                  onPress={() => handleSelect(c)}
                  style={[
                    styles.pickRow,
                    {
                      backgroundColor: active ? alphaHex(theme.brand, 0.12) : theme.muted,
                      borderColor: active ? theme.brand : theme.border,
                    },
                  ]}
                >
                  <View
                    style={[
                      styles.symBadge,
                      { backgroundColor: active ? theme.brand : theme.card },
                    ]}
                  >
                    <Text
                      style={{
                        color: active ? '#FFFFFF' : theme.brand,
                        fontFamily: theme.font('800'),
                        fontSize: 12,
                      }}
                    >
                      {c.symbol}
                    </Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text
                      style={{
                        color: theme.text,
                        fontFamily: theme.font('700'),
                        fontSize: theme.sp(13.5),
                      }}
                    >
                      {c.code} · {c.name}
                    </Text>
                    <Text
                      style={{
                        color: theme.textMuted,
                        fontFamily: theme.font('500'),
                        fontSize: theme.sp(11),
                      }}
                    >
                      {c.region}
                    </Text>
                  </View>
                  {active ? <Check size={17} color={theme.brand} /> : null}
                </Pressable>
              );
            })}
          </View>
        </View>
      </PremiumBottomSheet>
    </View>
  );
}

const styles = StyleSheet.create({
  labelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  chipRow: {
    gap: 8,
    paddingVertical: 2,
  },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
    borderWidth: 1,
  },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderRadius: 15,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 9,
  },
  searchInput: {
    flex: 1,
    paddingVertical: 2,
  },
  pickRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 11,
    paddingHorizontal: 12,
    paddingVertical: 11,
    borderRadius: 16,
    borderWidth: 1,
  },
  symBadge: {
    width: 38,
    height: 38,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
