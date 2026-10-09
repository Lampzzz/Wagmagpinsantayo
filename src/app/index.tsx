import { StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { SPACING } from '@/constants/theme';
import { HomeScreen } from '@/features/home';
import { MenuButton } from '@/features/menu';

export default function HomeRoute() {
  const insets = useSafeAreaInsets();
  return (
    <View style={styles.fill}>
      <HomeScreen />
      {/* The top-right corner belongs to the menu; Home's title and badge stay on the left. */}
      <MenuButton style={[styles.menu, { top: insets.top + SPACING.sm }]} />
    </View>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  menu: { position: 'absolute', right: SPACING.md },
});
