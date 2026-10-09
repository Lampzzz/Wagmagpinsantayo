import { useRef, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { KeyboardAvoidingView } from 'react-native-keyboard-controller';

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
import { countWords } from '@/utils/count-words';

import { useCreateNote } from '../hooks/use-create-note';
import { useUnsavedGuard, type LeaveConfirmation } from '../hooks/use-unsaved-guard';
import type { NoteContent, NoteDraft } from '../types';
import { NoteFields } from './note-fields';

const LONG_NOTE_WORDS = 1500;

const DISCARD: LeaveConfirmation = {
  title: 'Discard this note?',
  message: "It hasn't been saved.",
  stayLabel: 'Keep editing',
  leaveLabel: 'Discard',
};

type VoiceDraftEditorProps = {
  transcript: string;
  draft: NoteDraft;
  aiFailed: boolean;
  onClose: () => void;
};

/**
 * The AI's draft of a voice note, open in the editor but not saved. The user
 * edits it, then saves or discards it. Leaving any other way asks first.
 */
export function VoiceDraftEditor({ transcript, draft, aiFailed, onClose }: VoiceDraftEditorProps) {
  const contentRef = useRef<NoteContent>(draft);
  const { status, save } = useCreateNote();
  const allowLeave = useUnsavedGuard(true, DISCARD);

  const handleSave = async () => {
    if (await save(contentRef.current)) {
      allowLeave();
      onClose();
    }
  };

  return (
    <KeyboardAvoidingView behavior="padding" automaticOffset style={styles.container}>
      {aiFailed && (
        <Notice text="The AI couldn't tidy this up, so here is exactly what you said." />
      )}
      {countWords(transcript) > LONG_NOTE_WORDS && (
        <Notice text="This is a long note, so the AI may have missed details." />
      )}
      <NoteFields
        initial={draft}
        onChange={(content) => {
          contentRef.current = content;
        }}
      />
      {!aiFailed && <WhatYouSaid transcript={transcript} />}
      {status === 'empty' && <Notice text="Add a title or some text before saving." />}
      {status === 'failed' && <Notice text="Couldn't save the note. Please try again." />}
      <View style={styles.actions}>
        <Button
          label="Save"
          onPress={handleSave}
          disabled={status === 'saving' || status === 'saved'}
        />
        {/* Leaving asks the user to confirm, through the guard. */}
        <Button label="Discard" variant="ghost" onPress={onClose} />
      </View>
    </KeyboardAvoidingView>
  );
}

// Lets the user check the draft against their own words.
function WhatYouSaid({ transcript }: { transcript: string }) {
  const [open, setOpen] = useState(false);
  return (
    <View>
      <Pressable
        accessibilityRole="button"
        accessibilityState={{ expanded: open }}
        onPress={() => setOpen((value) => !value)}
        style={({ pressed }) => [styles.toggle, pressed && styles.pressed]}
      >
        <Text style={styles.toggleLabel}>{open ? 'Hide what you said' : 'Show what you said'}</Text>
      </Pressable>
      {open && (
        <ScrollView style={styles.transcript}>
          <Text selectable style={styles.transcriptText}>
            {transcript}
          </Text>
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    gap: SPACING.sm,
    padding: SPACING.md,
  },
  actions: {
    gap: SPACING.sm,
  },
  toggle: {
    minHeight: 44,
    justifyContent: 'center',
  },
  pressed: {
    transform: [{ scale: PRESSED_SCALE }],
  },
  toggleLabel: {
    fontFamily: FONTS.bodyBold,
    fontSize: FONT_SIZES.body,
    color: COLORS.primaryDark,
  },
  transcript: {
    maxHeight: 160,
    padding: SPACING.sm,
    borderRadius: RADII.lg,
    backgroundColor: COLORS.surface,
    ...SHADOWS.card,
  },
  transcriptText: {
    fontSize: FONT_SIZES.body,
    lineHeight: 24,
    color: COLORS.text,
  },
});
