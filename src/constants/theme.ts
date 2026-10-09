// Two drafts met here when front-end merged into development. The plain colors (background
// to border) style the Notes, Tasks, Reminders and Assistant screens. Pinsan's palette (ink
// to leaf, SKY and FONTS, from docs/FRONTEND.md) styles the home scene. Restyling the other
// screens with it is still open.

export const COLORS = {
  background: '#FFFFFF',
  surface: '#F4F6F8',
  text: '#111418',
  textMuted: '#5B6470',
  primary: '#1F6FEB',
  onPrimary: '#FFFFFF',
  danger: '#C62828',
  warning: '#8A5A00',
  warningSurface: '#FFF4D6',
  success: '#1B7F3B',
  successSurface: '#E3F4E8',
  border: '#D5DAE0',

  ink: '#2A2340',
  inkMuted: '#6E6A80',
  surfaceTranslucent: 'rgba(255, 255, 255, 0.92)',
  mango: '#FFB627',
  coral: '#FF7A6B',
  leaf: '#6CC57C',
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
  sm: 8,
  md: 12,
  lg: 20,
  xl: 28,
  pill: 999,
} as const;

export const FONTS = {
  display: 'Fredoka_600SemiBold',
  body: 'Nunito_400Regular',
  bodyBold: 'Nunito_700Bold',
} as const;

export const FONT_SIZES = {
  caption: 13,
  label: 14,
  body: 16,
  title: 20,
  heading: 26,
  display: 28,
} as const;
