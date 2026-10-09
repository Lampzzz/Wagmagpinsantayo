import { StyleSheet, View } from 'react-native';

import { COLORS } from '@/constants/theme';
import { AssistantChat } from '@/features/assistant';

export default function AssistantScreen() {
  return (
    <View style={styles.container}>
      <AssistantChat />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
});
