import { useRef } from 'react';
import { StyleSheet, TextInput, View } from 'react-native';

import { COLORS, FONT_SIZES, FONTS, SPACING } from '@/constants/theme';

import type { NoteContent } from '../types';

type NoteFieldsProps = {
  /** Shown when the fields mount. Later changes are ignored. */
  initial: NoteContent;
  onChange: (content: NoteContent) => void;
  autoFocus?: boolean;
};

/**
 * Title and body inputs. They are uncontrolled, so a long note isn't sent back
 * and forth on every keystroke and typing doesn't re-render the screen.
 */
export function NoteFields({ initial, onChange, autoFocus }: NoteFieldsProps) {
  const contentRef = useRef(initial);
  const bodyRef = useRef<TextInput>(null);

  const change = (patch: Partial<NoteContent>) => {
    contentRef.current = { ...contentRef.current, ...patch };
    onChange(contentRef.current);
  };

  return (
    <View style={styles.container}>
      <TextInput
        defaultValue={initial.title}
        onChangeText={(title) => change({ title })}
        placeholder="Title"
        placeholderTextColor={COLORS.textMuted}
        accessibilityLabel="Title"
        autoFocus={autoFocus}
        returnKeyType="next"
        submitBehavior="submit"
        onSubmitEditing={() => bodyRef.current?.focus()}
        style={styles.title}
      />
      <TextInput
        ref={bodyRef}
        defaultValue={initial.body}
        onChangeText={(body) => change({ body })}
        placeholder="Write your note"
        placeholderTextColor={COLORS.textMuted}
        accessibilityLabel="Note"
        multiline
        textAlignVertical="top"
        style={styles.body}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    gap: SPACING.sm,
  },
  title: {
    paddingVertical: SPACING.sm,
    fontFamily: FONTS.display,
    fontSize: FONT_SIZES.title,
    color: COLORS.text,
  },
  body: {
    flex: 1,
    fontFamily: FONTS.body,
    fontSize: FONT_SIZES.body,
    lineHeight: 24,
    color: COLORS.text,
  },
});
