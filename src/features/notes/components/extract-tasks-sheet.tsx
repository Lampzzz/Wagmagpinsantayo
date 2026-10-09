import { useCallback, useEffect, useRef, useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';

import { Button } from '@/components/ui/button';
import { Chip } from '@/components/ui/chip';
import { Notice } from '@/components/ui/notice';
import { Text } from '@/components/ui/text';
import { COLORS, FONT_SIZES, FONTS, SPACING } from '@/constants/theme';
import { useMascot } from '@/features/mascot';
import type { AlertOutcome } from '@/features/reminders';
import { useNow } from '@/hooks/use-now';

import { saveTaskSuggestions } from '../api/save-task-suggestions';
import { useTaskReviewStore, type TaskReview } from '../hooks/use-task-review';
import { describeSave, saveFailureText, saveLabel } from '../task-suggestions';
import { TaskSuggestionRow, type ReviewRow } from './task-suggestion-row';

type ExtractTasksSheetProps = {
  /** The `noteId` route param: whose suggestions to review. */
  noteId: string | undefined;
  /** Closes the sheet. */
  onClose: () => void;
};

/**
 * The review sheet for Extract tasks. Android sheets have no native header, so the
 * title and Save button sit in the body. Nothing is saved until the user taps Save.
 */
export function ExtractTasksSheet({ noteId, onClose }: ExtractTasksSheetProps) {
  // Read once: from here on, the rows are the user's working copy.
  const [review] = useState(() => {
    const pending = useTaskReviewStore.getState().review;
    return pending && pending.noteKey === noteId ? pending : null;
  });
  return (
    <View style={styles.sheet}>
      {review ? (
        <Review review={review} onClose={onClose} />
      ) : (
        <NothingToReview onClose={onClose} />
      )}
    </View>
  );
}

function Review({ review, onClose }: { review: TaskReview; onClose: () => void }) {
  const now = useNow();
  const { setMood } = useMascot();
  const finishReview = useTaskReviewStore((store) => store.finishReview);
  const cancelReview = useTaskReviewStore((store) => store.cancelReview);
  const [rows, setRows] = useState<ReviewRow[]>(() =>
    review.suggestions.map((suggestion) => ({ ...suggestion, checked: true })),
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // Totals across save attempts, so a retry still reports every task saved.
  const totalsRef = useRef<{ saved: number; alerts: AlertOutcome[] }>({ saved: 0, alerts: [] });
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  const toSave = rows.filter((row) => row.checked && row.title.trim() !== '');

  const toggle = useCallback((key: string) => {
    setRows((current) =>
      current.map((row) => (row.key === key ? { ...row, checked: !row.checked } : row)),
    );
  }, []);

  const rename = useCallback((key: string, title: string) => {
    setRows((current) => current.map((row) => (row.key === key ? { ...row, title } : row)));
  }, []);

  const remove = useCallback((key: string) => {
    setRows((current) => current.filter((row) => row.key !== key));
  }, []);

  const cancel = () => {
    cancelReview();
    onClose();
  };

  const save = async () => {
    if (saving || toSave.length === 0) return;
    setSaving(true);
    setError(null);
    const items = toSave.map((row) => ({ ...row, title: row.title.trim() }));
    const { savedKeys, alerts } = await saveTaskSuggestions(items);
    const totals = totalsRef.current;
    totals.saved += savedKeys.length;
    totals.alerts.push(...alerts);

    if (savedKeys.length === items.length) {
      finishReview(describeSave(totals));
      setMood('done');
      // The user may have swiped the sheet away while it saved; then it's already closed.
      if (mountedRef.current) onClose();
      return;
    }
    if (!mountedRef.current) return;
    // Only what's left stays in the list, so trying again never saves a task twice.
    const saved = new Set(savedKeys);
    setRows((current) => current.filter((row) => !saved.has(row.key)));
    setError(saveFailureText(items.length - savedKeys.length, totals.saved));
    setSaving(false);
    setMood('oops');
  };

  return (
    <>
      <View style={styles.header}>
        <Text accessibilityRole="header" style={styles.title}>
          Review tasks
        </Text>
        <Chip label="Cancel" disabled={saving} onPress={cancel} />
      </View>
      <Text style={styles.hint}>
        I found these in your note. Untick, edit or remove any. Nothing is saved until you tap Save.
      </Text>
      {review.long && (
        <Notice text="This note is long (over 1,500 words), so I may have missed some tasks." />
      )}
      {error && <Notice text={error} />}
      <Button
        label={saving ? 'Saving…' : saveLabel(toSave.length)}
        disabled={saving || toSave.length === 0}
        onPress={save}
      />
      <ScrollView
        style={styles.list}
        contentContainerStyle={styles.listContent}
        keyboardShouldPersistTaps="handled"
      >
        {rows.length === 0 ? (
          <Text style={styles.hint}>No tasks left. Tap Cancel to go back to your note.</Text>
        ) : (
          rows.map((row) => (
            <TaskSuggestionRow
              key={row.key}
              row={row}
              now={now}
              disabled={saving}
              onToggle={toggle}
              onChangeTitle={rename}
              onRemove={remove}
            />
          ))
        )}
      </ScrollView>
    </>
  );
}

function NothingToReview({ onClose }: { onClose: () => void }) {
  return (
    <>
      <Text accessibilityRole="header" style={styles.title}>
        Nothing to review
      </Text>
      <Text style={styles.hint}>Open a note and tap Extract tasks to find its to-dos.</Text>
      <Button label="Close" variant="ghost" onPress={onClose} />
    </>
  );
}

const styles = StyleSheet.create({
  sheet: {
    flex: 1,
    gap: SPACING.md,
    paddingHorizontal: SPACING.md,
    paddingTop: SPACING.lg,
    backgroundColor: COLORS.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: SPACING.sm,
  },
  title: {
    flexShrink: 1,
    fontFamily: FONTS.display,
    fontSize: FONT_SIZES.heading,
  },
  hint: {
    fontSize: FONT_SIZES.body,
    lineHeight: 22,
    color: COLORS.textMuted,
  },
  list: {
    flex: 1,
  },
  listContent: {
    gap: SPACING.sm,
    paddingBottom: SPACING.xl,
  },
});
