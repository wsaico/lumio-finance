import React, { useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Calendar, ChevronLeft, ChevronRight } from 'lucide-react-native';
import { format, isToday, isYesterday } from 'date-fns';
import { es } from 'date-fns/locale';
import { useAppTheme } from '@/theme/ThemeProvider';
import { PremiumBottomSheet } from './PremiumBottomSheet';
import { PremiumButton } from './PremiumButton';
import { SegmentedControl } from './SegmentedControl';
import { IosWheelColumn } from './IosWheelPicker';
import { triggerHaptic } from '@/lib/haptics';

const WEEK_DAYS = ['Lu', 'Ma', 'Mi', 'Ju', 'Vi', 'Sa', 'Do'];
const MONTHS_ES = [
  { value: 0, label: 'Ene' },
  { value: 1, label: 'Feb' },
  { value: 2, label: 'Mar' },
  { value: 3, label: 'Abr' },
  { value: 4, label: 'May' },
  { value: 5, label: 'Jun' },
  { value: 6, label: 'Jul' },
  { value: 7, label: 'Ago' },
  { value: 8, label: 'Sep' },
  { value: 9, label: 'Oct' },
  { value: 10, label: 'Nov' },
  { value: 11, label: 'Dic' },
];

export function PremiumDatePicker({
  value,
  onChange,
  label = 'Fecha',
  variant = 'pill',
}: {
  value: Date;
  onChange: (date: Date) => void;
  label?: string;
  variant?: 'pill' | 'hero';
}) {
  const theme = useAppTheme();
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState<'wheel' | 'calendar'>('wheel');
  const safeVal = value instanceof Date && !Number.isNaN(value.getTime()) ? value : new Date();

  const [draftYear, setDraftYear] = useState(safeVal.getFullYear());
  const [draftMonth, setDraftMonth] = useState(safeVal.getMonth());
  const [draftDay, setDraftDay] = useState(safeVal.getDate());

  const openPicker = () => {
    setDraftYear(safeVal.getFullYear());
    setDraftMonth(safeVal.getMonth());
    setDraftDay(safeVal.getDate());
    setOpen(true);
  };

  const daysInDraftMonth = new Date(draftYear, draftMonth + 1, 0).getDate();
  const safeDay = Math.min(draftDay, daysInDraftMonth);

  const dayOptions = useMemo(
    () =>
      Array.from({ length: daysInDraftMonth }, (_, i) => ({
        value: i + 1,
        label: String(i + 1).padStart(2, '0'),
      })),
    [daysInDraftMonth]
  );

  const currentYear = new Date().getFullYear();
  const yearOptions = useMemo(
    () =>
      Array.from({ length: 12 }, (_, i) => {
        const y = currentYear - 5 + i;
        return { value: y, label: String(y) };
      }),
    [currentYear]
  );

  const calendarCells = useMemo(() => {
    const firstDay = new Date(draftYear, draftMonth, 1);
    const startOffset = (firstDay.getDay() + 6) % 7;
    const cells: (number | null)[] = [];
    for (let i = 0; i < startOffset; i++) cells.push(null);
    for (let d = 1; d <= daysInDraftMonth; d++) cells.push(d);
    while (cells.length % 7 !== 0) cells.push(null);
    return cells;
  }, [draftYear, draftMonth, daysInDraftMonth]);

  const monthTitle = format(new Date(draftYear, draftMonth, 1), 'MMMM yyyy', { locale: es });

  const shortDisplay = isToday(safeVal)
    ? 'Hoy'
    : isYesterday(safeVal)
      ? 'Ayer'
      : format(safeVal, "d 'de' MMM", { locale: es });

  const applyDraft = () => {
    triggerHaptic('success');
    const next = new Date(safeVal);
    next.setFullYear(draftYear, draftMonth, safeDay);
    onChange(next);
    setOpen(false);
  };

  const applyPreset = (offsetDays: number) => {
    triggerHaptic('selection');
    const target = new Date();
    target.setDate(target.getDate() + offsetDays);
    setDraftYear(target.getFullYear());
    setDraftMonth(target.getMonth());
    setDraftDay(target.getDate());
  };

  const shiftMonth = (delta: number) => {
    triggerHaptic('light');
    const d = new Date(draftYear, draftMonth + delta, 1);
    setDraftYear(d.getFullYear());
    setDraftMonth(d.getMonth());
  };

  return (
    <>
      <Pressable
        onPress={openPicker}
        style={[
          variant === 'hero' ? styles.heroTrigger : styles.pillTrigger,
          { backgroundColor: theme.muted, borderColor: theme.border },
        ]}
      >
        <View style={[styles.iconBox, { backgroundColor: theme.brandSoft }]}>
          <Calendar size={15} color={theme.brand} />
        </View>
        <View style={{ flex: 1, minWidth: 0 }}>
          {variant === 'hero' ? (
            <Text style={{ color: theme.textMuted, fontFamily: theme.font('700'), fontSize: theme.sp(10) }}>
              {label.toUpperCase()}
            </Text>
          ) : null}
          <Text
            numberOfLines={1}
            style={{
              color: theme.text,
              fontFamily: theme.font('700'),
              fontSize: theme.sp(13.5),
            }}
          >
            {shortDisplay}
          </Text>
        </View>
      </Pressable>

      <PremiumBottomSheet
        open={open}
        onClose={() => setOpen(false)}
        title="Seleccionar fecha"
        footer={<PremiumButton title="Confirmar fecha" onPress={applyDraft} />}
      >
        <View style={styles.sheetInner}>
          {/* Quick Date Pills */}
          <View style={styles.quickRow}>
            {[
              { label: 'Hoy', offset: 0 },
              { label: 'Ayer', offset: -1 },
              { label: 'Hace 2 días', offset: -2 },
            ].map((q) => (
              <Pressable
                key={q.label}
                onPress={() => applyPreset(q.offset)}
                style={[styles.quickChip, { backgroundColor: theme.muted, borderColor: theme.border }]}
              >
                <Text style={{ color: theme.textSecondary, fontFamily: theme.font('700'), fontSize: 12 }}>
                  {q.label}
                </Text>
              </Pressable>
            ))}
          </View>

          <SegmentedControl
            value={mode}
            onChange={setMode}
            options={[
              { id: 'wheel', label: 'Rueda iOS' },
              { id: 'calendar', label: 'Calendario' },
            ]}
          />

          {mode === 'wheel' ? (
            <View style={[styles.wheelsBox, { borderColor: theme.border }]}>
              <IosWheelColumn
                options={dayOptions}
                value={safeDay}
                onChange={(v) => setDraftDay(Number(v))}
                width={74}
              />
              <IosWheelColumn
                options={MONTHS_ES}
                value={draftMonth}
                onChange={(v) => setDraftMonth(Number(v))}
                flex={1}
              />
              <IosWheelColumn
                options={yearOptions}
                value={draftYear}
                onChange={(v) => setDraftYear(Number(v))}
                width={92}
              />
            </View>
          ) : (
            <View style={styles.calWrap}>
              <View style={styles.calHeader}>
                <Pressable
                  onPress={() => shiftMonth(-1)}
                  style={[styles.navBtn, { backgroundColor: theme.muted }]}
                >
                  <ChevronLeft size={18} color={theme.text} />
                </Pressable>
                <Text
                  style={{
                    color: theme.text,
                    fontFamily: theme.font('800'),
                    fontSize: theme.sp(15),
                    textTransform: 'capitalize',
                  }}
                >
                  {monthTitle}
                </Text>
                <Pressable
                  onPress={() => shiftMonth(1)}
                  style={[styles.navBtn, { backgroundColor: theme.muted }]}
                >
                  <ChevronRight size={18} color={theme.text} />
                </Pressable>
              </View>

              <View style={styles.weekRow}>
                {WEEK_DAYS.map((wd) => (
                  <Text
                    key={wd}
                    style={[
                      styles.weekLabel,
                      { color: theme.textMuted, fontFamily: theme.font('700') },
                    ]}
                  >
                    {wd}
                  </Text>
                ))}
              </View>

              <View style={styles.daysGrid}>
                {calendarCells.map((day, idx) => {
                  if (day === null) {
                    return <View key={`empty-${idx}`} style={styles.dayCell} />;
                  }
                  const active = day === safeDay;
                  return (
                    <Pressable
                      key={`day-${day}`}
                      onPress={() => {
                        triggerHaptic('selection');
                        setDraftDay(day);
                      }}
                      style={[
                        styles.dayCell,
                        active && { backgroundColor: theme.brand, borderRadius: 14 },
                      ]}
                    >
                      <Text
                        style={{
                          color: active ? '#FFFFFF' : theme.text,
                          fontFamily: theme.font(active ? '800' : '600'),
                          fontSize: 14,
                          fontVariant: ['tabular-nums'],
                        }}
                      >
                        {day}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
            </View>
          )}
        </View>
      </PremiumBottomSheet>
    </>
  );
}

const styles = StyleSheet.create({
  heroTrigger: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    padding: 12,
    borderRadius: 16,
    borderWidth: 1,
  },
  pillTrigger: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 14,
    borderWidth: 1,
  },
  iconBox: {
    width: 34,
    height: 34,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sheetInner: {
    gap: 12,
    paddingBottom: 6,
  },
  quickRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
  },
  quickChip: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 999,
    borderWidth: 1,
  },
  wheelsBox: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 20,
    borderWidth: 1,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  calWrap: { gap: 10 },
  calHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  navBtn: {
    width: 36,
    height: 36,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  weekRow: { flexDirection: 'row' },
  weekLabel: { flex: 1, textAlign: 'center', fontSize: 11.5 },
  daysGrid: { flexDirection: 'row', flexWrap: 'wrap' },
  dayCell: {
    width: '14.285%',
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
