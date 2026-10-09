import { memo } from 'react';
import { Pressable, StyleSheet, TextInput, View } from 'react-native';

import { Card } from '@/components/ui/card';
import { Icon } from '@/components/ui/icon';
import { IconButton } from '@/components/ui/icon-button';
import { Text } from '@/components/ui/text';
import { COLORS, FONT_SIZES, FONTS, PRESSED_SCALE, SPACING } from '@/constants/theme';

import { dueLabel } from '../task-suggestions';
import type { TaskSuggestion } from '../types';

/** A suggestion in the review sheet, with whether the user still wants it saved. */
export type ReviewRow = TaskSuggestion & { checked: boolean };

type TaskSuggestionRowProps = {
  row: ReviewRow;
  now: number;
  /** True while saving, so nothing changes under the save. */
  disabled: boolean;
  onToggle: (key: string) => void;
  onChangeTitle: (key: string, title: string) => void;
  onRemove: (key: string) => void;
};

/** One suggested task: a checkbox, an editable title, the due date and a remove button. */
export const TaskSuggestionRow = memo(function TaskSuggestionRow({
  row,
  now,
  disabled,
  onToggle,
  onChangeTitle,
  onRemove,
}: TaskSuggestionRowProps) {
  const name = row.title.trim() || 'untitled task';
  return (
    <Card style={[styles.row, !row.checked && styles.unchecked]}>
      <Pressable
        accessibilityRole="checkbox"
        accessibilityLabel={`Save ${name}`}
        accessibilityState={{ checked: row.checked, disabled }}
        disabled={disabled}
        hitSlop={SPACING.sm}
        onPress={() => onToggle(row.key)}
        style={({ pressed }) => [styles.check, pressed && styles.pressed]}
      >
        <Icon
          ios={row.checked ? 'checkmark.square.fill' : 'square'}
          android={row.checked ? 'check_box' : 'check_box_outline_blank'}
          color={row.checked ? COLORS.primaryDark : COLORS.textMuted}
          size={28}
        />
      </Pressable>
      <View style={styles.body}>
        <TextInput
          value={row.title}
          onChangeText={(title) => onChangeTitle(row.key, title)}
          editable={!disabled}
          accessibilityLabel="Task title"
          placeholder="Task title"
          placeholderTextColor={COLORS.textMuted}
          maxLength={200}
          returnKeyType="done"
          style={styles.title}
        />
        <Text style={styles.due}>{dueLabel(row, now)}</Text>
      </View>
      <IconButton
        accessibilityLabel={`Remove ${name}`}
        icon={<Icon ios="xmark" android="close" color={COLORS.text} size={20} />}
        disabled={disabled}
        onPress={() => onRemove(row.key)}
      />
    </Card>
  );
});

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    paddingVertical: SPACING.sm,
  },
  unchecked: {
    opacity: 0.6,
  },
  check: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pressed: {
    transform: [{ scale: PRESSED_SCALE }],
  },
  body: {
    flex: 1,
    gap: 2,
  },
  title: {
    minHeight: 44,
    paddingVertical: SPACING.xs,
    borderBottomWidth: 1.5,
    borderColor: COLORS.border,
    fontFamily: FONTS.body,
    fontSize: FONT_SIZES.body,
    color: COLORS.text,
  },
  due: {
    fontSize: FONT_SIZES.caption,
    color: COLORS.textMuted,
  },
});
