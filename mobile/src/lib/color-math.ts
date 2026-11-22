function clampByte(n: number): number {
  return Math.max(0, Math.min(255, Math.round(n)));
}

export function hexToRgb(hex: string): { r: number; g: number; b: number } {
  const clean = hex.replace('#', '').trim();
  const full =
    clean.length === 3
      ? clean
          .split('')
          .map((c) => c + c)
          .join('')
      : clean.slice(0, 6);
  const num = parseInt(full || '5B35D5', 16);
  return {
    r: (num >> 16) & 255,
    g: (num >> 8) & 255,
    b: num & 255,
  };
}

export function rgbToHex(r: number, g: number, b: number): string {
  return (
    '#' +
    [clampByte(r), clampByte(g), clampByte(b)]
      .map((x) => x.toString(16).padStart(2, '0'))
      .join('')
  );
}

/** Mixes `hexA` at `ratioA` (0..1) with `hexB` at `1 - ratioA`. */
export function mixHex(hexA: string, hexB: string, ratioA: number): string {
  const a = hexToRgb(hexA);
  const b = hexToRgb(hexB);
  const t = Math.max(0, Math.min(1, ratioA));
  return rgbToHex(
    a.r * t + b.r * (1 - t),
    a.g * t + b.g * (1 - t),
    a.b * t + b.b * (1 - t)
  );
}

export function alphaHex(hex: string, opacity: number): string {
  const { r, g, b } = hexToRgb(hex);
  const a = Math.max(0, Math.min(1, opacity));
  return `rgba(${r}, ${g}, ${b}, ${a.toFixed(3)})`;
}

export function lightenHex(hex: string, amount: number): string {
  return mixHex('#FFFFFF', hex, amount);
}

export function darkenHex(hex: string, amount: number): string {
  return mixHex('#000000', hex, amount);
}
