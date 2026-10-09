import { StyleSheet, View } from 'react-native';

import { COLORS } from '@/constants/theme';
import { TaskList } from '@/features/tasks';

export default function TasksScreen() {
  return (
    <View style={styles.container}>
      <TaskList />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
});
