import { useFocusEffect } from 'expo-router';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AccessibilityInfo, BackHandler, Keyboard } from 'react-native';

import {
  useAssistant,
  type AssistantReply,
  type PickOption,
  type ReplyButton,
} from '@/features/assistant';
import { focusPinsan, releaseFocus, useMascot, type MascotMood } from '@/features/mascot';
import { useDictation } from '@/hooks/use-dictation';
import { stopSpeaking } from '@/lib/audio/speak';

/** As long as Pinsan's hop or worried tilt (the mascot store resets the mood after it). */
const REACTION_MS = 3000;
/** Long enough for any request; stops a forgotten mic from listening on. */
const MAX_RECORDING_MS = 30_000;

const HEARD_NOTHING = "Hmm, I didn't catch that. Tap the mic and try again.";
const VOICE_NEEDS_SETUP =
  'To hear you, I need the on-device AI first. You can type to me in the meantime.';
const VOICE_UNSUPPORTED = "Voice isn't available on this phone, but you can type to me.";

/** Pinsan's speech bubble: a reply from the assistant, or a short note of his own. */
export type BubbleContent = {
  /** New for every reply, so each one springs in. */
  key: number;
  reply: AssistantReply;
};

/** What's happening between your words and Pinsan's answer. */
export type TalkStage = 'idle' | 'starting' | 'listening' | 'transcribing' | 'thinking';

/**
 * Talking to Pinsan on Home. Tap the mic and the camera closes in on him while he listens;
 * your words show live. Tap again and he thinks, then answers in his bubble: a hop when it
 * worked, a worried tilt when it didn't. Typed requests and taps on the bubble's buttons take
 * the same path through the assistant.
 */
export function useTalkToPinsan() {
  const { busy, availability, send, pick, confirm, clearQuestion } = useAssistant();
  const { state: voice, start, stop, reset } = useDictation();
  const { setMood } = useMascot();
  const [bubble, setBubble] = useState<BubbleContent | null>(null);
  // The final words of a spoken request, kept on the paper note until Pinsan answers.
  const [heard, setHeard] = useState<string | null>(null);
  const [composerOpen, setComposerOpen] = useState(false);
  const [draft, setDraft] = useState('');
  const nextKey = useRef(1);
  const releaseTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  // True from the moment a request is sent until Pinsan has reacted to its reply.
  const answering = useRef(false);

  const recording =
    voice.phase === 'loading' || voice.phase === 'listening' || voice.phase === 'transcribing';
  const stage: TalkStage =
    voice.phase === 'loading'
      ? 'starting'
      : voice.phase === 'listening'
        ? 'listening'
        : voice.phase === 'transcribing'
          ? 'transcribing'
          : busy || heard !== null
            ? 'thinking'
            : 'idle';

  const voiceError = voice.phase === 'error' ? voice.message : null;
  // A failed recording speaks through the bubble until it's dismissed or the mic is tapped.
  const errorBubble = useMemo<BubbleContent | null>(
    () =>
      voiceError === null
        ? null
        : {
            key: 0,
            reply: note(voiceError, {
              isError: true,
              buttons: /settings/i.test(voiceError) ? ['open-settings'] : [],
            }),
          },
    [voiceError],
  );
  const shownBubble = errorBubble ?? bubble;

  const cancelRelease = useCallback(() => {
    if (releaseTimer.current !== null) clearTimeout(releaseTimer.current);
    releaseTimer.current = null;
  }, []);

  /** The camera glides back once Pinsan's reaction is over. */
  const releaseSoon = useCallback(() => {
    cancelRelease();
    releaseTimer.current = setTimeout(() => {
      releaseTimer.current = null;
      releaseFocus();
    }, REACTION_MS);
  }, [cancelRelease]);

  /** Pinsan stops, turns to you and listens, close up. */
  const attend = useCallback(() => {
    cancelRelease();
    setMood('listening');
    focusPinsan();
  }, [cancelRelease, setMood]);

  /** Back to strolling around the island, with the camera where it was. */
  const relax = useCallback(() => {
    cancelRelease();
    setMood('idle');
    releaseFocus();
  }, [cancelRelease, setMood]);

  const show = useCallback((reply: AssistantReply) => {
    setBubble({ key: nextKey.current++, reply });
  }, []);

  /** A line of Pinsan's own. The assistant announces its replies; this does the same. */
  const showNote = useCallback(
    (reply: AssistantReply) => {
      show(reply);
      AccessibilityInfo.announceForAccessibility(reply.speech);
    },
    [show],
  );

  /**
   * Shows the reply, and Pinsan reacts: a hop when it worked, a worried tilt when it didn't,
   * or `mood`. While a question waits for its answer, he keeps listening, close up.
   */
  const react = useCallback(
    (reply: AssistantReply, mood?: MascotMood) => {
      answering.current = false;
      show(reply);
      if (reply.question) {
        attend();
        return;
      }
      setMood(mood ?? (reply.isError ? 'oops' : 'done'));
      releaseSoon();
    },
    [attend, releaseSoon, setMood, show],
  );

  /** Sends one request or answer through the assistant while Pinsan thinks. */
  const answerWith = useCallback(
    async (turn: () => Promise<AssistantReply | null>, mood?: MascotMood) => {
      answering.current = true;
      cancelRelease();
      setBubble(null);
      setComposerOpen(false);
      Keyboard.dismiss();
      setMood('thinking');
      const reply = await turn();
      // Null: another request was still being answered, and its reply sets the mood.
      if (reply) react(reply, mood);
    },
    [cancelRelease, react, setMood],
  );

  const startListening = useCallback(async () => {
    if (availability !== 'ready') {
      showNote(
        availability === 'needs-setup'
          ? note(VOICE_NEEDS_SETUP, { buttons: ['set-up-ai'] })
          : note(VOICE_UNSUPPORTED),
      );
      return;
    }
    // A question stays up, so it can be answered out loud ("Save", "tomorrow at 5").
    setBubble((current) => (current?.reply.question ? current : null));
    setComposerOpen(false);
    Keyboard.dismiss();
    attend();
    reset();
    // The microphone mustn't hear the phone reading a reply aloud.
    await stopSpeaking();
    await start();
  }, [attend, availability, reset, showNote, start]);

  const finishListening = useCallback(async () => {
    answering.current = true;
    setMood('thinking');
    const text = await stop();
    if (text === null) {
      // It failed: the dictation error shows in the bubble, and Pinsan looks worried.
      answering.current = false;
      return;
    }
    if (text === '') {
      react(note(HEARD_NOTHING), 'oops');
      AccessibilityInfo.announceForAccessibility(HEARD_NOTHING);
      return;
    }
    setBubble(null);
    setHeard(text);
    const reply = await send(text, true);
    setHeard(null);
    if (reply) react(reply);
  }, [react, send, setMood, stop]);

  const toggleMic = useCallback(() => {
    if (voice.phase === 'listening') finishListening();
    else if (!recording && !busy) startListening();
  }, [busy, finishListening, recording, startListening, voice.phase]);

  // Stops a forgotten mic.
  const listening = voice.phase === 'listening';
  useEffect(() => {
    if (!listening) return;
    const timer = setTimeout(finishListening, MAX_RECORDING_MS);
    return () => clearTimeout(timer);
  }, [listening, finishListening]);

  // The mic or the speech model failed.
  useEffect(() => {
    if (voiceError === null) return;
    setMood('oops');
    releaseSoon();
    AccessibilityInfo.announceForAccessibility(voiceError);
  }, [voiceError, releaseSoon, setMood]);

  const openComposer = useCallback(() => {
    if (recording || busy) return;
    setComposerOpen(true);
    attend();
  }, [attend, busy, recording]);

  /** The keyboard went away without a request being sent. */
  const closeComposer = useCallback(() => {
    setComposerOpen(false);
    if (answering.current || shownBubble?.reply.question) return;
    relax();
  }, [relax, shownBubble]);

  const submitDraft = useCallback(() => {
    const text = draft.trim();
    if (!text || busy) return;
    setDraft('');
    answerWith(() => send(text));
  }, [answerWith, busy, draft, send]);

  const answerPick = useCallback(
    (option: PickOption, shown: string) => answerWith(() => pick(option, shown)),
    [answerWith, pick],
  );
  const answerConfirm = useCallback(
    // No hop for "Cancel": nothing was saved.
    (yes: boolean, shown: string) =>
      answerWith(() => confirm(yes, shown), yes ? undefined : 'idle'),
    [answerWith, confirm],
  );
  const answerFill = useCallback(
    (text: string) => answerWith(() => send(text)),
    [answerWith, send],
  );

  /** Closes the bubble. An unanswered proposal goes with it, unsaved. */
  const dismiss = useCallback(() => {
    if (voiceError !== null) reset();
    clearQuestion();
    setBubble(null);
    Keyboard.dismiss();
    relax();
  }, [clearQuestion, relax, reset, voiceError]);

  /** A Quick Add proposal is opening in the task editor: drop it here, without a reply. */
  const editProposal = useCallback(() => {
    clearQuestion();
    setBubble(null);
    relax();
  }, [clearQuestion, relax]);

  // Leaving Home (the menu, a task, the editor): stop listening and let Pinsan wander again.
  const leave = useRef(() => {});
  useEffect(() => {
    leave.current = () => {
      if (voice.phase === 'listening' || voice.phase === 'loading') {
        // Throw the recording away: nobody is there to see the reply.
        stop().catch(() => undefined);
      }
      setComposerOpen(false);
      if (!answering.current) relax();
    };
  });
  useFocusEffect(useCallback(() => () => leave.current(), []));

  // Android's back button closes the bubble before it leaves the app.
  const hasBubble = shownBubble !== null;
  useFocusEffect(
    useCallback(() => {
      if (!hasBubble) return;
      const subscription = BackHandler.addEventListener('hardwareBackPress', () => {
        dismiss();
        return true;
      });
      return () => subscription.remove();
    }, [dismiss, hasBubble]),
  );

  useEffect(() => cancelRelease, [cancelRelease]);

  return {
    stage,
    /** Live words while listening, then the final words until Pinsan answers. */
    words: voice.phase === 'listening' || voice.phase === 'transcribing' ? voice.transcript : heard,
    bubble: shownBubble,
    /** The bubble's buttons work only when nothing else is going on. */
    answerable: !busy && !recording,
    composerOpen,
    draft,
    setDraft,
    toggleMic,
    openComposer,
    closeComposer,
    submitDraft,
    answerPick,
    answerConfirm,
    answerFill,
    dismiss,
    editProposal,
  };
}

/** A line of Pinsan's own, outside the conversation. */
function note(
  text: string,
  { buttons = [], isError = false }: { buttons?: ReplyButton[]; isError?: boolean } = {},
): AssistantReply {
  return { text, speech: text, items: [], question: null, buttons, isError };
}
