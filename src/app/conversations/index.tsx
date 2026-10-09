import { StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { COLORS } from '@/constants/theme';
import { AssistantChat } from '@/features/assistant';

export default function ConversationsRoute() {
  return (
    <SafeAreaView edges={['bottom']} style={styles.container}>
      <AssistantChat />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
});
