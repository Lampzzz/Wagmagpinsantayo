import { memo } from 'react';
import { StyleSheet, View } from 'react-native';

import { Icon } from '@/components/ui/icon';
import { Text } from '@/components/ui/text';
import { COLORS, FONT_SIZES, RADII, SHADOWS, SPACING } from '@/constants/theme';

import type { ChatMessage } from '../hooks/use-assistant';
import type { PickOption } from '../types';
import { ReplyContent } from './reply-content';

type MessageBubbleProps = {
  message: ChatMessage;
  /** Only the newest reply's question can be answered. */
  answerable: boolean;
  onPick: (option: PickOption, shown: string) => void;
  onConfirm: (yes: boolean, shown: string) => void;
  onSend: (text: string) => void;
  /** Drops the question before a Quick Add proposal opens in the task editor. */
  onEdit?: () => void;
};

/** One message: what the user said, or the assistant's reply with its items and choices. */
export const MessageBubble = memo(function MessageBubble({
  message,
  answerable,
  onPick,
  onConfirm,
  onSend,
  onEdit,
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
      <ReplyContent
        reply={reply}
        answerable={answerable}
        onPick={onPick}
        onConfirm={onConfirm}
        onSend={onSend}
        onEdit={onEdit}
      />
    </View>
  );
});

const styles = StyleSheet.create({
  bubble: {
    maxWidth: '88%',
    gap: SPACING.sm,
    padding: SPACING.md,
    borderRadius: RADII.lg,
    ...SHADOWS.card,
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
});
