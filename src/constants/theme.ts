// First-draft tokens from docs/FRONTEND.md. Tune once the scene references land.

export const COLORS = {
  ink: '#2A2340',
  inkMuted: '#6E6A80',
  surface: '#FFFFFF',
  surfaceTranslucent: 'rgba(255, 255, 255, 0.92)',
  mango: '#FFB627',
  coral: '#FF7A6B',
  leaf: '#6CC57C',
  danger: '#E5484D',
} as const;

// Home sky gradients, top to bottom.
export const SKY = {
  dawn: ['#FFD9B8', '#BFE3FF'],
  day: ['#8FD3FF', '#E8F6FF'],
  night: ['#2B2A5C', '#5B4B8A'],
} as const;

export const SPACING = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
} as const;

export const RADII = {
  sm: 12,
  md: 20,
  lg: 28,
  pill: 999,
} as const;

export const FONTS = {
  display: 'Fredoka_600SemiBold',
  body: 'Nunito_400Regular',
  bodyBold: 'Nunito_700Bold',
} as const;

export const FONT_SIZES = {
  sm: 14,
  md: 16,
  lg: 20,
  xl: 28,
} as const;
