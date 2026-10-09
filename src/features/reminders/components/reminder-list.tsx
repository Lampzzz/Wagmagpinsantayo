import { Link, router } from 'expo-router';
import { memo, useCallback, useMemo } from 'react';
import {
  ActivityIndicator,
  Alert,
  Linking,
  Platform,
  Pressable,
  SectionList,
  StyleSheet,
  View,
  type SectionListRenderItem,
} from 'react-native';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Chip } from '@/components/ui/chip';
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
import { useNow } from '@/hooks/use-now';
import { capitalize } from '@/utils/capitalize';
import { formatRelative, formatWhen } from '@/utils/format-when';

import { groupReminders, isReminderPastDue, REMINDER_GROUP_TITLES } from '../api/group-reminders';
import { setReminderStatus } from '../api/reminders';
import { useNotificationPermission } from '../hooks/use-notification-permission';
import { useReminders } from '../hooks/use-reminders';
import type { Reminder, ReminderGroup } from '../types';

type Section = { key: ReminderGroup; title: string; data: Reminder[] };

// Android 14 and later deliver alarms late unless the user allows exact ones.
const ASK_FOR_EXACT_ALARMS = Platform.OS === 'android' && Number(Platform.Version) >= 34;

const FINISHED_WORDS = { completed: 'Done', dismissed: 'Dismissed', cancelled: 'Cancelled' };

/** Reminders grouped as Past due, Upcoming and Finished, with a button to add one. */
export function ReminderList() {
  const { status, data, retry } = useReminders();
  const now = useNow(30_000);
  const permission = useNotificationPermission();
  const sections = useMemo<Section[]>(
    () =>
      groupReminders(data ?? [], now).map(({ group, reminders }) => ({
        key: group,
        title: REMINDER_GROUP_TITLES[group],
        data: reminders,
      })),
    [data, now],
  );
  const hasUpcoming = (data ?? []).some(
    (reminder) => reminder.status === 'scheduled' && reminder.scheduledAt > now,
  );

  const close = useCallback(async (reminder: Reminder, next: 'completed' | 'dismissed') => {
    try {
      await setReminderStatus(reminder.id, next);
    } catch {
      Alert.alert("Couldn't update the reminder", 'Please try again.');
    }
  }, []);

  const open = useCallback((id: number) => {
    router.push({ pathname: '/reminders/[id]', params: { id: String(id) } });
  }, []);

  const renderItem = useCallback<SectionListRenderItem<Reminder, Section>>(
    ({ item }) => <ReminderRow reminder={item} now={now} onClose={close} onOpen={open} />,
    [now, close, open],
  );

  return (
    <View style={styles.container}>
      {data ? (
        <SectionList
          sections={sections}
          keyExtractor={reminderKey}
          renderItem={renderItem}
          renderSectionHeader={renderSectionHeader}
          ListHeaderComponent={permission === 'denied' && hasUpcoming ? NotificationsOff : null}
          ListFooterComponent={ASK_FOR_EXACT_ALARMS && hasUpcoming ? ExactAlarmNote : null}
          ListEmptyComponent={EmptyReminders}
          contentContainerStyle={sections.length === 0 ? styles.emptyContent : styles.listContent}
        />
      ) : (
        <View style={styles.message}>
          {status === 'error' ? (
            <>
              <Notice text="Couldn't load your reminders." />
              <Button label="Try again" onPress={retry} />
            </>
          ) : (
            <ActivityIndicator color={COLORS.primaryDark} />
          )}
        </View>
      )}
      <View style={styles.actions}>
        <Link href="/reminders/new" asChild>
          <Button label="New reminder" style={styles.action} />
        </Link>
      </View>
    </View>
  );
}

function reminderKey(reminder: Reminder) {
  return String(reminder.id);
}

function renderSectionHeader({ section }: { section: Section }) {
  return (
    <Text accessibilityRole="header" style={styles.sectionHeader}>
      {section.title}
    </Text>
  );
}

type ReminderRowProps = {
  reminder: Reminder;
  now: number;
  onClose: (reminder: Reminder, next: 'completed' | 'dismissed') => void;
  onOpen: (id: number) => void;
};

const ReminderRow = memo(function ReminderRow({
  reminder,
  now,
  onClose,
  onOpen,
}: ReminderRowProps) {
  const pastDue = isReminderPastDue(reminder, now);
  const upcoming = reminder.status === 'scheduled' && !pastDue;
  const noAlert = upcoming && reminder.notificationId === null;
  const when = capitalize(formatWhen(reminder.scheduledAt, true, now));
  const detail = upcoming ? `${when} · ${formatRelative(reminder.scheduledAt, now)}` : when;
  return (
    <View style={styles.row}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={[reminder.title, detail, pastDue ? 'past due' : null]
          .filter(Boolean)
          .join(', ')}
        accessibilityHint="Opens the reminder"
        onPress={() => onOpen(reminder.id)}
        style={({ pressed }) => [styles.rowBody, pressed && styles.pressed]}
      >
        <Text
          style={[styles.rowTitle, reminder.status !== 'scheduled' && styles.finishedTitle]}
          numberOfLines={2}
        >
          {reminder.title}
        </Text>
        <Text style={[styles.rowDetail, pastDue && styles.pastDueDetail]}>{detail}</Text>
        {reminder.taskTitle !== null && (
          <Text style={styles.rowDetail} numberOfLines={1}>
            For: {reminder.taskTitle}
          </Text>
        )}
        {(pastDue || noAlert || reminder.status !== 'scheduled') && (
          <View style={styles.badges}>
            {pastDue && <Badge label="Past due" tone="warning" />}
            {noAlert && <Badge label="No alert" tone="warning" />}
            {reminder.status !== 'scheduled' && (
              <Badge
                label={FINISHED_WORDS[reminder.status]}
                tone={reminder.status === 'completed' ? 'success' : 'neutral'}
              />
            )}
          </View>
        )}
      </Pressable>
      {pastDue && (
        <View style={styles.rowActions}>
          <Chip
            label="Done"
            accessibilityLabel={`Mark "${reminder.title}" as done`}
            onPress={() => onClose(reminder, 'completed')}
          />
          <Chip
            label="Dismiss"
            accessibilityLabel={`Dismiss "${reminder.title}"`}
            onPress={() => onClose(reminder, 'dismissed')}
          />
        </View>
      )}
    </View>
  );
});

function NotificationsOff() {
  return (
    <View style={styles.banner}>
      <Notice text="Notifications are off, so reminders can't alert you. Turn them on in Settings." />
      <Button label="Open settings" variant="ghost" onPress={() => Linking.openSettings()} />
    </View>
  );
}

function ExactAlarmNote() {
  return (
    <View style={styles.banner}>
      <Text style={styles.hint}>
        To get reminders exactly on time, allow &quot;Alarms &amp; reminders&quot; for this app in
        Settings.
      </Text>
      <Button label="Open settings" variant="ghost" onPress={() => Linking.openSettings()} />
    </View>
  );
}

function EmptyReminders() {
  return (
    <View style={styles.empty}>
      <Text accessibilityRole="header" style={styles.emptyTitle}>
        No reminders yet
      </Text>
      <Text style={styles.hint}>
        Tap New reminder, or ask the Assistant: &quot;Remind me in 10 minutes to stretch&quot;.
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  listContent: {
    gap: SPACING.sm,
    padding: SPACING.md,
  },
  emptyContent: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: SPACING.md,
  },
  message: {
    flex: 1,
    gap: SPACING.md,
    padding: SPACING.md,
    justifyContent: 'center',
  },
  sectionHeader: {
    paddingTop: SPACING.sm,
    fontFamily: FONTS.display,
    fontSize: FONT_SIZES.caption,
    letterSpacing: 0.5,
    textTransform: 'uppercase',
    color: COLORS.textMuted,
    backgroundColor: COLORS.background,
  },
  row: {
    borderRadius: RADII.lg,
    backgroundColor: COLORS.surface,
    ...SHADOWS.card,
  },
  rowBody: {
    gap: SPACING.xs,
    padding: SPACING.md,
  },
  pressed: {
    transform: [{ scale: PRESSED_SCALE }],
  },
  rowTitle: {
    fontFamily: FONTS.bodyBold,
    fontSize: FONT_SIZES.body,
    color: COLORS.text,
  },
  finishedTitle: {
    color: COLORS.textMuted,
  },
  rowDetail: {
    fontSize: FONT_SIZES.caption,
    color: COLORS.textMuted,
  },
  pastDueDetail: {
    color: COLORS.warning,
  },
  badges: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING.sm,
  },
  rowActions: {
    flexDirection: 'row',
    gap: SPACING.sm,
    paddingHorizontal: SPACING.md,
    paddingBottom: SPACING.md,
  },
  banner: {
    gap: SPACING.sm,
    paddingBottom: SPACING.sm,
  },
  empty: {
    gap: SPACING.sm,
    alignItems: 'center',
  },
  emptyTitle: {
    fontFamily: FONTS.display,
    fontSize: FONT_SIZES.title,
    color: COLORS.text,
  },
  hint: {
    fontSize: FONT_SIZES.body,
    lineHeight: 24,
    color: COLORS.textMuted,
    textAlign: 'center',
  },
  actions: {
    flexDirection: 'row',
    gap: SPACING.sm,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: COLORS.border,
  },
  action: {
    flex: 1,
  },
});
