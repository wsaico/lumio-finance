import React, { useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, View, type LayoutChangeEvent } from 'react-native';
import Svg, {
  Circle,
  Defs,
  Line,
  LinearGradient as SvgLinearGradient,
  Path,
  Stop,
} from 'react-native-svg';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import { runOnJS } from 'react-native-reanimated';
import { useAppTheme } from '@/theme/ThemeProvider';
import { triggerHaptic } from '@/lib/haptics';

export interface SplinePoint {
  label: string;
  primary: number;
  secondary?: number;
}

function buildSmoothPath(points: { x: number; y: number }[]): string {
  if (points.length === 0) return '';
  if (points.length === 1) return `M ${points[0].x} ${points[0].y}`;
  let d = `M ${points[0].x} ${points[0].y}`;
  for (let i = 0; i < points.length - 1; i++) {
    const p0 = points[i];
    const p1 = points[i + 1];
    const cx = (p0.x + p1.x) / 2;
    d += ` C ${cx} ${p0.y}, ${cx} ${p1.y}, ${p1.x} ${p1.y}`;
  }
  return d;
}

export function DualSplineAreaChart({
  data,
  height = 170,
  primaryColor,
  secondaryColor,
  primaryLabel = 'Ingresos',
  secondaryLabel = 'Gastos',
  formatValue,
  variant = 'surface',
}: {
  data: SplinePoint[];
  height?: number;
  primaryColor?: string;
  secondaryColor?: string;
  primaryLabel?: string;
  secondaryLabel?: string;
  formatValue?: (n: number) => string;
  variant?: 'surface' | 'hero';
}) {
  const theme = useAppTheme();
  const [width, setWidth] = useState(320);
  const [activeIdx, setActiveIdx] = useState<number | null>(
    data.length > 0 ? data.length - 1 : null
  );

  const pColor = primaryColor || (variant === 'hero' ? '#FFFFFF' : theme.brand);
  const sColor = secondaryColor || theme.coral;
  const hasSecondary = data.some((d) => typeof d.secondary === 'number');

  const padX = 14;
  const padTop = 28;
  const padBottom = 26;
  const plotW = Math.max(100, width - padX * 2);
  const plotH = Math.max(60, height - padTop - padBottom);

  const { pCoords, sCoords, pLine, pArea, sLine, sArea } = useMemo(() => {
    const safeData = data.length > 0 ? data : [{ label: '-', primary: 0 }];
    const allVals = safeData.flatMap((d) =>
      typeof d.secondary === 'number' ? [d.primary, d.secondary] : [d.primary]
    );
    const maxVal = Math.max(1, ...allVals);
    const minVal = Math.min(0, ...allVals);
    const span = Math.max(1, maxVal - minVal);

    const stepX = safeData.length > 1 ? plotW / (safeData.length - 1) : 0;
    const toY = (v: number) => padTop + plotH - ((v - minVal) / span) * plotH;

    const pPts = safeData.map((d, i) => ({
      x: safeData.length === 1 ? padX + plotW / 2 : padX + i * stepX,
      y: toY(d.primary),
    }));

    const sPts = hasSecondary
      ? safeData.map((d, i) => ({
          x: safeData.length === 1 ? padX + plotW / 2 : padX + i * stepX,
          y: toY(d.secondary || 0),
        }))
      : [];

    const baseLineY = padTop + plotH;
    const pl = buildSmoothPath(pPts);
    const pa =
      pPts.length > 0
        ? `${pl} L ${pPts[pPts.length - 1].x} ${baseLineY} L ${pPts[0].x} ${baseLineY} Z`
        : '';

    const sl = buildSmoothPath(sPts);
    const sa =
      sPts.length > 0
        ? `${sl} L ${sPts[sPts.length - 1].x} ${baseLineY} L ${sPts[0].x} ${baseLineY} Z`
        : '';

    return { pCoords: pPts, sCoords: sPts, pLine: pl, pArea: pa, sLine: sl, sArea: sa };
  }, [data, plotW, plotH, hasSecondary]);

  const updateIndexFromX = (x: number) => {
    if (data.length <= 1) return;
    const ratio = Math.max(0, Math.min(1, (x - padX) / plotW));
    const nextIdx = Math.round(ratio * (data.length - 1));
    if (nextIdx !== activeIdx) {
      triggerHaptic('selection');
      setActiveIdx(nextIdx);
    }
  };

  const pan = Gesture.Pan()
    .onBegin((e) => {
      runOnJS(updateIndexFromX)(e.x);
    })
    .onUpdate((e) => {
      runOnJS(updateIndexFromX)(e.x);
    });

  const activeData = activeIdx !== null && data[activeIdx] ? data[activeIdx] : null;
  const activePt = activeIdx !== null && pCoords[activeIdx] ? pCoords[activeIdx] : null;
  const fmt = (n: number) => (formatValue ? formatValue(n) : String(Math.round(n)));

  return (
    <View
      onLayout={(e: LayoutChangeEvent) => setWidth(e.nativeEvent.layout.width)}
      style={{ width: '100%' }}
    >
      {activeData && activePt ? (
        <View
          style={[
            styles.tooltipRow,
            {
              backgroundColor:
                variant === 'hero' ? 'rgba(255,255,255,0.18)' : theme.muted,
              borderColor:
                variant === 'hero' ? 'rgba(255,255,255,0.28)' : theme.border,
            },
          ]}
        >
          <Text
            style={{
              color: variant === 'hero' ? '#FFFFFF' : theme.textMuted,
              fontFamily: theme.font('700'),
              fontSize: theme.sp(11),
            }}
          >
            {activeData.label}
          </Text>
          <View style={styles.dotPair}>
            <View style={[styles.dot, { backgroundColor: pColor }]} />
            <Text
              style={{
                color: variant === 'hero' ? '#FFFFFF' : theme.text,
                fontFamily: theme.font('800'),
                fontSize: theme.sp(12),
                fontVariant: ['tabular-nums'],
              }}
            >
              {primaryLabel}: {fmt(activeData.primary)}
            </Text>
          </View>
          {hasSecondary && typeof activeData.secondary === 'number' ? (
            <View style={styles.dotPair}>
              <View style={[styles.dot, { backgroundColor: sColor }]} />
              <Text
                style={{
                  color: variant === 'hero' ? '#FFFFFF' : theme.text,
                  fontFamily: theme.font('800'),
                  fontSize: theme.sp(12),
                  fontVariant: ['tabular-nums'],
                }}
              >
                {secondaryLabel}: {fmt(activeData.secondary)}
              </Text>
            </View>
          ) : null}
        </View>
      ) : null}

      <GestureDetector gesture={pan}>
        <View style={{ height, width: '100%' }}>
          <Svg width={width} height={height}>
            <Defs>
              <SvgLinearGradient id="primaryAreaGrad" x1="0" y1="0" x2="0" y2="1">
                <Stop offset="0%" stopColor={pColor} stopOpacity={variant === 'hero' ? 0.34 : 0.25} />
                <Stop offset="100%" stopColor={pColor} stopOpacity={0.01} />
              </SvgLinearGradient>
              <SvgLinearGradient id="secondaryAreaGrad" x1="0" y1="0" x2="0" y2="1">
                <Stop offset="0%" stopColor={sColor} stopOpacity={variant === 'hero' ? 0.36 : 0.22} />
                <Stop offset="100%" stopColor={sColor} stopOpacity={0.01} />
              </SvgLinearGradient>
            </Defs>

            {/* Active vertical crosshair */}
            {activePt ? (
              <Line
                x1={activePt.x}
                y1={padTop}
                x2={activePt.x}
                y2={padTop + plotH}
                stroke={variant === 'hero' ? 'rgba(255,255,255,0.4)' : theme.border}
                strokeWidth={1.2}
                strokeDasharray="4 4"
              />
            ) : null}

            {hasSecondary && sArea ? <Path d={sArea} fill="url(#secondaryAreaGrad)" /> : null}
            {pArea ? <Path d={pArea} fill="url(#primaryAreaGrad)" /> : null}

            {hasSecondary && sLine ? (
              <Path d={sLine} fill="none" stroke={sColor} strokeWidth={2.4} strokeLinecap="round" />
            ) : null}
            {pLine ? (
              <Path d={pLine} fill="none" stroke={pColor} strokeWidth={2.8} strokeLinecap="round" />
            ) : null}

            {activePt ? (
              <>
                <Circle cx={activePt.x} cy={activePt.y} r={7} fill={pColor} opacity={0.22} />
                <Circle
                  cx={activePt.x}
                  cy={activePt.y}
                  r={4.2}
                  fill="#FFFFFF"
                  stroke={pColor}
                  strokeWidth={2.5}
                />
              </>
            ) : null}
          </Svg>

          {/* Interactive X Axis labels */}
          <View style={[styles.xLabels, { paddingHorizontal: padX }]}>
            {data.map((d, idx) => {
              const active = idx === activeIdx;
              return (
                <Pressable
                  key={`${d.label}-${idx}`}
                  onPress={() => {
                    triggerHaptic('selection');
                    setActiveIdx(idx);
                  }}
                  style={styles.xLabelTouch}
                >
                  <Text
                    style={{
                      color:
                        variant === 'hero'
                          ? active
                            ? '#FFFFFF'
                            : 'rgba(255,255,255,0.68)'
                          : active
                            ? theme.brand
                            : theme.textMuted,
                      fontFamily: theme.font(active ? '800' : '600'),
                      fontSize: theme.sp(10.5),
                    }}
                  >
                    {d.label}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </View>
      </GestureDetector>
    </View>
  );
}

const styles = StyleSheet.create({
  tooltipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 14,
    borderWidth: 1,
    marginBottom: 4,
  },
  dotPair: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  dot: {
    width: 7,
    height: 7,
    borderRadius: 99,
  },
  xLabels: {
    position: 'absolute',
    bottom: 2,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  xLabelTouch: {
    paddingHorizontal: 4,
    paddingVertical: 2,
  },
});
