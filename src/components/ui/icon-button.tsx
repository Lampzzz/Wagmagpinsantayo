import type { ReactNode } from 'react';
import { Pressable, StyleSheet, type PressableProps } from 'react-native';

import { COLORS, PRESSED_SCALE, RADII, SHADOWS } from '@/constants/theme';

type IconButtonProps = Omit<PressableProps, 'children'> & {
  /** Read by screen readers, since the button shows only an icon. */
  accessibilityLabel: string;
  /** Tint it `onPrimary` on primary and danger, `text` on plain. */
  icon: ReactNode;
  variant?: 'primary' | 'plain' | 'danger';
};

/** A round, 48 pt button that shows only an icon. */
export function IconButton({ icon, variant = 'plain', disabled, style, ...rest }: IconButtonProps) {
  return (
    <Pressable
      accessibilityRole="button"
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
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    width: 48,
    height: 48,
    borderRadius: RADII.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primary: {
    backgroundColor: COLORS.primary,
    ...SHADOWS.primary,
  },
  plain: {
    backgroundColor: COLORS.surface,
    borderWidth: 1.5,
    borderColor: COLORS.borderStrong,
    ...SHADOWS.soft,
  },
  // `danger` is for text; this lighter red still gives an ink or white icon 3.8:1.
  danger: {
    backgroundColor: COLORS.dangerFill,
  },
  pressed: {
    transform: [{ scale: PRESSED_SCALE }],
  },
  disabled: {
    opacity: 0.4,
  },
});
