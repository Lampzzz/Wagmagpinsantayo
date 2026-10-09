import { StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { COLORS } from '@/constants/theme';
import { JournalList } from '@/features/notes';

export default function JournalRoute() {
  return (
    <SafeAreaView edges={['bottom']} style={styles.container}>
      <JournalList />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
});
