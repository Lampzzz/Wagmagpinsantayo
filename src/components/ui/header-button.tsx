import { Pressable, StyleSheet, Text, type PressableProps } from 'react-native';

import { COLORS, FONT_SIZES, FONTS, PRESSED_SCALE, RADII, SPACING } from '@/constants/theme';

type HeaderButtonProps = Omit<PressableProps, 'children'> & {
  label: string;
  tone?: 'default' | 'danger';
};

/** A small pill sized for a navigation header: mango, or pale red for the danger tone. */
export function HeaderButton({ label, tone = 'default', style, ...rest }: HeaderButtonProps) {
  return (
    <Pressable
      accessibilityRole="button"
      // 36 pt tall, so this brings the touch target past 44 pt.
      hitSlop={SPACING.sm}
      style={(state) => [
        styles.base,
        tone === 'danger' && styles.dangerBase,
        state.pressed && styles.pressed,
        typeof style === 'function' ? style(state) : style,
      ]}
      {...rest}
    >
      <Text style={[styles.label, tone === 'danger' && styles.dangerLabel]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    minWidth: 44,
    minHeight: 36,
    paddingHorizontal: SPACING.md,
    borderRadius: RADII.pill,
    backgroundColor: COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dangerBase: {
    backgroundColor: COLORS.dangerSurface,
  },
  pressed: {
    transform: [{ scale: PRESSED_SCALE }],
  },
  label: {
    fontFamily: FONTS.display,
    fontSize: FONT_SIZES.body,
    color: COLORS.onPrimary,
  },
  dangerLabel: {
    color: COLORS.danger,
  },
});
