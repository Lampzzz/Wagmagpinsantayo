import { StyleSheet, View } from 'react-native';

import { COLORS, RADII } from '@/constants/theme';

type ProgressBarProps = {
  /** Fraction complete, from 0 to 1. */
  progress: number;
  accessibilityLabel: string;
};

export function ProgressBar({ progress, accessibilityLabel }: ProgressBarProps) {
  const percent = Math.round(Math.min(Math.max(progress, 0), 1) * 100);
  return (
    <View
      accessibilityRole="progressbar"
      accessibilityLabel={accessibilityLabel}
      accessibilityValue={{ min: 0, max: 100, now: percent }}
      style={styles.track}
    >
      <View style={[styles.fill, { width: `${percent}%` }]} />
    </View>
  );
}

const styles = StyleSheet.create({
  track: {
    height: 8,
    borderRadius: RADII.pill,
    backgroundColor: COLORS.surface,
    overflow: 'hidden',
  },
  fill: {
    height: '100%',
    backgroundColor: COLORS.primary,
  },
});
