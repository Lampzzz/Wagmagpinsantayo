import { Link } from 'expo-router';
import { Tabs } from 'expo-router/js-tabs';

import { HeaderButton } from '@/components/ui/header-button';
import { Icon } from '@/components/ui/icon';
import { COLORS } from '@/constants/theme';

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: COLORS.primary,
        tabBarInactiveTintColor: COLORS.textMuted,
        tabBarHideOnKeyboard: true,
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Home',
          headerShown: false,
          tabBarIcon: ({ color }) => <Icon ios="house" android="home" color={color} />,
        }}
      />
      <Tabs.Screen
        name="notes"
        options={{
          title: 'Notes',
          tabBarIcon: ({ color }) => <Icon ios="note.text" android="description" color={color} />,
          headerRight: () => (
            <Link href="/ai-setup" asChild>
              <HeaderButton label="AI" accessibilityLabel="On-device AI" />
            </Link>
          ),
        }}
      />
      <Tabs.Screen
        name="assistant"
        options={{
          title: 'Assistant',
          tabBarIcon: ({ color }) => (
            <Icon ios="bubble.left.and.bubble.right" android="chat" color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="tasks"
        options={{
          title: 'Tasks',
          tabBarIcon: ({ color }) => <Icon ios="checklist" android="checklist" color={color} />,
        }}
      />
      <Tabs.Screen
        name="reminders"
        options={{
          title: 'Reminders',
          tabBarIcon: ({ color }) => <Icon ios="bell" android="notifications" color={color} />,
        }}
      />
    </Tabs>
  );
}
