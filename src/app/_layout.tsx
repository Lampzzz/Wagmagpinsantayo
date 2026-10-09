import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { KeyboardProvider } from 'react-native-keyboard-controller';

import { useReminderAlerts } from '@/features/reminders';

export default function RootLayout() {
  useReminderAlerts();
  return (
    <KeyboardProvider>
      <Stack>
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="notes/new" options={{ title: 'New note' }} />
        <Stack.Screen name="notes/[id]" options={{ title: 'Note' }} />
        <Stack.Screen name="notes/voice" options={{ title: 'Voice note', presentation: 'modal' }} />
        <Stack.Screen name="tasks/new" options={{ title: 'New task' }} />
        <Stack.Screen name="tasks/[id]" options={{ title: 'Task' }} />
        <Stack.Screen name="reminders/new" options={{ title: 'New reminder' }} />
        <Stack.Screen name="reminders/[id]" options={{ title: 'Reminder' }} />
        <Stack.Screen name="ai-setup" options={{ title: 'On-device AI', presentation: 'modal' }} />
      </Stack>
      <StatusBar style="auto" />
    </KeyboardProvider>
  );
}
