import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import {
  AlertTriangle,
  ArrowDownUp,
  ArrowRight,
  Calendar,
  Check,
  ChevronRight,
  CreditCard,
  Search,
  SlidersHorizontal,
  Sparkles,
  Wallet,
  X,
  Zap,
} from 'lucide-react-native';
import { format, isToday, isYesterday } from 'date-fns';
import { es } from 'date-fns/locale';
import { useAppTheme } from '@/theme/ThemeProvider';
import { getCurrencySymbol } from '@/lib/currencies';
import { formatAccountPillName, formatMoneyValue } from '@/lib/format';
import { CategoryIcon } from '@/components/ui/CategoryIcon';
import { PremiumAccountPicker } from '@/components/ui/PremiumAccountPicker';
import { PremiumCalculator } from '@/components/ui/PremiumCalculator';
import { BalancePreviewBanner } from '@/components/alerts/BalancePreviewBanner';
import type { SuggestedTransaction } from '@/hooks/useTransactionSuggestions';
import { useSettingsStore } from '@/stores/settings-store';
import { showAppToast } from '@/stores/toast-store';
import { triggerHaptic } from '@/lib/haptics';
import { alphaHex } from '@/lib/color-math';

export type ExpressStep = 'title' | 'category' | 'amount';

export interface ExpressTransactionSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialStep?: ExpressStep;
  activeTab: 'EXPENSE' | 'INCOME' | 'TRANSFER';
  onTabChange: (tab: 'EXPENSE' | 'INCOME' | 'TRANSFER') => void;
  description: string;
  onDescriptionChange: (val: string) => void;
  amount: string;
  onAmountChange: (val: string) => void;
  categoryId: string;
  subcategoryId: string;
  onCategorySelect: (catId: string, subId?: string) => void;
  categories: any[];
  recentCategoryIds: string[];
  accounts: any[];
  accountId: string;
  onAccountSelect: (id: string) => void;
  transferToAccountId: string;
  onTransferToSelect: (id: string) => void;
  onSwapTransferAccounts: () => void;
  frequent: SuggestedTransaction[];
  autocompleteMatches: SuggestedTransaction[];
  onApplySuggestion: (item: SuggestedTransaction) => void;
  smartSuggestions: Array<{
    categoryId: string;
    categoryName: string;
    categoryColor?: string;
    categoryIcon?: string;
    subcategoryId?: string;
    subcategoryName?: string;
  }>;
  transactionDate: Date;
  onDateChange: (d: Date) => void;
  isSubmitting: boolean;
  onSubmit: (createAnother?: boolean) => void;
}

export function ExpressTransactionSheet(props: ExpressTransactionSheetProps) {
  const {
    open,
    onOpenChange,
    initialStep = 'title',
    activeTab,
    onTabChange,
    description,
    onDescriptionChange,
    amount,
    onAmountChange,
    categoryId,
    subcategoryId,
    onCategorySelect,
    categories,
    recentCategoryIds,
    accounts,
    accountId,
    onAccountSelect,
    transferToAccountId,
    onTransferToSelect,
    onSwapTransferAccounts,
    frequent,
    autocompleteMatches,
    onApplySuggestion,
    smartSuggestions,
    transactionDate,
    onDateChange,
    isSubmitting,
    onSubmit,
  } = props;

  const theme = useAppTheme();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const numberFormat = useSettingsStore((s) => s.numberFormat);
  const [step, setStep] = useState<ExpressStep>(initialStep);
  const [catSearch, setCatSearch] = useState('');
  const [expandedCatId, setExpandedCatId] = useState<string | null>(null);
  const [titleError, setTitleError] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const titleInputRef = useRef<React.ComponentRef<typeof TextInput> | null>(null);

  useEffect(() => {
    if (open) {
      setStep(initialStep);
      setCatSearch('');
      setTitleError(null);
      setFormError(null);
    }
  }, [open, initialStep]);

  const currentAccount = accounts.find((a) => a.id === accountId);
  const transferToAccount = accounts.find((a) => a.id === transferToAccountId);
  const currencySymbol = getCurrencySymbol(currentAccount?.currencyCode);
  const currentCategory = categories.find((c: any) => c.id === categoryId);
  const currentSubcategory = currentCategory?.subcategories?.find(
    (s: any) => s.id === subcategoryId
  );

  const tabAccent =
    activeTab === 'INCOME'
      ? theme.income
      : activeTab === 'TRANSFER'
        ? theme.transfer
        : theme.expense;

  const filteredCategories = useMemo(() => {
    const byType = categories.filter((c: any) =>
      activeTab === 'INCOME' ? !c.type || c.type === 'INCOME' : !c.type || c.type === 'EXPENSE'
    );
    const q = catSearch.trim().toLowerCase();
    if (!q) return byType;
    return byType.filter(
      (c: any) =>
        c.name?.toLowerCase().includes(q) ||
        c.subcategories?.some((s: any) => s.name?.toLowerCase().includes(q))
    );
  }, [categories, activeTab, catSearch]);

  const recentCats = useMemo(() => {
    if (catSearch.trim()) return [];
    return recentCategoryIds
      .map((id) => filteredCategories.find((c: any) => c.id === id))
      .filter(Boolean)
      .slice(0, 4);
  }, [recentCategoryIds, filteredCategories, catSearch]);

  const numericAmount = Number(amount) || 0;
  const topSmart = smartSuggestions?.[0];

  const dateShort = isToday(transactionDate)
    ? 'Hoy'
    : isYesterday(transactionDate)
      ? 'Ayer'
      : format(transactionDate, 'd MMM', { locale: es });

  const toggleQuickDate = () => {
    triggerHaptic('selection');
    const now = new Date();
    if (isToday(transactionDate)) {
      const y = new Date(now);
      y.setDate(now.getDate() - 1);
      onDateChange(y);
    } else {
      onDateChange(now);
    }
  };

  const handleTitleNext = () => {
    if (!description.trim()) {
      setTitleError('Escribe una descripción para identificar este movimiento');
      titleInputRef.current?.focus();
      return;
    }
    setTitleError(null);
    if (activeTab === 'TRANSFER') {
      setStep('category');
      return;
    }
    if (categoryId && description.trim().length >= 2) setStep('amount');
    else setStep('category');
  };

  const handleSafeSubmit = (createAnother = false) => {
    setFormError(null);
    if (accounts.length === 0) {
      setFormError('Primero debes crear una cuenta para registrar movimientos.');
      showAppToast.warning({
        title: 'Primero crea una cuenta',
        description: 'Necesitas al menos una cuenta para registrar movimientos.',
      });
      return;
    }
    if (!description.trim()) {
      setTitleError('La descripción es obligatoria');
      setFormError('Escribe una descripción para este movimiento.');
      setStep('title');
      return;
    }
    if (activeTab !== 'TRANSFER' && !categoryId) {
      setFormError('Selecciona una categoría antes de guardar.');
      showAppToast.warning({ title: 'Selecciona una categoría' });
      setStep('category');
      return;
    }
    if (
      activeTab === 'TRANSFER' &&
      (!transferToAccountId || transferToAccountId === accountId)
    ) {
      setFormError('Selecciona una cuenta destino diferente a la de origen.');
      showAppToast.warning({
        title: 'Selecciona la cuenta destino',
        description: 'Origen y destino deben ser diferentes.',
      });
      setStep('category');
      return;
    }
    if (numericAmount <= 0) {
      setFormError('Ingresa un importe mayor a 0 en el teclado.');
      showAppToast.warning({
        title: 'Ingresa un monto mayor a 0',
      });
      return;
    }
    onSubmit(createAnother);
    if (createAnother) setStep('title');
  };

  const historyItems =
    description.trim().length >= 2 && autocompleteMatches.length > 0
      ? autocompleteMatches.slice(0, 4)
      : frequent.slice(0, 4);

  return (
    <Modal
      visible={open}
      transparent
      statusBarTranslucent
      animationType="fade"
      onRequestClose={() => onOpenChange(false)}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === 'web' ? undefined : 'padding'}
        style={styles.backdrop}
      >
        <Pressable style={StyleSheet.absoluteFill} onPress={() => onOpenChange(false)} />
        <View
          style={[
            styles.sheet,
            {
              backgroundColor: theme.card,
              borderColor: theme.border,
              paddingBottom: Math.max(insets.bottom, 12),
              maxHeight: '90%',
              marginTop: Math.max(insets.top, 20),
            },
          ]}
        >
          <View style={styles.handleWrap}>
            <View style={[styles.handle, { backgroundColor: theme.border }]} />
          </View>

          {/* Top Bar */}
          <View style={[styles.topBar, { borderBottomColor: theme.border }]}>
            <View style={[styles.typeTabs, { backgroundColor: theme.muted, borderColor: theme.border }]}>
              {(
                [
                  { id: 'EXPENSE', label: 'Gasto', col: theme.expense },
                  { id: 'INCOME', label: 'Ingreso', col: theme.income },
                  { id: 'TRANSFER', label: 'Transferir', col: theme.transfer },
                ] as const
              ).map((t) => {
                const active = activeTab === t.id;
                return (
                  <Pressable
                    key={t.id}
                    onPress={() => {
                      triggerHaptic('selection');
                      onTabChange(t.id);
                    }}
                    style={[styles.typePill, active && { backgroundColor: t.col }]}
                  >
                    <Text
                      style={{
                        color: active ? '#FFFFFF' : theme.textMuted,
                        fontFamily: theme.font('800'),
                        fontSize: 11.5,
                      }}
                    >
                      {t.label}
                    </Text>
                  </Pressable>
                );
              })}
            </View>

            <View style={styles.topRight}>
              <Pressable
                onPress={toggleQuickDate}
                style={[styles.dateChip, { backgroundColor: theme.muted }]}
              >
                <Calendar size={13} color={theme.brand} />
                <Text style={{ color: theme.text, fontFamily: theme.font('700'), fontSize: 11.5 }}>
                  {dateShort}
                </Text>
              </Pressable>
              <Pressable
                onPress={() => onOpenChange(false)}
                style={[styles.closeCircle, { backgroundColor: theme.muted }]}
                accessibilityLabel="Formulario completo"
              >
                <X size={16} color={theme.textSecondary} />
              </Pressable>
            </View>
          </View>

          {/* 3-Step Interactive Stepper */}
          <View style={[styles.stepper, { backgroundColor: theme.muted, borderBottomColor: theme.border }]}>
            <Pressable
              onPress={() => setStep('title')}
              style={[
                styles.stepPill,
                step === 'title'
                  ? { backgroundColor: tabAccent, borderColor: tabAccent }
                  : { backgroundColor: theme.card, borderColor: theme.border },
              ]}
            >
              <Text style={{ color: step === 'title' ? '#FFFFFF' : theme.text, fontFamily: theme.font('700'), fontSize: 11.5 }} numberOfLines={1}>
                1 · {description.trim() || 'Título'}
              </Text>
            </Pressable>

            <ChevronRight size={13} color={theme.textMuted} />

            <Pressable
              onPress={() => setStep('category')}
              style={[
                styles.stepPill,
                step === 'category'
                  ? { backgroundColor: tabAccent, borderColor: tabAccent }
                  : { backgroundColor: theme.card, borderColor: theme.border },
              ]}
            >
              <Text style={{ color: step === 'category' ? '#FFFFFF' : theme.text, fontFamily: theme.font('700'), fontSize: 11.5 }} numberOfLines={1}>
                2 ·{' '}
                {activeTab === 'TRANSFER'
                  ? transferToAccount?.name || 'Cuentas'
                  : currentSubcategory?.name || currentCategory?.name || 'Categoría'}
              </Text>
            </Pressable>

            <ChevronRight size={13} color={theme.textMuted} />

            <Pressable
              onPress={() => setStep('amount')}
              style={[
                styles.stepPill,
                step === 'amount'
                  ? { backgroundColor: tabAccent, borderColor: tabAccent }
                  : { backgroundColor: theme.card, borderColor: theme.border },
              ]}
            >
              <Text style={{ color: step === 'amount' ? '#FFFFFF' : theme.text, fontFamily: theme.font('700'), fontSize: 11.5 }} numberOfLines={1}>
                3 · {numericAmount > 0 ? `${currencySymbol}${numericAmount}` : 'Monto'}
              </Text>
            </Pressable>
          </View>

          {/* Body per Step */}
          <ScrollView
            style={{ maxHeight: 450 }}
            contentContainerStyle={styles.body}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            {step === 'title' && (
              <>
                <View>
                  <Text style={{ color: theme.text, fontFamily: theme.font('800'), fontSize: theme.sp(17) }}>
                    {activeTab === 'EXPENSE'
                      ? '¿En qué gastaste?'
                      : activeTab === 'INCOME'
                        ? '¿De dónde viene el ingreso?'
                        : '¿Motivo de la transferencia?'}
                  </Text>
                  <Text style={{ color: theme.textMuted, fontFamily: theme.font('500'), fontSize: theme.sp(12) }}>
                    Escribe un título o toca un frecuente para ir directo al monto
                  </Text>
                </View>

                <View
                  style={[
                    styles.titleInputBox,
                    {
                      backgroundColor: theme.muted,
                      borderColor: titleError ? theme.expense : tabAccent,
                    },
                  ]}
                >
                  <TextInput
                    ref={titleInputRef}
                    value={description}
                    onChangeText={(v) => {
                      onDescriptionChange(v);
                      if (titleError && v.trim()) setTitleError(null);
                    }}
                    onSubmitEditing={handleTitleNext}
                    returnKeyType="next"
                    placeholder={
                      activeTab === 'EXPENSE'
                        ? 'Ej. Almuerzo, Uber, Café...'
                        : activeTab === 'INCOME'
                          ? 'Ej. Sueldo, Freelance, Venta...'
                          : 'Ej. Ahorro mensual, Pago tarjeta...'
                    }
                    placeholderTextColor={theme.textMuted}
                    style={[styles.titleInput, { color: theme.text, fontFamily: theme.font('700'), fontSize: theme.sp(15) }]}
                  />
                  {description ? (
                    <Pressable onPress={() => onDescriptionChange('')} hitSlop={8}>
                      <X size={16} color={theme.textMuted} />
                    </Pressable>
                  ) : null}
                </View>

                {titleError ? (
                  <Text style={{ color: theme.expense, fontFamily: theme.font('700'), fontSize: theme.sp(11.5) }}>
                    {titleError}
                  </Text>
                ) : null}

                {activeTab === 'TRANSFER' && !description.trim() ? (
                  <View style={styles.wrapRow}>
                    {['Transferencia entre cuentas', 'Pago de tarjeta', 'Ahorro mensual'].map((preset) => (
                      <Pressable
                        key={preset}
                        onPress={() => {
                          onDescriptionChange(preset);
                          setStep('category');
                        }}
                        style={[styles.presetChip, { backgroundColor: theme.transferSoft }]}
                      >
                        <Text style={{ color: theme.transfer, fontFamily: theme.font('700'), fontSize: 11.5 }}>
                          {preset}
                        </Text>
                      </Pressable>
                    ))}
                  </View>
                ) : null}

                {activeTab !== 'TRANSFER' && topSmart && description.trim().length >= 2 ? (
                  <Pressable
                    onPress={() => {
                      triggerHaptic('selection');
                      onCategorySelect(topSmart.categoryId, topSmart.subcategoryId || '');
                      setStep('amount');
                    }}
                    style={[
                      styles.smartCard,
                      {
                        backgroundColor: theme.brandSoft,
                        borderColor: alphaHex(theme.brand, 0.35),
                      },
                    ]}
                  >
                    <View
                      style={[
                        styles.smartIcon,
                        { backgroundColor: topSmart.categoryColor || theme.brand },
                      ]}
                    >
                      <CategoryIcon name={topSmart.categoryIcon} size={18} color="#FFFFFF" />
                    </View>
                    <View style={{ flex: 1 }}>
                      <View style={styles.smartLabelRow}>
                        <Sparkles size={11} color={theme.brand} />
                        <Text style={{ color: theme.brand, fontFamily: theme.font('800'), fontSize: 10 }}>
                          CATEGORÍA SUGERIDA · 1 TOQUE
                        </Text>
                      </View>
                      <Text style={{ color: theme.text, fontFamily: theme.font('800'), fontSize: theme.sp(13.5) }}>
                        {topSmart.categoryName}
                        {topSmart.subcategoryName ? ` · ${topSmart.subcategoryName}` : ''}
                      </Text>
                    </View>
                    <ArrowRight size={17} color={theme.brand} />
                  </Pressable>
                ) : null}

                {historyItems.length > 0 ? (
                  <View style={{ gap: 8 }}>
                    <View style={styles.smartLabelRow}>
                      <Zap size={12} color={theme.coral} />
                      <Text style={{ color: theme.textMuted, fontFamily: theme.font('800'), fontSize: 10.5 }}>
                        FRECUENTES · TOCA PARA IR AL MONTO
                      </Text>
                    </View>
                    {historyItems.map((item) => (
                      <Pressable
                        key={item.id}
                        onPress={() => {
                          triggerHaptic('selection');
                          onApplySuggestion(item);
                          setStep('amount');
                        }}
                        style={[styles.freqRow, { backgroundColor: theme.muted, borderColor: theme.border }]}
                      >
                        <View
                          style={[
                            styles.freqIcon,
                            { backgroundColor: item.categoryColor || theme.brand },
                          ]}
                        >
                          <CategoryIcon name={item.categoryIcon} size={15} color="#FFFFFF" />
                        </View>
                        <View style={{ flex: 1 }}>
                          <Text style={{ color: theme.text, fontFamily: theme.font('700'), fontSize: theme.sp(13) }} numberOfLines={1}>
                            {item.description}
                          </Text>
                          <Text style={{ color: theme.textMuted, fontFamily: theme.font('500'), fontSize: theme.sp(11) }}>
                            {item.categoryName || 'Sugerencia'} {item.count > 1 ? `· ${item.count}x` : ''}
                          </Text>
                        </View>
                        {item.lastAmount > 0 ? (
                          <Text style={{ color: theme.brand, fontFamily: theme.font('800'), fontSize: theme.sp(12.5), fontVariant: ['tabular-nums'] }}>
                            {getCurrencySymbol(item.currencyCode)}
                            {item.lastAmount.toFixed(0)}
                          </Text>
                        ) : null}
                      </Pressable>
                    ))}
                  </View>
                ) : null}
              </>
            )}

            {step === 'category' && activeTab !== 'TRANSFER' && (
              <>
                <View style={[styles.searchBox, { backgroundColor: theme.muted, borderColor: theme.border }]}>
                  <Search size={15} color={theme.textMuted} />
                  <TextInput
                    value={catSearch}
                    onChangeText={setCatSearch}
                    placeholder="Filtrar categorías..."
                    placeholderTextColor={theme.textMuted}
                    style={[styles.searchInput, { color: theme.text, fontFamily: theme.font('600'), fontSize: theme.sp(13) }]}
                  />
                </View>

                {recentCats.length > 0 ? (
                  <View style={styles.wrapRow}>
                    {recentCats.map((c: any) => (
                      <Pressable
                        key={`rc-${c.id}`}
                        onPress={() => {
                          triggerHaptic('selection');
                          onCategorySelect(c.id, '');
                          setStep('amount');
                        }}
                        style={[styles.presetChip, { backgroundColor: theme.brandSoft }]}
                      >
                        <CategoryIcon name={c.icon} size={13} color={c.color || theme.brand} />
                        <Text style={{ color: theme.text, fontFamily: theme.font('700'), fontSize: 12 }}>
                          {c.name}
                        </Text>
                      </Pressable>
                    ))}
                  </View>
                ) : null}

                <View style={styles.catGrid}>
                  {filteredCategories.map((cat: any) => {
                    const selected = categoryId === cat.id;
                    const color = cat.color || theme.brand;
                    const hasSubs = Array.isArray(cat.subcategories) && cat.subcategories.length > 0;
                    const expanded = expandedCatId === cat.id;
                    return (
                      <View key={cat.id} style={{ width: '48.5%', gap: 6 }}>
                        <Pressable
                          onPress={() => {
                            triggerHaptic('selection');
                            onCategorySelect(cat.id, '');
                            if (hasSubs && !expanded) {
                              setExpandedCatId(cat.id);
                            } else {
                              setStep('amount');
                            }
                          }}
                          style={[
                            styles.catTile,
                            {
                              backgroundColor: selected ? alphaHex(color, 0.14) : theme.muted,
                              borderColor: selected ? color : theme.border,
                            },
                          ]}
                        >
                          <View style={[styles.catBadge, { backgroundColor: color }]}>
                            <CategoryIcon name={cat.icon} size={16} color="#FFFFFF" />
                          </View>
                          <Text
                            numberOfLines={1}
                            style={{ flex: 1, color: theme.text, fontFamily: theme.font('700'), fontSize: theme.sp(12.5) }}
                          >
                            {cat.name}
                          </Text>
                        </Pressable>
                        {expanded && hasSubs ? (
                          <View style={styles.wrapRow}>
                            {cat.subcategories.map((sub: any) => (
                              <Pressable
                                key={sub.id}
                                onPress={() => {
                                  triggerHaptic('selection');
                                  onCategorySelect(cat.id, sub.id);
                                  setStep('amount');
                                }}
                                style={[styles.subMini, { backgroundColor: theme.card, borderColor: color }]}
                              >
                                <Text style={{ color: theme.text, fontFamily: theme.font('700'), fontSize: 10.5 }}>
                                  {sub.name}
                                </Text>
                              </Pressable>
                            ))}
                          </View>
                        ) : null}
                      </View>
                    );
                  })}
                </View>
              </>
            )}

            {step === 'category' && activeTab === 'TRANSFER' && (
              <View style={{ gap: 12 }}>
                <View style={styles.swapRow}>
                  <Text style={{ color: theme.textMuted, fontFamily: theme.font('800'), fontSize: 11 }}>
                    CUENTA ORIGEN
                  </Text>
                  <Pressable onPress={onSwapTransferAccounts} style={styles.swapBtn}>
                    <ArrowDownUp size={13} color={theme.brand} />
                    <Text style={{ color: theme.brand, fontFamily: theme.font('700'), fontSize: 12 }}>
                      Invertir
                    </Text>
                  </Pressable>
                </View>
                <PremiumAccountPicker
                  accounts={accounts}
                  selectedId={accountId}
                  onSelectSingle={onAccountSelect}
                  showBalance={false}
                  inlineThreshold={3}
                  placeholder="Elegir cuenta origen"
                />

                <Text style={{ color: theme.textMuted, fontFamily: theme.font('800'), fontSize: 11, marginTop: 4 }}>
                  CUENTA DESTINO
                </Text>
                <PremiumAccountPicker
                  accounts={accounts}
                  excludeIds={accountId ? [accountId] : []}
                  selectedId={transferToAccountId}
                  onSelectSingle={(id) => {
                    triggerHaptic('selection');
                    onTransferToSelect(id);
                    setStep('amount');
                  }}
                  showBalance={false}
                  inlineThreshold={3}
                  placeholder="Elegir cuenta destino"
                />
              </View>
            )}

            {step === 'amount' && (
              <View style={{ gap: 10 }}>
                {accounts.length === 0 ? (
                  <View
                    style={[
                      styles.noAccBanner,
                      {
                        backgroundColor: alphaHex(theme.expense, 0.1),
                        borderColor: alphaHex(theme.expense, 0.35),
                      },
                    ]}
                  >
                    <AlertTriangle size={18} color={theme.expense} />
                    <View style={{ flex: 1 }}>
                      <Text style={{ color: theme.text, fontFamily: theme.font('800'), fontSize: 12.5 }}>
                        Primero crea una cuenta
                      </Text>
                      <Text style={{ color: theme.textSecondary, fontFamily: theme.font('500'), fontSize: 11.5 }}>
                        Necesitas al menos una cuenta de origen para guardar este registro.
                      </Text>
                    </View>
                    <Pressable
                      onPress={() => {
                        onOpenChange(false);
                        router.push('/(tabs)/accounts' as any);
                      }}
                      style={[styles.createAccBtn, { backgroundColor: theme.brand }]}
                    >
                      <Text style={{ color: '#FFFFFF', fontFamily: theme.font('800'), fontSize: 11.5 }}>
                        Crear cuenta
                      </Text>
                    </Pressable>
                  </View>
                ) : (
                  <PremiumAccountPicker
                    accounts={accounts}
                    selectedId={accountId}
                    onSelectSingle={(id) => {
                      triggerHaptic('selection');
                      onAccountSelect(id);
                    }}
                    showBalance={false}
                    inlineThreshold={3}
                    placeholder="Elegir cuenta"
                  />
                )}

                <BalancePreviewBanner account={currentAccount} amount={numericAmount} type={activeTab} />

                {activeTab === 'TRANSFER' && transferToAccount?.accountType === 'CREDIT_CARD' ? (
                  <View style={[styles.ccHint, { backgroundColor: theme.brandSoft, borderColor: theme.border }]}>
                    <CreditCard size={14} color={theme.brand} />
                    <Text style={{ color: theme.text, fontFamily: theme.font('700'), fontSize: 11.5, flex: 1 }}>
                      Pago a tarjeta · Nueva deuda estimada:{' '}
                      {formatMoneyValue(
                        Math.max(0, Math.abs(Number(transferToAccount.usedBalance || 0)) - numericAmount),
                        transferToAccount.currencyCode,
                        numberFormat
                      )}
                    </Text>
                  </View>
                ) : null}

                <PremiumCalculator
                  initialValue={amount || '0'}
                  currencySymbol={currencySymbol}
                  accentColor={tabAccent}
                  onChange={(val) => {
                    setFormError(null);
                    onAmountChange(val);
                  }}
                  onConfirm={(val) => onAmountChange(val)}
                  hideConfirmButton
                />
              </View>
            )}
          </ScrollView>

          {formError ? (
            <View
              style={[
                styles.inlineError,
                {
                  backgroundColor: alphaHex(theme.expense, 0.12),
                  borderTopColor: alphaHex(theme.expense, 0.3),
                },
              ]}
            >
              <AlertTriangle size={15} color={theme.expense} />
              <Text style={{ flex: 1, color: theme.expense, fontFamily: theme.font('700'), fontSize: 12 }}>
                {formError}
              </Text>
            </View>
          ) : null}

          {/* Bottom Bar */}
          <View style={[styles.footer, { borderTopColor: theme.border }]}>
            <Pressable
              onPress={() => onOpenChange(false)}
              style={[styles.fullFormBtn, { backgroundColor: theme.muted }]}
            >
              <SlidersHorizontal size={15} color={theme.textSecondary} />
              <Text style={{ color: theme.textSecondary, fontFamily: theme.font('700'), fontSize: 12 }}>
                Más opciones
              </Text>
            </Pressable>

            {step === 'title' ? (
              <Pressable
                onPress={handleTitleNext}
                style={[styles.primaryAction, { backgroundColor: tabAccent }]}
              >
                <Text style={{ color: '#FFFFFF', fontFamily: theme.font('800'), fontSize: 14 }}>
                  Continuar
                </Text>
                <ArrowRight size={16} color="#FFFFFF" />
              </Pressable>
            ) : step === 'category' ? (
              <Pressable
                onPress={() => setStep('amount')}
                style={[styles.primaryAction, { backgroundColor: tabAccent }]}
              >
                <Text style={{ color: '#FFFFFF', fontFamily: theme.font('800'), fontSize: 14 }}>
                  Ir al monto
                </Text>
                <ArrowRight size={16} color="#FFFFFF" />
              </Pressable>
            ) : (
              <View style={{ flex: 1, flexDirection: 'row', gap: 8 }}>
                <Pressable
                  disabled={isSubmitting}
                  onPress={() => handleSafeSubmit(true)}
                  style={[styles.addAnotherBtn, { borderColor: theme.border, backgroundColor: theme.muted }]}
                >
                  <Text style={{ color: theme.text, fontFamily: theme.font('700'), fontSize: 12 }}>
                    + Otra
                  </Text>
                </Pressable>
                <Pressable
                  disabled={isSubmitting}
                  onPress={() => handleSafeSubmit(false)}
                  style={[styles.primaryAction, { backgroundColor: tabAccent }]}
                >
                  {isSubmitting ? (
                    <ActivityIndicator color="#FFFFFF" size="small" />
                  ) : (
                    <>
                      <Check size={17} color="#FFFFFF" strokeWidth={2.8} />
                      <Text style={{ color: '#FFFFFF', fontFamily: theme.font('800'), fontSize: 14 }}>
                        Guardar
                      </Text>
                    </>
                  )}
                </Pressable>
              </View>
            )}
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(10,12,22,0.55)',
    justifyContent: 'flex-end',
  },
  sheet: {
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
    borderTopWidth: 1,
    borderLeftWidth: 1,
    borderRightWidth: 1,
    overflow: 'hidden',
    flexShrink: 1,
  },
  noAccBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    padding: 12,
    borderRadius: 16,
    borderWidth: 1,
  },
  createAccBtn: {
    paddingHorizontal: 11,
    paddingVertical: 8,
    borderRadius: 11,
  },
  inlineError: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderTopWidth: 1,
  },
  handleWrap: { paddingTop: 10, paddingBottom: 4, alignItems: 'center' },
  handle: { width: 42, height: 4.5, borderRadius: 99 },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderBottomWidth: 1,
    gap: 8,
  },
  typeTabs: {
    flexDirection: 'row',
    padding: 3,
    borderRadius: 99,
    borderWidth: 1,
  },
  typePill: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 99,
  },
  topRight: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  dateChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 99,
  },
  closeCircle: {
    width: 30,
    height: 30,
    borderRadius: 99,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepper: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderBottomWidth: 1,
    gap: 4,
  },
  stepPill: {
    flex: 1,
    paddingHorizontal: 8,
    paddingVertical: 6,
    borderRadius: 99,
    borderWidth: 1,
    alignItems: 'center',
  },
  body: { padding: 16, gap: 12 },
  titleInputBox: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 18,
    borderWidth: 1.5,
    paddingHorizontal: 14,
    height: 50,
    gap: 8,
  },
  titleInput: { flex: 1, height: '100%' },
  wrapRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 7 },
  presetChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 11,
    paddingVertical: 6,
    borderRadius: 99,
  },
  smartCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    padding: 11,
    borderRadius: 18,
    borderWidth: 1,
  },
  smartIcon: {
    width: 36,
    height: 36,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  smartLabelRow: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  freqRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    padding: 10,
    borderRadius: 16,
    borderWidth: 1,
  },
  freqIcon: {
    width: 32,
    height: 32,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
  },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 12,
    height: 40,
    borderRadius: 14,
    borderWidth: 1,
  },
  searchInput: { flex: 1, height: '100%' },
  catGrid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', gap: 8 },
  catTile: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: 10,
    borderRadius: 16,
    borderWidth: 1,
  },
  catBadge: {
    width: 30,
    height: 30,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  subMini: {
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: 99,
    borderWidth: 1,
  },
  swapRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  swapBtn: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  accPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 99,
    borderWidth: 1,
  },
  ccHint: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: 10,
    borderRadius: 14,
    borderWidth: 1,
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 14,
    paddingTop: 10,
    borderTopWidth: 1,
  },
  fullFormBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 12,
    height: 44,
    borderRadius: 99,
  },
  addAnotherBtn: {
    paddingHorizontal: 14,
    height: 44,
    borderRadius: 99,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryAction: {
    flex: 1,
    height: 44,
    borderRadius: 99,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
});
