import { useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';

import type { AiAvailability } from '../types';
import { getAiAvailability } from './use-ai-setup';

/** Re-checks on focus, so a screen updates after the user returns from AI setup. */
export function useAiAvailability(): AiAvailability {
  const [availability, setAvailability] = useState(getAiAvailability);
  useFocusEffect(useCallback(() => setAvailability(getAiAvailability()), []));
  return availability;
}
