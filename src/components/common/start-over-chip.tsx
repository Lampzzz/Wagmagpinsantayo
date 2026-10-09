import { StyleSheet } from 'react-native';

import { Chip } from '@/components/ui/chip';
import { SPACING } from '@/constants/theme';

/** Small enough for a caption row: give the row this height too, so it never jumps. */
export const START_OVER_HEIGHT = 32;

type StartOverChipProps = {
  onPress: () => void;
};

/**
 * "Start over" while you talk: the words so far are thrown away, and the mic listens again.
 * It sits at the end of a row.
 */
export function StartOverChip({ onPress }: StartOverChipProps) {
  return (
    <Chip
      label="Start over"
      accessibilityHint="Clears what you said and listens again"
      onPress={onPress}
      // Brings the touch target to 48 pt.
      hitSlop={SPACING.sm}
      style={styles.chip}
    />
  );
}

const styles = StyleSheet.create({
  chip: {
    minHeight: START_OVER_HEIGHT,
    marginStart: 'auto',
    paddingVertical: 0,
    paddingHorizontal: SPACING.sm + SPACING.xs,
  },
});
