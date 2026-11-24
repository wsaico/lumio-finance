import React, { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { Building2, Check, ChevronRight, Plus, Search, Smartphone, TrendingUp, X } from 'lucide-react-native';
import { useAppTheme } from '@/theme/ThemeProvider';
import { useSettingsStore } from '@/stores/settings-store';
import {
  ENTITY_COLORS,
  getEntitiesForCountry,
  type BankPreset,
} from '@/lib/banks';
import { getRegionByCountry } from '@/lib/regions';
import { PremiumBottomSheet } from './PremiumBottomSheet';
import { alphaHex } from '@/lib/color-math';
import { triggerHaptic } from '@/lib/haptics';

export function PremiumEntityPicker({
  entityName,
  entityColor,
  accountType,
  onSelect,
}: {
  entityName: string;
  entityColor: string;
  accountType: 'BANK' | 'DIGITAL' | 'INVESTMENT' | 'CREDIT_CARD';
  onSelect: (name: string, color: string) => void;
}) {
  const theme = useAppTheme();
  const countryCode = useSettingsStore((s) => s.countryCode) || 'PE';
  const region = getRegionByCountry(countryCode);

  const [sheetOpen, setSheetOpen] = useState(false);
  const [search, setSearch] = useState('');

  const orderedEntities = useMemo(
    () => getEntitiesForCountry(countryCode, accountType),
    [countryCode, accountType]
  );

  const quickEntities = useMemo(() => {
    const top = orderedEntities.slice(0, 4);
    if (
      entityName.trim() &&
      !top.some((b) => b.name.toLowerCase() === entityName.trim().toLowerCase())
    ) {
      return [
        {
          id: 'selected-custom',
          name: entityName.trim(),
          color: entityColor || theme.brand,
          type: 'CUSTOM' as const,
          countries: [countryCode],
        },
        ...top.slice(0, 3),
      ];
    }
    return top;
  }, [orderedEntities, entityName, entityColor, theme.brand, countryCode]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return orderedEntities;
    return orderedEntities.filter((b) => b.name.toLowerCase().includes(q));
  }, [orderedEntities, search]);

  const exactMatch = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return true;
    return orderedEntities.some((b) => b.name.toLowerCase() === q);
  }, [orderedEntities, search]);

  const handleChoose = (name: string, color: string) => {
    triggerHaptic('selection');
    onSelect(name, color);
    setSheetOpen(false);
    setSearch('');
  };

  const renderTypeIcon = (item: BankPreset, active: boolean) => {
    const iconColor = active ? '#FFFFFF' : item.color;
    if (item.type === 'DIGITAL') return <Smartphone size={15} color={iconColor} />;
    if (item.type === 'INVESTMENT') return <TrendingUp size={15} color={iconColor} />;
    return <Building2 size={15} color={iconColor} />;
  };

  return (
    <View style={{ gap: 8 }}>
      <View style={styles.labelRow}>
        <Text style={{ color: theme.textSecondary, fontFamily: theme.font('700'), fontSize: theme.sp(12) }}>
          Entidad o billetera
        </Text>
        <Text style={{ color: theme.textMuted, fontFamily: theme.font('500'), fontSize: theme.sp(10.5) }}>
          Catálogo {region.name} + personalizadas
        </Text>
      </View>

      {/* Primary picker button */}
      <Pressable
        onPress={() => {
          triggerHaptic('selection');
          setSheetOpen(true);
        }}
        style={[
          styles.selectorBtn,
          { backgroundColor: theme.muted, borderColor: theme.border },
        ]}
      >
        <View style={[styles.dotBadge, { backgroundColor: entityColor || theme.brand }]}>
          <Building2 size={15} color="#FFFFFF" />
        </View>
        <View style={{ flex: 1 }}>
          <Text
            numberOfLines={1}
            style={{ color: theme.text, fontFamily: theme.font('700'), fontSize: theme.sp(14) }}
          >
            {entityName || 'Elegir o escribir entidad'}
          </Text>
          <Text style={{ color: theme.textMuted, fontFamily: theme.font('500'), fontSize: theme.sp(11) }}>
            Toca para buscar o agregar una entidad nueva
          </Text>
        </View>
        <ChevronRight size={17} color={theme.textMuted} />
      </Pressable>

      {/* Quick country chips */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.chipRow}
      >
        {quickEntities.map((b) => {
          const active = entityName.trim().toLowerCase() === b.name.toLowerCase();
          return (
            <Pressable
              key={b.id}
              onPress={() => {
                triggerHaptic('selection');
                onSelect(b.name, b.color);
              }}
              style={[
                styles.chip,
                {
                  backgroundColor: active ? b.color : theme.card,
                  borderColor: active ? b.color : theme.border,
                },
              ]}
            >
              <View
                style={[
                  styles.miniDot,
                  { backgroundColor: active ? '#FFFFFF' : b.color },
                ]}
              />
              <Text
                style={{
                  color: active ? '#FFFFFF' : theme.text,
                  fontFamily: theme.font('700'),
                  fontSize: theme.sp(11.5),
                }}
              >
                {b.name}
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
            styles.chip,
            { backgroundColor: theme.brandSoft, borderColor: theme.brand },
          ]}
        >
          <Plus size={13} color={theme.brand} strokeWidth={2.5} />
          <Text
            style={{
              color: theme.brand,
              fontFamily: theme.font('800'),
              fontSize: theme.sp(11.5),
            }}
          >
            Otra entidad
          </Text>
        </Pressable>
      </ScrollView>

      {/* Color swatches */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.swatchRow}
      >
        {ENTITY_COLORS.map((hex) => {
          const active = entityColor.toLowerCase() === hex.toLowerCase();
          return (
            <Pressable
              key={hex}
              onPress={() => {
                triggerHaptic('selection');
                onSelect(entityName, hex);
              }}
              style={[
                styles.swatch,
                {
                  backgroundColor: hex,
                  borderColor: active ? theme.text : 'transparent',
                },
              ]}
            >
              {active ? <Check size={13} color="#FFFFFF" strokeWidth={3} /> : null}
            </Pressable>
          );
        })}
      </ScrollView>

      <PremiumBottomSheet
        open={sheetOpen}
        onClose={() => {
          setSheetOpen(false);
          setSearch('');
        }}
        title="Elegir o crear entidad"
        subtitle={`Bancos, billeteras e inversiones de ${region.name} y globales`}
      >
        <View style={{ gap: 12, paddingBottom: 16 }}>
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
              placeholder="Buscar banco o escribir uno nuevo..."
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

          {search.trim().length >= 2 && !exactMatch ? (
            <Pressable
              onPress={() => handleChoose(search.trim(), entityColor || theme.brand)}
              style={[
                styles.customCreateCard,
                {
                  backgroundColor: alphaHex(theme.brand, 0.12),
                  borderColor: theme.brand,
                },
              ]}
            >
              <View style={[styles.typeBadge, { backgroundColor: theme.brand }]}>
                <Plus size={16} color="#FFFFFF" strokeWidth={2.6} />
              </View>
              <View style={{ flex: 1 }}>
                <Text
                  style={{
                    color: theme.brand,
                    fontFamily: theme.font('800'),
                    fontSize: theme.sp(13.5),
                  }}
                >
                  Usar &quot;{search.trim()}&quot; como entidad nueva
                </Text>
                <Text
                  style={{
                    color: theme.textSecondary,
                    fontFamily: theme.font('500'),
                    fontSize: theme.sp(11),
                  }}
                >
                  Puedes ajustar el color identificativo debajo
                </Text>
              </View>
            </Pressable>
          ) : null}

          <View style={{ gap: 8 }}>
            {filtered.map((item) => {
              const active = entityName.trim().toLowerCase() === item.name.toLowerCase();
              const isLocal = item.countries.includes(countryCode);
              return (
                <Pressable
                  key={item.id}
                  onPress={() => handleChoose(item.name, item.color)}
                  style={[
                    styles.entityRow,
                    {
                      backgroundColor: active ? alphaHex(item.color, 0.12) : theme.muted,
                      borderColor: active ? item.color : theme.border,
                    },
                  ]}
                >
                  <View
                    style={[
                      styles.typeBadge,
                      {
                        backgroundColor: active ? item.color : alphaHex(item.color, 0.14),
                      },
                    ]}
                  >
                    {renderTypeIcon(item, active)}
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text
                      style={{
                        color: theme.text,
                        fontFamily: theme.font('700'),
                        fontSize: theme.sp(13.5),
                      }}
                    >
                      {item.name}
                    </Text>
                    <Text
                      style={{
                        color: theme.textMuted,
                        fontFamily: theme.font('500'),
                        fontSize: theme.sp(11),
                      }}
                    >
                      {item.type === 'DIGITAL'
                        ? 'Billetera digital'
                        : item.type === 'INVESTMENT'
                          ? 'Inversión'
                          : 'Banco / Entidad'}
                      {isLocal ? ` · ${region.name}` : item.countries.includes('GLOBAL') ? ' · Global' : ''}
                    </Text>
                  </View>
                  {active ? <Check size={17} color={item.color} /> : null}
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
  },
  selectorBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 11,
    borderRadius: 16,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 11,
  },
  dotBadge: {
    width: 34,
    height: 34,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
  },
  chipRow: {
    gap: 7,
    paddingVertical: 2,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 11,
    paddingVertical: 7,
    borderRadius: 999,
    borderWidth: 1,
  },
  miniDot: {
    width: 8,
    height: 8,
    borderRadius: 99,
  },
  swatchRow: {
    gap: 8,
    paddingVertical: 2,
  },
  swatch: {
    width: 28,
    height: 28,
    borderRadius: 999,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
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
  customCreateCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 11,
    padding: 12,
    borderRadius: 16,
    borderWidth: 1.5,
  },
  entityRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 11,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 16,
    borderWidth: 1,
  },
  typeBadge: {
    width: 36,
    height: 36,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
