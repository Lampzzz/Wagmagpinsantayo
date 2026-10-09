import { useEffect } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, View } from 'react-native';
import Animated, {
  cancelAnimation,
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';

import { Icon } from '@/components/ui/icon';
import { COLORS, PRESSED_SCALE, RADII, SHADOWS } from '@/constants/theme';

import type { TalkStage } from '../hooks/use-talk-to-pinsan';

const MIC_SIZE = 76;
const PULSE_MS = 1400;

type MicButtonProps = {
  stage: TalkStage;
  onPress: () => void;
};

/** The big mango mic: tap to talk to Pinsan, tap again when you're done. */
export function MicButton({ stage, onPress }: MicButtonProps) {
  const listening = stage === 'listening';
  const working = stage === 'starting' || stage === 'transcribing' || stage === 'thinking';

  return (
    <View style={styles.wrap}>
      {listening && <Pulse />}
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={listening ? 'Stop talking' : 'Talk to Pinsan'}
        accessibilityHint={
          listening
            ? 'Pinsan answers what you said'
            : "Starts listening. Tap again when you're done"
        }
        accessibilityState={{ disabled: working, busy: working }}
        disabled={working}
        onPress={onPress}
        style={({ pressed }) => [styles.button, pressed && styles.pressed]}
      >
        {working ? (
          <ActivityIndicator color={COLORS.onPrimary} />
        ) : (
          <Icon
            ios={listening ? 'stop.fill' : 'mic.fill'}
            android={listening ? 'stop' : 'mic'}
            color={COLORS.onPrimary}
            size={listening ? 28 : 34}
          />
        )}
      </Pressable>
    </View>
  );
}

/** A soft mango ring that swells and fades while Pinsan is listening. */
function Pulse() {
  const t = useSharedValue(0);

  useEffect(() => {
    t.set(withRepeat(withTiming(1, { duration: PULSE_MS, easing: Easing.out(Easing.quad) }), -1));
    return () => cancelAnimation(t);
  }, [t]);

  const ring = useAnimatedStyle(() => ({
    opacity: 0.45 * (1 - t.value),
    transform: [{ scale: 1 + 0.45 * t.value }],
  }));

  return <Animated.View pointerEvents="none" style={[styles.ring, ring]} />;
}

const styles = StyleSheet.create({
  wrap: {
    width: MIC_SIZE,
    height: MIC_SIZE,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ring: {
    position: 'absolute',
    width: MIC_SIZE,
    height: MIC_SIZE,
    borderRadius: RADII.pill,
    backgroundColor: COLORS.primary,
  },
  button: {
    width: MIC_SIZE,
    height: MIC_SIZE,
    borderRadius: RADII.pill,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.primary,
    ...SHADOWS.primary,
  },
  pressed: {
    transform: [{ scale: PRESSED_SCALE }],
  },
});
