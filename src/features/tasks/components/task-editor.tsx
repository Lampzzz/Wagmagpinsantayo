import { router, Stack } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Linking,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';
import { KeyboardAvoidingView } from 'react-native-keyboard-controller';

import { readWhenInput, WhenField, type WhenInput } from '@/components/common/when-field';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Chip } from '@/components/ui/chip';
import { HeaderButton } from '@/components/ui/header-button';
import { Notice } from '@/components/ui/notice';
import { Text } from '@/components/ui/text';
import { TextField } from '@/components/ui/text-field';
import {
  COLORS,
  FONT_SIZES,
  FONTS,
  PRESSED_SCALE,
  RADII,
  SHADOWS,
  SPACING,
} from '@/constants/theme';
import { createReminder, useReminders, type AlertOutcome } from '@/features/reminders';
import { useNow } from '@/hooks/use-now';
import { capitalize } from '@/utils/capitalize';
import { formatWhen } from '@/utils/format-when';
import { parseId } from '@/utils/parse-id';

import { isTaskOverdue } from '../api/group-tasks';
import { createTask, deleteTask, setTaskDone, updateTask } from '../api/tasks';
import { useTask } from '../hooks/use-task';
import type { NewTask, Task, TaskPriority } from '../types';

const PRIORITIES: { value: TaskPriority; label: string }[] = [
  { value: 'low', label: 'Low' },
  { value: 'normal', label: 'Normal' },
  { value: 'high', label: 'High' },
];

/** A new task filled in ahead, such as a Quick Add proposal the user wants to change. */
type TaskDraft = NewTask & {
  /** Offers a reminder at the due time, on to start with, as Quick Add would set. */
  remind?: boolean;
};

type TaskEditorProps = {
  /** The task's id from the route. Leave it out to add a new task. */
  taskId?: string;
  /** Starting values for a new task. */
  prefill?: TaskDraft;
  onClose: () => void;
};

/** Adds a task, or shows and edits one: title, deadline, priority, notes and reminders. */
export function TaskEditor({ taskId, prefill, onClose }: TaskEditorProps) {
  if (taskId === undefined) return <TaskForm task={null} draft={prefill} onClose={onClose} />;
  const id = parseId(taskId);
  if (id === null) return <Missing />;
  return <SavedTask id={id} onClose={onClose} />;
}

function SavedTask({ id, onClose }: { id: number; onClose: () => void }) {
  const { status, data: task, retry } = useTask(id);
  // Keyed by id so the fields start from the saved task once it loads.
  if (task) return <TaskForm key={task.id} task={task} onClose={onClose} />;
  if (status === 'loading') {
    return (
      <View style={styles.message}>
        <ActivityIndicator color={COLORS.primaryDark} />
      </View>
    );
  }
  if (status === 'error') {
    return (
      <View style={styles.message}>
        <Notice text="Couldn't open this task." />
        <Button label="Try again" onPress={retry} />
      </View>
    );
  }
  return <Missing />;
}

function Missing() {
  return (
    <View style={styles.message}>
      <Text style={styles.hint}>{"This task doesn't exist. It may have been deleted."}</Text>
    </View>
  );
}

type TaskFormProps = {
  /** Null for a new task. */
  task: Task | null;
  /** Starting values for a new task. */
  draft?: TaskDraft;
  onClose: () => void;
};

function TaskForm({ task, draft, onClose }: TaskFormProps) {
  const now = useNow();
  const start = task ?? draft;
  const base =
    start?.dueAt === undefined || start.dueAt === null
      ? null
      : { at: start.dueAt, hasTime: start.dueHasTime ?? false };
  const [initialWhen] = useState(() =>
    base === null ? '' : capitalize(formatWhen(base.at, base.hasTime, Date.now())),
  );
  const [title, setTitle] = useState(start?.title ?? '');
  const [notes, setNotes] = useState(start?.description ?? '');
  const [priority, setPriority] = useState<TaskPriority>(start?.priority ?? 'normal');
  const [whenText, setWhenText] = useState(initialWhen);
  const [remind, setRemind] = useState(draft?.remind ?? false);
  const [saving, setSaving] = useState(false);

  // Untouched, the saved or proposed deadline stands, even if it has passed since.
  const whenInput: WhenInput =
    start && whenText === initialWhen
      ? base
        ? { kind: 'ok', ...base }
        : { kind: 'empty' }
      : readWhenInput(whenText, 'task', now, base);
  const canSave = title.trim() !== '' && whenInput.kind !== 'invalid' && !saving;
  const remindAt = whenInput.kind === 'ok' ? reminderTime(whenInput, now) : null;

  const save = async () => {
    if (!canSave) return;
    setSaving(true);
    const due =
      whenInput.kind === 'ok'
        ? { dueAt: whenInput.at, dueHasTime: whenInput.hasTime }
        : { dueAt: null, dueHasTime: false };
    let created: Task;
    try {
      if (task) {
        await updateTask(task.id, { title, description: notes, priority, ...due });
        onClose();
        return;
      }
      created = await createTask({ title, description: notes, priority, ...due });
    } catch {
      setSaving(false);
      Alert.alert("Couldn't save the task", 'Please try again.');
      return;
    }
    if (remind && remindAt !== null) {
      // Worked out again: the time shown can be a minute old, and may have passed since.
      const at = whenInput.kind === 'ok' ? reminderTime(whenInput, Date.now()) : null;
      if (at === null) {
        Alert.alert(
          'Task saved',
          "That time has passed, so there won't be a reminder.",
          [{ text: 'OK', onPress: onClose }],
          { cancelable: true, onDismiss: onClose },
        );
        return;
      }
      try {
        const { alert } = await createReminder({
          title: created.title,
          scheduledAt: at,
          taskId: created.id,
        });
        explainAlert(alert, onClose);
        return;
      } catch {
        Alert.alert(
          'The task is saved',
          "But its reminder couldn't be set. Add one from the task.",
        );
      }
    }
    onClose();
  };

  const toggleDone = async () => {
    if (!task) return;
    try {
      await setTaskDone(task.id, task.status !== 'done');
    } catch {
      Alert.alert("Couldn't update the task", 'Please try again.');
    }
  };

  const taskId = task?.id;
  const confirmDelete = useCallback(() => {
    if (taskId === undefined) return;
    Alert.alert('Delete this task?', "This can't be undone. Any reminders for it are kept.", [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            await deleteTask(taskId);
            onClose();
          } catch {
            Alert.alert("Couldn't delete the task", 'Please try again.');
          }
        },
      },
    ]);
  }, [taskId, onClose]);

  // Memoized because each new options object is applied again.
  const screenOptions = useMemo(
    () => ({
      headerRight:
        taskId === undefined
          ? undefined
          : () => <HeaderButton label="Delete" tone="danger" onPress={confirmDelete} />,
    }),
    [taskId, confirmDelete],
  );

  return (
    <>
      <Stack.Screen options={screenOptions} />
      <KeyboardAvoidingView behavior="padding" automaticOffset style={styles.flex}>
        <ScrollView contentContainerStyle={styles.form} keyboardShouldPersistTaps="handled">
          {task && <TaskStatus task={task} now={now} />}
          <TextField
            label="Title"
            value={title}
            onChangeText={setTitle}
            placeholder="What needs doing?"
            autoFocus={!task}
            maxLength={200}
          />
          <WhenField
            label="Due"
            mode="task"
            value={whenText}
            onChangeText={setWhenText}
            input={whenInput}
            now={now}
          />
          {draft?.remind && (
            <DueReminder
              on={remind}
              remindAt={remindAt}
              hasDue={whenInput.kind === 'ok'}
              now={now}
              onToggle={() => setRemind((value) => !value)}
            />
          )}
          <View style={styles.field}>
            <Text style={styles.label}>Priority</Text>
            <View accessibilityRole="radiogroup" style={styles.chips}>
              {PRIORITIES.map((option) => (
                <Chip
                  key={option.value}
                  label={option.label}
                  selected={priority === option.value}
                  onPress={() => setPriority(option.value)}
                />
              ))}
            </View>
          </View>
          <TextField
            label="Notes"
            value={notes}
            onChangeText={setNotes}
            placeholder="Optional"
            multiline
          />
          {task && <TaskReminders task={task} now={now} />}
        </ScrollView>
        <View style={styles.actions}>
          {task && (
            <Button
              label={task.status === 'done' ? 'Mark as not done' : 'Mark as done'}
              variant="ghost"
              onPress={toggleDone}
              style={styles.action}
            />
          )}
          <Button
            label={task ? 'Save' : 'Add task'}
            onPress={save}
            disabled={!canSave}
            style={styles.action}
          />
        </View>
      </KeyboardAvoidingView>
    </>
  );
}

// Quick Add's rule, for a proposal opened here: a reminder at the due time, or at 9:00 AM on a
// day without a time. None once that time has passed.
const REMINDER_HOUR = 9;

function reminderTime(due: { at: number; hasTime: boolean }, now: number): number | null {
  const at = due.hasTime ? due.at : new Date(due.at).setHours(REMINDER_HOUR, 0, 0, 0);
  return at > now ? at : null;
}

// Saved either way. Say so when the reminder won't alert, as the reminder editor does, then leave.
function explainAlert(alert: AlertOutcome, onDone: () => void) {
  if (alert === 'no-permission') {
    Alert.alert(
      'Task saved',
      "Notifications are off, so its reminder can't alert you. Turn them on in Settings.",
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
      'Task saved',
      "Its reminder couldn't be scheduled to alert you. The app tries again each time you open it.",
      [{ text: 'OK', onPress: onDone }],
      { cancelable: true, onDismiss: onDone },
    );
  } else {
    onDone();
  }
}

type DueReminderProps = {
  on: boolean;
  remindAt: number | null;
  hasDue: boolean;
  now: number;
  onToggle: () => void;
};

/** The reminder a Quick Add proposal comes with, saved along with the task. */
function DueReminder({ on, remindAt, hasDue, now, onToggle }: DueReminderProps) {
  const available = remindAt !== null;
  const note = !hasDue
    ? 'Add a due date to get a reminder.'
    : !available
      ? "That time has passed, so there won't be a reminder."
      : on
        ? `Reminds you ${formatWhen(remindAt, true, now)}.`
        : 'No reminder.';
  return (
    <View style={styles.field}>
      <Text style={styles.label}>Reminder</Text>
      <View style={styles.chips}>
        <Chip
          label="Remind me"
          selected={on && available}
          disabled={!available}
          accessibilityRole="switch"
          accessibilityState={{ checked: on && available, disabled: !available }}
          onPress={onToggle}
        />
      </View>
      <Text accessibilityLiveRegion="polite" style={styles.note}>
        {note}
      </Text>
    </View>
  );
}

function TaskStatus({ task, now }: { task: Task; now: number }) {
  if (task.status === 'done') return <Badge label="Done" tone="success" />;
  if (isTaskOverdue(task, now)) return <Badge label="Overdue" tone="warning" />;
  return null;
}

/** Reminders set for this task. They stay when the task is done or deleted. */
function TaskReminders({ task, now }: { task: Task; now: number }) {
  const { data } = useReminders();
  const reminders = (data ?? [])
    .filter((reminder) => reminder.taskId === task.id)
    .sort((a, b) => a.scheduledAt - b.scheduledAt);

  return (
    <View style={styles.field}>
      <Text style={styles.label}>Reminders</Text>
      {reminders.map((reminder) => (
        <Pressable
          key={reminder.id}
          accessibilityRole="button"
          accessibilityHint="Opens the reminder"
          onPress={() =>
            router.push({ pathname: '/reminders/[id]', params: { id: String(reminder.id) } })
          }
          style={({ pressed }) => [styles.reminder, pressed && styles.pressed]}
        >
          <Text style={styles.reminderTitle}>{reminder.title}</Text>
          <Text style={styles.reminderTime}>
            {capitalize(formatWhen(reminder.scheduledAt, true, now))}
            {reminder.status === 'scheduled' ? '' : ` · ${STATUS_WORDS[reminder.status]}`}
          </Text>
        </Pressable>
      ))}
      <Button
        label="Add reminder"
        variant="ghost"
        onPress={() =>
          router.push({ pathname: '/reminders/new', params: { taskId: String(task.id) } })
        }
      />
    </View>
  );
}

const STATUS_WORDS = { completed: 'Done', dismissed: 'Dismissed', cancelled: 'Cancelled' };

const styles = StyleSheet.create({
  flex: {
    flex: 1,
  },
  form: {
    gap: SPACING.lg,
    padding: SPACING.md,
  },
  field: {
    gap: SPACING.sm,
  },
  // Matches TextField's label, so "Priority" and "Reminders" line up with "Title" and "Notes".
  label: {
    marginStart: SPACING.xs,
    fontFamily: FONTS.bodyBold,
    fontSize: FONT_SIZES.caption,
    color: COLORS.textMuted,
  },
  chips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING.sm,
  },
  reminder: {
    gap: SPACING.xs,
    padding: SPACING.md,
    borderRadius: RADII.lg,
    backgroundColor: COLORS.surface,
    ...SHADOWS.card,
  },
  pressed: {
    transform: [{ scale: PRESSED_SCALE }],
  },
  reminderTitle: {
    fontFamily: FONTS.bodyBold,
    fontSize: FONT_SIZES.body,
    color: COLORS.text,
  },
  reminderTime: {
    fontSize: FONT_SIZES.caption,
    color: COLORS.textMuted,
  },
  note: {
    marginStart: SPACING.xs,
    fontSize: FONT_SIZES.caption,
    color: COLORS.textMuted,
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
