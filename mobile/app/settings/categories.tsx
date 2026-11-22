import React, { useState } from 'react';
import {
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { Check, Edit3, Plus, Tag, Trash2 } from 'lucide-react-native';
import { useAppTheme } from '@/theme/ThemeProvider';
import { TopAppHeader } from '@/components/navigation/TopAppHeader';
import { PremiumCard } from '@/components/ui/PremiumCard';
import { SegmentedControl } from '@/components/ui/SegmentedControl';
import { CategoryIcon, PICKABLE_ICON_NAMES } from '@/components/ui/CategoryIcon';
import { PremiumBottomSheet } from '@/components/ui/PremiumBottomSheet';
import { PremiumButton } from '@/components/ui/PremiumButton';
import { ConfirmAlertModal } from '@/components/alerts/ConfirmAlertModal';
import { ShimmerSkeleton } from '@/components/ui/ShimmerSkeleton';
import { useCategories } from '@/hooks/useCategories';
import { useTags, type UserTag } from '@/hooks/useTags';
import { alphaHex } from '@/lib/color-math';
import { triggerHaptic } from '@/lib/haptics';
import { showAppToast } from '@/stores/toast-store';

const COLORS = [
  '#5B35D5',
  '#FF7A33',
  '#10B981',
  '#0EA5E9',
  '#EC4899',
  '#F59E0B',
  '#6366F1',
  '#F43F5E',
];

export default function CategoriesAndTagsScreen() {
  const theme = useAppTheme();
  const {
    expense,
    income,
    isLoading,
    refetch,
    createCategory,
    updateCategory,
    deleteCategory,
  } = useCategories();
  const { tags, isLoading: tagsLoading, createTag, updateTag, deleteTag } = useTags();

  const [tab, setTab] = useState<'EXPENSE' | 'INCOME' | 'TAGS'>('EXPENSE');
  const [modalOpen, setModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<any>(null);
  const [deleteTarget, setDeleteTarget] = useState<any>(null);

  const [name, setName] = useState('');
  const [color, setColor] = useState('#5B35D5');
  const [icon, setIcon] = useState('tags');

  const openCreate = () => {
    setEditingItem(null);
    setName('');
    setColor(tab === 'INCOME' ? '#10B981' : '#5B35D5');
    setIcon(tab === 'INCOME' ? 'wallet' : 'shopping-bag');
    setModalOpen(true);
  };

  const openEdit = (item: any) => {
    setEditingItem(item);
    setName(item.name || '');
    setColor(item.color || '#5B35D5');
    setIcon(item.icon || 'tags');
    setModalOpen(true);
  };

  const handleSave = async () => {
    if (!name.trim()) {
      showAppToast.warning({ title: 'Ingresa un nombre válido' });
      return;
    }

    if (tab === 'TAGS') {
      if (editingItem?.id) {
        await updateTag.mutateAsync({ id: editingItem.id, name: name.trim(), color });
      } else {
        await createTag.mutateAsync({ name: name.trim(), color });
      }
    } else {
      const payload = {
        name: name.trim(),
        type: tab,
        color,
        icon,
      };
      if (editingItem?.id) {
        await updateCategory.mutateAsync({ id: editingItem.id, ...payload });
      } else {
        await createCategory.mutateAsync(payload);
      }
    }
    setModalOpen(false);
  };

  const activeList = tab === 'EXPENSE' ? expense : tab === 'INCOME' ? income : tags;
  const isBusy =
    createCategory.isPending ||
    updateCategory.isPending ||
    createTag.isPending ||
    updateTag.isPending;

  return (
    <View style={[styles.screen, { backgroundColor: theme.bg }]}>
      <TopAppHeader
        title="Categorías y Etiquetas"
        subtitle="Organiza tus movimientos"
        showBack
        rightSlot={
          <Pressable
            onPress={() => {
              triggerHaptic('medium');
              openCreate();
            }}
            style={[styles.addBtn, { backgroundColor: theme.coral }]}
          >
            <Plus size={18} color="#FFFFFF" strokeWidth={2.5} />
          </Pressable>
        }
      />

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scroll}
        refreshControl={
          <RefreshControl
            refreshing={isLoading || tagsLoading}
            onRefresh={() => {
              void refetch();
            }}
            tintColor={theme.brand}
          />
        }
      >
        <SegmentedControl
          value={tab}
          onChange={(v) => setTab(v)}
          options={[
            { id: 'EXPENSE', label: `Gastos (${expense.length})` },
            { id: 'INCOME', label: `Ingresos (${income.length})` },
            { id: 'TAGS', label: `Etiquetas (${tags.length})` },
          ]}
        />

        {isLoading || tagsLoading ? (
          <View style={{ gap: 10 }}>
            <ShimmerSkeleton height={68} borderRadius={20} />
            <ShimmerSkeleton height={68} borderRadius={20} />
          </View>
        ) : (
          <View style={{ gap: 10 }}>
            {activeList.map((item: any) => {
              const itemColor = item.color || theme.brand;
              return (
                <PremiumCard key={item.id} padding={14} style={styles.rowCard}>
                  <View
                    style={[
                      styles.iconWrap,
                      {
                        backgroundColor: alphaHex(itemColor, 0.14),
                        borderRadius: theme.iconRadius,
                      },
                    ]}
                  >
                    {tab === 'TAGS' ? (
                      <Tag size={18} color={itemColor} />
                    ) : (
                      <CategoryIcon name={item.icon} size={19} color={itemColor} />
                    )}
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={{ color: theme.text, fontFamily: theme.font('800'), fontSize: theme.sp(14.5) }}>
                      {item.name}
                    </Text>
                    <Text style={{ color: theme.textMuted, fontFamily: theme.font('500'), fontSize: 11.5 }}>
                      {tab === 'TAGS'
                        ? 'Etiqueta personal'
                        : item.subcategories?.length
                          ? `${item.subcategories.length} subcategorías`
                          : item.isSystem
                            ? 'Predefinida · Editable'
                            : 'Personalizada'}
                    </Text>
                  </View>

                  <Pressable
                    onPress={() => openEdit(item)}
                    style={[styles.miniBtn, { backgroundColor: theme.muted }]}
                  >
                    <Edit3 size={14} color={theme.textSecondary} />
                  </Pressable>
                  <Pressable
                    onPress={() => setDeleteTarget(item)}
                    style={[styles.miniBtn, { backgroundColor: alphaHex(theme.expense, 0.12) }]}
                  >
                    <Trash2 size={14} color={theme.expense} />
                  </Pressable>
                </PremiumCard>
              );
            })}
          </View>
        )}
      </ScrollView>

      <PremiumBottomSheet
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={
          editingItem
            ? tab === 'TAGS'
              ? 'Editar etiqueta'
              : 'Editar categoría'
            : tab === 'TAGS'
              ? 'Nueva etiqueta'
              : tab === 'INCOME'
                ? 'Nueva categoría de ingreso'
                : 'Nueva categoría de gasto'
        }
        footer={
          <View style={styles.sheetFoot}>
            <PremiumButton title="Cancelar" variant="outline" onPress={() => setModalOpen(false)} style={{ flex: 1 }} />
            <PremiumButton title="Guardar" variant="coral" loading={isBusy} onPress={handleSave} style={{ flex: 1.4 }} />
          </View>
        }
      >
        <View style={styles.modalBody}>
          <View>
            <Text style={[styles.label, { color: theme.textSecondary, fontFamily: theme.font('700'), fontSize: theme.sp(12) }]}>
              Nombre
            </Text>
            <TextInput
              value={name}
              onChangeText={setName}
              placeholder={tab === 'TAGS' ? 'Ej. Reembolsable, Viaje 2027' : 'Ej. Mascotas, Cafetería'}
              placeholderTextColor={theme.textMuted}
              style={[styles.input, { backgroundColor: theme.muted, borderColor: theme.border, color: theme.text, fontFamily: theme.font('600') }]}
            />
          </View>

          <View>
            <Text style={[styles.label, { color: theme.textSecondary, fontFamily: theme.font('700'), fontSize: theme.sp(12) }]}>
              Color
            </Text>
            <View style={styles.swatchRow}>
              {COLORS.map((hex) => {
                const active = color.toLowerCase() === hex.toLowerCase();
                return (
                  <Pressable
                    key={hex}
                    onPress={() => setColor(hex)}
                    style={[styles.swatch, { backgroundColor: hex, borderColor: active ? theme.text : 'transparent' }]}
                  >
                    {active ? <Check size={14} color="#FFFFFF" strokeWidth={3} /> : null}
                  </Pressable>
                );
              })}
            </View>
          </View>

          {tab !== 'TAGS' && (
            <View>
              <Text style={[styles.label, { color: theme.textSecondary, fontFamily: theme.font('700'), fontSize: theme.sp(12) }]}>
                Ícono profesional
              </Text>
              <View style={styles.iconGrid}>
                {PICKABLE_ICON_NAMES.slice(0, 48).map((iconName) => {
                  const active = icon === iconName;
                  return (
                    <Pressable
                      key={iconName}
                      onPress={() => {
                        triggerHaptic('selection');
                        setIcon(iconName);
                      }}
                      style={[
                        styles.iconChoice,
                        {
                          backgroundColor: active ? alphaHex(color, 0.16) : theme.muted,
                          borderColor: active ? color : theme.border,
                          borderRadius: theme.iconRadius,
                        },
                      ]}
                    >
                      <CategoryIcon name={iconName} size={18} color={active ? color : theme.textSecondary} />
                    </Pressable>
                  );
                })}
              </View>
            </View>
          )}
        </View>
      </PremiumBottomSheet>

      <ConfirmAlertModal
        open={Boolean(deleteTarget)}
        onOpenChange={(v) => !v && setDeleteTarget(null)}
        variant="danger"
        title={tab === 'TAGS' ? 'Eliminar etiqueta' : 'Eliminar categoría'}
        description={
          deleteTarget ? `¿Deseas eliminar "${deleteTarget.name}"?` : ''
        }
        confirmLabel="Eliminar"
        isLoading={deleteCategory.isPending || deleteTag.isPending}
        onConfirm={async () => {
          if (!deleteTarget) return;
          if (tab === 'TAGS') await deleteTag.mutateAsync((deleteTarget as UserTag).id);
          else await deleteCategory.mutateAsync(deleteTarget.id);
          setDeleteTarget(null);
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  scroll: { padding: 16, gap: 14, paddingBottom: 42 },
  addBtn: { width: 38, height: 38, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  rowCard: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  iconWrap: { width: 42, height: 42, alignItems: 'center', justifyContent: 'center' },
  miniBtn: { width: 32, height: 32, borderRadius: 11, alignItems: 'center', justifyContent: 'center' },
  sheetFoot: { flexDirection: 'row', gap: 10 },
  modalBody: { gap: 14, paddingBottom: 12 },
  label: { marginBottom: 6 },
  input: { borderWidth: 1, borderRadius: 16, paddingHorizontal: 14, paddingVertical: 12, fontSize: 15 },
  swatchRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  swatch: { width: 32, height: 32, borderRadius: 16, borderWidth: 2, alignItems: 'center', justifyContent: 'center' },
  iconGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  iconChoice: { width: 44, height: 44, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
});
