// Pinsan's palette (docs/FRONTEND.md, "Visual system") styles every screen. The plain names
// (background to border) came from the developer's draft; they keep their names and now hold
// Pinsan's colors, so the Notes, Tasks, Reminders and Assistant screens pick up the look.
// Contrast ratios are WCAG, against white and `background`. The app is light-only.

export const COLORS = {
  /** Screen background: warm cream. */
  background: '#FFF5E8',
  /** Cards, bubbles and fields. */
  surface: '#FFFFFF',
  /** Main text (ink): 13.8:1 on background. */
  text: '#2A2340',
  /** Secondary text (inkMuted): 4.8:1 on background, 5.2:1 on white. */
  textMuted: '#6E6A80',
  /**
   * Mango, as a fill only: buttons, selected chips, the user's bubble. It is 1.8:1 on white,
   * so never use it for text, icons or spinners on a light background; use `primaryDark`.
   */
  primary: '#FFB627',
  /** Text and icons on `primary`: ink, 8.5:1. White would be 1.8:1. */
  onPrimary: '#2A2340',
  /** Text-safe red: 5.2:1 on background. Behind an icon, use `dangerFill`. */
  danger: '#C62828',
  /** 6.1:1 on warningSurface, 6.7:1 on background. */
  warning: '#7A4E00',
  /** Mango tint. */
  warningSurface: '#FFEBBF',
  /** Leaf darkened for text and ticks: 5.1:1 on successSurface. Leaf is 2.1:1 on white. */
  success: '#25733A',
  /** Leaf tint. */
  successSurface: '#E3F5E6',
  /** Soft separators. */
  border: '#EFE2D2',

  ink: '#2A2340',
  inkMuted: '#6E6A80',
  surfaceTranslucent: 'rgba(255, 255, 255, 0.92)',
  mango: '#FFB627',
  coral: '#FF7A6B',
  leaf: '#6CC57C',

  /** Mango-family text, icons and spinners on light backgrounds: 5.5:1 on background. */
  primaryDark: '#8A5A00',
  /** Quiet fills, such as a neutral badge. Put `text` on it; `textMuted` is only 4.4:1. */
  surfaceMuted: '#F6EBDD',
  /** Outlines of chips, ghost buttons and fields. */
  borderStrong: '#DCCAB4',
  /** Red behind an icon only: ink 3.8:1, white 3.9:1. Too light for text. */
  dangerFill: '#E5484D',
  /** Pale red behind `danger` text: 4.9:1. */
  dangerSurface: '#FDECEC',
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

// Soft, warm shadows, never hard ones. Spread one into a style: `...SHADOWS.card`.
export const SHADOWS = {
  /** Cards and bubbles. */
  card: { boxShadow: '0px 6px 20px rgba(122, 74, 30, 0.10)' },
  /** Small raised controls. */
  soft: { boxShadow: '0px 2px 8px rgba(122, 74, 30, 0.10)' },
  /** A warm glow under mango buttons. */
  primary: { boxShadow: '0px 4px 14px rgba(214, 140, 0, 0.30)' },
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

/** Pressed controls shrink a little. Animate only transform and opacity. */
export const PRESSED_SCALE = 0.96;
