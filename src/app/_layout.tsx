import { Fredoka_600SemiBold } from '@expo-google-fonts/fredoka';
import { Nunito_400Regular, Nunito_700Bold } from '@expo-google-fonts/nunito';
import { useFonts } from 'expo-font';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { LogBox, StyleSheet } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';

// React Three Fiber 9.8 still uses THREE.Clock internally. Nothing to fix on our side, and the
// warning toast covers the bottom of the screen in development.
LogBox.ignoreLogs(['THREE.Clock: This module has been deprecated']);

export default function RootLayout() {
  const [fontsLoaded] = useFonts({ Fredoka_600SemiBold, Nunito_400Regular, Nunito_700Bold });

  // Fonts are bundled, so this resolves almost immediately, even offline.
  if (!fontsLoaded) return null;

  return (
    <GestureHandlerRootView style={styles.root}>
      <StatusBar style="dark" />
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="index" />
      </Stack>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
});
