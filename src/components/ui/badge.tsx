import { StyleSheet, Text } from 'react-native';

import { COLORS, FONT_SIZES, FONTS, RADII, SPACING } from '@/constants/theme';

type BadgeProps = {
  label: string;
  tone?: 'neutral' | 'warning' | 'success';
};

/** A short status label, such as "Overdue" or "Done". */
export function Badge({ label, tone = 'neutral' }: BadgeProps) {
  return <Text style={[styles.base, styles[tone]]}>{label}</Text>;
}

const styles = StyleSheet.create({
  base: {
    alignSelf: 'flex-start',
    overflow: 'hidden',
    paddingHorizontal: SPACING.sm + SPACING.xs,
    paddingVertical: SPACING.xs,
    borderRadius: RADII.pill,
    fontFamily: FONTS.bodyBold,
    fontSize: FONT_SIZES.caption,
  },
  neutral: {
    backgroundColor: COLORS.surfaceMuted,
    color: COLORS.text,
  },
  warning: {
    backgroundColor: COLORS.warningSurface,
    color: COLORS.warning,
  },
  success: {
    backgroundColor: COLORS.successSurface,
    color: COLORS.success,
  },
});
