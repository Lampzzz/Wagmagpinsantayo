import { router, Stack } from 'expo-router';
import { StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { HeaderButton } from '@/components/ui/header-button';
import { COLORS } from '@/constants/theme';
import { AssistantChat } from '@/features/assistant';

const SCREEN_OPTIONS = {
  headerRight: () => (
    <HeaderButton
      label="History"
      accessibilityHint="Shows what you and Pinsan said, by day"
      onPress={() => router.push('/conversations/history')}
    />
  ),
};

export default function ConversationsRoute() {
  return (
    <SafeAreaView edges={['bottom']} style={styles.container}>
      <Stack.Screen options={SCREEN_OPTIONS} />
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
