import { useCallback, useRef, useState } from 'react';

import {
  areAiModelsDownloaded,
  downloadAiModels,
  hasRoomForAiModels,
  isAiSupportedOnDevice,
} from '@/lib/ai';

import type { AiAvailability } from '../types';

export type AiSetupState =
  { status: AiAvailability | 'no-space' | 'failed' } | { status: 'downloading'; progress: number };

export function getAiAvailability(): AiAvailability {
  if (!isAiSupportedOnDevice()) return 'unsupported';
  return areAiModelsDownloaded() ? 'ready' : 'needs-setup';
}

export function useAiSetup() {
  const [state, setState] = useState<AiSetupState>(() => ({ status: getAiAvailability() }));
  const abortRef = useRef<AbortController | null>(null);

  const start = useCallback(async () => {
    if (!hasRoomForAiModels()) {
      setState({ status: 'no-space' });
      return;
    }
    const controller = new AbortController();
    abortRef.current = controller;
    setState({ status: 'downloading', progress: 0 });
    try {
      await downloadAiModels({
        signal: controller.signal,
        onProgress: (progress) => setState({ status: 'downloading', progress }),
      });
      setState({ status: 'ready' });
    } catch {
      setState({ status: controller.signal.aborted ? 'needs-setup' : 'failed' });
    } finally {
      abortRef.current = null;
    }
  }, []);

  const cancel = useCallback(() => abortRef.current?.abort(), []);

  return { state, start, cancel };
}
