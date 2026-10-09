import { StyleSheet, View } from 'react-native';
import Animated, { FadeIn, FadeOut } from 'react-native-reanimated';

import { Text } from '@/components/ui/text';
import { COLORS, FONT_SIZES, FONTS, SHADOWS, SPACING } from '@/constants/theme';

/** Ruled lines, and the text sits on them. */
const LINE_HEIGHT = 28;
const LINES = 3;
// About three lines' worth: older words scroll off the top as you keep talking.
const MAX_SHOWN_CHARACTERS = 96;

type PaperNoteProps = {
  /** What's happening, such as "Listening…". */
  label: string;
  /** Your words so far. */
  words: string;
  /** Shown before any words arrive. */
  placeholder: string;
};

/** A cream paper note, slightly askew, where your words appear as Pinsan hears them. */
export function PaperNote({ label, words, placeholder }: PaperNoteProps) {
  return (
    <Animated.View
      entering={FadeIn.duration(180)}
      exiting={FadeOut.duration(160)}
      accessibilityLiveRegion="polite"
      style={styles.paper}
    >
      <View style={styles.labelRow}>
        <View style={styles.dot} />
        <Text style={styles.label}>{label}</Text>
      </View>
      <View style={styles.page}>
        {Array.from({ length: LINES }, (_, index) => (
          <View key={index} style={[styles.rule, { top: (index + 1) * LINE_HEIGHT - 1 }]} />
        ))}
        <View style={styles.margin} />
        <Text style={[styles.words, !words && styles.placeholder]} numberOfLines={LINES}>
          {words ? latest(words) : placeholder}
        </Text>
      </View>
    </Animated.View>
  );
}

/** The end of a long transcript, starting at a word. */
function latest(words: string) {
  if (words.length <= MAX_SHOWN_CHARACTERS) return words;
  const tail = words.slice(-MAX_SHOWN_CHARACTERS);
  return `…${tail.slice(tail.indexOf(' ') + 1)}`;
}

const styles = StyleSheet.create({
  paper: {
    alignSelf: 'center',
    width: '100%',
    maxWidth: 340,
    paddingTop: SPACING.sm + SPACING.xs,
    paddingBottom: SPACING.md,
    paddingHorizontal: SPACING.md,
    borderRadius: 6,
    backgroundColor: COLORS.background,
    transform: [{ rotate: '-1.5deg' }],
    ...SHADOWS.card,
  },
  labelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs + 2,
    marginStart: SPACING.md,
  },
  // A small red dot, as on a recorder. Decorative: the label says what's happening.
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: COLORS.dangerFill,
  },
  label: {
    fontFamily: FONTS.bodyBold,
    fontSize: FONT_SIZES.caption,
    color: COLORS.textMuted,
  },
  page: {
    height: LINE_HEIGHT * LINES,
    paddingStart: SPACING.md,
  },
  rule: {
    position: 'absolute',
    left: 0,
    right: 0,
    height: 1,
    backgroundColor: COLORS.borderStrong,
  },
  // The red margin line of a notebook page.
  margin: {
    position: 'absolute',
    top: 0,
    bottom: -SPACING.md,
    left: SPACING.sm,
    width: 1.5,
    backgroundColor: COLORS.coral,
    opacity: 0.6,
  },
  words: {
    fontFamily: FONTS.body,
    fontSize: 17,
    lineHeight: LINE_HEIGHT,
    color: COLORS.text,
  },
  placeholder: {
    color: COLORS.textMuted,
  },
});
