import { Pressable, StyleSheet, Text, View } from 'react-native';

import { COLORS, FONTS, RADII, SPACING } from '@/constants/theme';

import { zoomBy } from '../scene/orbit';

// Zoom buttons for anyone who can't pinch: one-handed use, accessibility, the emulator.

export function ZoomControls() {
  return (
    <View style={styles.column}>
      <ZoomButton label="Zoom in" glyph="+" factor={0.7} />
      <ZoomButton label="Zoom out" glyph="−" factor={1.45} />
    </View>
  );
}

function ZoomButton({ label, glyph, factor }: { label: string; glyph: string; factor: number }) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      hitSlop={SPACING.xs}
      onPress={() => zoomBy(factor)}
      style={({ pressed }) => [styles.button, pressed && styles.pressed]}
    >
      <Text style={styles.glyph}>{glyph}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  column: {
    position: 'absolute',
    right: SPACING.md,
    top: '42%',
    gap: SPACING.sm,
  },
  button: {
    width: 48,
    height: 48,
    borderRadius: RADII.pill,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.surfaceTranslucent,
  },
  pressed: { transform: [{ scale: 0.92 }] },
  glyph: { fontFamily: FONTS.display, fontSize: 26, lineHeight: 30, color: COLORS.ink },
});
