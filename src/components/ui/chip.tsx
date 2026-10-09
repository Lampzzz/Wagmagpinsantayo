import { Pressable, StyleSheet, Text, type PressableProps } from 'react-native';

import { COLORS, FONT_SIZES, FONTS, PRESSED_SCALE, RADII, SPACING } from '@/constants/theme';

type ChipProps = Omit<PressableProps, 'children'> & {
  label: string;
  /** Highlighted, as the chosen one of a set. */
  selected?: boolean;
  tone?: 'default' | 'danger';
};

/** A small rounded button for quick answers and choices. */
export function Chip({
  label,
  selected = false,
  tone = 'default',
  disabled,
  style,
  ...rest
}: ChipProps) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected, disabled: !!disabled }}
      disabled={disabled}
      style={(state) => [
        styles.base,
        selected && styles.selected,
        tone === 'danger' && styles.danger,
        state.pressed && styles.pressed,
        disabled && styles.disabled,
        typeof style === 'function' ? style(state) : style,
      ]}
      {...rest}
    >
      <Text
        style={[
          styles.label,
          selected && styles.selectedLabel,
          tone === 'danger' && styles.dangerLabel,
        ]}
      >
        {label}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    minHeight: 44,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    borderRadius: RADII.pill,
    borderWidth: 1.5,
    borderColor: COLORS.borderStrong,
    backgroundColor: COLORS.surface,
    justifyContent: 'center',
  },
  selected: {
    borderColor: COLORS.primary,
    backgroundColor: COLORS.primary,
  },
  danger: {
    borderColor: COLORS.danger,
    backgroundColor: COLORS.dangerSurface,
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
  selectedLabel: {
    color: COLORS.onPrimary,
  },
  dangerLabel: {
    color: COLORS.danger,
  },
});
