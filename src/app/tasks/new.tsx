import { router } from 'expo-router';
import { StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { COLORS } from '@/constants/theme';
import { TaskEditor } from '@/features/tasks';

export default function NewTaskRoute() {
  return (
    <SafeAreaView edges={['bottom']} style={styles.container}>
      <TaskEditor onClose={() => router.back()} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
});
