import type { ReactNode } from 'react';
import { Pressable, StyleSheet, Text, type PressableProps } from 'react-native';

import {
  COLORS,
  FONT_SIZES,
  FONTS,
  PRESSED_SCALE,
  RADII,
  SHADOWS,
  SPACING,
} from '@/constants/theme';

type ButtonProps = Omit<PressableProps, 'children'> & {
  label: string;
  variant?: 'primary' | 'ghost';
  /** Shown before the label. Tint it to match: `onPrimary` for primary, `text` for ghost. */
  icon?: ReactNode;
};

/** A big rounded pill: mango with ink text, or white with an outline for the ghost variant. */
export function Button({
  label,
  variant = 'primary',
  icon,
  disabled,
  style,
  ...rest
}: ButtonProps) {
  return (
    <Pressable
      accessibilityRole="button"
      // Set explicitly so screen readers don't also read an icon glyph.
      accessibilityLabel={label}
      accessibilityState={{ disabled: !!disabled }}
      disabled={disabled}
      style={(state) => [
        styles.base,
        styles[variant],
        state.pressed && styles.pressed,
        disabled && styles.disabled,
        typeof style === 'function' ? style(state) : style,
      ]}
      {...rest}
    >
      {icon}
      <Text style={[styles.label, variant === 'primary' && styles.primaryLabel]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    minHeight: 52,
    paddingHorizontal: SPACING.lg,
    borderRadius: RADII.pill,
    flexDirection: 'row',
    gap: SPACING.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primary: {
    backgroundColor: COLORS.primary,
    ...SHADOWS.primary,
  },
  ghost: {
    backgroundColor: COLORS.surface,
    borderWidth: 1.5,
    borderColor: COLORS.borderStrong,
  },
  pressed: {
    transform: [{ scale: PRESSED_SCALE }],
  },
  disabled: {
    opacity: 0.5,
  },
  label: {
    fontFamily: FONTS.display,
    fontSize: FONT_SIZES.body,
    color: COLORS.text,
  },
  primaryLabel: {
    color: COLORS.onPrimary,
  },
});
