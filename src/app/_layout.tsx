import { Fredoka_600SemiBold } from '@expo-google-fonts/fredoka';
import { Nunito_400Regular, Nunito_700Bold } from '@expo-google-fonts/nunito';
import { useFonts } from 'expo-font';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { LogBox, StyleSheet } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { KeyboardProvider } from 'react-native-keyboard-controller';

import { COLORS, FONT_SIZES, FONTS } from '@/constants/theme';
import { ReminderAlerts } from '@/features/reminders';

// React Three Fiber 9.8 still uses THREE.Clock internally. Nothing to fix on our side, and the
// warning toast covers the bottom of the screen in development.
LogBox.ignoreLogs(['THREE.Clock: This module has been deprecated']);

export default function RootLayout() {
  const [fontsLoaded] = useFonts({ Fredoka_600SemiBold, Nunito_400Regular, Nunito_700Bold });

  // Fonts are bundled, so this resolves almost immediately, even offline.
  if (!fontsLoaded) return null;

  return (
    <GestureHandlerRootView style={styles.root}>
      <KeyboardProvider>
        <Stack
          screenOptions={{
            headerStyle: { backgroundColor: COLORS.background },
            headerShadowVisible: false,
            headerTintColor: COLORS.text,
            headerTitleStyle: {
              fontFamily: FONTS.display,
              fontSize: FONT_SIZES.title,
              color: COLORS.text,
            },
            contentStyle: { backgroundColor: COLORS.background },
          }}
        >
          {/* Home is the island, full screen, with no tab bar: its ☰ menu opens everything else. */}
          <Stack.Screen name="index" options={{ title: 'Home', headerShown: false }} />
          <Stack.Screen name="conversations/index" options={{ title: 'Conversations' }} />
          <Stack.Screen name="journal/index" options={{ title: 'Journal' }} />
          <Stack.Screen name="tasks/index" options={{ title: 'Tasks' }} />
          <Stack.Screen name="reminders/index" options={{ title: 'Reminders' }} />
          <Stack.Screen name="notes/new" options={{ title: 'New note' }} />
          <Stack.Screen name="notes/[id]" options={{ title: 'Note' }} />
          <Stack.Screen
            name="notes/voice"
            options={{ title: 'Voice note', presentation: 'modal' }}
          />
          <Stack.Screen name="tasks/new" options={{ title: 'New task' }} />
          <Stack.Screen name="tasks/[id]" options={{ title: 'Task' }} />
          <Stack.Screen name="reminders/new" options={{ title: 'New reminder' }} />
          <Stack.Screen name="reminders/[id]" options={{ title: 'Reminder' }} />
          <Stack.Screen
            name="alarm/[id]"
            options={{
              title: 'Alarm',
              presentation: 'fullScreenModal',
              headerShown: false,
              gestureEnabled: false,
            }}
          />
          <Stack.Screen
            name="ai-setup"
            options={{ title: 'On-device AI', presentation: 'modal' }}
          />
          <Stack.Screen
            name="extract-tasks"
            options={{
              title: 'Review tasks',
              presentation: 'formSheet',
              sheetAllowedDetents: [0.5, 1],
              sheetCornerRadius: 28,
              sheetGrabberVisible: true,
              // Android sheets have no native header, so the sheet draws its own title.
              headerShown: false,
            }}
          />
          <Stack.Screen name="studio" options={{ headerShown: false }} />
        </Stack>
        <ReminderAlerts />
        <StatusBar style="auto" />
      </KeyboardProvider>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
});
