import { router } from 'expo-router';
import { StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { COLORS } from '@/constants/theme';
import { VoiceNoteRecorder } from '@/features/notes';

export default function VoiceNoteRoute() {
  return (
    <SafeAreaView edges={['bottom']} style={styles.container}>
      <VoiceNoteRecorder onClose={() => router.back()} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
});
