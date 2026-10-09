import { Link } from 'expo-router';
import { ActivityIndicator, ScrollView, StyleSheet, Text, View } from 'react-native';

import { Button } from '@/components/ui/button';
import { Notice } from '@/components/ui/notice';
import { COLORS, FONT_SIZES, RADII, SPACING } from '@/constants/theme';
import { useAiAvailability } from '@/features/ai-setup';

import { useVoiceNote, type VoiceNoteState } from '../hooks/use-voice-note';
import { MicIcon } from './mic-icon';
import { VoiceDraftEditor } from './voice-draft-editor';

// Every phase but 'draft', which opens the draft in the editor instead.
type RecordingState = Exclude<VoiceNoteState, { phase: 'draft' }>;

type VoiceNoteRecorderProps = {
  /** Called once the note is saved or discarded, or the user closes after a problem. */
  onClose: () => void;
};

export function VoiceNoteRecorder({ onClose }: VoiceNoteRecorderProps) {
  const availability = useAiAvailability();

  if (availability === 'unsupported') {
    return (
      <Hint text="Voice notes need Android 13 or newer, or iOS 17 or newer. You can still type notes." />
    );
  }
  if (availability === 'needs-setup') {
    return (
      <View style={styles.section}>
        <Hint text="Voice notes use on-device AI. Set it up once, then it works offline." />
        <Link href="/ai-setup" asChild>
          <Button label="Set up AI" />
        </Link>
      </View>
    );
  }
  return <Recorder onClose={onClose} />;
}

function Recorder({ onClose }: VoiceNoteRecorderProps) {
  const { state, start, stop, reset } = useVoiceNote();

  if (state.phase === 'draft') {
    return (
      <VoiceDraftEditor
        transcript={state.transcript}
        draft={state.draft}
        aiFailed={state.aiFailed}
        onClose={onClose}
      />
    );
  }
  return (
    <ScrollView contentContainerStyle={styles.section}>
      <PhaseBody state={state} />
      <PhaseActions state={state} onStart={start} onStop={stop} onReset={reset} onClose={onClose} />
    </ScrollView>
  );
}

function PhaseBody({ state }: { state: RecordingState }) {
  switch (state.phase) {
    case 'idle':
      return <Hint text={'Tap Record and speak. Try: "List this: eggs, milk and bread."'} />;
    case 'loading':
      return <Busy text="Getting ready…" />;
    case 'listening':
      return <Transcript label="Listening…" text={state.transcript || '…'} />;
    case 'drafting':
      return (
        <>
          <Transcript label="You said" text={state.transcript || '…'} />
          <Busy text="Writing your note…" />
        </>
      );
    case 'empty':
      return <Hint text="I didn't catch anything, so nothing was saved." />;
    case 'error':
      return <Notice text={state.message} />;
  }
}

type PhaseActionsProps = {
  state: RecordingState;
  onStart: () => void;
  onStop: () => void;
  onReset: () => void;
  onClose: () => void;
};

function PhaseActions({ state, onStart, onStop, onReset, onClose }: PhaseActionsProps) {
  switch (state.phase) {
    case 'idle':
      return (
        <Button label="Record" icon={<MicIcon color={COLORS.onPrimary} />} onPress={onStart} />
      );
    case 'listening':
      return <Button label="Stop" onPress={onStop} />;
    case 'empty':
    case 'error':
      return (
        <View style={styles.actions}>
          <Button label="Record again" onPress={onReset} />
          <Button label="Close" variant="ghost" onPress={onClose} />
        </View>
      );
    case 'loading':
    case 'drafting':
      return null;
  }
}

function Hint({ text }: { text: string }) {
  return <Text style={styles.hint}>{text}</Text>;
}

function Busy({ text }: { text: string }) {
  return (
    <View style={styles.busy} accessibilityLiveRegion="polite">
      <ActivityIndicator color={COLORS.primary} />
      <Text style={styles.hint}>{text}</Text>
    </View>
  );
}

function Transcript({ label, text }: { label: string; text: string }) {
  return (
    <View style={styles.card} accessibilityLiveRegion="polite">
      <Text style={styles.label}>{label}</Text>
      <Text style={styles.transcript}>{text}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  section: {
    gap: SPACING.md,
    padding: SPACING.md,
  },
  actions: {
    gap: SPACING.sm,
  },
  card: {
    gap: SPACING.sm,
    padding: SPACING.md,
    borderRadius: RADII.md,
    backgroundColor: COLORS.surface,
  },
  label: {
    fontSize: FONT_SIZES.caption,
    fontWeight: '600',
    color: COLORS.textMuted,
  },
  transcript: {
    fontSize: FONT_SIZES.body,
    lineHeight: 24,
    color: COLORS.text,
  },
  hint: {
    fontSize: FONT_SIZES.body,
    lineHeight: 24,
    color: COLORS.textMuted,
  },
  busy: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
  },
});
