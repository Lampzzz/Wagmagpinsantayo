import { router, Stack } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
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
import { Chip } from '@/components/ui/chip';
import { HeaderButton } from '@/components/ui/header-button';
import { Notice } from '@/components/ui/notice';
import { TextField } from '@/components/ui/text-field';
import { COLORS, FONT_SIZES, RADII, SPACING } from '@/constants/theme';
import { useReminders } from '@/features/reminders';
import { useNow } from '@/hooks/use-now';
import { capitalize } from '@/utils/capitalize';
import { formatWhen } from '@/utils/format-when';
import { parseId } from '@/utils/parse-id';

import { isTaskOverdue } from '../api/group-tasks';
import { createTask, deleteTask, setTaskDone, updateTask } from '../api/tasks';
import { useTask } from '../hooks/use-task';
import type { Task, TaskPriority } from '../types';

const PRIORITIES: { value: TaskPriority; label: string }[] = [
  { value: 'low', label: 'Low' },
  { value: 'normal', label: 'Normal' },
  { value: 'high', label: 'High' },
];

type TaskEditorProps = {
  /** The task's id from the route. Leave it out to add a new task. */
  taskId?: string;
  onClose: () => void;
};

/** Adds a task, or shows and edits one: title, deadline, priority, notes and reminders. */
export function TaskEditor({ taskId, onClose }: TaskEditorProps) {
  if (taskId === undefined) return <TaskForm task={null} onClose={onClose} />;
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
        <ActivityIndicator color={COLORS.primary} />
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
  onClose: () => void;
};

function TaskForm({ task, onClose }: TaskFormProps) {
  const now = useNow();
  const [initialWhen] = useState(() =>
    task === null || task.dueAt === null
      ? ''
      : capitalize(formatWhen(task.dueAt, task.dueHasTime, Date.now())),
  );
  const [title, setTitle] = useState(task?.title ?? '');
  const [notes, setNotes] = useState(task?.description ?? '');
  const [priority, setPriority] = useState<TaskPriority>(task?.priority ?? 'normal');
  const [whenText, setWhenText] = useState(initialWhen);
  const [saving, setSaving] = useState(false);

  const base =
    task === null || task.dueAt === null ? null : { at: task.dueAt, hasTime: task.dueHasTime };
  // Untouched, the saved deadline stands, even if it has passed since.
  const whenInput: WhenInput =
    task && whenText === initialWhen
      ? base
        ? { kind: 'ok', ...base }
        : { kind: 'empty' }
      : readWhenInput(whenText, 'task', now, base);
  const canSave = title.trim() !== '' && whenInput.kind !== 'invalid' && !saving;

  const save = async () => {
    if (!canSave) return;
    setSaving(true);
    const due =
      whenInput.kind === 'ok'
        ? { dueAt: whenInput.at, dueHasTime: whenInput.hasTime }
        : { dueAt: null, dueHasTime: false };
    try {
      if (task) await updateTask(task.id, { title, description: notes, priority, ...due });
      else await createTask({ title, description: notes, priority, ...due });
      onClose();
    } catch {
      setSaving(false);
      Alert.alert("Couldn't save the task", 'Please try again.');
    }
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
  label: {
    fontSize: FONT_SIZES.caption,
    fontWeight: '600',
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
    borderRadius: RADII.md,
    backgroundColor: COLORS.surface,
  },
  pressed: {
    opacity: 0.7,
  },
  reminderTitle: {
    fontSize: FONT_SIZES.body,
    fontWeight: '600',
    color: COLORS.text,
  },
  reminderTime: {
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
