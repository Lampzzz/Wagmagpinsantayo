import { useCallback, useRef, useState } from 'react';
import { AccessibilityInfo } from 'react-native';

import { useAiAvailability } from '@/features/ai-setup';
import { confirmEmergencyCall } from '@/features/menu';
import { speak, stopSpeaking } from '@/lib/audio/speak';

import { createAssistantDeps } from '../api/assistant-deps';
import { composeMessage } from '../api/compose-reply';
import { parseEmergency } from '../api/parse-emergency';
import { runTurn } from '../api/run-turn';
import { saveToHistory } from '../history/history-store';
import type { AssistantReply, ConversationState, PickOption, TurnInput } from '../types';

/**
 * Reads replies to spoken requests aloud in the phone's voice. Off: the reply is on screen,
 * and a demo hall is noisy. Screen readers announce every reply either way.
 */
const READ_REPLIES_ALOUD = false;

export type ChatMessage =
  | { id: string; from: 'user'; text: string; spoken: boolean }
  | { id: string; from: 'assistant'; reply: AssistantReply };

/**
 * The conversation for this session. Typed text, speech and taps on a reply's
 * buttons all go through `runTurn`. Each call resolves with the reply, or with null
 * when nothing was sent because another message was still being answered; a call for
 * help sent then still brings up the emergency call prompt at once.
 * Every line shown, yours and Pinsan's, is also kept in the history on the phone.
 */
export function useAssistant() {
  const availability = useAiAvailability();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [busy, setBusy] = useState(false);
  const conversation = useRef<ConversationState>({ pending: null, focus: null });
  const working = useRef(false);
  const nextId = useRef(0);

  const submit = useCallback(
    async (input: TurnInput, shown: string, spoken: boolean): Promise<AssistantReply | null> => {
      // One message at a time: the model is slow, and answers depend on order.
      if (working.current) {
        // Except a call for help, which can't wait for a slow answer: offer to call right away.
        if (input.kind === 'text' && parseEmergency(input.text)) confirmEmergencyCall();
        return null;
      }
      working.current = true;
      setBusy(true);
      stopSpeaking();
      const said: ChatMessage = { id: String(nextId.current++), from: 'user', text: shown, spoken };
      setMessages((previous) => [...previous, said]);
      // Fire and forget: a failed save never holds up or breaks the turn.
      saveToHistory({ role: 'user', text: shown, spoken });

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
      saveToHistory({ role: 'pinsan', text: reply.text, spoken: false });
      if (spoken && READ_REPLIES_ALOUD) speak(reply.speech);
      else AccessibilityInfo.announceForAccessibility(reply.speech);
      working.current = false;
      setBusy(false);
      return reply;
    },
    [availability],
  );

  const send = useCallback(
    async (text: string, spoken = false) => {
      const trimmed = text.trim();
      return trimmed ? submit({ kind: 'text', text: trimmed }, trimmed, spoken) : null;
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

  /**
   * Drops the question waiting for an answer, without a reply: the user took it elsewhere,
   * such as a Quick Add proposal opened in the task editor. Its buttons go away too.
   */
  const clearQuestion = useCallback(() => {
    if (working.current || !conversation.current.pending) return;
    conversation.current = { pending: null, focus: conversation.current.focus };
    setMessages((previous) => {
      const last = previous[previous.length - 1];
      if (last?.from !== 'assistant' || !last.reply.question) return previous;
      return [...previous.slice(0, -1), { ...last, reply: { ...last.reply, question: null } }];
    });
  }, []);

  return { messages, busy, availability, send, pick, confirm, clearQuestion };
}
