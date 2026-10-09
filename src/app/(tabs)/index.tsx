import { StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { COLORS } from '@/constants/theme';
import { NotesList } from '@/features/notes';

export default function HomeScreen() {
  return (
    <SafeAreaView edges={['bottom']} style={styles.container}>
      <NotesList />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
});
