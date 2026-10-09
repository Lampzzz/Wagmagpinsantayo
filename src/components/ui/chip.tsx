import { Pressable, StyleSheet, Text, type PressableProps } from 'react-native';

import { COLORS, FONT_SIZES, RADII, SPACING } from '@/constants/theme';

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
      hitSlop={{ top: 4, bottom: 4 }}
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
    minHeight: 40,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    borderRadius: RADII.pill,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.background,
    justifyContent: 'center',
  },
  selected: {
    borderColor: COLORS.primary,
    backgroundColor: COLORS.primary,
  },
  danger: {
    borderColor: COLORS.danger,
  },
  pressed: {
    opacity: 0.7,
  },
  disabled: {
    opacity: 0.5,
  },
  label: {
    fontSize: FONT_SIZES.body,
    fontWeight: '500',
    color: COLORS.text,
  },
  selectedLabel: {
    color: COLORS.onPrimary,
  },
  dangerLabel: {
    color: COLORS.danger,
  },
});
