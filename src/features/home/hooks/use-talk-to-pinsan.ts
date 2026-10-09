import { useFocusEffect } from 'expo-router';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AccessibilityInfo, BackHandler, Keyboard } from 'react-native';
import { KeyboardEvents } from 'react-native-keyboard-controller';

import {
  parseEmergency,
  useAssistant,
  type AssistantReply,
  type PickOption,
  type ReplyButton,
} from '@/features/assistant';
import { focusPinsan, releaseFocus, useMascot, type MascotMood } from '@/features/mascot';
import { useDictation } from '@/hooks/use-dictation';
import { stopSpeaking } from '@/lib/audio/speak';

import { AUTO_HIDE_MS, hidesOnItsOwn } from '../auto-hide';

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
  /** A line of Pinsan's own under a question that still waits, such as "I didn't catch that". */
  aside?: string;
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
  // True while the mic is switching on, so a second tap can't load the speech model twice.
  const startingMic = useRef(false);
  // False while another screen is on top of Home.
  const focused = useRef(true);

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
  // A failed recording speaks through the bubble until it's dismissed or something new starts.
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
  // The question Pinsan waits on, when its bubble is up (under a mic error, maybe).
  const asked = bubble?.reply.question ? bubble : null;

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

  /** A mic error gives way to whatever starts next, so it never hides a newer reply. */
  const clearVoiceError = useCallback(() => {
    if (voiceError !== null) reset();
  }, [reset, voiceError]);

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
   * A line of Pinsan's own while a question waits: it goes under the question, which stays up
   * to be answered out loud, typed or with its buttons.
   */
  const addAside = useCallback((question: BubbleContent, text: string) => {
    setBubble({ key: nextKey.current++, reply: question.reply, aside: text });
    AccessibilityInfo.announceForAccessibility(text);
  }, []);

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
      clearVoiceError();
      cancelRelease();
      setBubble(null);
      setComposerOpen(false);
      Keyboard.dismiss();
      setMood('thinking');
      const reply = await turn();
      // Null: another request was still being answered, and its reply sets the mood.
      if (reply) react(reply, mood);
    },
    [cancelRelease, clearVoiceError, react, setMood],
  );

  const startListening = useCallback(async () => {
    if (startingMic.current) return;
    clearVoiceError();
    if (availability !== 'ready') {
      const reply =
        availability === 'needs-setup'
          ? note(VOICE_NEEDS_SETUP, { buttons: ['set-up-ai'] })
          : note(VOICE_UNSUPPORTED);
      // A question that waits stays up: it can still be typed or tapped.
      if (asked) addAside(asked, reply.text);
      else showNote(reply);
      return;
    }
    // A question stays up, so it can be answered out loud ("Save", "tomorrow at 5").
    setBubble((current) =>
      current?.reply.question ? { key: current.key, reply: current.reply } : null,
    );
    setComposerOpen(false);
    Keyboard.dismiss();
    attend();
    startingMic.current = true;
    try {
      // The microphone mustn't hear the phone reading a reply aloud.
      await stopSpeaking();
      // Home was left meanwhile: no mic for a screen nobody sees.
      if (!focused.current) return;
      await start();
      // Left while the mic switched on: switch it off again, and drop what it heard.
      if (!focused.current) await stop();
    } finally {
      startingMic.current = false;
    }
  }, [addAside, asked, attend, availability, clearVoiceError, showNote, start, stop]);

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
      if (asked) {
        // The question stays up, to be answered again.
        answering.current = false;
        addAside(asked, HEARD_NOTHING);
        attend();
      } else {
        react(note(HEARD_NOTHING), 'oops');
        AccessibilityInfo.announceForAccessibility(HEARD_NOTHING);
      }
      return;
    }
    setBubble(null);
    setHeard(text);
    const reply = await send(text, true);
    setHeard(null);
    if (reply) react(reply);
  }, [addAside, asked, attend, react, send, setMood, stop]);

  const toggleMic = useCallback(() => {
    if (voice.phase === 'listening') finishListening();
    else if (!recording && !busy) startListening();
  }, [busy, finishListening, recording, startListening, voice.phase]);

  /** Back while you talk: the recording is thrown away, and a question stays up to answer. */
  const cancelListening = useCallback(() => {
    // Too late: the words are on their way to Pinsan.
    if (voice.phase === 'transcribing') return;
    stop().catch(() => undefined);
    if (asked) attend();
    else relax();
  }, [asked, attend, relax, stop, voice.phase]);

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
    if (recording) return;
    clearVoiceError();
    setComposerOpen(true);
    // While Pinsan thinks, he goes on thinking: only a call for help can be sent then.
    if (!busy) attend();
  }, [attend, busy, clearVoiceError, recording]);

  /** The keyboard went away without a request being sent. */
  const closeComposer = useCallback(() => {
    setComposerOpen(false);
    if (answering.current || shownBubble?.reply.question) return;
    relax();
  }, [relax, shownBubble]);

  // Android can hide the keyboard (Back, the back gesture, its own hide key) while the text box
  // keeps its focus, so its onBlur never comes. Close the composer once the keyboard is gone.
  useEffect(() => {
    if (!composerOpen) return;
    const subscription = KeyboardEvents.addListener('keyboardDidHide', closeComposer);
    return () => subscription.remove();
  }, [closeComposer, composerOpen]);

  const submitDraft = useCallback(() => {
    const text = draft.trim();
    if (!text) return;
    if (busy) {
      // Only a call for help goes through while Pinsan thinks: the call prompt comes up at once.
      if (parseEmergency(text) === null) return;
      setDraft('');
      setComposerOpen(false);
      Keyboard.dismiss();
      // A reply only if Pinsan was done thinking after all.
      send(text).then((reply) => reply && react(reply));
      return;
    }
    setDraft('');
    answerWith(() => send(text));
  }, [answerWith, busy, draft, react, send]);

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
    if (voiceError !== null) {
      // Only the mic's message goes: a question under it comes back, to be answered.
      reset();
      if (asked) attend();
      else relax();
      return;
    }
    clearQuestion();
    setBubble(null);
    Keyboard.dismiss();
    relax();
  }, [asked, attend, clearQuestion, relax, reset, voiceError]);

  /** A Quick Add proposal is opening in the task editor: drop it here, without a reply. */
  const editProposal = useCallback(() => {
    clearQuestion();
    setBubble(null);
    relax();
  }, [clearQuestion, relax]);

  // A reply with nothing left to do fades on its own, a few seconds after the camera glides
  // back. Anything new (a request, the mic, the text box, closing it) calls that off.
  useEffect(() => {
    if (bubble === null || composerOpen || stage !== 'idle' || !hidesOnItsOwn(bubble.reply)) {
      return;
    }
    const timer = setTimeout(async () => {
      // A screen reader reads at its own pace: the reply stays until it's closed.
      if (await AccessibilityInfo.isScreenReaderEnabled()) return;
      setBubble((current) => (current === bubble ? null : current));
    }, AUTO_HIDE_MS);
    return () => clearTimeout(timer);
  }, [bubble, composerOpen, stage]);

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
  useFocusEffect(
    useCallback(() => {
      focused.current = true;
      return () => {
        focused.current = false;
        leave.current();
      };
    }, []),
  );

  // Android's back button stops the mic, or closes the bubble, before it leaves the app.
  const goBack = recording ? cancelListening : dismiss;
  const handlesBack = recording || shownBubble !== null;
  useFocusEffect(
    useCallback(() => {
      if (!handlesBack) return;
      const subscription = BackHandler.addEventListener('hardwareBackPress', () => {
        goBack();
        return true;
      });
      return () => subscription.remove();
    }, [goBack, handlesBack]),
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
