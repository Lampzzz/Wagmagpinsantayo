import { StyleSheet, Text } from 'react-native';

import { COLORS, FONT_SIZES, RADII, SPACING } from '@/constants/theme';

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
    paddingHorizontal: SPACING.sm,
    paddingVertical: 2,
    borderRadius: RADII.sm,
    fontSize: FONT_SIZES.caption,
    fontWeight: '600',
  },
  neutral: {
    backgroundColor: COLORS.surface,
    color: COLORS.textMuted,
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
