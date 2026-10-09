import { useState } from 'react';
import { StyleSheet, Text, TextInput, View, type TextInputProps } from 'react-native';

import { COLORS, FONT_SIZES, FONTS, RADII, SPACING } from '@/constants/theme';

type TextFieldProps = TextInputProps & {
  label: string;
  /** Shown under the field. */
  note?: string;
  /** Marks `note` as a problem to fix. */
  invalid?: boolean;
};

/** A labelled text input with an optional note underneath. */
export function TextField({
  label,
  note,
  invalid = false,
  style,
  multiline,
  onFocus,
  onBlur,
  ...rest
}: TextFieldProps) {
  const [focused, setFocused] = useState(false);

  const handleFocus: TextInputProps['onFocus'] = (event) => {
    setFocused(true);
    onFocus?.(event);
  };
  const handleBlur: TextInputProps['onBlur'] = (event) => {
    setFocused(false);
    onBlur?.(event);
  };

  return (
    <View style={styles.container}>
      <Text style={styles.label}>{label}</Text>
      <TextInput
        accessibilityLabel={label}
        accessibilityHint={note}
        placeholderTextColor={COLORS.textMuted}
        cursorColor={COLORS.text}
        selectionColor={COLORS.primary}
        multiline={multiline}
        textAlignVertical={multiline ? 'top' : 'center'}
        onFocus={handleFocus}
        onBlur={handleBlur}
        style={[
          styles.input,
          multiline && styles.multiline,
          focused && styles.focusedInput,
          invalid && styles.invalidInput,
          style,
        ]}
        {...rest}
      />
      {note ? (
        <Text accessibilityLiveRegion="polite" style={[styles.note, invalid && styles.invalidNote]}>
          {note}
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: SPACING.xs,
  },
  label: {
    marginStart: SPACING.xs,
    fontFamily: FONTS.bodyBold,
    fontSize: FONT_SIZES.caption,
    color: COLORS.textMuted,
  },
  input: {
    minHeight: 52,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    borderRadius: RADII.lg,
    borderWidth: 1.5,
    borderColor: COLORS.borderStrong,
    backgroundColor: COLORS.surface,
    fontFamily: FONTS.body,
    fontSize: FONT_SIZES.body,
    color: COLORS.text,
  },
  multiline: {
    minHeight: 112,
    paddingTop: 14,
    paddingBottom: 14,
    lineHeight: 22,
  },
  focusedInput: {
    borderColor: COLORS.coral,
  },
  invalidInput: {
    borderColor: COLORS.warning,
  },
  note: {
    marginStart: SPACING.xs,
    fontFamily: FONTS.body,
    fontSize: FONT_SIZES.caption,
    color: COLORS.textMuted,
  },
  invalidNote: {
    color: COLORS.warning,
  },
});
