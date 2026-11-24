import React, { useEffect, useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { Check, ChevronDown, ChevronRight, Layers, Search, Sparkles, X } from 'lucide-react-native';
import { useAppTheme } from '@/theme/ThemeProvider';
import { CategoryIcon } from './CategoryIcon';
import { PremiumBottomSheet } from './PremiumBottomSheet';
import { PremiumButton } from './PremiumButton';
import { alphaHex } from '@/lib/color-math';
import { triggerHaptic } from '@/lib/haptics';

const PAGE_STEP = 40;

export function PremiumCategoryPicker({
  open,
  onClose,
  categories,
  selectedCategoryId,
  selectedSubcategoryId,
  selectedCategoryIds = [],
  recentCategoryIds = [],
  type = 'EXPENSE',
  multiSelect = false,
  includeAllOption = false,
  allLabel = 'Todas las categorías',
  title,
  subtitle,
  onSelect,
  onConfirmMulti,
}: {
  open: boolean;
  onClose: () => void;
  categories: any[];
  selectedCategoryId?: string;
  selectedSubcategoryId?: string;
  selectedCategoryIds?: string[];
  recentCategoryIds?: string[];
  type?: 'EXPENSE' | 'INCOME' | 'ALL';
  multiSelect?: boolean;
  includeAllOption?: boolean;
  allLabel?: string;
  title?: string;
  subtitle?: string;
  onSelect?: (categoryId: string, subcategoryId?: string) => void;
  onConfirmMulti?: (categoryIds: string[]) => void;
}) {
  const theme = useAppTheme();
  const [search, setSearch] = useState('');
  const [expandedCatId, setExpandedCatId] = useState<string | null>(selectedCategoryId || null);
  const [draftIds, setDraftIds] = useState<string[]>(selectedCategoryIds);
  const [visibleLimit, setVisibleLimit] = useState(PAGE_STEP);

  useEffect(() => {
    if (open) {
      setDraftIds(selectedCategoryIds);
      setVisibleLimit(PAGE_STEP);
    } else {
      setSearch('');
    }
  }, [open, selectedCategoryIds]);

  const filtered = useMemo(() => {
    const byType =
      type === 'ALL'
        ? categories || []
        : (categories || []).filter((c) => !c.type || c.type === type);
    const q = search.trim().toLowerCase();
    if (!q) return byType;
    return byType.filter(
      (c) =>
        c.name?.toLowerCase().includes(q) ||
        c.subcategories?.some((s: any) => s.name?.toLowerCase().includes(q))
    );
  }, [categories, type, search]);

  const displayedCategories = useMemo(
    () => (search.trim() ? filtered : filtered.slice(0, visibleLimit)),
    [filtered, search, visibleLimit]
  );

  const recentCats = useMemo(() => {
    if (search.trim() || multiSelect) return [];
    return recentCategoryIds
      .map((id) => filtered.find((c) => c.id === id))
      .filter(Boolean)
      .slice(0, 4);
  }, [recentCategoryIds, filtered, search, multiSelect]);

  const handlePick = (cat: any, subId?: string) => {
    triggerHaptic('selection');
    if (multiSelect) {
      setDraftIds((prev) =>
        prev.includes(cat.id) ? prev.filter((id) => id !== cat.id) : [...prev, cat.id]
      );
      return;
    }
    onSelect?.(cat.id, subId || '');
    onClose();
  };

  const resolvedTitle =
    title ||
    (multiSelect
      ? 'Elegir categorías'
      : type === 'INCOME'
        ? 'Categoría de ingreso'
        : type === 'ALL'
          ? 'Filtrar por categoría'
          : 'Categoría de gasto');

  const resolvedSubtitle =
    subtitle ||
    (multiSelect
      ? `Selecciona las categorías a incluir (${filtered.length} disponibles)`
      : 'Toca una categoría o despliega sus subcategorías');

  return (
    <PremiumBottomSheet
      open={open}
      onClose={onClose}
      title={resolvedTitle}
      subtitle={resolvedSubtitle}
      footer={
        multiSelect ? (
          <View style={styles.footerRow}>
            <PremiumButton
              title={draftIds.length > 0 ? 'Todas (Limpiar)' : 'Todas'}
              variant="outline"
              onPress={() => setDraftIds([])}
              style={{ flex: 1 }}
            />
            <PremiumButton
              title={draftIds.length === 0 ? 'Aplicar todas' : `Aplicar (${draftIds.length})`}
              variant="coral"
              onPress={() => {
                onConfirmMulti?.(draftIds);
                onClose();
              }}
              style={{ flex: 1.5 }}
            />
          </View>
        ) : undefined
      }
    >
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
          placeholder="Buscar categoría o subcategoría..."
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

      {includeAllOption && !multiSelect ? (
        <Pressable
          onPress={() => {
            triggerHaptic('selection');
            onSelect?.('', '');
            onClose();
          }}
          style={[
            styles.catCard,
            {
              backgroundColor: !selectedCategoryId ? alphaHex(theme.brand, 0.1) : theme.card,
              borderColor: !selectedCategoryId ? theme.brand : theme.border,
            },
          ]}
        >
          <View style={styles.catRow}>
            <View style={styles.catMain}>
              <View
                style={[
                  styles.catIcon,
                  {
                    backgroundColor: theme.brand,
                    borderRadius: Math.min(theme.iconRadius, 14),
                  },
                ]}
              >
                <Layers size={18} color="#FFFFFF" />
              </View>
              <Text
                style={{
                  flex: 1,
                  color: theme.text,
                  fontFamily: theme.font('700'),
                  fontSize: theme.sp(14),
                }}
              >
                {allLabel}
              </Text>
              {!selectedCategoryId ? <Check size={17} color={theme.brand} strokeWidth={2.8} /> : null}
            </View>
          </View>
        </Pressable>
      ) : null}

      {recentCats.length > 0 && (
        <View style={{ gap: 8 }}>
          <View style={styles.sectionHeader}>
            <Sparkles size={13} color={theme.brand} />
            <Text style={{ color: theme.textMuted, fontFamily: theme.font('800'), fontSize: theme.sp(10.5) }}>
              RECIENTES
            </Text>
          </View>
          <View style={styles.recentRow}>
            {recentCats.map((cat: any) => {
              const active = selectedCategoryId === cat.id && !selectedSubcategoryId;
              return (
                <Pressable
                  key={`rec-${cat.id}`}
                  onPress={() => handlePick(cat)}
                  style={[
                    styles.recentChip,
                    {
                      backgroundColor: active ? theme.brand : theme.muted,
                      borderColor: active ? theme.brand : theme.border,
                    },
                  ]}
                >
                  <CategoryIcon
                    name={cat.icon}
                    size={14}
                    color={active ? '#FFFFFF' : cat.color || theme.brand}
                  />
                  <Text
                    style={{
                      color: active ? '#FFFFFF' : theme.text,
                      fontFamily: theme.font('700'),
                      fontSize: theme.sp(12),
                    }}
                    numberOfLines={1}
                  >
                    {cat.name}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </View>
      )}

      <View style={{ gap: 8 }}>
        {displayedCategories.length === 0 ? (
          <Text
            style={{
              color: theme.textMuted,
              fontFamily: theme.font('500'),
              fontSize: theme.sp(12.5),
              textAlign: 'center',
              paddingVertical: 16,
            }}
          >
            No se encontraron categorías con &quot;{search.trim()}&quot;.
          </Text>
        ) : (
          displayedCategories.map((cat: any) => {
            const isSelected = multiSelect
              ? draftIds.includes(cat.id)
              : selectedCategoryId === cat.id;
            const hasSubs = !multiSelect && Array.isArray(cat.subcategories) && cat.subcategories.length > 0;
            const isExpanded = expandedCatId === cat.id;
            const catColor = cat.color || theme.brand;

            return (
              <View
                key={cat.id}
                style={[
                  styles.catCard,
                  {
                    backgroundColor: isSelected ? alphaHex(catColor, 0.08) : theme.card,
                    borderColor: isSelected ? catColor : theme.border,
                  },
                ]}
              >
                <View style={styles.catRow}>
                  <Pressable
                    onPress={() => handlePick(cat)}
                    style={styles.catMain}
                  >
                    <View
                      style={[
                        styles.catIcon,
                        {
                          backgroundColor: catColor,
                          borderRadius: Math.min(theme.iconRadius, 14),
                        },
                      ]}
                    >
                      <CategoryIcon name={cat.icon} size={18} color="#FFFFFF" />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text
                        style={{
                          color: theme.text,
                          fontFamily: theme.font('700'),
                          fontSize: theme.sp(14),
                        }}
                      >
                        {cat.name}
                      </Text>
                      {hasSubs ? (
                        <Text
                          style={{
                            color: theme.textMuted,
                            fontFamily: theme.font('500'),
                            fontSize: theme.sp(11),
                          }}
                        >
                          {cat.subcategories.length} subcategorías
                        </Text>
                      ) : null}
                    </View>
                    {isSelected && (!selectedSubcategoryId || multiSelect) ? (
                      <Check size={17} color={catColor} strokeWidth={2.8} />
                    ) : null}
                  </Pressable>

                  {hasSubs ? (
                    <Pressable
                      onPress={() => {
                        triggerHaptic('light');
                        setExpandedCatId(isExpanded ? null : cat.id);
                      }}
                      style={[styles.expandBtn, { backgroundColor: theme.muted }]}
                    >
                      {isExpanded ? (
                        <ChevronDown size={16} color={theme.textSecondary} />
                      ) : (
                        <ChevronRight size={16} color={theme.textSecondary} />
                      )}
                    </Pressable>
                  ) : null}
                </View>

                {hasSubs && isExpanded ? (
                  <View style={styles.subsWrap}>
                    {cat.subcategories.map((sub: any) => {
                      const subSelected = selectedSubcategoryId === sub.id;
                      return (
                        <Pressable
                          key={sub.id}
                          onPress={() => handlePick(cat, sub.id)}
                          style={[
                            styles.subChip,
                            {
                              backgroundColor: subSelected ? catColor : theme.muted,
                              borderColor: subSelected ? catColor : theme.border,
                            },
                          ]}
                        >
                          <CategoryIcon
                            name={sub.icon || cat.icon}
                            size={13}
                            color={subSelected ? '#FFFFFF' : catColor}
                          />
                          <Text
                            style={{
                              color: subSelected ? '#FFFFFF' : theme.text,
                              fontFamily: theme.font('700'),
                              fontSize: theme.sp(12),
                            }}
                          >
                            {sub.name}
                          </Text>
                        </Pressable>
                      );
                    })}
                  </View>
                ) : null}
              </View>
            );
          })
        )}

        {!search.trim() && filtered.length > visibleLimit ? (
          <Pressable
            onPress={() => setVisibleLimit((n) => n + PAGE_STEP)}
            style={[
              styles.moreBtn,
              { backgroundColor: theme.brandSoft, borderColor: theme.border },
            ]}
          >
            <Text style={{ color: theme.brand, fontFamily: theme.font('800'), fontSize: theme.sp(12.5) }}>
              Mostrar {Math.min(PAGE_STEP, filtered.length - visibleLimit)} más ({filtered.length - visibleLimit} restantes)
            </Text>
          </Pressable>
        ) : null}
      </View>
    </PremiumBottomSheet>
  );
}

const styles = StyleSheet.create({
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderRadius: 16,
    borderWidth: 1,
    paddingHorizontal: 14,
    height: 44,
  },
  searchInput: {
    flex: 1,
    height: '100%',
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  recentRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  recentChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 99,
    borderWidth: 1,
  },
  catCard: {
    borderRadius: 18,
    borderWidth: 1,
    padding: 10,
    gap: 10,
  },
  catRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  catMain: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 11,
  },
  catIcon: {
    width: 38,
    height: 38,
    alignItems: 'center',
    justifyContent: 'center',
  },
  expandBtn: {
    width: 32,
    height: 32,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  subsWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 7,
    paddingTop: 2,
    paddingLeft: 4,
  },
  subChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 11,
    paddingVertical: 6,
    borderRadius: 99,
    borderWidth: 1,
  },
  footerRow: {
    flexDirection: 'row',
    gap: 10,
  },
  moreBtn: {
    alignItems: 'center',
    paddingVertical: 11,
    borderRadius: 14,
    borderWidth: 1,
  },
});
