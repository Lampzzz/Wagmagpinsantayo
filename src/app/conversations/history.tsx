import { Stack } from 'expo-router';
import { StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { COLORS } from '@/constants/theme';
import { ConversationHistory } from '@/features/assistant';

const SCREEN_OPTIONS = { title: 'History' };

export default function ConversationHistoryRoute() {
  return (
    <SafeAreaView edges={['bottom']} style={styles.container}>
      <Stack.Screen options={SCREEN_OPTIONS} />
      <ConversationHistory />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
});
