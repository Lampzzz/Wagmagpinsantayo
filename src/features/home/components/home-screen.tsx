import { LinearGradient } from 'expo-linear-gradient';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { COLORS, FONT_SIZES, FONTS, RADII, SKY, SPACING } from '@/constants/theme';
import { Mascot, useMascot, type MascotMood } from '@/features/mascot';

const MOODS: MascotMood[] = ['idle', 'listening', 'thinking', 'done', 'oops'];

export function HomeScreen() {
  const insets = useSafeAreaInsets();
  const { mood, setMood } = useMascot();

  const nextMood = () => setMood(MOODS[(MOODS.indexOf(mood) + 1) % MOODS.length]);

  return (
    <LinearGradient colors={SKY.day} style={styles.fill}>
      <View style={styles.fill}>
        <Mascot />
      </View>

      <View style={[styles.topBar, { top: insets.top + SPACING.sm }]}>
        <Text style={styles.title}>Pinsan</Text>
        <View style={styles.badge}>
          <Text style={styles.badgeText}>Offline · private</Text>
        </View>
      </View>

      {/* Temporary: cycles moods so we can check every animation on the phone. */}
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`Mascot mood: ${mood}. Tap for next mood.`}
        onPress={nextMood}
        style={({ pressed }) => [
          styles.moodButton,
          { bottom: insets.bottom + SPACING.lg },
          pressed && styles.pressed,
        ]}
      >
        <Text style={styles.moodText}>Mood: {mood} → tap</Text>
      </Pressable>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  topBar: {
    position: 'absolute',
    left: SPACING.md,
    right: SPACING.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  title: { fontFamily: FONTS.display, fontSize: FONT_SIZES.xl, color: COLORS.ink },
  badge: {
    backgroundColor: COLORS.surfaceTranslucent,
    borderRadius: RADII.pill,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
  },
  badgeText: { fontFamily: FONTS.bodyBold, fontSize: FONT_SIZES.sm, color: COLORS.ink },
  moodButton: {
    position: 'absolute',
    alignSelf: 'center',
    minHeight: 48,
    justifyContent: 'center',
    backgroundColor: COLORS.mango,
    borderRadius: RADII.pill,
    paddingHorizontal: SPACING.lg,
  },
  pressed: { transform: [{ scale: 0.96 }] },
  moodText: { fontFamily: FONTS.display, fontSize: FONT_SIZES.md, color: COLORS.ink },
});
