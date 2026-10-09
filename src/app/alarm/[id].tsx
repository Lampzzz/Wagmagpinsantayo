import { useLocalSearchParams } from 'expo-router';

import { ReminderAlarm } from '@/features/reminders';

export default function AlarmRoute() {
  const { id, ring } = useLocalSearchParams<{ id: string; ring?: string }>();
  return <ReminderAlarm key={id} reminderId={id} ring={ring === '1'} />;
}
