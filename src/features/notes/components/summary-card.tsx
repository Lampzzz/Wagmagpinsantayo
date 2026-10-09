import { StyleSheet, View } from 'react-native';

import { Card } from '@/components/ui/card';
import { Chip } from '@/components/ui/chip';
import { Notice } from '@/components/ui/notice';
import { Text } from '@/components/ui/text';
import { COLORS, FONT_SIZES, FONTS, SPACING } from '@/constants/theme';

type SummaryCardProps = {
  bullets: string[];
  /** The note was long, so the summary may miss details. */
  long: boolean;
  onInsert: () => void;
  onShare: () => void;
  onDiscard: () => void;
};

/** The AI's summary of a note. The note itself only changes if the user taps Insert. */
export function SummaryCard({ bullets, long, onInsert, onShare, onDiscard }: SummaryCardProps) {
  return (
    <Card style={styles.card}>
      <Text accessibilityRole="header" style={styles.title}>
        Summary
      </Text>
      {long && (
        <Notice text="This note is long (over 1,500 words), so the summary may miss details." />
      )}
      <View style={styles.bullets}>
        {bullets.map((bullet) => (
          <View key={bullet} style={styles.bulletRow}>
            <Text accessible={false} style={styles.dot}>
              •
            </Text>
            <Text style={styles.bulletText}>{bullet}</Text>
          </View>
        ))}
      </View>
      <View style={styles.actions}>
        <Chip
          label="Insert at top"
          accessibilityHint="Adds the summary to the top of your note"
          onPress={onInsert}
        />
        <Chip
          label="Share"
          accessibilityHint="Opens the share sheet, where you can copy the summary"
          onPress={onShare}
        />
        <Chip label="Discard" accessibilityHint="Closes the summary" onPress={onDiscard} />
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  card: {
    gap: SPACING.sm,
  },
  title: {
    fontFamily: FONTS.display,
    fontSize: FONT_SIZES.title,
  },
  bullets: {
    gap: SPACING.xs,
  },
  bulletRow: {
    flexDirection: 'row',
    gap: SPACING.sm,
  },
  dot: {
    fontFamily: FONTS.bodyBold,
    fontSize: FONT_SIZES.body,
    lineHeight: 24,
    color: COLORS.primaryDark,
  },
  bulletText: {
    flex: 1,
    fontSize: FONT_SIZES.body,
    lineHeight: 24,
  },
  actions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING.sm,
    paddingTop: SPACING.xs,
  },
});
