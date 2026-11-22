import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import {
  Camera,
  CheckCircle2,
  Paperclip,
  PiggyBank,
  PieChart,
  Repeat,
  Sparkles,
  Zap,
} from 'lucide-react-native';
import { useAppTheme } from '@/theme/ThemeProvider';
import { SettingsGroup, SettingsRow, SettingsSwitch } from './SettingsShared';
import {
  useSettingsStore,
  type ConfirmAmountMode,
  type NewTxInitialEntry,
} from '@/stores/settings-store';
import { alphaHex } from '@/lib/color-math';

export function TransactionsSection() {
  const theme = useAppTheme();
  const store = useSettingsStore();

  return (
    <View style={{ gap: 18 }}>
      <SettingsGroup title="Registro rápido y autocompletado">
        <View style={styles.padded}>
          <Text style={{ color: theme.textSecondary, fontFamily: theme.font('700'), fontSize: theme.sp(12), marginBottom: 8 }}>
            Al presionar el botón + iniciar en:
          </Text>
          <View style={styles.chipWrap}>
            {([
              { id: 'express_title', label: 'Título guiado' },
              { id: 'express_amount', label: 'Teclado monto' },
              { id: 'express_category', label: 'Categoría' },
              { id: 'full_form', label: 'Formulario completo' },
            ] as { id: NewTxInitialEntry; label: string }[]).map((opt) => {
              const active = store.newTxInitialEntry === opt.id;
              return (
                <Pressable
                  key={opt.id}
                  onPress={() => store.setNewTxInitialEntry(opt.id)}
                  style={[
                    styles.pill,
                    { backgroundColor: active ? theme.brand : theme.muted, borderColor: active ? theme.brand : theme.border },
                  ]}
                >
                  <Zap size={12} color={active ? '#FFFFFF' : theme.textMuted} />
                  <Text style={{ color: active ? '#FFFFFF' : theme.text, fontFamily: theme.font('700'), fontSize: 12 }}>
                    {opt.label}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </View>

        <SettingsRow
          Icon={Sparkles}
          title="Sugerir títulos y categorías"
          description="Predice automáticamente según tu historial"
          right={
            <SettingsSwitch
              value={store.autoSuggestTitles}
              onValueChange={store.setAutoSuggestTitles}
            />
          }
        />
        <SettingsRow
          Icon={Paperclip}
          title="Botón de adjuntos visible"
          description="Muestra selector de comprobantes en el editor"
          right={
            <SettingsSwitch
              value={store.showAttachmentsButton}
              onValueChange={store.setShowAttachmentsButton}
            />
          }
        />
        <SettingsRow
          Icon={Camera}
          title="Escáner inteligente con IA"
          description="Extrae comercio, fecha y monto de tus boletas con Gemini"
          right={
            <SettingsSwitch
              value={store.enableAIReceiptScanning}
              onValueChange={store.setEnableAIReceiptScanning}
            />
          }
          isLast
        />
      </SettingsGroup>

      <SettingsGroup title="Recurrentes y validaciones">
        <SettingsRow
          Icon={Repeat}
          title="Pago automático por defecto"
          description="Activa ejecución automática al programar suscripciones"
          right={
            <SettingsSwitch
              value={store.defaultAutoPayRecurring}
              onValueChange={store.setDefaultAutoPayRecurring}
            />
          }
        />
        <SettingsRow
          Icon={CheckCircle2}
          title="Fecha al confirmar pago manual"
          description={store.manualPayDateMode === 'today' ? 'Usar fecha de hoy' : 'Usar fecha programada'}
          onPress={() =>
            store.setManualPayDateMode(
              store.manualPayDateMode === 'today' ? 'scheduled' : 'today'
            )
          }
          right={
            <View style={[styles.badge, { backgroundColor: theme.brandSoft }]}>
              <Text style={{ color: theme.brand, fontFamily: theme.font('800'), fontSize: 11.5 }}>
                {store.manualPayDateMode === 'today' ? 'Hoy' : 'Programada'}
              </Text>
            </View>
          }
        />
        <View style={[styles.padded, { borderTopWidth: 1, borderTopColor: theme.border }]}>
          <Text style={{ color: theme.textSecondary, fontFamily: theme.font('700'), fontSize: theme.sp(12), marginBottom: 8 }}>
            Confirmar monto antes de guardar
          </Text>
          <View style={styles.chipWrap}>
            {([
              { id: 'if_zero', label: 'Si es cero' },
              { id: 'always', label: 'Siempre' },
              { id: 'never', label: 'Nunca' },
            ] as { id: ConfirmAmountMode; label: string }[]).map((opt) => {
              const active = store.confirmAmountMode === opt.id;
              return (
                <Pressable
                  key={opt.id}
                  onPress={() => store.setConfirmAmountMode(opt.id)}
                  style={[
                    styles.pill,
                    { backgroundColor: active ? alphaHex(theme.coral, 0.16) : theme.muted, borderColor: active ? theme.coral : theme.border },
                  ]}
                >
                  <Text style={{ color: active ? theme.coral : theme.text, fontFamily: theme.font('700'), fontSize: 12 }}>
                    {opt.label}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </View>
      </SettingsGroup>

      <SettingsGroup title="Visualización de presupuestos y metas">
        <SettingsRow
          Icon={PieChart}
          title="Texto total de presupuestos"
          description={
            store.budgetTotalType === 'remaining'
              ? 'Mostrar saldo disponible restante'
              : store.budgetTotalType === 'spent'
                ? 'Mostrar monto gastado'
                : 'Mostrar porcentaje utilizado'
          }
          onPress={() =>
            store.setBudgetTotalType(
              store.budgetTotalType === 'remaining' ? 'spent' : 'remaining'
            )
          }
          right={
            <View style={[styles.badge, { backgroundColor: theme.brandSoft }]}>
              <Text style={{ color: theme.brand, fontFamily: theme.font('800'), fontSize: 11.5 }}>
                {store.budgetTotalType === 'remaining' ? 'Restante' : 'Gastado'}
              </Text>
            </View>
          }
        />
        <SettingsRow
          Icon={PiggyBank}
          title="Texto total de metas"
          description={
            store.goalTotalType === 'remaining'
              ? 'Mostrar cuánto falta por ahorrar'
              : 'Mostrar monto ahorrado acumulado'
          }
          onPress={() =>
            store.setGoalTotalType(
              store.goalTotalType === 'remaining' ? 'saved' : 'remaining'
            )
          }
          right={
            <View style={[styles.badge, { backgroundColor: theme.brandSoft }]}>
              <Text style={{ color: theme.brand, fontFamily: theme.font('800'), fontSize: 11.5 }}>
                {store.goalTotalType === 'remaining' ? 'Restante' : 'Ahorrado'}
              </Text>
            </View>
          }
          isLast
        />
      </SettingsGroup>
    </View>
  );
}

const styles = StyleSheet.create({
  padded: { padding: 14 },
  chipWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  pill: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 11, paddingVertical: 8, borderRadius: 12, borderWidth: 1 },
  badge: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 10 },
});
