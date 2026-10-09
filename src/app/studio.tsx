import { Redirect, useLocalSearchParams } from 'expo-router';

import { PinsanStudio, type StudioView } from '@/features/mascot';

const VIEWS: StudioView[] = ['front', 'turnaround', 'walk', 'moods'];

// Development only: Pinsan on light grey for checking the model against the character sheets.
// Open with a deep link, e.g. exp://127.0.0.1:8081/--/studio?view=turnaround&paint=0
export default function Studio() {
  const { view, paint } = useLocalSearchParams<{ view?: string; paint?: string }>();
  if (!__DEV__) return <Redirect href="/" />;
  const shown = VIEWS.find((v) => v === view) ?? 'front';
  return <PinsanStudio view={shown} paint={paint !== '0'} />;
}
