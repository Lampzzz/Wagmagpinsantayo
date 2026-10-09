import { useRef } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  type LayoutChangeEvent,
} from 'react-native';
import Animated, {
  FadeOut,
  useAnimatedStyle,
  useDerivedValue,
  useSharedValue,
  withDelay,
  withSpring,
  type SharedValue,
} from 'react-native-reanimated';

import { Icon } from '@/components/ui/icon';
import { Text } from '@/components/ui/text';
import { COLORS, FONT_SIZES, RADII, SHADOWS, SPACING } from '@/constants/theme';
import { ReplyContent, type AssistantReply, type PickOption } from '@/features/assistant';
import { usePinsanAnchor } from '@/features/mascot';

import { BUBBLE_SIDE_MARGIN, placeBubble, TAIL_LENGTH, type BubbleArea } from '../place-bubble';

const MAX_WIDTH = 360;
const THINKING_WIDTH = 150;
const CLOSE_SIZE = 28;
// The tail is a square turned 45°, half hidden under the bubble.
const TAIL_SQUARE = Math.round(TAIL_LENGTH * Math.SQRT2);
const TAIL_INSET = RADII.xl;
// Room for the composer above the keyboard, when it's open.
const KEYBOARD_CLEARANCE = 88;
const SPRING = { damping: 14, stiffness: 180, mass: 0.8 };
// Saving after a tap on Save takes a blink; only a slower answer shows "Thinking…".
const THINKING_DELAY_MS = 350;

type BubbleFrameProps = {
  area: BubbleArea;
  /** The keyboard's height while it's open, from react-native-keyboard-controller. */
  keyboardHeight: SharedValue<number>;
};

type PinsanBubbleProps = BubbleFrameProps & {
  /** The reply to show; the parent keys this component by reply, so each one springs in. */
  reply: AssistantReply;
  /** A short line of Pinsan's own under the reply, such as "I didn't catch that". */
  aside?: string;
  answerable: boolean;
  /** False while you're talking: the bubble stays up to read, but can't be tapped. */
  interactive: boolean;
  onPick: (option: PickOption, shown: string) => void;
  onConfirm: (yes: boolean, shown: string) => void;
  onSend: (text: string) => void;
  onEdit: () => void;
  onDismiss: () => void;
};

/** Pinsan's speech bubble, hanging over his head, with the reply's items and buttons. */
export function PinsanBubble({
  reply,
  aside,
  area,
  keyboardHeight,
  answerable,
  interactive,
  onPick,
  onConfirm,
  onSend,
  onEdit,
  onDismiss,
}: PinsanBubbleProps) {
  const width = Math.min(area.width - BUBBLE_SIDE_MARGIN * 2, MAX_WIDTH);
  const { frame, tail, limit, onLayout } = useBubbleMotion(area, keyboardHeight, width);

  return (
    <Animated.View
      exiting={FadeOut.duration(140)}
      pointerEvents={interactive ? 'box-none' : 'none'}
      style={styles.layer}
    >
      <Animated.View onLayout={onLayout} style={[styles.bubble, { width }, limit, frame]}>
        <Animated.View style={[styles.tail, tail]} />
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
        >
          <ReplyContent
            reply={reply}
            answerable={answerable}
            onPick={onPick}
            onConfirm={onConfirm}
            onSend={onSend}
            onEdit={onEdit}
            size="large"
            accessory={<CloseButton onPress={onDismiss} />}
          />
          {aside && <Text style={styles.aside}>{aside}</Text>}
        </ScrollView>
      </Animated.View>
    </Animated.View>
  );
}

/** A small bubble while the assistant works out the answer. */
export function ThinkingBubble({ area, keyboardHeight }: BubbleFrameProps) {
  const { frame, tail, onLayout } = useBubbleMotion(
    area,
    keyboardHeight,
    THINKING_WIDTH,
    THINKING_DELAY_MS,
  );
  return (
    <Animated.View exiting={FadeOut.duration(120)} pointerEvents="none" style={styles.layer}>
      <Animated.View
        onLayout={onLayout}
        accessibilityLabel="Pinsan is thinking"
        style={[styles.bubble, styles.thinking, { width: THINKING_WIDTH }, frame]}
      >
        <Animated.View style={[styles.tail, tail]} />
        <ActivityIndicator color={COLORS.primaryDark} />
        <Text style={styles.thinkingText}>Thinking…</Text>
      </Animated.View>
    </Animated.View>
  );
}

function CloseButton({ onPress }: { onPress: () => void }) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel="Close"
      accessibilityHint="Closes Pinsan's reply"
      // 28 pt to look at, 48 pt to tap.
      hitSlop={(48 - CLOSE_SIZE) / 2}
      onPress={onPress}
      style={({ pressed }) => [styles.close, pressed && styles.closePressed]}
    >
      <Icon ios="xmark" android="close" color={COLORS.text} size={16} />
    </Pressable>
  );
}

/**
 * Follows Pinsan's head on the UI thread, clamped inside the area and above the keyboard, and
 * springs in (scale 0.9 → 1 with a fade) once the bubble's size is known. `limit` keeps a tall
 * reply inside that space, scrolling, so its buttons never hide behind the composer.
 */
function useBubbleMotion(
  area: BubbleArea,
  keyboardHeight: SharedValue<number>,
  width: number,
  delayMs = 0,
) {
  const anchor = usePinsanAnchor();
  const height = useSharedValue(0);
  const appear = useSharedValue(0);
  const measured = useRef(false);

  const onLayout = (event: LayoutChangeEvent) => {
    height.set(event.nativeEvent.layout.height);
    if (measured.current) return;
    measured.current = true;
    appear.set(withDelay(delayMs, withSpring(1, SPRING)));
  };

  // The lowest the bubble may reach: above the mic, or above the composer and the keyboard.
  const bottom = useDerivedValue(() => {
    const raised = Math.abs(keyboardHeight.value);
    return raised > 0
      ? Math.min(area.bottom, area.height - raised - KEYBOARD_CLEARANCE)
      : area.bottom;
  });

  const spot = useDerivedValue(() =>
    placeBubble(anchor.value, { ...area, bottom: bottom.value }, width, height.value, TAIL_INSET),
  );

  const limit = useAnimatedStyle(() => ({
    maxHeight: Math.max(0, bottom.value - area.top - TAIL_LENGTH),
  }));

  const frame = useAnimatedStyle(() => ({
    opacity: Math.min(appear.value, 1),
    transform: [
      { translateX: spot.value.x },
      { translateY: spot.value.y },
      { scale: 0.9 + 0.1 * appear.value },
    ],
  }));

  const tail = useAnimatedStyle(() => ({
    opacity: spot.value.tailVisible ? 1 : 0,
    transform: [{ translateX: spot.value.tailX - TAIL_SQUARE / 2 }, { rotate: '45deg' }],
  }));

  return { frame, tail, limit, onLayout };
}

const styles = StyleSheet.create({
  layer: {
    ...StyleSheet.absoluteFill,
  },
  bubble: {
    position: 'absolute',
    top: 0,
    left: 0,
    borderRadius: RADII.xl,
    backgroundColor: COLORS.surface,
    // Scale from the tail, so the bubble grows out of Pinsan's head.
    transformOrigin: 'bottom',
    ...SHADOWS.card,
  },
  tail: {
    position: 'absolute',
    bottom: -TAIL_SQUARE / 2,
    left: 0,
    width: TAIL_SQUARE,
    height: TAIL_SQUARE,
    borderRadius: 3,
    backgroundColor: COLORS.surface,
  },
  scroll: {
    flexGrow: 0,
    flexShrink: 1,
    borderRadius: RADII.xl,
  },
  // Compact, so a Quick Add proposal fits between the title and Pinsan's head.
  content: {
    gap: SPACING.sm + SPACING.xs,
    padding: SPACING.md,
  },
  close: {
    width: CLOSE_SIZE,
    height: CLOSE_SIZE,
    marginStart: 'auto',
    marginEnd: -SPACING.xs,
    marginTop: -SPACING.xs,
    borderRadius: RADII.pill,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.surfaceMuted,
  },
  closePressed: {
    transform: [{ scale: 0.9 }],
  },
  aside: {
    fontSize: FONT_SIZES.body,
    lineHeight: 22,
    color: COLORS.textMuted,
  },
  thinking: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING.sm,
    minHeight: 52,
    paddingHorizontal: SPACING.md,
  },
  thinkingText: {
    fontSize: FONT_SIZES.body,
    color: COLORS.textMuted,
  },
});
