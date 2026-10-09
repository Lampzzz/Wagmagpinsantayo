import { router } from 'expo-router';
import { StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { COLORS, SPACING } from '@/constants/theme';
import { AiSetupPanel } from '@/features/ai-setup';

export default function AiSetupRoute() {
  return (
    <SafeAreaView edges={['bottom']} style={styles.container}>
      <AiSetupPanel onDone={() => router.back()} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: SPACING.md,
    backgroundColor: COLORS.background,
  },
});
