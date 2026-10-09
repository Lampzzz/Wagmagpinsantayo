import { StyleSheet, Text, TextInput, View, type TextInputProps } from 'react-native';

import { COLORS, FONT_SIZES, RADII, SPACING } from '@/constants/theme';

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
  ...rest
}: TextFieldProps) {
  return (
    <View style={styles.container}>
      <Text style={styles.label}>{label}</Text>
      <TextInput
        accessibilityLabel={label}
        accessibilityHint={note}
        placeholderTextColor={COLORS.textMuted}
        multiline={multiline}
        textAlignVertical={multiline ? 'top' : 'center'}
        style={[styles.input, multiline && styles.multiline, invalid && styles.invalidInput, style]}
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
    fontSize: FONT_SIZES.caption,
    fontWeight: '600',
    color: COLORS.textMuted,
  },
  input: {
    minHeight: 48,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    borderRadius: RADII.md,
    borderWidth: 1,
    borderColor: COLORS.border,
    fontSize: FONT_SIZES.body,
    color: COLORS.text,
  },
  multiline: {
    minHeight: 96,
  },
  invalidInput: {
    borderColor: COLORS.warning,
  },
  note: {
    fontSize: FONT_SIZES.caption,
    color: COLORS.textMuted,
  },
  invalidNote: {
    color: COLORS.warning,
  },
});
