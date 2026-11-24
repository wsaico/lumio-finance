import React, { useEffect, useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import {
  Banknote,
  Building2,
  Check,
  ChevronRight,
  CreditCard,
  Search,
  Smartphone,
  TrendingUp,
  Wallet,
  X,
} from 'lucide-react-native';
import { useAppTheme } from '@/theme/ThemeProvider';
import { useFormat } from '@/hooks/useFormat';
import { PremiumBottomSheet } from './PremiumBottomSheet';
import { PremiumButton } from './PremiumButton';
import { alphaHex } from '@/lib/color-math';
import { triggerHaptic } from '@/lib/haptics';

const TYPE_FILTERS = [
  { id: 'ALL', label: 'Todas' },
  { id: 'BANK', label: 'Bancos' },
  { id: 'DIGITAL', label: 'Billeteras' },
  { id: 'CREDIT_CARD', label: 'Tarjetas' },
  { id: 'CASH', label: 'Efectivo' },
  { id: 'INVESTMENT', label: 'Inversión' },
] as const;

function getAccountTypeIcon(accountType?: string) {
  switch (accountType) {
    case 'CREDIT_CARD':
      return CreditCard;
    case 'BANK':
      return Building2;
    case 'DIGITAL':
      return Smartphone;
    case 'CASH':
      return Banknote;
    case 'INVESTMENT':
      return TrendingUp;
    default:
      return Wallet;
  }
}

export function PremiumAccountPicker({
  accounts,
  mode = 'single',
  selectedId,
  selectedIds = [],
  onSelectSingle,
  onConfirmMulti,
  excludeIds = [],
  includeAllOption = false,
  allValue = 'ALL',
  allLabel = 'Todas las cuentas',
  label,
  placeholder = 'Seleccionar cuenta',
  showBalance = true,
  inlineThreshold = 3,
}: {
  accounts: any[];
  mode?: 'single' | 'multiple';
  selectedId?: string;
  selectedIds?: string[];
  onSelectSingle?: (id: string) => void;
  onConfirmMulti?: (ids: string[]) => void;
  excludeIds?: string[];
  includeAllOption?: boolean;
  allValue?: string;
  allLabel?: string;
  label?: string;
  placeholder?: string;
  showBalance?: boolean;
  inlineThreshold?: number;
}) {
  const theme = useAppTheme();
  const { formatMaskedMoney } = useFormat();

  const [sheetOpen, setSheetOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState<string>('ALL');
  const [draftIds, setDraftIds] = useState<string[]>(selectedIds);
  const [visibleLimit, setVisibleLimit] = useState(40);

  useEffect(() => {
    if (sheetOpen) {
      setVisibleLimit(40);
      if (mode === 'multiple') {
        setDraftIds(selectedIds);
      }
    } else {
      setSearch('');
      setTypeFilter('ALL');
    }
  }, [sheetOpen, mode, selectedIds]);

  const availableAccounts = useMemo(() => {
    if (!excludeIds.length) return accounts || [];
    const ex = new Set(excludeIds);
    return (accounts || []).filter((a) => !ex.has(a.id));
  }, [accounts, excludeIds]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return availableAccounts.filter((acc) => {
      if (typeFilter !== 'ALL' && acc.accountType !== typeFilter) return false;
      if (!q) return true;
      return (
        String(acc.name || '').toLowerCase().includes(q) ||
        String(acc.bankName || '').toLowerCase().includes(q) ||
        String(acc.currencyCode || '').toLowerCase().includes(q)
      );
    });
  }, [availableAccounts, search, typeFilter]);

  const selectedAccount = useMemo(
    () => availableAccounts.find((a) => a.id === selectedId),
    [availableAccounts, selectedId]
  );

  const selectedMultiNames = useMemo(() => {
    if (selectedIds.length === 0) return 'Ninguna seleccionada';
    const names = selectedIds
      .map((id) => availableAccounts.find((a) => a.id === id)?.name)
      .filter(Boolean);
    if (names.length <= 2) return names.join(', ');
    return `${names.slice(0, 2).join(', ')} +${names.length - 2}`;
  }, [availableAccounts, selectedIds]);

  const canRenderInline =
    mode === 'single' &&
    !includeAllOption &&
    availableAccounts.length > 0 &&
    availableAccounts.length <= inlineThreshold;

  const toggleDraftId = (id: string) => {
    triggerHaptic('selection');
    setDraftIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  const renderTriggerSummary = () => {
    if (mode === 'multiple') {
      return (
        <Pressable
          onPress={() => {
            triggerHaptic('selection');
            setSheetOpen(true);
          }}
          style={[
            styles.selectorCard,
            { backgroundColor: theme.muted, borderColor: theme.border },
          ]}
        >
          <View style={[styles.iconBox, { backgroundColor: theme.brandSoft }]}>
            <Wallet size={16} color={theme.brand} />
          </View>
          <View style={{ flex: 1 }}>
            <Text
              numberOfLines={1}
              style={{ color: theme.text, fontFamily: theme.font('700'), fontSize: theme.sp(13.5) }}
            >
              {selectedIds.length === 0
                ? placeholder
                : `${selectedIds.length} ${selectedIds.length === 1 ? 'cuenta' : 'cuentas'}: ${selectedMultiNames}`}
            </Text>
            <Text style={{ color: theme.textMuted, fontFamily: theme.font('500'), fontSize: theme.sp(11) }}>
              Toca para buscar y elegir cuentas ({availableAccounts.length} disponibles)
            </Text>
          </View>
          <ChevronRight size={17} color={theme.textMuted} />
        </Pressable>
      );
    }

    const isAllSelected = includeAllOption && (!selectedId || selectedId === allValue);
    const SelectedIcon = selectedAccount
      ? getAccountTypeIcon(selectedAccount.accountType)
      : Wallet;
    const accColor = selectedAccount?.color || theme.brand;

    return (
      <Pressable
        onPress={() => {
          triggerHaptic('selection');
          setSheetOpen(true);
        }}
        style={[
          styles.selectorCard,
          { backgroundColor: theme.muted, borderColor: theme.border },
        ]}
      >
        <View
          style={[
            styles.iconBox,
            {
              backgroundColor: selectedAccount
                ? alphaHex(accColor, 0.16)
                : theme.brandSoft,
            },
          ]}
        >
          <SelectedIcon size={16} color={selectedAccount ? accColor : theme.brand} />
        </View>
        <View style={{ flex: 1 }}>
          <Text
            numberOfLines={1}
            style={{ color: theme.text, fontFamily: theme.font('700'), fontSize: theme.sp(13.5) }}
          >
            {isAllSelected
              ? allLabel
              : selectedAccount
                ? selectedAccount.name
                : placeholder}
          </Text>
          <Text
            numberOfLines={1}
            style={{ color: theme.textMuted, fontFamily: theme.font('500'), fontSize: theme.sp(11) }}
          >
            {selectedAccount
              ? `${selectedAccount.bankName || selectedAccount.accountType} · ${selectedAccount.currencyCode}${
                  showBalance
                    ? ` · ${formatMaskedMoney(
                        selectedAccount.accountType === 'CREDIT_CARD'
                          ? Math.max(
                              0,
                              Number(selectedAccount.creditLimit || 0) -
                                Math.abs(Number(selectedAccount.usedBalance || 0))
                            )
                          : selectedAccount.currentBalance,
                        selectedAccount.currencyCode
                      )}`
                    : ''
                }`
              : `${availableAccounts.length} cuentas disponibles`}
          </Text>
        </View>
        <ChevronRight size={17} color={theme.textMuted} />
      </Pressable>
    );
  };

  return (
    <View style={{ gap: 6 }}>
      {label ? (
        <Text
          style={{
            color: theme.textSecondary,
            fontFamily: theme.font('700'),
            fontSize: theme.sp(12),
          }}
        >
          {label}
        </Text>
      ) : null}

      {canRenderInline ? (
        <View style={styles.inlineWrap}>
          {availableAccounts.map((acc) => {
            const active = selectedId === acc.id;
            const accColor = acc.color || theme.brand;
            const Icon = getAccountTypeIcon(acc.accountType);
            return (
              <Pressable
                key={acc.id}
                onPress={() => {
                  triggerHaptic('selection');
                  onSelectSingle?.(acc.id);
                }}
                style={[
                  styles.inlinePill,
                  {
                    backgroundColor: active ? alphaHex(accColor, 0.15) : theme.muted,
                    borderColor: active ? accColor : theme.border,
                  },
                ]}
              >
                <Icon size={13} color={active ? accColor : theme.textMuted} />
                <Text
                  numberOfLines={1}
                  style={{
                    color: active ? theme.text : theme.textSecondary,
                    fontFamily: theme.font(active ? '800' : '600'),
                    fontSize: theme.sp(12),
                  }}
                >
                  {acc.name}
                  {showBalance
                    ? ` (${formatMaskedMoney(
                        acc.accountType === 'CREDIT_CARD'
                          ? Math.max(
                              0,
                              Number(acc.creditLimit || 0) -
                                Math.abs(Number(acc.usedBalance || 0))
                            )
                          : acc.currentBalance,
                        acc.currencyCode
                      )})`
                    : ` · ${acc.currencyCode}`}
                </Text>
              </Pressable>
            );
          })}
        </View>
      ) : (
        renderTriggerSummary()
      )}

      <PremiumBottomSheet
        open={sheetOpen}
        onClose={() => {
          setSheetOpen(false);
          setSearch('');
        }}
        title={mode === 'multiple' ? 'Seleccionar cuentas' : 'Elegir cuenta'}
        subtitle={`${availableAccounts.length} ${availableAccounts.length === 1 ? 'cuenta disponible' : 'cuentas disponibles'}`}
        footer={
          mode === 'multiple' ? (
            <View style={styles.footerRow}>
              <PremiumButton
                title="Limpiar"
                variant="outline"
                onPress={() => setDraftIds([])}
                style={{ flex: 1 }}
              />
              <PremiumButton
                title={`Aplicar (${draftIds.length})`}
                variant="coral"
                onPress={() => {
                  onConfirmMulti?.(draftIds);
                  setSheetOpen(false);
                  setSearch('');
                }}
                style={{ flex: 1.5 }}
              />
            </View>
          ) : undefined
        }
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
              placeholder="Buscar por nombre, banco o moneda..."
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

          {availableAccounts.length > 4 ? (
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.filterRow}
            >
              {TYPE_FILTERS.map((tf) => {
                const active = typeFilter === tf.id;
                return (
                  <Pressable
                    key={tf.id}
                    onPress={() => setTypeFilter(tf.id)}
                    style={[
                      styles.filterChip,
                      {
                        backgroundColor: active ? theme.brand : theme.muted,
                        borderColor: active ? theme.brand : theme.border,
                      },
                    ]}
                  >
                    <Text
                      style={{
                        color: active ? '#FFFFFF' : theme.textSecondary,
                        fontFamily: theme.font('700'),
                        fontSize: 11.5,
                      }}
                    >
                      {tf.label}
                    </Text>
                  </Pressable>
                );
              })}
            </ScrollView>
          ) : null}

          {includeAllOption && mode === 'single' ? (
            <Pressable
              onPress={() => {
                triggerHaptic('selection');
                onSelectSingle?.(allValue);
                setSheetOpen(false);
                setSearch('');
              }}
              style={[
                styles.accRow,
                {
                  backgroundColor:
                    !selectedId || selectedId === allValue
                      ? alphaHex(theme.brand, 0.12)
                      : theme.muted,
                  borderColor:
                    !selectedId || selectedId === allValue ? theme.brand : theme.border,
                },
              ]}
            >
              <View style={[styles.iconBox, { backgroundColor: theme.brandSoft }]}>
                <Wallet size={16} color={theme.brand} />
              </View>
              <Text
                style={{
                  flex: 1,
                  color: theme.text,
                  fontFamily: theme.font('700'),
                  fontSize: theme.sp(13.5),
                }}
              >
                {allLabel}
              </Text>
              {!selectedId || selectedId === allValue ? (
                <Check size={17} color={theme.brand} />
              ) : null}
            </Pressable>
          ) : null}

          <View style={{ gap: 8 }}>
            {filtered.length === 0 ? (
              <Text
                style={{
                  color: theme.textMuted,
                  fontFamily: theme.font('500'),
                  fontSize: theme.sp(12.5),
                  textAlign: 'center',
                  paddingVertical: 16,
                }}
              >
                No se encontraron cuentas con ese criterio.
              </Text>
            ) : (
              (search.trim() ? filtered : filtered.slice(0, visibleLimit)).map((acc) => {
                const selected =
                  mode === 'multiple'
                    ? draftIds.includes(acc.id)
                    : selectedId === acc.id;
                const accColor = acc.color || theme.brand;
                const Icon = getAccountTypeIcon(acc.accountType);
                const balanceVal =
                  acc.accountType === 'CREDIT_CARD'
                    ? Math.max(
                        0,
                        Number(acc.creditLimit || 0) -
                          Math.abs(Number(acc.usedBalance || 0))
                      )
                    : acc.currentBalance;

                return (
                  <Pressable
                    key={acc.id}
                    onPress={() => {
                      if (mode === 'multiple') {
                        toggleDraftId(acc.id);
                      } else {
                        triggerHaptic('selection');
                        onSelectSingle?.(acc.id);
                        setSheetOpen(false);
                        setSearch('');
                      }
                    }}
                    style={[
                      styles.accRow,
                      {
                        backgroundColor: selected
                          ? alphaHex(accColor, 0.12)
                          : theme.muted,
                        borderColor: selected ? accColor : theme.border,
                      },
                    ]}
                  >
                    <View
                      style={[
                        styles.iconBox,
                        { backgroundColor: alphaHex(accColor, 0.18) },
                      ]}
                    >
                      <Icon size={16} color={accColor} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text
                        numberOfLines={1}
                        style={{
                          color: theme.text,
                          fontFamily: theme.font('700'),
                          fontSize: theme.sp(13.5),
                        }}
                      >
                        {acc.name}
                      </Text>
                      <Text
                        numberOfLines={1}
                        style={{
                          color: theme.textMuted,
                          fontFamily: theme.font('500'),
                          fontSize: theme.sp(11),
                        }}
                      >
                        {acc.bankName || acc.accountType} · {acc.currencyCode}
                      </Text>
                    </View>
                    {showBalance ? (
                      <Text
                        style={{
                          color: theme.text,
                          fontFamily: theme.font('800'),
                          fontSize: theme.sp(12.5),
                          fontVariant: ['tabular-nums'],
                        }}
                      >
                        {formatMaskedMoney(balanceVal, acc.currencyCode)}
                      </Text>
                    ) : null}
                    {selected ? <Check size={17} color={accColor} /> : null}
                  </Pressable>
                );
              })
            )}
            {!search.trim() && filtered.length > visibleLimit ? (
              <Pressable
                onPress={() => setVisibleLimit((n) => n + 40)}
                style={[
                  styles.accRow,
                  {
                    justifyContent: 'center',
                    backgroundColor: theme.brandSoft,
                    borderColor: theme.border,
                  },
                ]}
              >
                <Text style={{ color: theme.brand, fontFamily: theme.font('800'), fontSize: theme.sp(12.5) }}>
                  Mostrar {Math.min(40, filtered.length - visibleLimit)} más ({filtered.length - visibleLimit} restantes)
                </Text>
              </Pressable>
            ) : null}
          </View>
        </View>
      </PremiumBottomSheet>
    </View>
  );
}

const styles = StyleSheet.create({
  selectorCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 11,
    paddingHorizontal: 12,
    paddingVertical: 11,
    borderRadius: 16,
    borderWidth: 1,
  },
  iconBox: {
    width: 36,
    height: 36,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  inlineWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  inlinePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
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
  filterRow: {
    gap: 7,
    paddingVertical: 2,
  },
  filterChip: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 999,
    borderWidth: 1,
  },
  accRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 12,
    paddingVertical: 11,
    borderRadius: 16,
    borderWidth: 1,
  },
  footerRow: {
    flexDirection: 'row',
    gap: 10,
  },
});
