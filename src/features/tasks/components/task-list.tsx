import { Link, router } from 'expo-router';
import { memo, useCallback, useMemo } from 'react';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  SectionList,
  StyleSheet,
  View,
  type SectionListRenderItem,
} from 'react-native';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Icon } from '@/components/ui/icon';
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
import { formatWhen } from '@/utils/format-when';

import { groupTasks, isTaskOverdue, TASK_GROUP_TITLES } from '../api/group-tasks';
import { setTaskDone } from '../api/tasks';
import { useTasks } from '../hooks/use-tasks';
import type { Task, TaskGroup } from '../types';

type Section = { key: TaskGroup; title: string; data: Task[] };

/** Tasks grouped as Overdue, Today, Upcoming, No date and Done, with a button to add one. */
export function TaskList() {
  const { status, data, retry } = useTasks();
  const now = useNow();
  const sections = useMemo<Section[]>(
    () =>
      groupTasks(data ?? [], now).map(({ group, tasks }) => ({
        key: group,
        title: TASK_GROUP_TITLES[group],
        data: tasks,
      })),
    [data, now],
  );

  const toggle = useCallback(async (task: Task) => {
    try {
      await setTaskDone(task.id, task.status !== 'done');
    } catch {
      Alert.alert("Couldn't update the task", 'Please try again.');
    }
  }, []);

  const open = useCallback((id: number) => {
    router.push({ pathname: '/tasks/[id]', params: { id: String(id) } });
  }, []);

  const renderItem = useCallback<SectionListRenderItem<Task, Section>>(
    ({ item }) => <TaskRow task={item} now={now} onToggle={toggle} onOpen={open} />,
    [now, toggle, open],
  );

  return (
    <View style={styles.container}>
      {data ? (
        <SectionList
          sections={sections}
          keyExtractor={taskKey}
          renderItem={renderItem}
          renderSectionHeader={renderSectionHeader}
          ListEmptyComponent={EmptyTasks}
          contentContainerStyle={sections.length === 0 ? styles.emptyContent : styles.listContent}
        />
      ) : (
        <View style={styles.message}>
          {status === 'error' ? (
            <>
              <Notice text="Couldn't load your tasks." />
              <Button label="Try again" onPress={retry} />
            </>
          ) : (
            <ActivityIndicator color={COLORS.primaryDark} />
          )}
        </View>
      )}
      <View style={styles.actions}>
        <Link href="/tasks/new" asChild>
          <Button label="New task" style={styles.action} />
        </Link>
      </View>
    </View>
  );
}

function taskKey(task: Task) {
  return String(task.id);
}

function renderSectionHeader({ section }: { section: Section }) {
  return (
    <Text accessibilityRole="header" style={styles.sectionHeader}>
      {section.title}
    </Text>
  );
}

type TaskRowProps = {
  task: Task;
  now: number;
  onToggle: (task: Task) => void;
  onOpen: (id: number) => void;
};

const TaskRow = memo(function TaskRow({ task, now, onToggle, onOpen }: TaskRowProps) {
  const done = task.status === 'done';
  const overdue = isTaskOverdue(task, now);
  const due = task.dueAt === null ? null : `Due ${formatWhen(task.dueAt, task.dueHasTime, now)}`;
  const highPriority = task.priority === 'high' && !done;
  return (
    <View style={styles.row}>
      <Pressable
        accessibilityRole="checkbox"
        accessibilityLabel={task.title}
        accessibilityState={{ checked: done }}
        accessibilityHint={done ? 'Marks the task as not done' : 'Marks the task as done'}
        onPress={() => onToggle(task)}
        style={({ pressed }) => [styles.check, pressed && styles.pressed]}
      >
        <Icon
          ios={done ? 'checkmark.circle.fill' : 'circle'}
          android={done ? 'check_circle' : 'radio_button_unchecked'}
          color={done ? COLORS.success : COLORS.textMuted}
          size={26}
        />
      </Pressable>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={[task.title, overdue ? 'overdue' : null, due]
          .filter(Boolean)
          .join(', ')}
        accessibilityHint="Opens the task"
        onPress={() => onOpen(task.id)}
        style={({ pressed }) => [styles.rowBody, pressed && styles.pressed]}
      >
        <Text style={[styles.rowTitle, done && styles.doneTitle]} numberOfLines={2}>
          {task.title}
        </Text>
        {(due !== null || highPriority) && (
          <View style={styles.rowDetails}>
            {overdue && <Badge label="Overdue" tone="warning" />}
            {highPriority && <Badge label="High priority" />}
            {due !== null && (
              <Text style={[styles.rowDetail, overdue && styles.overdueDetail]}>{due}</Text>
            )}
          </View>
        )}
      </Pressable>
    </View>
  );
});

function EmptyTasks() {
  return (
    <View style={styles.empty}>
      <Text accessibilityRole="header" style={styles.emptyTitle}>
        No tasks yet
      </Text>
      <Text style={styles.hint}>
        Tap New task, or ask the Assistant: &quot;Create a task to call the dentist&quot;.
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
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: RADII.lg,
    backgroundColor: COLORS.surface,
    ...SHADOWS.card,
  },
  check: {
    width: 52,
    minHeight: 52,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rowBody: {
    flex: 1,
    gap: SPACING.xs,
    paddingVertical: SPACING.md,
    paddingRight: SPACING.md,
  },
  pressed: {
    transform: [{ scale: PRESSED_SCALE }],
  },
  rowTitle: {
    fontFamily: FONTS.bodyBold,
    fontSize: FONT_SIZES.body,
    color: COLORS.text,
  },
  doneTitle: {
    color: COLORS.textMuted,
    textDecorationLine: 'line-through',
  },
  rowDetails: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: SPACING.sm,
  },
  rowDetail: {
    fontSize: FONT_SIZES.caption,
    color: COLORS.textMuted,
  },
  overdueDetail: {
    color: COLORS.warning,
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
