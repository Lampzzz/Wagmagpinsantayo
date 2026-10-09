import { useFrame } from '@react-three/fiber/native';
import { useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { COLORS, FONTS, RADII, SPACING } from '@/constants/theme';

// Development only: the scene's real frame rate, so smoothness can be judged on the phone
// itself (the emulator can't: it tops out at 15–30 fps even for an empty scene).

let frames = 0;

function countFrame() {
  frames += 1;
}

function takeFrames() {
  const counted = frames;
  frames = 0;
  return counted;
}

/** Goes inside the Canvas and counts rendered frames. */
export function FrameCounter() {
  useFrame(countFrame);
  return null;
}

/** Goes over the Canvas and shows frames per second, updated once a second. */
export function FpsBadge() {
  const insets = useSafeAreaInsets();
  const [fps, setFps] = useState(0);

  useEffect(() => {
    takeFrames();
    const timer = setInterval(() => setFps(takeFrames()), 1000);
    return () => clearInterval(timer);
  }, []);

  return (
    <View pointerEvents="none" style={[styles.badge, { bottom: insets.bottom + SPACING.lg }]}>
      <Text style={styles.text}>{fps} fps</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    position: 'absolute',
    left: SPACING.md,
    minHeight: 32,
    justifyContent: 'center',
    paddingHorizontal: SPACING.sm,
    borderRadius: RADII.md,
    backgroundColor: 'rgba(42, 35, 64, 0.6)',
  },
  text: { fontFamily: FONTS.bodyBold, fontSize: 13, color: COLORS.background },
});
