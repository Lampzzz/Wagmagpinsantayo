import { Link, router } from 'expo-router';
import { memo } from 'react';
import { Linking, Pressable, StyleSheet, Text, View } from 'react-native';

import { Button } from '@/components/ui/button';
import { Chip } from '@/components/ui/chip';
import { Icon } from '@/components/ui/icon';
import { COLORS, FONT_SIZES, RADII, SPACING } from '@/constants/theme';

import type { ChatMessage } from '../hooks/use-assistant';
import type { PickOption, Question, ReplyButton, ReplyItem } from '../types';

type MessageBubbleProps = {
  message: ChatMessage;
  /** Only the newest reply's question can be answered. */
  answerable: boolean;
  onPick: (option: PickOption, shown: string) => void;
  onConfirm: (yes: boolean, shown: string) => void;
  onSend: (text: string) => void;
};

/** One message: what the user said, or the assistant's reply with its items and choices. */
export const MessageBubble = memo(function MessageBubble({
  message,
  answerable,
  onPick,
  onConfirm,
  onSend,
}: MessageBubbleProps) {
  if (message.from === 'user') {
    return (
      <View style={[styles.bubble, styles.user]}>
        {message.spoken && <Icon ios="mic.fill" android="mic" color={COLORS.onPrimary} size={14} />}
        <Text style={styles.userText}>{message.text}</Text>
      </View>
    );
  }

  const { reply } = message;
  return (
    <View style={[styles.bubble, styles.assistant, reply.isError && styles.trouble]}>
      <Text style={[styles.text, reply.isError && styles.troubleText]} selectable>
        {reply.text}
      </Text>
      {reply.items.map((item) => (
        <ItemRow key={`${item.entity}-${item.id}`} item={item} />
      ))}
      {answerable && reply.question && (
        <Answers question={reply.question} onPick={onPick} onConfirm={onConfirm} onSend={onSend} />
      )}
      {reply.buttons.map((button) => (
        <ActionButton key={button} button={button} />
      ))}
    </View>
  );
});

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
};

function Answers({ question, onPick, onConfirm, onSend }: AnswersProps) {
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
      const destructive =
        question.action.kind === 'delete-task' || question.action.kind === 'delete-reminder';
      return (
        <View style={styles.choices}>
          <Chip
            label={question.yesLabel}
            tone={destructive ? 'danger' : 'default'}
            onPress={() => onConfirm(true, question.yesLabel)}
          />
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
  if (button === 'open-settings') {
    return <Button label="Open settings" variant="ghost" onPress={() => Linking.openSettings()} />;
  }
  return (
    <Link href="/ai-setup" asChild>
      <Button label="Set up AI" variant="ghost" />
    </Link>
  );
}

const styles = StyleSheet.create({
  bubble: {
    maxWidth: '88%',
    gap: SPACING.sm,
    padding: SPACING.md,
    borderRadius: RADII.md,
  },
  user: {
    alignSelf: 'flex-end',
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.primary,
  },
  assistant: {
    alignSelf: 'flex-start',
    backgroundColor: COLORS.surface,
  },
  trouble: {
    backgroundColor: COLORS.warningSurface,
  },
  userText: {
    flexShrink: 1,
    fontSize: FONT_SIZES.body,
    lineHeight: 22,
    color: COLORS.onPrimary,
  },
  text: {
    fontSize: FONT_SIZES.body,
    lineHeight: 22,
    color: COLORS.text,
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
    borderRadius: RADII.sm,
    backgroundColor: COLORS.background,
  },
  pressed: {
    opacity: 0.7,
  },
  itemText: {
    flex: 1,
    gap: 2,
  },
  itemTitle: {
    fontSize: FONT_SIZES.body,
    fontWeight: '600',
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
    borderRadius: RADII.sm,
    borderWidth: 1,
    borderColor: COLORS.primary,
    backgroundColor: COLORS.background,
  },
  dangerOption: {
    borderColor: COLORS.danger,
  },
  optionLabel: {
    fontSize: FONT_SIZES.body,
    fontWeight: '600',
    color: COLORS.primary,
  },
  dangerText: {
    color: COLORS.danger,
  },
  choices: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING.sm,
  },
});
