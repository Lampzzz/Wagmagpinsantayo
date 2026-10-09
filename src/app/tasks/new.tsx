import { router, useLocalSearchParams } from 'expo-router';
import { StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { COLORS } from '@/constants/theme';
import { TaskEditor, type TaskPriority } from '@/features/tasks';

// "Edit" on a Quick Add proposal fills the new task in ahead. The assistant's reply buttons
// (features/assistant/components/reply-content.tsx) send these.
type DraftParams = {
  title?: string;
  notes?: string;
  priority?: string;
  /** Epoch milliseconds. */
  dueAt?: string;
  /** "1" when `dueAt` has a time of day. */
  dueHasTime?: string;
  /** "1" when the proposal came with a reminder at the due time. */
  remind?: string;
};

const PRIORITIES: readonly string[] = ['low', 'normal', 'high'];

export default function NewTaskRoute() {
  const params = useLocalSearchParams<DraftParams>();
  const dueAt = Number(params.dueAt);
  const hasDue = params.dueAt !== undefined && Number.isFinite(dueAt);
  const prefill =
    params.title === undefined
      ? undefined
      : {
          title: params.title,
          description: params.notes ?? '',
          priority: PRIORITIES.includes(params.priority ?? '')
            ? (params.priority as TaskPriority)
            : undefined,
          dueAt: hasDue ? dueAt : null,
          dueHasTime: hasDue && params.dueHasTime === '1',
          remind: hasDue && params.remind === '1',
        };

  return (
    <SafeAreaView edges={['bottom']} style={styles.container}>
      <TaskEditor prefill={prefill} onClose={() => router.back()} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
});
