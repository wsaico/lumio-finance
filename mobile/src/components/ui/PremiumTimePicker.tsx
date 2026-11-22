import React, { useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Clock } from 'lucide-react-native';
import { format } from 'date-fns';
import { useAppTheme } from '@/theme/ThemeProvider';
import { PremiumBottomSheet } from './PremiumBottomSheet';
import { PremiumButton } from './PremiumButton';
import { IosWheelColumn } from './IosWheelPicker';
import { alphaHex } from '@/lib/color-math';
import { triggerHaptic } from '@/lib/haptics';

const HOURS_12 = Array.from({ length: 12 }, (_, i) => ({
  value: i + 1,
  label: String(i + 1).padStart(2, '0'),
}));

const MINUTES_60 = Array.from({ length: 60 }, (_, i) => ({
  value: i,
  label: String(i).padStart(2, '0'),
}));

const PERIODS = [
  { value: 'AM', label: 'AM' },
  { value: 'PM', label: 'PM' },
];

function to12Hour(h24: number): { hour12: number; period: 'AM' | 'PM' } {
  const period: 'AM' | 'PM' = h24 >= 12 ? 'PM' : 'AM';
  const mod = h24 % 12;
  return { hour12: mod === 0 ? 12 : mod, period };
}

function to24Hour(hour12: number, period: 'AM' | 'PM'): number {
  if (period === 'AM') return hour12 === 12 ? 0 : hour12;
  return hour12 === 12 ? 12 : hour12 + 12;
}

export function PremiumTimePicker({
  value,
  onChange,
  label = 'Hora',
}: {
  value: Date;
  onChange: (date: Date) => void;
  label?: string;
}) {
  const theme = useAppTheme();
  const safeVal = value instanceof Date && !Number.isNaN(value.getTime()) ? value : new Date();
  const initial12 = to12Hour(safeVal.getHours());

  const [open, setOpen] = useState(false);
  const [hour12, setHour12] = useState(initial12.hour12);
  const [minute, setMinute] = useState(safeVal.getMinutes());
  const [period, setPeriod] = useState<'AM' | 'PM'>(initial12.period);

  const openPicker = () => {
    const cur = to12Hour(safeVal.getHours());
    setHour12(cur.hour12);
    setMinute(safeVal.getMinutes());
    setPeriod(cur.period);
    setOpen(true);
  };

  const setFromDate = (d: Date) => {
    triggerHaptic('selection');
    const c = to12Hour(d.getHours());
    setHour12(c.hour12);
    setMinute(d.getMinutes());
    setPeriod(c.period);
  };

  const applyTime = () => {
    triggerHaptic('success');
    const next = new Date(safeVal);
    next.setHours(to24Hour(hour12, period), minute, 0, 0);
    onChange(next);
    setOpen(false);
  };

  const displayTrigger = useMemo(() => format(safeVal, 'hh:mm a'), [safeVal]);

  return (
    <>
      <Pressable
        onPress={openPicker}
        style={[
          styles.trigger,
          { backgroundColor: theme.muted, borderColor: theme.border },
        ]}
      >
        <View style={[styles.iconBox, { backgroundColor: theme.brandSoft }]}>
          <Clock size={15} color={theme.brand} />
        </View>
        <View style={{ flex: 1, minWidth: 0 }}>
          <Text style={{ color: theme.textMuted, fontFamily: theme.font('700'), fontSize: theme.sp(10) }}>
            {label.toUpperCase()}
          </Text>
          <Text
            numberOfLines={1}
            style={{
              color: theme.text,
              fontFamily: theme.font('700'),
              fontSize: theme.sp(13.5),
              fontVariant: ['tabular-nums'],
            }}
          >
            {displayTrigger}
          </Text>
        </View>
      </Pressable>

      <PremiumBottomSheet
        open={open}
        onClose={() => setOpen(false)}
        title="Hora del movimiento"
        footer={<PremiumButton title="Confirmar hora" variant="primary" onPress={applyTime} />}
      >
        <View style={styles.sheetInner}>
          {/* Live digital readout */}
          <View style={[styles.readout, { backgroundColor: alphaHex(theme.brand, 0.08) }]}>
            <Text
              style={{
                color: theme.brand,
                fontFamily: theme.font('800'),
                fontSize: theme.sp(28),
                fontVariant: ['tabular-nums'],
                letterSpacing: 0.5,
              }}
            >
              {`${String(hour12).padStart(2, '0')}:${String(minute).padStart(2, '0')} ${period}`}
            </Text>
          </View>

          {/* Quick presets */}
          <View style={styles.quickRow}>
            {[
              { label: 'Ahora', offsetMin: 0 },
              { label: 'Hace 15 min', offsetMin: -15 },
              { label: 'Hace 1 hora', offsetMin: -60 },
            ].map((q) => (
              <Pressable
                key={q.label}
                onPress={() => {
                  const d = new Date(Date.now() + q.offsetMin * 60_000);
                  setFromDate(d);
                }}
                style={[styles.quickChip, { backgroundColor: theme.muted, borderColor: theme.border }]}
              >
                <Text style={{ color: theme.textSecondary, fontFamily: theme.font('700'), fontSize: 12 }}>
                  {q.label}
                </Text>
              </Pressable>
            ))}
          </View>

          {/* iPhone-style 3-column Drum Wheel */}
          <View style={[styles.wheelsBox, { borderColor: theme.border }]}>
            <IosWheelColumn
              options={HOURS_12}
              value={hour12}
              onChange={(v) => setHour12(Number(v))}
              flex={1}
            />
            <Text
              style={{
                color: theme.brand,
                fontFamily: theme.font('800'),
                fontSize: 22,
                paddingHorizontal: 2,
              }}
            >
              :
            </Text>
            <IosWheelColumn
              options={MINUTES_60}
              value={minute}
              onChange={(v) => setMinute(Number(v))}
              flex={1}
            />
            <IosWheelColumn
              options={PERIODS}
              value={period}
              onChange={(v) => setPeriod(v as 'AM' | 'PM')}
              width={78}
            />
          </View>
        </View>
      </PremiumBottomSheet>
    </>
  );
}

const styles = StyleSheet.create({
  trigger: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    padding: 12,
    borderRadius: 16,
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
    gap: 14,
    paddingBottom: 6,
  },
  readout: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: 18,
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
});
