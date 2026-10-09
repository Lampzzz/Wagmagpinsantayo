import { Pressable, StyleSheet, Text, type PressableProps } from 'react-native';

import { COLORS, FONT_SIZES, SPACING } from '@/constants/theme';

type HeaderButtonProps = Omit<PressableProps, 'children'> & {
  label: string;
  tone?: 'default' | 'danger';
};

/** A text button sized for a navigation header. */
export function HeaderButton({ label, tone = 'default', style, ...rest }: HeaderButtonProps) {
  return (
    <Pressable
      accessibilityRole="button"
      hitSlop={SPACING.sm}
      style={(state) => [
        styles.base,
        state.pressed && styles.pressed,
        typeof style === 'function' ? style(state) : style,
      ]}
      {...rest}
    >
      <Text style={[styles.label, tone === 'danger' && styles.danger]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    minWidth: 44,
    minHeight: 44,
    paddingHorizontal: SPACING.xs,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pressed: {
    opacity: 0.6,
  },
  label: {
    fontSize: FONT_SIZES.body,
    fontWeight: '600',
    color: COLORS.primary,
  },
  danger: {
    color: COLORS.danger,
  },
});
