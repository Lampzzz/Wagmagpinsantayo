import { StyleSheet, TextInput, View } from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';

import { Icon } from '@/components/ui/icon';
import { IconButton } from '@/components/ui/icon-button';
import { COLORS, FONT_SIZES, FONTS, RADII, SHADOWS, SPACING } from '@/constants/theme';

const MAX_MESSAGE_LENGTH = 500;

type HomeComposerProps = {
  value: string;
  onChangeText: (text: string) => void;
  onSubmit: () => void;
  /** The keyboard went away. */
  onClose: () => void;
  busy: boolean;
};

/** "Tell Pinsan anything…": a text box for when talking out loud won't do. */
export function HomeComposer({ value, onChangeText, onSubmit, onClose, busy }: HomeComposerProps) {
  const canSend = value.trim() !== '' && !busy;
  return (
    <Animated.View entering={FadeIn.duration(150)} style={styles.row}>
      <View style={styles.field}>
        <TextInput
          value={value}
          onChangeText={onChangeText}
          placeholder="Tell Pinsan anything…"
          placeholderTextColor={COLORS.textMuted}
          cursorColor={COLORS.text}
          selectionColor={COLORS.primary}
          accessibilityLabel="Message to Pinsan"
          autoFocus
          maxLength={MAX_MESSAGE_LENGTH}
          returnKeyType="send"
          submitBehavior="blurAndSubmit"
          onSubmitEditing={onSubmit}
          onBlur={onClose}
          style={styles.input}
        />
      </View>
      <IconButton
        accessibilityLabel="Send"
        variant="primary"
        icon={<Icon ios="arrow.up" android="arrow_upward" color={COLORS.onPrimary} />}
        onPress={onSubmit}
        disabled={!canSend}
        style={styles.send}
      />
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    padding: SPACING.xs + 2,
    paddingStart: SPACING.md,
    borderRadius: RADII.pill,
    backgroundColor: COLORS.surface,
    ...SHADOWS.card,
  },
  field: {
    flex: 1,
  },
  input: {
    minHeight: 48,
    fontFamily: FONTS.body,
    fontSize: FONT_SIZES.body,
    color: COLORS.text,
  },
  send: {
    width: 48,
    height: 48,
  },
});
