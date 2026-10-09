import { Stack } from 'expo-router';
import { memo, useMemo } from 'react';
import { ActivityIndicator, Alert, SectionList, StyleSheet, View } from 'react-native';

import { Button } from '@/components/ui/button';
import { HeaderButton } from '@/components/ui/header-button';
import { Icon } from '@/components/ui/icon';
import { Notice } from '@/components/ui/notice';
import { Text } from '@/components/ui/text';
import { COLORS, FONT_SIZES, FONTS, RADII, SHADOWS, SPACING } from '@/constants/theme';
import { useNow } from '@/hooks/use-now';
import { formatTime } from '@/utils/format-when';

import { groupByDay, startOfLocalDay } from '../history/group-by-day';
import { clearHistory } from '../history/history-store';
import type { HistoryMessage } from '../history/types';
import { useConversationHistory } from '../hooks/use-conversation-history';

type Section = { key: string; title: string; data: HistoryMessage[] };

/**
 * Everything said to Pinsan, on Home or the Conversations screen, and what he answered,
 * read back by day: newest day first, each day in the order it was said, under a sticky
 * day header. Read only, so the bubbles have no buttons.
 */
export function ConversationHistory() {
  const { status, data, retry } = useConversationHistory();
  const now = useNow();
  // Day titles only change at midnight, so the sections are rebuilt once a day.
  const today = startOfLocalDay(now);
  const sections = useMemo<Section[]>(
    () =>
      groupByDay(data ?? [], today).map(({ key, title, messages }) => ({
        key,
        title,
        data: messages,
      })),
    [data, today],
  );

  const hasHistory = sections.length > 0;
  // Memoized because each new options object is applied again.
  const screenOptions = useMemo(
    () => ({
      headerRight: hasHistory
        ? () => (
            <HeaderButton
              label="Clear"
              tone="danger"
              accessibilityHint="Deletes the conversation history from this phone"
              onPress={confirmClear}
            />
          )
        : undefined,
    }),
    [hasHistory],
  );

  return (
    <>
      <Stack.Screen options={screenOptions} />
      {data === null ? (
        <View style={styles.message}>
          {status === 'error' ? (
            <>
              <Notice text="Couldn't load your conversations." />
              <Button label="Try again" onPress={retry} />
            </>
          ) : (
            <ActivityIndicator color={COLORS.primaryDark} />
          )}
        </View>
      ) : hasHistory ? (
        <SectionList
          sections={sections}
          keyExtractor={messageKey}
          renderItem={renderItem}
          renderSectionHeader={renderSectionHeader}
          stickySectionHeadersEnabled
          contentContainerStyle={styles.list}
        />
      ) : (
        <EmptyHistory />
      )}
    </>
  );
}

function confirmClear() {
  Alert.alert(
    'Clear the conversation history?',
    "Everything you and Pinsan said is deleted from this phone. Your notes, tasks and reminders stay. This can't be undone.",
    [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Clear',
        style: 'destructive',
        onPress: async () => {
          try {
            await clearHistory();
          } catch {
            Alert.alert("Couldn't clear the history", 'Please try again.');
          }
        },
      },
    ],
  );
}

function messageKey(message: HistoryMessage) {
  return String(message.id);
}

function renderItem({ item }: { item: HistoryMessage }) {
  return <HistoryBubble message={item} />;
}

function renderSectionHeader({ section }: { section: Section }) {
  return (
    <View style={styles.sectionHeader}>
      <View style={styles.dayPill}>
        <Text accessibilityRole="header" style={styles.dayTitle}>
          {section.title}
        </Text>
      </View>
    </View>
  );
}

/** One saved line: yours in mango on the right, Pinsan's in white on the left, with its time. */
const HistoryBubble = memo(function HistoryBubble({ message }: { message: HistoryMessage }) {
  const isUser = message.role === 'user';
  const time = formatTime(message.createdAt);
  const speaker = isUser ? 'You' : 'Pinsan';
  return (
    <View
      accessible
      accessibilityLabel={`${speaker}, ${time}${message.spoken ? ', by voice' : ''}: ${message.text}`}
      style={[styles.line, isUser ? styles.userLine : styles.pinsanLine]}
    >
      <View style={[styles.bubble, isUser ? styles.user : styles.pinsan]}>
        {message.spoken && <Icon ios="mic.fill" android="mic" color={COLORS.onPrimary} size={14} />}
        <Text style={[styles.text, isUser && styles.userText]}>{message.text}</Text>
      </View>
      <Text style={styles.time}>{time}</Text>
    </View>
  );
});

function EmptyHistory() {
  return (
    <View style={styles.empty}>
      <Text accessibilityRole="header" style={styles.emptyTitle}>
        No conversations yet.
      </Text>
      <Text style={styles.hint}>Tap the mic on Home and say something to Pinsan.</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  message: {
    flex: 1,
    gap: SPACING.md,
    padding: SPACING.md,
    justifyContent: 'center',
  },
  list: {
    gap: SPACING.sm,
    paddingHorizontal: SPACING.md,
    paddingBottom: SPACING.md,
  },
  sectionHeader: {
    alignItems: 'center',
    paddingVertical: SPACING.sm,
  },
  // Floats over the bubbles while its day scrolls by.
  dayPill: {
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.xs,
    borderRadius: RADII.pill,
    backgroundColor: COLORS.surfaceMuted,
    ...SHADOWS.soft,
  },
  dayTitle: {
    fontFamily: FONTS.bodyBold,
    fontSize: FONT_SIZES.label,
    color: COLORS.text,
  },
  line: {
    maxWidth: '88%',
    gap: SPACING.xs,
  },
  userLine: {
    alignSelf: 'flex-end',
    alignItems: 'flex-end',
  },
  pinsanLine: {
    alignSelf: 'flex-start',
    alignItems: 'flex-start',
  },
  bubble: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    padding: SPACING.md,
    borderRadius: RADII.lg,
    ...SHADOWS.card,
  },
  user: {
    backgroundColor: COLORS.primary,
  },
  pinsan: {
    backgroundColor: COLORS.surface,
  },
  text: {
    flexShrink: 1,
    fontSize: FONT_SIZES.body,
    lineHeight: 22,
    color: COLORS.text,
  },
  userText: {
    color: COLORS.onPrimary,
  },
  time: {
    paddingHorizontal: SPACING.xs,
    fontSize: FONT_SIZES.caption,
    color: COLORS.textMuted,
  },
  empty: {
    flex: 1,
    gap: SPACING.sm,
    padding: SPACING.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyTitle: {
    fontFamily: FONTS.display,
    fontSize: FONT_SIZES.title,
    color: COLORS.text,
    textAlign: 'center',
  },
  hint: {
    fontSize: FONT_SIZES.body,
    lineHeight: 24,
    color: COLORS.textMuted,
    textAlign: 'center',
  },
});
