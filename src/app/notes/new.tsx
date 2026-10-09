import { router } from 'expo-router';
import { StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { COLORS } from '@/constants/theme';
import { NoteEditor } from '@/features/notes';

export default function NewNoteRoute() {
  return (
    <SafeAreaView edges={['bottom']} style={styles.container}>
      <NoteEditor onDeleted={() => router.back()} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
});
