import { router } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet, TextInput, View } from 'react-native';

import { Icon } from '@/components/ui/icon';
import { IconButton } from '@/components/ui/icon-button';
import { Notice } from '@/components/ui/notice';
import { Text } from '@/components/ui/text';
import { COLORS, FONT_SIZES, FONTS, RADII, SHADOWS, SPACING } from '@/constants/theme';
import type { AiAvailability } from '@/features/ai-setup';
import { useDictation, type DictationState } from '@/hooks/use-dictation';
import { stopSpeaking } from '@/lib/audio/speak';

// Long enough for any request; stops a forgotten mic from listening on.
const MAX_RECORDING_MS = 30_000;
const MAX_MESSAGE_LENGTH = 500;

type ChatComposerProps = {
  busy: boolean;
  /** Voice uses the on-device speech model, so it needs the AI download. */
  voice: AiAvailability;
  onSend: (text: string, spoken: boolean) => void;
};

/** Where requests are typed or spoken. Both end up as the same text message. */
export function ChatComposer({ busy, voice, onSend }: ChatComposerProps) {
  const [text, setText] = useState('');
  const [heardNothing, setHeardNothing] = useState(false);
  const { state, start, stop, reset } = useDictation();
  const listening = state.phase === 'listening';
  const recording = listening || state.phase === 'loading' || state.phase === 'transcribing';

  const sendText = () => {
    const trimmed = text.trim();
    if (!trimmed || busy || recording) return;
    setText('');
    onSend(trimmed, false);
  };

  const finishRecording = useCallback(async () => {
    const transcript = await stop();
    // null means it failed; the dictation state says why.
    if (transcript === null) return;
    if (transcript === '') setHeardNothing(true);
    else onSend(transcript, true);
  }, [stop, onSend]);

  const toggleMic = async () => {
    setHeardNothing(false);
    if (voice === 'needs-setup') {
      router.push('/ai-setup');
      return;
    }
    if (listening) {
      await finishRecording();
      return;
    }
    reset();
    // The microphone mustn't hear the app reading a reply aloud.
    await stopSpeaking();
    await start();
  };

  useEffect(() => {
    if (!listening) return;
    const timer = setTimeout(finishRecording, MAX_RECORDING_MS);
    return () => clearTimeout(timer);
  }, [listening, finishRecording]);

  return (
    <View style={styles.container}>
      <VoiceStatus state={state} heardNothing={heardNothing} />
      <View style={styles.row}>
        <TextInput
          value={text}
          onChangeText={setText}
          placeholder={listening ? 'Listening…' : 'Ask about tasks or reminders'}
          placeholderTextColor={COLORS.textMuted}
          cursorColor={COLORS.text}
          selectionColor={COLORS.primary}
          accessibilityLabel="Message"
          editable={!recording}
          multiline
          maxLength={MAX_MESSAGE_LENGTH}
          returnKeyType="send"
          submitBehavior="submit"
          onSubmitEditing={sendText}
          style={styles.input}
        />
        {voice !== 'unsupported' && (
          <IconButton
            accessibilityLabel={listening ? 'Stop recording' : 'Speak a request'}
            accessibilityHint={voice === 'needs-setup' ? 'Opens on-device AI setup' : undefined}
            variant={listening ? 'danger' : 'plain'}
            icon={
              <Icon
                ios={listening ? 'stop.fill' : 'mic.fill'}
                android={listening ? 'stop' : 'mic'}
                color={listening ? COLORS.onPrimary : COLORS.text}
              />
            }
            onPress={toggleMic}
            disabled={busy || state.phase === 'loading' || state.phase === 'transcribing'}
          />
        )}
        <IconButton
          accessibilityLabel="Send"
          variant="primary"
          icon={<Icon ios="arrow.up" android="arrow_upward" color={COLORS.onPrimary} />}
          onPress={sendText}
          disabled={busy || recording || text.trim() === ''}
        />
      </View>
    </View>
  );
}

function VoiceStatus({ state, heardNothing }: { state: DictationState; heardNothing: boolean }) {
  switch (state.phase) {
    case 'loading':
      return <Working text="Getting ready…" />;
    case 'listening':
      return (
        <View style={styles.transcript} accessibilityLiveRegion="polite">
          <Text style={styles.label}>Listening… tap stop when you&apos;re done</Text>
          <Text style={styles.transcriptText}>{state.transcript || '…'}</Text>
        </View>
      );
    case 'transcribing':
      return <Working text="Working out what you said…" />;
    case 'error':
      return <Notice text={state.message} />;
    case 'idle':
      return heardNothing ? (
        <Text style={styles.hint} accessibilityLiveRegion="polite">
          I didn&apos;t catch that. Tap the mic and try again.
        </Text>
      ) : null;
  }
}

function Working({ text }: { text: string }) {
  return (
    <View style={styles.working} accessibilityLiveRegion="polite">
      <ActivityIndicator color={COLORS.primaryDark} />
      <Text style={styles.hint}>{text}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: SPACING.sm,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: COLORS.border,
    backgroundColor: COLORS.background,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: SPACING.sm,
  },
  input: {
    flex: 1,
    minHeight: 48,
    maxHeight: 120,
    paddingHorizontal: SPACING.md,
    paddingTop: 13,
    paddingBottom: 13,
    borderRadius: RADII.lg,
    borderWidth: 1.5,
    borderColor: COLORS.borderStrong,
    backgroundColor: COLORS.surface,
    fontFamily: FONTS.body,
    fontSize: FONT_SIZES.body,
    color: COLORS.text,
  },
  transcript: {
    gap: SPACING.xs,
    padding: SPACING.md,
    borderRadius: RADII.lg,
    backgroundColor: COLORS.surface,
    ...SHADOWS.card,
  },
  label: {
    fontFamily: FONTS.bodyBold,
    fontSize: FONT_SIZES.caption,
    color: COLORS.textMuted,
  },
  transcriptText: {
    fontSize: FONT_SIZES.body,
    lineHeight: 22,
    color: COLORS.text,
  },
  working: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
  },
  hint: {
    fontSize: FONT_SIZES.body,
    color: COLORS.textMuted,
  },
});
