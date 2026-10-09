import { StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { COLORS } from '@/constants/theme';
import { ReminderList } from '@/features/reminders';

export default function RemindersRoute() {
  return (
    <SafeAreaView edges={['bottom']} style={styles.container}>
      <ReminderList />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
});
