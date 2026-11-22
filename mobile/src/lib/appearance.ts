export const ACCENT_COLORS = [
  { name: 'Violeta Eléctrico 2027', value: '#5B35D5' },
  { name: 'Violeta Lumio', value: '#7C3AED' },
  { name: 'Índigo', value: '#6366F1' },
  { name: 'Azul cielo', value: '#0EA5E9' },
  { name: 'Esmeralda', value: '#10B981' },
  { name: 'Rosa', value: '#F43F5E' },
  { name: 'Ámbar Coral', value: '#FF7A33' },
];

export const CORAL_ACCENT = '#FF7A33';
export const CORAL_ACCENT_END = '#F26422';

export const FONT_OPTIONS = [
  { name: 'Outfit', description: 'Suave, moderno y redondeado' },
  { name: 'Inter', description: 'Clara y muy legible' },
  { name: 'Plus Jakarta Sans', description: 'Elegante y amigable' },
  { name: 'Montserrat', description: 'Firme y geométrica' },
] as const;

export function resolveRNFontFamily(fontName: string, weight: '400' | '500' | '600' | '700' | '800' = '600'): string {
  const suffixMap: Record<string, string> = {
    '400': 'Regular',
    '500': 'Medium',
    '600': 'SemiBold',
    '700': 'Bold',
    '800': 'ExtraBold',
  };
  const suffix = suffixMap[weight] || 'SemiBold';
  if (fontName === 'Inter') return `Inter_${weight}${suffix}`;
  if (fontName === 'Plus Jakarta Sans') return `PlusJakartaSans_${weight}${suffix}`;
  if (fontName === 'Montserrat') return `Montserrat_${weight}${suffix}`;
  return `Outfit_${weight}${suffix}`;
}
