import { StyleSheet, View } from 'react-native';

import { COLORS } from '@/constants/theme';
import { ReminderList } from '@/features/reminders';

export default function RemindersScreen() {
  return (
    <View style={styles.container}>
      <ReminderList />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
});
