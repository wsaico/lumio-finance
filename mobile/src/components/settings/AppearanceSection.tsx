import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import {
  Check,
  Contrast,
  Hand,
  Layers,
  Moon,
  Palette,
  Sparkles,
  Sun,
  Type,
  Zap,
} from 'lucide-react-native';
import { useAppTheme } from '@/theme/ThemeProvider';
import { PremiumCard } from '@/components/ui/PremiumCard';
import { SettingsGroup, SettingsRow, SettingsSwitch } from './SettingsShared';
import { useSettingsStore, type IconStyle, type MotionMode, type ProgressBarStyle, type ThemeMode } from '@/stores/settings-store';
import { ACCENT_COLORS, FONT_OPTIONS } from '@/lib/appearance';
import { alphaHex } from '@/lib/color-math';
import { triggerHaptic } from '@/lib/haptics';

const SCALES = [90, 95, 100, 105, 110, 115];

export function AppearanceSection() {
  const theme = useAppTheme();
  const store = useSettingsStore();

  return (
    <View style={{ gap: 18 }}>
      <SettingsGroup title="Tema de interfaz">
        <View style={styles.padded}>
          <View style={styles.pillRow}>
            {([
              { id: 'system', label: 'Sistema', Icon: Layers },
              { id: 'light', label: 'Claro', Icon: Sun },
              { id: 'dark', label: 'Oscuro OLED', Icon: Moon },
            ] as { id: ThemeMode; label: string; Icon: typeof Sun }[]).map((t) => {
              const active = store.themeMode === t.id;
              const Icon = t.Icon;
              return (
                <Pressable
                  key={t.id}
                  onPress={() => {
                    triggerHaptic('selection');
                    store.setThemeMode(t.id);
                  }}
                  style={[
                    styles.choiceBtn,
                    {
                      backgroundColor: active ? theme.brand : theme.muted,
                      borderColor: active ? theme.brand : theme.border,
                    },
                  ]}
                >
                  <Icon size={15} color={active ? '#FFFFFF' : theme.textSecondary} />
                  <Text style={{ color: active ? '#FFFFFF' : theme.text, fontFamily: theme.font('700'), fontSize: theme.sp(12.5) }}>
                    {t.label}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </View>
      </SettingsGroup>

      <SettingsGroup title="Color de acento 2027">
        <View style={styles.padded}>
          <View style={styles.swatchRow}>
            {ACCENT_COLORS.map((c) => {
              const active = store.accentColor.toLowerCase() === c.value.toLowerCase();
              return (
                <Pressable
                  key={c.value}
                  onPress={() => {
                    triggerHaptic('selection');
                    store.setAccentColor(c.value, true);
                  }}
                  style={styles.swatchWrap}
                >
                  <View
                    style={[
                      styles.swatch,
                      {
                        backgroundColor: c.value,
                        borderColor: active ? theme.text : 'transparent',
                        transform: [{ scale: active ? 1.1 : 1 }],
                      },
                    ]}
                  >
                    {active ? <Check size={15} color="#FFFFFF" strokeWidth={3} /> : null}
                  </View>
                </Pressable>
              );
            })}
          </View>
        </View>
        <SettingsRow
          Icon={Palette}
          title="Material You"
          description="Tiñe sutilmente superficies y bordes con el color elegido"
          right={<SettingsSwitch value={store.materialYou} onValueChange={store.setMaterialYou} />}
        />
        <SettingsRow
          Icon={Contrast}
          title="Modo de alto contraste"
          description="Mayor nitidez en textos y separadores"
          right={<SettingsSwitch value={store.highContrast} onValueChange={store.setHighContrast} />}
          isLast
        />
      </SettingsGroup>

      <SettingsGroup title="Estilo visual e interacción">
        <View style={styles.padded}>
          <Text style={[styles.subLabel, { color: theme.textSecondary, fontFamily: theme.font('700'), fontSize: theme.sp(12) }]}>
            Forma de íconos
          </Text>
          <View style={styles.pillRow}>
            {([
              { id: 'rounded', label: 'Redondeado' },
              { id: 'soft', label: 'Suave' },
              { id: 'circle', label: 'Circular' },
            ] as { id: IconStyle; label: string }[]).map((opt) => {
              const active = store.iconStyle === opt.id;
              return (
                <Pressable
                  key={opt.id}
                  onPress={() => store.setIconStyle(opt.id)}
                  style={[styles.choiceBtn, { backgroundColor: active ? alphaHex(theme.brand, 0.14) : theme.muted, borderColor: active ? theme.brand : theme.border }]}
                >
                  <Text style={{ color: active ? theme.brand : theme.text, fontFamily: theme.font('700'), fontSize: 12 }}>
                    {opt.label}
                  </Text>
                </Pressable>
              );
            })}
          </View>

          <Text style={[styles.subLabel, { color: theme.textSecondary, fontFamily: theme.font('700'), fontSize: theme.sp(12), marginTop: 12 }]}>
            Barras de progreso
          </Text>
          <View style={styles.pillRow}>
            {([
              { id: 'gradient', label: 'Degradado' },
              { id: 'simple', label: 'Simple' },
              { id: 'segmented', label: 'Segmentada' },
            ] as { id: ProgressBarStyle; label: string }[]).map((opt) => {
              const active = store.progressBarStyle === opt.id;
              return (
                <Pressable
                  key={opt.id}
                  onPress={() => store.setProgressBarStyle(opt.id)}
                  style={[styles.choiceBtn, { backgroundColor: active ? alphaHex(theme.coral, 0.15) : theme.muted, borderColor: active ? theme.coral : theme.border }]}
                >
                  <Text style={{ color: active ? theme.coral : theme.text, fontFamily: theme.font('700'), fontSize: 12 }}>
                    {opt.label}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </View>

        <SettingsRow
          Icon={Sparkles}
          title="Densidad de lista compacta"
          description="Muestra más movimientos por pantalla"
          right={
            <SettingsSwitch
              value={store.txListDensity === 'compact'}
              onValueChange={(v) => store.setTxListDensity(v ? 'compact' : 'comfortable')}
            />
          }
        />
        <SettingsRow
          Icon={Hand}
          title="Modo zurdo"
          description="Invierte los accesos principales en la barra inferior"
          right={
            <SettingsSwitch
              value={store.leftHandedMode}
              onValueChange={store.setLeftHandedMode}
            />
          }
          isLast
        />
      </SettingsGroup>

      <SettingsGroup title="Tipografía y movimiento">
        <View style={styles.padded}>
          <View style={styles.fontHeader}>
            <Type size={15} color={theme.brand} />
            <Text style={{ color: theme.text, fontFamily: theme.font('700'), fontSize: theme.sp(13) }}>
              Familia tipográfica
            </Text>
          </View>
          <View style={{ gap: 8, marginTop: 8 }}>
            {FONT_OPTIONS.map((f) => {
              const active = store.fontFamily === f.name;
              return (
                <Pressable
                  key={f.name}
                  onPress={() => store.setFontFamily(f.name)}
                  style={[
                    styles.fontRow,
                    { backgroundColor: active ? alphaHex(theme.brand, 0.12) : theme.muted, borderColor: active ? theme.brand : theme.border },
                  ]}
                >
                  <View style={{ flex: 1 }}>
                    <Text style={{ color: theme.text, fontFamily: theme.font('700'), fontSize: 14 }}>
                      {f.name}
                    </Text>
                    <Text style={{ color: theme.textMuted, fontSize: 11.5 }}>{f.description}</Text>
                  </View>
                  {active ? <Check size={16} color={theme.brand} /> : null}
                </Pressable>
              );
            })}
          </View>

          <Text style={[styles.subLabel, { color: theme.textSecondary, fontFamily: theme.font('700'), fontSize: theme.sp(12), marginTop: 14 }]}>
            Tamaño de texto ({store.fontScale}%)
          </Text>
          <View style={styles.scaleRow}>
            {SCALES.map((s) => {
              const active = store.fontScale === s;
              return (
                <Pressable
                  key={s}
                  onPress={() => store.setFontScale(s)}
                  style={[
                    styles.scaleChip,
                    { backgroundColor: active ? theme.brand : theme.muted, borderColor: active ? theme.brand : theme.border },
                  ]}
                >
                  <Text style={{ color: active ? '#FFFFFF' : theme.text, fontFamily: theme.font('700'), fontSize: 11.5 }}>
                    {s}%
                  </Text>
                </Pressable>
              );
            })}
          </View>

          <Text style={[styles.subLabel, { color: theme.textSecondary, fontFamily: theme.font('700'), fontSize: theme.sp(12), marginTop: 14 }]}>
            Animaciones
          </Text>
          <View style={styles.pillRow}>
            {([
              { id: 'full', label: 'Completas' },
              { id: 'reduced', label: 'Reducidas' },
              { id: 'none', label: 'Sin animar' },
            ] as { id: MotionMode; label: string }[]).map((m) => {
              const active = store.motionMode === m.id;
              return (
                <Pressable
                  key={m.id}
                  onPress={() => store.setMotionMode(m.id)}
                  style={[styles.choiceBtn, { backgroundColor: active ? theme.brand : theme.muted, borderColor: active ? theme.brand : theme.border }]}
                >
                  <Zap size={13} color={active ? '#FFFFFF' : theme.textMuted} />
                  <Text style={{ color: active ? '#FFFFFF' : theme.text, fontFamily: theme.font('700'), fontSize: 11.5 }}>
                    {m.label}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </View>
      </SettingsGroup>

      <PremiumCard padding={14} variant="muted">
        <Text style={{ color: theme.textSecondary, fontFamily: theme.font('600'), fontSize: theme.sp(12) }}>
          Todos los cambios visuales se aplican de inmediato en gráficos, tarjetas y botones.
        </Text>
      </PremiumCard>
    </View>
  );
}

const styles = StyleSheet.create({
  padded: { padding: 14 },
  pillRow: { flexDirection: 'row', gap: 8 },
  choiceBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 10, borderRadius: 14, borderWidth: 1 },
  swatchRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  swatchWrap: { alignItems: 'center' },
  swatch: { width: 36, height: 36, borderRadius: 18, borderWidth: 2.5, alignItems: 'center', justifyContent: 'center' },
  subLabel: { marginBottom: 6 },
  fontHeader: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  fontRow: { flexDirection: 'row', alignItems: 'center', padding: 12, borderRadius: 14, borderWidth: 1 },
  scaleRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  scaleChip: { paddingHorizontal: 11, paddingVertical: 7, borderRadius: 10, borderWidth: 1 },
});
