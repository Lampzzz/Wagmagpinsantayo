import { router, useLocalSearchParams } from 'expo-router';
import { StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { COLORS } from '@/constants/theme';
import { ReminderEditor } from '@/features/reminders';

export default function NewReminderRoute() {
  const { taskId } = useLocalSearchParams<{ taskId?: string }>();
  return (
    <SafeAreaView edges={['bottom']} style={styles.container}>
      <ReminderEditor taskId={taskId} onClose={() => router.back()} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
});
