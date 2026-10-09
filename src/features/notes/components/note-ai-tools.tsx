import { Link, router } from 'expo-router';
import { useEffect } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';

import { Card } from '@/components/ui/card';
import { Chip } from '@/components/ui/chip';
import { Notice } from '@/components/ui/notice';
import { Text } from '@/components/ui/text';
import { COLORS, FONT_SIZES, FONTS, SPACING } from '@/constants/theme';
import { useAiAvailability } from '@/features/ai-setup';

import { useNoteAi, type NoteAiState } from '../hooks/use-note-ai';
import { useTaskReviewStore, type TaskReviewOutcome } from '../hooks/use-task-review';
import type { NoteContent } from '../types';
import { SummaryCard } from './summary-card';

type NoteAiToolsProps = {
  /** The note as the editor shows it now. */
  getContent: () => NoteContent;
  /** The stored note's id, or null while it has no row yet. */
  getNoteId: () => number | null;
  /** Shows new content in the editor and saves it like any other edit. */
  onReplace: (content: NoteContent) => void;
};

/** The note editor's on-device AI tools: Summarize and Extract tasks. */
export function NoteAiTools(props: NoteAiToolsProps) {
  const availability = useAiAvailability();

  if (availability === 'unsupported') {
    return (
      <Text style={styles.hint}>
        Summarize and Extract tasks need Android 13 or newer, or iOS 17 or newer.
      </Text>
    );
  }
  if (availability === 'needs-setup') {
    return (
      <View style={styles.row}>
        <Link href="/ai-setup" asChild>
          <Chip label="Set up AI" accessibilityHint="Opens the one-time AI setup" />
        </Link>
        <Text style={[styles.hint, styles.fill]}>to summarize notes and find tasks offline.</Text>
      </View>
    );
  }
  return <ReadyTools {...props} />;
}

function ReadyTools({ getContent, getNoteId, onReplace }: NoteAiToolsProps) {
  const ai = useNoteAi({ getContent, getNoteId, onReplace });
  const outcome = useTaskReviewStore((store) => store.outcome);
  const clearOutcome = useTaskReviewStore((store) => store.clearOutcome);
  const busy = ai.state.phase === 'working';

  // What the review sheet saved belongs to this visit to the note.
  useEffect(() => clearOutcome, [clearOutcome]);

  return (
    <View style={styles.tools}>
      <View style={styles.row}>
        <Chip
          label="Summarize"
          accessibilityHint="Writes the main points of this note. The note doesn't change."
          disabled={busy}
          onPress={ai.summarize}
        />
        <Chip
          label="Extract tasks"
          accessibilityHint="Finds the to-dos in this note for you to review before saving"
          disabled={busy}
          onPress={ai.extract}
        />
      </View>
      <ToolStatus
        state={ai.state}
        onRetry={ai.retry}
        onDismiss={ai.dismiss}
        onInsert={ai.insertSummary}
        onShare={ai.shareSummary}
      />
      {outcome && <SavedTasks outcome={outcome} onDismiss={clearOutcome} />}
    </View>
  );
}

type ToolStatusProps = {
  state: NoteAiState;
  onRetry: () => void;
  onDismiss: () => void;
  onInsert: () => void;
  onShare: () => void;
};

function ToolStatus({ state, onRetry, onDismiss, onInsert, onShare }: ToolStatusProps) {
  switch (state.phase) {
    case 'idle':
      return null;
    case 'working':
      return (
        <View style={styles.status}>
          <View accessibilityLiveRegion="polite" style={styles.row}>
            <ActivityIndicator color={COLORS.primaryDark} />
            <Text style={[styles.statusText, styles.fill]}>Pinsan is reading your note…</Text>
          </View>
          {state.long && (
            <Notice text="This note is long (over 1,500 words), so I may miss details." />
          )}
        </View>
      );
    case 'summary':
      return (
        <SummaryCard
          bullets={state.bullets}
          long={state.long}
          onInsert={onInsert}
          onShare={onShare}
          onDiscard={onDismiss}
        />
      );
    case 'empty':
      return <Message text="Write something first, then I can read it." onDismiss={onDismiss} />;
    case 'too-short':
      return (
        <Message
          text="This note is already short, so there's nothing to summarize."
          onDismiss={onDismiss}
        />
      );
    case 'no-tasks':
      return (
        <Message
          text="I didn't find any tasks in this note, so nothing was created."
          onDismiss={onDismiss}
        />
      );
    case 'failed':
      return (
        <View style={styles.status}>
          <Notice text={failureText(state)} />
          <View style={styles.row}>
            <Chip label="Try again" onPress={onRetry} />
            <Chip label="Dismiss" onPress={onDismiss} />
          </View>
        </View>
      );
  }
}

function failureText({ tool, reason }: Extract<NoteAiState, { phase: 'failed' }>): string {
  const unchanged = tool === 'summarize' ? "Your note hasn't changed." : 'Nothing was saved.';
  if (reason === 'timeout') return `Hmm, that took too long, so I stopped. ${unchanged}`;
  return tool === 'summarize'
    ? `Hmm, I couldn't summarize this note. ${unchanged}`
    : `Hmm, I couldn't read the tasks in this note. ${unchanged}`;
}

function Message({ text, onDismiss }: { text: string; onDismiss: () => void }) {
  return (
    <View style={styles.row}>
      <Text accessibilityLiveRegion="polite" style={[styles.statusText, styles.fill]}>
        {text}
      </Text>
      <Chip label="OK" onPress={onDismiss} />
    </View>
  );
}

function SavedTasks({ outcome, onDismiss }: { outcome: TaskReviewOutcome; onDismiss: () => void }) {
  return (
    <Card accessibilityLiveRegion="polite" style={styles.saved}>
      <Text style={styles.savedTitle}>{outcome.title}</Text>
      {outcome.detail ? <Text style={styles.savedDetail}>{outcome.detail}</Text> : null}
      <View style={styles.row}>
        {/* navigate goes back to the open tabs rather than stacking a second copy. */}
        <Chip label="View tasks" onPress={() => router.navigate('/tasks')} />
        <Chip label="OK" onPress={onDismiss} />
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  tools: {
    gap: SPACING.sm,
  },
  row: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: SPACING.sm,
  },
  fill: {
    flexShrink: 1,
    flexGrow: 1,
  },
  status: {
    gap: SPACING.sm,
  },
  statusText: {
    fontSize: FONT_SIZES.body,
    lineHeight: 22,
  },
  hint: {
    fontSize: FONT_SIZES.caption,
    color: COLORS.textMuted,
  },
  saved: {
    gap: SPACING.sm,
    backgroundColor: COLORS.successSurface,
  },
  savedTitle: {
    fontFamily: FONTS.display,
    fontSize: FONT_SIZES.body,
    color: COLORS.success,
  },
  savedDetail: {
    fontSize: FONT_SIZES.body,
    lineHeight: 22,
  },
});
