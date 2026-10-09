import { Link, router } from 'expo-router';
import { memo, useCallback } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  StyleSheet,
  View,
  type ListRenderItem,
} from 'react-native';

import { Button } from '@/components/ui/button';
import { Notice } from '@/components/ui/notice';
import { Text } from '@/components/ui/text';
import {
  COLORS,
  FONT_SIZES,
  FONTS,
  PRESSED_SCALE,
  RADII,
  SHADOWS,
  SPACING,
} from '@/constants/theme';
import { formatShortDate } from '@/utils/format-short-date';

import { useNotes } from '../hooks/use-notes';
import type { NoteSummary } from '../types';
import { MicIcon } from './mic-icon';

/** Every note, last edited first, with buttons to write or record a new one. */
export function NotesList() {
  const { status, notes, retry } = useNotes();

  const openNote = useCallback((id: number) => {
    router.push({ pathname: '/notes/[id]', params: { id: String(id) } });
  }, []);

  const renderItem = useCallback<ListRenderItem<NoteSummary>>(
    ({ item }) => <NoteRow note={item} onOpen={openNote} />,
    [openNote],
  );

  return (
    <View style={styles.container}>
      {status === 'ready' ? (
        <FlatList
          data={notes}
          keyExtractor={noteKey}
          renderItem={renderItem}
          ListEmptyComponent={EmptyNotes}
          contentContainerStyle={notes.length === 0 ? styles.emptyContent : styles.listContent}
        />
      ) : (
        <View style={styles.message}>
          {status === 'loading' ? (
            <ActivityIndicator color={COLORS.primaryDark} />
          ) : (
            <>
              <Notice text="Couldn't load your notes." />
              <Button label="Try again" onPress={retry} />
            </>
          )}
        </View>
      )}
      <View style={styles.actions}>
        <Link href="/notes/new" asChild>
          <Button label="New note" style={styles.action} />
        </Link>
        <Link href="/notes/voice" asChild>
          <Button
            label="Voice note"
            variant="ghost"
            icon={<MicIcon color={COLORS.text} />}
            style={styles.action}
          />
        </Link>
      </View>
    </View>
  );
}

function noteKey(note: NoteSummary) {
  return String(note.id);
}

type NoteRowProps = {
  note: NoteSummary;
  onOpen: (id: number) => void;
};

const NoteRow = memo(function NoteRow({ note, onOpen }: NoteRowProps) {
  const { heading, preview } = rowText(note);
  const edited = formatShortDate(note.updatedAt);
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${heading}, edited ${edited}`}
      accessibilityHint="Opens the note"
      onPress={() => onOpen(note.id)}
      style={({ pressed }) => [styles.row, pressed && styles.rowPressed]}
    >
      <Text style={styles.rowTitle} numberOfLines={1}>
        {heading}
      </Text>
      {preview !== '' && (
        <Text style={styles.rowPreview} numberOfLines={2}>
          {preview}
        </Text>
      )}
      <Text style={styles.rowDate}>{edited}</Text>
    </Pressable>
  );
});

// A note without a title is headed by the first line of its body.
function rowText({ title, excerpt }: NoteSummary) {
  const lines = excerpt
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line !== '');
  const heading = title.trim();
  if (heading) return { heading, preview: lines.join(' ') };
  return { heading: lines[0] ?? 'Untitled', preview: lines.slice(1).join(' ') };
}

function EmptyNotes() {
  return (
    <View style={styles.empty}>
      <Text accessibilityRole="header" style={styles.emptyTitle}>
        No notes yet
      </Text>
      <Text style={styles.hint}>Tap New note to write one, or Voice note to say it.</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  listContent: {
    gap: SPACING.sm,
    padding: SPACING.md,
  },
  emptyContent: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: SPACING.md,
  },
  message: {
    flex: 1,
    gap: SPACING.md,
    padding: SPACING.md,
    justifyContent: 'center',
  },
  row: {
    gap: SPACING.xs,
    padding: SPACING.md,
    borderRadius: RADII.lg,
    backgroundColor: COLORS.surface,
    ...SHADOWS.card,
  },
  rowPressed: {
    transform: [{ scale: PRESSED_SCALE }],
  },
  rowTitle: {
    fontFamily: FONTS.bodyBold,
    fontSize: FONT_SIZES.body,
    color: COLORS.text,
  },
  rowPreview: {
    fontSize: FONT_SIZES.body,
    lineHeight: 22,
    color: COLORS.textMuted,
  },
  rowDate: {
    fontSize: FONT_SIZES.caption,
    color: COLORS.textMuted,
  },
  empty: {
    gap: SPACING.sm,
    alignItems: 'center',
  },
  emptyTitle: {
    fontFamily: FONTS.display,
    fontSize: FONT_SIZES.title,
    color: COLORS.text,
  },
  hint: {
    fontSize: FONT_SIZES.body,
    lineHeight: 24,
    color: COLORS.textMuted,
    textAlign: 'center',
  },
  actions: {
    flexDirection: 'row',
    gap: SPACING.sm,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: COLORS.border,
  },
  action: {
    flex: 1,
  },
});
