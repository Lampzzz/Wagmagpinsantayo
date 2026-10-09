import { router, useLocalSearchParams } from 'expo-router';
import { StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { COLORS } from '@/constants/theme';
import { ExtractTasksSheet } from '@/features/notes';

export default function ExtractTasksRoute() {
  const { noteId } = useLocalSearchParams<{ noteId?: string }>();
  return (
    <SafeAreaView edges={['bottom']} style={styles.container}>
      <ExtractTasksSheet noteId={noteId} onClose={() => router.back()} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
});
