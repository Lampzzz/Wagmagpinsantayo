import { useCallback, useRef, useState } from 'react';
import { AccessibilityInfo } from 'react-native';

import { useAiAvailability } from '@/features/ai-setup';
import { speak, stopSpeaking } from '@/lib/audio/speak';

import { createAssistantDeps } from '../api/assistant-deps';
import { composeMessage } from '../api/compose-reply';
import { runTurn } from '../api/run-turn';
import type { AssistantReply, ConversationState, PickOption, TurnInput } from '../types';

export type ChatMessage =
  | { id: string; from: 'user'; text: string; spoken: boolean }
  | { id: string; from: 'assistant'; reply: AssistantReply };

/**
 * The conversation for this session. Typed text, speech and taps on a reply's
 * buttons all go through `runTurn`. Replies to speech are read aloud.
 */
export function useAssistant() {
  const availability = useAiAvailability();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [busy, setBusy] = useState(false);
  const conversation = useRef<ConversationState>({ pending: null, focus: null });
  const working = useRef(false);
  const nextId = useRef(0);

  const submit = useCallback(
    async (input: TurnInput, shown: string, spoken: boolean) => {
      // One message at a time: the model is slow, and answers depend on order.
      if (working.current) return;
      working.current = true;
      setBusy(true);
      stopSpeaking();
      const said: ChatMessage = { id: String(nextId.current++), from: 'user', text: shown, spoken };
      setMessages((previous) => [...previous, said]);

      let reply: AssistantReply;
      try {
        const result = await runTurn(
          input,
          conversation.current,
          createAssistantDeps(availability),
        );
        conversation.current = result.state;
        reply = result.reply;
      } catch {
        reply = composeMessage('Something went wrong. Please try again.', { isError: true });
      }
      const answer: ChatMessage = { id: String(nextId.current++), from: 'assistant', reply };
      setMessages((previous) => [...previous, answer]);
      if (spoken) speak(reply.speech);
      else AccessibilityInfo.announceForAccessibility(reply.speech);
      working.current = false;
      setBusy(false);
    },
    [availability],
  );

  const send = useCallback(
    (text: string, spoken = false) => {
      const trimmed = text.trim();
      if (trimmed) submit({ kind: 'text', text: trimmed }, trimmed, spoken);
    },
    [submit],
  );

  const pick = useCallback(
    (option: PickOption, shown: string) => submit({ kind: 'pick', option }, shown, false),
    [submit],
  );

  const confirm = useCallback(
    (yes: boolean, shown: string) => submit({ kind: 'confirm', yes }, shown, false),
    [submit],
  );

  return { messages, busy, availability, send, pick, confirm };
}
