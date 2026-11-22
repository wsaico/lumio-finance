import React, { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useAppTheme } from '@/theme/ThemeProvider';
import { triggerHaptic } from '@/lib/haptics';

export interface GroupedBarItem {
  label: string;
  cost: number;
  budget: number;
}

export function GroupedBudgetBarChart({
  data,
  costLabel = 'Gasto',
  budgetLabel = 'Presupuesto',
  costColor,
  budgetColor,
  formatValue,
  height = 148,
}: {
  data: GroupedBarItem[];
  costLabel?: string;
  budgetLabel?: string;
  costColor?: string;
  budgetColor?: string;
  formatValue?: (n: number) => string;
  height?: number;
}) {
  const theme = useAppTheme();
  const [selectedIdx, setSelectedIdx] = useState<number>(Math.max(0, data.length - 1));
  const cColor = costColor || theme.coral;
  const bColor = budgetColor || theme.brand;
  const maxVal = Math.max(1, ...data.flatMap((d) => [d.cost, d.budget]));
  const fmt = (n: number) => (formatValue ? formatValue(n) : String(Math.round(n)));
  const active = data[selectedIdx] || data[0];

  return (
    <View style={styles.wrap}>
      {active ? (
        <View
          style={[
            styles.infoBar,
            { backgroundColor: theme.muted, borderColor: theme.border },
          ]}
        >
          <Text style={{ color: theme.textMuted, fontFamily: theme.font('700'), fontSize: theme.sp(11) }}>
            {active.label}
          </Text>
          <View style={styles.legendPair}>
            <View style={[styles.dot, { backgroundColor: cColor }]} />
            <Text style={{ color: theme.text, fontFamily: theme.font('800'), fontSize: theme.sp(11.5), fontVariant: ['tabular-nums'] }}>
              {costLabel}: {fmt(active.cost)}
            </Text>
          </View>
          <View style={styles.legendPair}>
            <View style={[styles.dot, { backgroundColor: bColor }]} />
            <Text style={{ color: theme.text, fontFamily: theme.font('800'), fontSize: theme.sp(11.5), fontVariant: ['tabular-nums'] }}>
              {budgetLabel}: {fmt(active.budget)}
            </Text>
          </View>
        </View>
      ) : null}

      <View style={[styles.barsRow, { height }]}>
        {data.map((item, idx) => {
          const isSelected = idx === selectedIdx;
          const costPct = Math.max(6, Math.round((item.cost / maxVal) * 100));
          const budgetPct = Math.max(6, Math.round((item.budget / maxVal) * 100));
          return (
            <Pressable
              key={`${item.label}-${idx}`}
              onPress={() => {
                triggerHaptic('selection');
                setSelectedIdx(idx);
              }}
              style={styles.groupCol}
            >
              <View style={styles.pairWrap}>
                <View
                  style={[
                    styles.barTrack,
                    { height: height - 28 },
                  ]}
                >
                  <View
                    style={[
                      styles.bar,
                      {
                        height: `${costPct}%`,
                        backgroundColor: cColor,
                        opacity: isSelected ? 1 : 0.72,
                      },
                    ]}
                  />
                  <View
                    style={[
                      styles.bar,
                      {
                        height: `${budgetPct}%`,
                        backgroundColor: bColor,
                        opacity: isSelected ? 1 : 0.72,
                      },
                    ]}
                  />
                </View>
              </View>
              <Text
                style={{
                  color: isSelected ? theme.brand : theme.textMuted,
                  fontFamily: theme.font(isSelected ? '800' : '600'),
                  fontSize: theme.sp(11),
                }}
              >
                {item.label}
              </Text>
            </Pressable>
          );
        })}
      </View>

      <View style={styles.legendFooter}>
        <View style={styles.legendPair}>
          <View style={[styles.dot, { backgroundColor: cColor }]} />
          <Text style={{ color: theme.textSecondary, fontFamily: theme.font('600'), fontSize: theme.sp(11) }}>
            {costLabel}
          </Text>
        </View>
        <View style={styles.legendPair}>
          <View style={[styles.dot, { backgroundColor: bColor }]} />
          <Text style={{ color: theme.textSecondary, fontFamily: theme.font('600'), fontSize: theme.sp(11) }}>
            {budgetLabel}
          </Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    gap: 10,
  },
  infoBar: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 14,
    borderWidth: 1,
  },
  barsRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    gap: 6,
  },
  groupCol: {
    flex: 1,
    alignItems: 'center',
    gap: 6,
  },
  pairWrap: {
    width: '100%',
    alignItems: 'center',
  },
  barTrack: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'center',
    gap: 4,
    width: '100%',
  },
  bar: {
    width: 9,
    borderRadius: 99,
  },
  legendFooter: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 18,
  },
  legendPair: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 99,
  },
});
