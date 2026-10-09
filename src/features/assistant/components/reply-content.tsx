import { Link, router, type Href } from 'expo-router';
import type { ReactNode } from 'react';
import { Linking, Pressable, StyleSheet, View } from 'react-native';

import { Button } from '@/components/ui/button';
import { Chip } from '@/components/ui/chip';
import { Icon } from '@/components/ui/icon';
import { Text } from '@/components/ui/text';
import { COLORS, FONT_SIZES, FONTS, PRESSED_SCALE, RADII, SPACING } from '@/constants/theme';
import type { NewTask } from '@/features/tasks';

import type { AssistantReply, PickOption, Question, ReplyButton, ReplyItem } from '../types';

export type ReplyContentProps = {
  reply: AssistantReply;
  /** Only the newest reply's question can be answered, and not while another is on its way. */
  answerable: boolean;
  onPick: (option: PickOption, shown: string) => void;
  onConfirm: (yes: boolean, shown: string) => void;
  onSend: (text: string) => void;
  /**
   * Adds an Edit button to Quick Add proposals, which opens the task editor filled in with
   * the proposal. Called first, so the question can be dropped.
   */
  onEdit?: () => void;
  /** Larger text, for Pinsan's speech bubble. */
  size?: 'regular' | 'large';
  /** Shown beside the text, such as a close button. Give it `marginStart: 'auto'` to sit at the end. */
  accessory?: ReactNode;
};

/** A reply's text, its items, and the buttons that answer its question. */
export function ReplyContent({
  reply,
  answerable,
  onPick,
  onConfirm,
  onSend,
  onEdit,
  size = 'regular',
  accessory,
}: ReplyContentProps) {
  return (
    <>
      <View style={styles.textRow}>
        <Text
          style={[
            styles.text,
            size === 'large' && styles.largeText,
            reply.isError && styles.troubleText,
          ]}
          selectable
        >
          {reply.text}
        </Text>
        {accessory}
      </View>
      {reply.items.map((item) => (
        <ItemRow key={`${item.entity}-${item.id}`} item={item} />
      ))}
      {answerable && reply.question && (
        <Answers
          question={reply.question}
          onPick={onPick}
          onConfirm={onConfirm}
          onSend={onSend}
          onEdit={onEdit}
        />
      )}
      {reply.buttons.map((button) => (
        <ActionButton key={button} button={button} />
      ))}
    </>
  );
}

function ItemRow({ item }: { item: ReplyItem }) {
  const isTask = item.entity === 'task';
  const open = () =>
    router.push({
      pathname: isTask ? '/tasks/[id]' : '/reminders/[id]',
      params: { id: String(item.id) },
    });
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${item.title}, ${item.detail}`}
      accessibilityHint={isTask ? 'Opens the task' : 'Opens the reminder'}
      onPress={open}
      style={({ pressed }) => [styles.item, pressed && styles.pressed]}
    >
      <Icon
        ios={isTask ? 'checklist' : 'bell'}
        android={isTask ? 'checklist' : 'notifications'}
        color={COLORS.textMuted}
        size={18}
      />
      <View style={styles.itemText}>
        <Text style={styles.itemTitle} numberOfLines={2}>
          {item.title}
        </Text>
        <Text style={styles.itemDetail} numberOfLines={2}>
          {item.detail}
        </Text>
      </View>
    </Pressable>
  );
}

type AnswersProps = {
  question: Question;
  onPick: (option: PickOption, shown: string) => void;
  onConfirm: (yes: boolean, shown: string) => void;
  onSend: (text: string) => void;
  onEdit?: () => void;
};

function Answers({ question, onPick, onConfirm, onSend, onEdit }: AnswersProps) {
  switch (question.kind) {
    case 'pick':
      return (
        <View style={styles.answers}>
          {question.options.map((option) => {
            const shown = question.deleting ? `Delete "${option.label}"` : option.label;
            return (
              <Pressable
                key={`${option.entity}-${option.id}`}
                accessibilityRole="button"
                accessibilityLabel={`${shown}, ${option.detail}`}
                onPress={() => onPick(option, shown)}
                style={({ pressed }) => [
                  styles.option,
                  question.deleting && styles.dangerOption,
                  pressed && styles.pressed,
                ]}
              >
                <Text style={[styles.optionLabel, question.deleting && styles.dangerText]}>
                  {shown}
                </Text>
                <Text style={styles.itemDetail}>{option.detail}</Text>
              </Pressable>
            );
          })}
        </View>
      );
    case 'confirm': {
      const { action } = question;
      const destructive = action.kind === 'delete-task' || action.kind === 'delete-reminder';
      const edit =
        onEdit && action.kind === 'create-task'
          ? () => {
              onEdit();
              router.push(taskDraftHref(action.task, action.remindAt));
            }
          : null;
      return (
        <View style={styles.choices}>
          {destructive ? (
            <Chip
              label={question.yesLabel}
              tone="danger"
              onPress={() => onConfirm(true, question.yesLabel)}
            />
          ) : (
            <Button
              label={question.yesLabel}
              onPress={() => onConfirm(true, question.yesLabel)}
              style={styles.yes}
            />
          )}
          {edit && (
            <Chip
              label="Edit"
              accessibilityHint="Opens the task editor with these details, to change before saving"
              onPress={edit}
            />
          )}
          <Chip label={question.noLabel} onPress={() => onConfirm(false, question.noLabel)} />
        </View>
      );
    }
    case 'fill':
      if (question.suggestions.length === 0) return null;
      return (
        <View style={styles.choices}>
          {question.suggestions.map((suggestion) => (
            <Chip key={suggestion} label={suggestion} onPress={() => onSend(suggestion)} />
          ))}
        </View>
      );
  }
}

function ActionButton({ button }: { button: ReplyButton }) {
  switch (button) {
    case 'open-settings':
      return (
        <Button label="Open settings" variant="ghost" onPress={() => Linking.openSettings()} />
      );
    case 'set-up-ai':
      return (
        <Link href="/ai-setup" asChild>
          <Button label="Set up AI" variant="ghost" />
        </Link>
      );
    default:
      return null;
  }
}

/**
 * The new-task editor, filled in from a Quick Add proposal. `src/app/tasks/new.tsx` reads
 * these params. `remind` says the proposal came with a reminder at the due time.
 */
function taskDraftHref(task: NewTask, remindAt: number | undefined): Href {
  const params: Record<string, string> = { title: task.title };
  if (task.description) params.notes = task.description;
  if (task.priority) params.priority = task.priority;
  if (task.dueAt !== undefined && task.dueAt !== null) {
    params.dueAt = String(task.dueAt);
    params.dueHasTime = task.dueHasTime ? '1' : '0';
  }
  if (remindAt !== undefined) params.remind = '1';
  return { pathname: '/tasks/new', params };
}

const styles = StyleSheet.create({
  textRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: SPACING.sm,
  },
  text: {
    flexShrink: 1,
    fontSize: FONT_SIZES.body,
    lineHeight: 22,
    color: COLORS.text,
  },
  largeText: {
    fontSize: 17,
    lineHeight: 24,
  },
  troubleText: {
    color: COLORS.warning,
  },
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    minHeight: 48,
    padding: SPACING.sm,
    borderRadius: RADII.md,
    backgroundColor: COLORS.background,
  },
  pressed: {
    transform: [{ scale: PRESSED_SCALE }],
  },
  itemText: {
    flex: 1,
    gap: 2,
  },
  itemTitle: {
    fontFamily: FONTS.bodyBold,
    fontSize: FONT_SIZES.body,
    color: COLORS.text,
  },
  itemDetail: {
    fontSize: FONT_SIZES.caption,
    color: COLORS.textMuted,
  },
  answers: {
    gap: SPACING.sm,
  },
  option: {
    gap: 2,
    minHeight: 48,
    padding: SPACING.sm,
    borderRadius: RADII.md,
    borderWidth: 1.5,
    // A decorative mango outline; the label carries the meaning, in primaryDark.
    borderColor: COLORS.primary,
    backgroundColor: COLORS.background,
  },
  dangerOption: {
    borderColor: COLORS.danger,
  },
  optionLabel: {
    fontFamily: FONTS.bodyBold,
    fontSize: FONT_SIZES.body,
    color: COLORS.primaryDark,
  },
  dangerText: {
    color: COLORS.danger,
  },
  choices: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: SPACING.sm,
  },
  // As tall as the chips beside it.
  yes: {
    minHeight: 44,
    paddingHorizontal: SPACING.lg,
  },
});
