import React from 'react';
import Svg, { Path } from 'react-native-svg';

export function MiniSparkline({
  values,
  width = 68,
  height = 26,
  color = '#5B35D5',
}: {
  values: number[];
  width?: number;
  height?: number;
  color?: string;
}) {
  const safe = values.length >= 2 ? values : [0, ...values, 0];
  const min = Math.min(...safe);
  const max = Math.max(...safe);
  const span = Math.max(1, max - min);
  const pad = 2;
  const w = width - pad * 2;
  const h = height - pad * 2;

  const pts = safe.map((v, idx) => ({
    x: pad + (idx / (safe.length - 1)) * w,
    y: pad + h - ((v - min) / span) * h,
  }));

  let d = `M ${pts[0].x} ${pts[0].y}`;
  for (let i = 0; i < pts.length - 1; i++) {
    const cx = (pts[i].x + pts[i + 1].x) / 2;
    d += ` C ${cx} ${pts[i].y}, ${cx} ${pts[i + 1].y}, ${pts[i + 1].x} ${pts[i + 1].y}`;
  }

  return (
    <Svg width={width} height={height}>
      <Path d={d} fill="none" stroke={color} strokeWidth={2.2} strokeLinecap="round" />
    </Svg>
  );
}
