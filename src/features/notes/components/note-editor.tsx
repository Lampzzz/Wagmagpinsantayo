import { Stack } from 'expo-router';
import { useCallback, useMemo } from 'react';
import { ActivityIndicator, Alert, StyleSheet, View } from 'react-native';
import { KeyboardAvoidingView } from 'react-native-keyboard-controller';

import { Button } from '@/components/ui/button';
import { HeaderButton } from '@/components/ui/header-button';
import { Notice } from '@/components/ui/notice';
import { Text } from '@/components/ui/text';
import { COLORS, FONT_SIZES, SPACING } from '@/constants/theme';
import { formatShortDate } from '@/utils/format-short-date';

import { useNoteEditor, type NoteEditorStatus } from '../hooks/use-note-editor';
import { useUnsavedGuard, type LeaveConfirmation } from '../hooks/use-unsaved-guard';
import { NoteAiTools } from './note-ai-tools';
import { NoteFields } from './note-fields';

const UNSAVED_CHANGES: LeaveConfirmation = {
  title: "Your latest changes aren't saved",
  message: 'If you leave now, they will be lost.',
  stayLabel: 'Stay',
  leaveLabel: 'Leave',
};

type NoteEditorProps = {
  /** The note's id from the route. Leave it out to start a new note. */
  noteId?: string;
  onDeleted: () => void;
};

export function NoteEditor({ noteId, onDeleted }: NoteEditorProps) {
  const editor = useNoteEditor(noteId);
  const { remove } = editor;
  const allowLeave = useUnsavedGuard(editor.saveFailed, UNSAVED_CHANGES);

  const confirmDelete = useCallback(() => {
    Alert.alert('Delete this note?', "This can't be undone.", [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          if (await remove()) {
            allowLeave();
            onDeleted();
          } else {
            Alert.alert("Couldn't delete the note", 'Please try again.');
          }
        },
      },
    ]);
  }, [remove, allowLeave, onDeleted]);

  // Delete appears once the note is stored, so this option is set here rather
  // than in the root layout. Memoized because each new object is applied again.
  const screenOptions = useMemo(
    () => ({
      headerRight:
        editor.noteId === null
          ? undefined
          : () => <HeaderButton label="Delete" tone="danger" onPress={confirmDelete} />,
    }),
    [editor.noteId, confirmDelete],
  );

  return (
    <>
      <Stack.Screen options={screenOptions} />
      {editor.status === 'ready' ? (
        <KeyboardAvoidingView behavior="padding" automaticOffset style={styles.editor}>
          <NoteTimes createdAt={editor.createdAt} updatedAt={editor.updatedAt} />
          {editor.saveFailed && (
            <Notice text="Couldn't save your latest changes. Keep editing to try again." />
          )}
          <NoteAiTools
            getContent={editor.getContent}
            getNoteId={editor.getNoteId}
            onReplace={editor.replaceContent}
          />
          <NoteFields
            // Inserting a summary replaces the content, so the fields remount with it.
            key={editor.revision}
            initial={editor.initial}
            onChange={editor.onChange}
            autoFocus={noteId === undefined && editor.revision === 0}
          />
        </KeyboardAvoidingView>
      ) : (
        <View style={styles.message}>
          <StatusMessage status={editor.status} onRetry={editor.retry} />
        </View>
      )}
    </>
  );
}

function NoteTimes({ createdAt, updatedAt }: { createdAt?: number; updatedAt?: number }) {
  if (createdAt === undefined || updatedAt === undefined) return null;
  const created = `Created ${formatShortDate(createdAt)}`;
  return (
    <Text style={styles.caption}>
      {updatedAt > createdAt ? `${created} · Edited ${formatShortDate(updatedAt)}` : created}
    </Text>
  );
}

type StatusMessageProps = {
  status: Exclude<NoteEditorStatus, 'ready'>;
  onRetry: () => void;
};

function StatusMessage({ status, onRetry }: StatusMessageProps) {
  switch (status) {
    case 'loading':
      return <ActivityIndicator color={COLORS.primaryDark} />;
    case 'missing':
      return (
        <Text style={styles.hint}>{"This note doesn't exist. It may have been deleted."}</Text>
      );
    case 'error':
      return (
        <>
          <Notice text="Couldn't open this note." />
          <Button label="Try again" onPress={onRetry} />
        </>
      );
  }
}

const styles = StyleSheet.create({
  editor: {
    flex: 1,
    gap: SPACING.sm,
    padding: SPACING.md,
  },
  caption: {
    fontSize: FONT_SIZES.caption,
    color: COLORS.textMuted,
  },
  message: {
    flex: 1,
    gap: SPACING.md,
    padding: SPACING.md,
    justifyContent: 'center',
  },
  hint: {
    fontSize: FONT_SIZES.body,
    lineHeight: 24,
    color: COLORS.textMuted,
    textAlign: 'center',
  },
});
