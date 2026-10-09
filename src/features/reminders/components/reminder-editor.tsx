import { router, Stack } from 'expo-router';
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Linking,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { KeyboardAvoidingView } from 'react-native-keyboard-controller';

import { readWhenInput, WhenField, type WhenInput } from '@/components/common/when-field';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { HeaderButton } from '@/components/ui/header-button';
import { Notice } from '@/components/ui/notice';
import { TextField } from '@/components/ui/text-field';
import { COLORS, FONT_SIZES, RADII, SPACING } from '@/constants/theme';
import { useNow } from '@/hooks/use-now';
import { capitalize } from '@/utils/capitalize';
import { formatWhen } from '@/utils/format-when';
import { parseId } from '@/utils/parse-id';

import { isReminderPastDue } from '../api/group-reminders';
import {
  createReminder,
  deleteReminder,
  getTaskTitle,
  setReminderStatus,
  updateReminder,
} from '../api/reminders';
import { useNotificationPermission } from '../hooks/use-notification-permission';
import { useReminder } from '../hooks/use-reminder';
import type { AlertOutcome, Reminder } from '../types';

const FINISHED_WORDS = { completed: 'Done', dismissed: 'Dismissed', cancelled: 'Cancelled' };

type ReminderEditorProps = {
  /** The reminder's id from the route. Leave it out to add a new reminder. */
  reminderId?: string;
  /** For a new reminder: the task it's for, from the route. */
  taskId?: string;
  onClose: () => void;
};

/** Adds a reminder, or shows and edits one, with its alert status and actions. */
export function ReminderEditor({ reminderId, taskId, onClose }: ReminderEditorProps) {
  if (reminderId === undefined) {
    return <ReminderForm reminder={null} taskId={parseId(taskId)} onClose={onClose} />;
  }
  const id = parseId(reminderId);
  if (id === null) return <Missing />;
  return <SavedReminder id={id} onClose={onClose} />;
}

function SavedReminder({ id, onClose }: { id: number; onClose: () => void }) {
  const { status, data: reminder, retry } = useReminder(id);
  // Keyed by id so the fields start from the saved reminder once it loads.
  if (reminder) {
    return <ReminderForm key={reminder.id} reminder={reminder} taskId={null} onClose={onClose} />;
  }
  if (status === 'loading') {
    return (
      <View style={styles.message}>
        <ActivityIndicator color={COLORS.primary} />
      </View>
    );
  }
  if (status === 'error') {
    return (
      <View style={styles.message}>
        <Notice text="Couldn't open this reminder." />
        <Button label="Try again" onPress={retry} />
      </View>
    );
  }
  return <Missing />;
}

function Missing() {
  return (
    <View style={styles.message}>
      <Text style={styles.hint}>{"This reminder doesn't exist. It may have been deleted."}</Text>
    </View>
  );
}

type ReminderFormProps = {
  /** Null for a new reminder. */
  reminder: Reminder | null;
  /** The task a new reminder is for. */
  taskId: number | null;
  onClose: () => void;
};

function ReminderForm({ reminder, taskId, onClose }: ReminderFormProps) {
  const now = useNow(30_000);
  const [initialWhen] = useState(() =>
    reminder ? capitalize(formatWhen(reminder.scheduledAt, true, Date.now())) : '',
  );
  const [title, setTitle] = useState(reminder?.title ?? '');
  const [whenText, setWhenText] = useState(initialWhen);
  const [saving, setSaving] = useState(false);
  const newTaskTitle = useTaskTitle(reminder ? null : taskId, setTitle);

  const unchanged = reminder !== null && whenText === initialWhen;
  const whenInput: WhenInput = unchanged
    ? { kind: 'ok', at: reminder.scheduledAt, hasTime: true }
    : readWhenInput(
        whenText,
        'reminder',
        now,
        reminder && { at: reminder.scheduledAt, hasTime: true },
      );
  const canSave = title.trim() !== '' && whenInput.kind === 'ok' && !saving;

  const save = async () => {
    if (!canSave || whenInput.kind !== 'ok') return;
    setSaving(true);
    try {
      const saved = reminder
        ? await updateReminder(
            reminder.id,
            unchanged ? { title } : { title, scheduledAt: whenInput.at },
          )
        : await createReminder({ title, scheduledAt: whenInput.at, taskId });
      explainAlert(saved.alert, onClose);
    } catch {
      setSaving(false);
      Alert.alert("Couldn't save the reminder", 'Please try again.');
    }
  };

  const close = async (status: 'completed' | 'dismissed' | 'cancelled') => {
    if (!reminder) return;
    try {
      const { alertCleared } = await setReminderStatus(reminder.id, status);
      if (alertCleared) onClose();
      else Alert.alert('Saved', 'Its alert may still go off.', [{ text: 'OK', onPress: onClose }]);
    } catch {
      Alert.alert("Couldn't update the reminder", 'Please try again.');
    }
  };

  const reminderId = reminder?.id;
  const confirmDelete = useCallback(() => {
    if (reminderId === undefined) return;
    Alert.alert('Delete this reminder?', "This can't be undone.", [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            const { alertCleared } = await deleteReminder(reminderId);
            if (alertCleared) onClose();
            else
              Alert.alert('Deleted', 'Its alert may still go off.', [
                { text: 'OK', onPress: onClose },
              ]);
          } catch {
            Alert.alert("Couldn't delete the reminder", 'Please try again.');
          }
        },
      },
    ]);
  }, [reminderId, onClose]);

  // Memoized because each new options object is applied again.
  const screenOptions = useMemo(
    () => ({
      headerRight:
        reminderId === undefined
          ? undefined
          : () => <HeaderButton label="Delete" tone="danger" onPress={confirmDelete} />,
    }),
    [reminderId, confirmDelete],
  );

  const linkedTaskId = reminder ? reminder.taskId : taskId;
  const linkedTaskTitle = reminder ? reminder.taskTitle : newTaskTitle;

  return (
    <>
      <Stack.Screen options={screenOptions} />
      <KeyboardAvoidingView behavior="padding" automaticOffset style={styles.flex}>
        <ScrollView contentContainerStyle={styles.form} keyboardShouldPersistTaps="handled">
          {reminder && <ReminderStatus reminder={reminder} now={now} />}
          <TextField
            label="Remind me to"
            value={title}
            onChangeText={setTitle}
            placeholder="What should I remind you about?"
            autoFocus={!reminder}
            maxLength={200}
          />
          <WhenField
            label="When"
            mode="reminder"
            value={whenText}
            onChangeText={setWhenText}
            input={whenInput}
            now={now}
          />
          {linkedTaskId !== null && linkedTaskTitle !== null && (
            <Pressable
              accessibilityRole="button"
              accessibilityHint="Opens the task"
              onPress={() =>
                router.push({ pathname: '/tasks/[id]', params: { id: String(linkedTaskId) } })
              }
              style={({ pressed }) => [styles.task, pressed && styles.pressed]}
            >
              <Text style={styles.label}>For the task</Text>
              <Text style={styles.taskTitle}>{linkedTaskTitle}</Text>
            </Pressable>
          )}
          {reminder?.status === 'scheduled' && (
            <View style={styles.statusActions}>
              <Button label="Mark as done" variant="ghost" onPress={() => close('completed')} />
              <Button label="Dismiss" variant="ghost" onPress={() => close('dismissed')} />
              <Button label="Cancel reminder" variant="ghost" onPress={() => close('cancelled')} />
            </View>
          )}
        </ScrollView>
        <View style={styles.actions}>
          <Button
            label={reminder ? 'Save' : 'Add reminder'}
            onPress={save}
            disabled={!canSave}
            style={styles.action}
          />
        </View>
      </KeyboardAvoidingView>
    </>
  );
}

/** Done, dismissed, cancelled or past due, and whether the phone will alert. */
function ReminderStatus({ reminder, now }: { reminder: Reminder; now: number }) {
  const permission = useNotificationPermission();
  if (reminder.status !== 'scheduled') {
    return (
      <Badge
        label={FINISHED_WORDS[reminder.status]}
        tone={reminder.status === 'completed' ? 'success' : 'neutral'}
      />
    );
  }
  if (isReminderPastDue(reminder, now)) return <Badge label="Past due" tone="warning" />;
  if (reminder.notificationId !== null) return null;
  return (
    <View style={styles.alertNotice}>
      <Notice
        text={
          permission === 'denied'
            ? "Notifications are off, so this reminder can't alert you."
            : "This reminder's alert isn't set yet. The app tries again each time you open it."
        }
      />
      {permission === 'denied' && (
        <Button label="Open settings" variant="ghost" onPress={() => Linking.openSettings()} />
      )}
    </View>
  );
}

// For a new reminder made from a task: the task's title, which also fills an empty title.
function useTaskTitle(
  taskId: number | null,
  setTitle: (update: (title: string) => string) => void,
) {
  const [taskTitle, setTaskTitle] = useState<string | null>(null);
  useEffect(() => {
    if (taskId === null) return;
    let active = true;
    getTaskTitle(taskId)
      .then((found) => {
        if (!active) return;
        setTaskTitle(found);
        if (found) setTitle((title) => title || found);
      })
      .catch(() => undefined);
    return () => {
      active = false;
    };
  }, [taskId, setTitle]);
  return taskTitle;
}

// Saved either way. Say so when the phone won't alert, then leave.
function explainAlert(alert: AlertOutcome, onDone: () => void) {
  if (alert === 'no-permission') {
    Alert.alert(
      'Reminder saved',
      "Notifications are off, so it can't alert you. Turn them on in Settings.",
      [
        { text: 'Not now', style: 'cancel', onPress: onDone },
        {
          text: 'Open settings',
          onPress: () => {
            Linking.openSettings();
            onDone();
          },
        },
      ],
      { cancelable: true, onDismiss: onDone },
    );
  } else if (alert === 'failed') {
    Alert.alert(
      'Reminder saved',
      "Its alert couldn't be scheduled. The app tries again each time you open it.",
      [{ text: 'OK', onPress: onDone }],
      { cancelable: true, onDismiss: onDone },
    );
  } else {
    onDone();
  }
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
  },
  form: {
    gap: SPACING.lg,
    padding: SPACING.md,
  },
  label: {
    fontSize: FONT_SIZES.caption,
    fontWeight: '600',
    color: COLORS.textMuted,
  },
  task: {
    gap: SPACING.xs,
    padding: SPACING.md,
    borderRadius: RADII.md,
    backgroundColor: COLORS.surface,
  },
  pressed: {
    opacity: 0.7,
  },
  taskTitle: {
    fontSize: FONT_SIZES.body,
    fontWeight: '600',
    color: COLORS.text,
  },
  statusActions: {
    gap: SPACING.sm,
  },
  alertNotice: {
    gap: SPACING.sm,
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
  message: {
    flex: 1,
    gap: SPACING.md,
    padding: SPACING.md,
    justifyContent: 'center',
  },
  hint: {
    fontSize: FONT_SIZES.body,
    lineHeight: 24,
    color: COLORS.textMuted,
    textAlign: 'center',
  },
});
