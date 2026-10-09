import { LinearGradient } from 'expo-linear-gradient';
import { memo, useState } from 'react';
import { Keyboard, Pressable, StyleSheet, View, type LayoutChangeEvent } from 'react-native';
import {
  KeyboardStickyView,
  useReanimatedKeyboardAnimation,
} from 'react-native-keyboard-controller';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Icon } from '@/components/ui/icon';
import { IconButton } from '@/components/ui/icon-button';
import { Text } from '@/components/ui/text';
import { COLORS, FONT_SIZES, FONTS, RADII, SKY, SPACING } from '@/constants/theme';
import { Mascot } from '@/features/mascot';
import { MENU_BUTTON_SIZE } from '@/features/menu';

import { useTalkToPinsan, type TalkStage } from '../hooks/use-talk-to-pinsan';
import type { BubbleArea } from '../place-bubble';
import { HomeComposer } from './home-composer';
import { MicButton } from './mic-button';
import { PaperNote } from './paper-note';
import { PinsanBubble, ThinkingBubble } from './pinsan-bubble';

// Under the mic: what a tap does now.
const MIC_HINTS: Record<TalkStage, string> = {
  idle: 'Tap to talk',
  starting: 'Getting ready…',
  listening: "Tap when you're done",
  transcribing: 'Writing it down…',
  thinking: 'Thinking…',
};

const NOTE_LABELS: Record<TalkStage, string> = {
  idle: 'You said',
  starting: 'Getting ready…',
  listening: 'Listening…',
  transcribing: 'Writing it down…',
  thinking: 'You said',
};

// Kept out of Home's re-renders: the transcript and the text box update it often.
const Scene = memo(function Scene() {
  return (
    <View style={StyleSheet.absoluteFill}>
      <Mascot />
    </View>
  );
});

/**
 * Home: Pinsan's island, full screen. Talk to him with the mic, or type with the keyboard
 * button; he answers in a speech bubble over his head. The top-right corner stays empty for
 * the menu button, which the route draws over this screen.
 */
export function HomeScreen() {
  const insets = useSafeAreaInsets();
  const talk = useTalkToPinsan();
  const { height: keyboardHeight } = useReanimatedKeyboardAnimation();
  const [size, setSize] = useState({ width: 0, height: 0 });
  const [bottomTop, setBottomTop] = useState(0);

  const area: BubbleArea = {
    width: size.width,
    height: size.height,
    // Below the menu button, which the route floats SPACING.sm under the status bar.
    top: insets.top + SPACING.sm + MENU_BUTTON_SIZE + SPACING.md,
    bottom: (bottomTop || size.height) - SPACING.md,
  };
  const measured = size.width > 0;
  const { stage } = talk;
  const recording = stage === 'starting' || stage === 'listening' || stage === 'transcribing';
  const showNote =
    stage === 'listening' || stage === 'transcribing' || (stage === 'thinking' && !!talk.words);
  // Tapping anywhere else closes the keyboard (a question waiting stays up), or the bubble.
  const backdrop = talk.composerOpen || (talk.bubble !== null && stage === 'idle');
  const tapBackdrop = talk.composerOpen ? () => Keyboard.dismiss() : talk.dismiss;

  const onLayout = (event: LayoutChangeEvent) => {
    const { width, height } = event.nativeEvent.layout;
    setSize({ width, height });
  };

  return (
    <LinearGradient colors={SKY.day} style={styles.fill} onLayout={onLayout}>
      <Scene />

      {backdrop && (
        <Pressable
          accessible={false}
          importantForAccessibility="no"
          onPress={tapBackdrop}
          style={StyleSheet.absoluteFill}
        />
      )}

      {measured &&
        (stage === 'thinking' ? (
          <ThinkingBubble area={area} keyboardHeight={keyboardHeight} />
        ) : talk.bubble ? (
          <PinsanBubble
            key={talk.bubble.key}
            reply={talk.bubble.reply}
            aside={talk.bubble.aside}
            area={area}
            keyboardHeight={keyboardHeight}
            answerable={talk.answerable}
            interactive={!recording}
            onPick={talk.answerPick}
            onConfirm={talk.answerConfirm}
            onSend={talk.answerFill}
            onEdit={talk.editProposal}
            onDismiss={talk.dismiss}
          />
        ) : null)}

      <View
        pointerEvents="box-none"
        onLayout={(event) => setBottomTop(event.nativeEvent.layout.y)}
        style={[styles.bottom, { paddingBottom: insets.bottom + SPACING.md }]}
      >
        {showNote && (
          <PaperNote
            label={NOTE_LABELS[stage]}
            words={talk.words ?? ''}
            placeholder="Go ahead, I'm listening…"
            // Once there are words to clear. The mic is surely on by then.
            onStartOver={stage === 'listening' && talk.words ? talk.startOver : undefined}
          />
        )}
        {talk.composerOpen ? (
          // Rides up with the keyboard, to just above it.
          <KeyboardStickyView offset={{ opened: insets.bottom + SPACING.md - SPACING.sm }}>
            <HomeComposer
              value={talk.draft}
              onChangeText={talk.setDraft}
              onSubmit={talk.submitDraft}
              onClose={talk.closeComposer}
              busy={stage === 'thinking'}
            />
          </KeyboardStickyView>
        ) : (
          <View pointerEvents="box-none" style={styles.controls}>
            <View style={styles.side}>
              <IconButton
                accessibilityLabel="Type to Pinsan"
                accessibilityHint="Opens a text box"
                icon={<Icon ios="keyboard" android="keyboard" color={COLORS.text} />}
                onPress={talk.openComposer}
                // Open while Pinsan thinks too, for a call for help.
                disabled={recording}
                style={styles.keyboardButton}
              />
            </View>
            <View style={styles.micColumn}>
              <MicButton stage={stage} onPress={talk.toggleMic} />
              <View
                accessibilityElementsHidden
                importantForAccessibility="no-hide-descendants"
                style={styles.hint}
              >
                <Text style={styles.hintText}>{MIC_HINTS[stage]}</Text>
              </View>
            </View>
            {/* Balances the keyboard button, so the mic stays centered. */}
            <View style={styles.side} />
          </View>
        )}
      </View>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  bottom: {
    position: 'absolute',
    left: SPACING.md,
    right: SPACING.md,
    bottom: 0,
    gap: SPACING.md,
  },
  controls: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'center',
    gap: SPACING.lg,
  },
  side: {
    width: 56,
    height: 76,
    justifyContent: 'center',
    alignItems: 'center',
  },
  keyboardButton: {
    width: 56,
    height: 56,
  },
  micColumn: {
    alignItems: 'center',
    gap: SPACING.sm,
  },
  hint: {
    paddingHorizontal: SPACING.sm + SPACING.xs,
    paddingVertical: SPACING.xs,
    borderRadius: RADII.pill,
    backgroundColor: COLORS.surfaceTranslucent,
  },
  hintText: {
    fontFamily: FONTS.bodyBold,
    fontSize: FONT_SIZES.caption,
    color: COLORS.ink,
  },
});
