import { Link } from 'expo-router';
import { Tabs } from 'expo-router/js-tabs';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { TAB_BAR_ICON_SIZE, TabBarIcon } from '@/components/common/tab-bar-icon';
import { HeaderButton } from '@/components/ui/header-button';
import { COLORS, FONT_SIZES, FONTS, RADII, SHADOWS, SPACING } from '@/constants/theme';

// Room for the icon pill and its label, above the system navigation bar.
const TAB_BAR_HEIGHT = 72;
// Small enough that "Reminders" fits a fifth of a narrow phone.
const TAB_LABEL_SIZE = 12;

export default function TabsLayout() {
  const insets = useSafeAreaInsets();

  return (
    <Tabs
      screenOptions={{
        headerStyle: { backgroundColor: COLORS.background },
        headerShadowVisible: false,
        headerTintColor: COLORS.text,
        headerTitleAlign: 'left',
        headerTitleStyle: {
          fontFamily: FONTS.display,
          fontSize: FONT_SIZES.heading,
          fontWeight: 'normal',
          color: COLORS.text,
        },
        headerRightContainerStyle: { paddingEnd: SPACING.md },
        sceneStyle: { backgroundColor: COLORS.background },
        // Ink: the active icon sits on a mango pill, and its label on the white bar.
        tabBarActiveTintColor: COLORS.onPrimary,
        tabBarInactiveTintColor: COLORS.textMuted,
        tabBarHideOnKeyboard: true,
        // In the layout, not floating, so it never covers the island on Home.
        tabBarStyle: {
          height: TAB_BAR_HEIGHT + insets.bottom,
          paddingTop: SPACING.sm,
          backgroundColor: COLORS.surface,
          borderTopWidth: 0,
          borderTopLeftRadius: RADII.xl,
          borderTopRightRadius: RADII.xl,
          elevation: 0,
          ...SHADOWS.bar,
        },
        tabBarIconStyle: TAB_BAR_ICON_SIZE,
        tabBarLabelStyle: {
          marginTop: SPACING.xs,
          fontFamily: FONTS.display,
          fontSize: TAB_LABEL_SIZE,
          fontWeight: 'normal',
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Home',
          headerShown: false,
          tabBarIcon: ({ color, focused }) => (
            <TabBarIcon focused={focused} ios="house" android="home" color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="notes"
        options={{
          title: 'Notes',
          tabBarIcon: ({ color, focused }) => (
            <TabBarIcon focused={focused} ios="note.text" android="description" color={color} />
          ),
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
          tabBarIcon: ({ color, focused }) => (
            <TabBarIcon
              focused={focused}
              ios="bubble.left.and.bubble.right"
              android="chat"
              color={color}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="tasks"
        options={{
          title: 'Tasks',
          tabBarIcon: ({ color, focused }) => (
            <TabBarIcon focused={focused} ios="checklist" android="checklist" color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="reminders"
        options={{
          title: 'Reminders',
          tabBarIcon: ({ color, focused }) => (
            <TabBarIcon focused={focused} ios="bell" android="notifications" color={color} />
          ),
        }}
      />
    </Tabs>
  );
}
