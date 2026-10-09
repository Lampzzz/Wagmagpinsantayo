import { act } from 'react';
import { create, type ReactTestRenderer } from 'react-test-renderer';

import { loadSpeechToText } from '@/lib/ai';
import { startMicStream } from '@/lib/audio/mic-stream';

import { useDictation } from './use-dictation';

jest.mock('@/lib/ai', () => ({ loadSpeechToText: jest.fn(), SPEECH_SAMPLE_RATE_HZ: 16_000 }));
jest.mock('@/lib/audio/mic-stream', () => ({
  MicPermissionError: class MicPermissionError extends Error {},
  startMicStream: jest.fn(),
}));

const loadModel = jest.mocked(loadSpeechToText);
const openMic = jest.mocked(startMicStream);

type Dictation = ReturnType<typeof useDictation>;

/** A speech model that hears `words` and hands them over once the stream stops. */
function fakeSpeechToText(words = '') {
  let finish = () => {};
  const stopped = new Promise<void>((resolve) => {
    finish = resolve;
  });
  return {
    streamInsert: jest.fn(),
    streamStop: jest.fn(() => finish()),
    transcribeStop: jest.fn(),
    dispose: jest.fn(),
    async *stream() {
      await stopped;
      yield { committed: words, nonCommitted: '' };
    },
  };
}

function deferred<T>() {
  let resolve: (value: T) => void = () => {};
  let reject: (error: unknown) => void = () => {};
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}

function Probe({ onRender }: { onRender: (dictation: Dictation) => void }) {
  onRender(useDictation());
  return null;
}

let renderer: ReactTestRenderer | null = null;

async function renderDictation() {
  let latest: Dictation | null = null;
  await act(async () => {
    renderer = create(<Probe onRender={(dictation) => (latest = dictation)} />);
  });
  return () => {
    if (latest === null) throw new Error('Not rendered');
    return latest;
  };
}

beforeEach(() => {
  loadModel.mockReset();
  openMic.mockReset();
  openMic.mockResolvedValue({ stop: jest.fn(async () => {}) });
});

afterEach(async () => {
  await act(async () => renderer?.unmount());
  renderer = null;
});

describe('useDictation', () => {
  it('records, then stop() frees the model and resolves with what was heard', async () => {
    const stt = fakeSpeechToText('pay the bill');
    loadModel.mockResolvedValue(stt as never);
    const dictation = await renderDictation();

    await act(() => dictation().start());
    expect(dictation().state.phase).toBe('listening');
    expect(openMic).toHaveBeenCalledTimes(1);

    let text: string | null = null;
    await act(async () => {
      text = await dictation().stop();
    });
    expect(text).toBe('pay the bill');
    expect(stt.dispose).toHaveBeenCalledTimes(1);
    expect(dictation().state).toEqual({ phase: 'idle' });
  });

  it('stop() while the model loads calls the start off: the mic never opens', async () => {
    const stt = fakeSpeechToText();
    const model = deferred<typeof stt>();
    loadModel.mockReturnValue(model.promise as never);
    const dictation = await renderDictation();

    let starting: Promise<void> = Promise.resolve();
    await act(async () => {
      starting = dictation().start();
    });
    expect(dictation().state.phase).toBe('loading');

    let text: string | null = null;
    await act(async () => {
      text = await dictation().stop();
    });
    expect(text).toBe('');

    await act(async () => {
      model.resolve(stt);
      await starting;
    });
    expect(openMic).not.toHaveBeenCalled();
    expect(stt.dispose).toHaveBeenCalledTimes(1);
    expect(dictation().state).toEqual({ phase: 'idle' });
  });

  it('a model that fails to load after stop() goes back to idle, not to an error', async () => {
    const model = deferred<never>();
    loadModel.mockReturnValue(model.promise);
    const dictation = await renderDictation();

    let starting: Promise<void> = Promise.resolve();
    await act(async () => {
      starting = dictation().start();
    });
    await act(async () => {
      await dictation().stop();
    });
    await act(async () => {
      model.reject(new Error('out of memory'));
      await starting;
    });
    expect(dictation().state).toEqual({ phase: 'idle' });
  });

  it('loads the model once when start() is called again while it loads', async () => {
    const stt = fakeSpeechToText();
    const model = deferred<typeof stt>();
    loadModel.mockReturnValue(model.promise as never);
    const dictation = await renderDictation();

    let first: Promise<void> = Promise.resolve();
    await act(async () => {
      first = dictation().start();
      await dictation().start();
    });
    expect(loadModel).toHaveBeenCalledTimes(1);

    await act(async () => {
      model.resolve(stt);
      await first;
    });
    expect(openMic).toHaveBeenCalledTimes(1);
    expect(dictation().state.phase).toBe('listening');
  });

  it('discard() goes idle at once, then frees the model without showing its words', async () => {
    const stt = fakeSpeechToText('scratch that');
    const freed = deferred<void>();
    stt.dispose.mockImplementation(() => freed.resolve());
    loadModel.mockResolvedValue(stt as never);
    const micStopped = deferred<void>();
    const stopMic = jest.fn(() => micStopped.promise);
    openMic.mockResolvedValue({ stop: stopMic });
    const dictation = await renderDictation();
    await act(() => dictation().start());

    let discarded = false;
    await act(async () => {
      discarded = dictation().discard();
    });
    expect(discarded).toBe(true);
    // Idle while the mic is still stopping: no 'transcribing' on the way.
    expect(dictation().state).toEqual({ phase: 'idle' });
    expect(stopMic).toHaveBeenCalledTimes(1);
    expect(stt.dispose).not.toHaveBeenCalled();

    await act(async () => {
      micStopped.resolve();
      await freed.promise;
    });
    expect(stt.streamStop).toHaveBeenCalled();
    expect(stt.transcribeStop).toHaveBeenCalled();
    expect(stt.dispose).toHaveBeenCalledTimes(1);
    // Its last words came in while it was freed, and stayed away.
    expect(dictation().state).toEqual({ phase: 'idle' });

    let text: string | null = '';
    await act(async () => {
      text = await dictation().stop();
    });
    expect(text).toBeNull();
  });

  it('start() right after discard() loads the next model only once the last is freed', async () => {
    const events: string[] = [];
    const first = fakeSpeechToText('scratch that');
    first.dispose.mockImplementation(() => events.push('free'));
    const second = fakeSpeechToText();
    loadModel.mockImplementation(async () => {
      events.push('load');
      return (events.length === 1 ? first : second) as never;
    });
    const micStopped = deferred<void>();
    openMic.mockResolvedValueOnce({ stop: jest.fn(() => micStopped.promise) });
    const dictation = await renderDictation();
    await act(() => dictation().start());

    let restarting: Promise<void> = Promise.resolve();
    await act(async () => {
      dictation().discard();
      restarting = dictation().start();
    });
    // The first model waits on its mic to stop: no second one meanwhile.
    expect(dictation().state.phase).toBe('loading');
    expect(events).toEqual(['load']);

    await act(async () => {
      micStopped.resolve();
      await restarting;
    });
    expect(events).toEqual(['load', 'free', 'load']);
    expect(openMic).toHaveBeenCalledTimes(2);
    // The old words came in while it loaded, so the new recording starts blank.
    expect(dictation().state).toEqual({ phase: 'listening', transcript: '' });
  });

  it('discard() while the model loads calls the start off: the mic never opens', async () => {
    const stt = fakeSpeechToText();
    const model = deferred<typeof stt>();
    loadModel.mockReturnValue(model.promise as never);
    const dictation = await renderDictation();

    let starting: Promise<void> = Promise.resolve();
    await act(async () => {
      starting = dictation().start();
    });
    let discarded = true;
    await act(async () => {
      discarded = dictation().discard();
    });
    // Nothing was heard yet, so there's nothing to start over.
    expect(discarded).toBe(false);

    await act(async () => {
      model.resolve(stt);
      await starting;
    });
    expect(openMic).not.toHaveBeenCalled();
    expect(stt.dispose).toHaveBeenCalledTimes(1);
    expect(dictation().state).toEqual({ phase: 'idle' });
  });

  it('discard() while start() waits for the last model to be freed loads none', async () => {
    const stt = fakeSpeechToText();
    loadModel.mockResolvedValue(stt as never);
    const micStopped = deferred<void>();
    openMic.mockResolvedValueOnce({ stop: jest.fn(() => micStopped.promise) });
    const dictation = await renderDictation();
    await act(() => dictation().start());

    let restarting: Promise<void> = Promise.resolve();
    await act(async () => {
      dictation().discard();
      restarting = dictation().start();
    });
    await act(async () => {
      dictation().discard();
      micStopped.resolve();
      await restarting;
    });
    expect(loadModel).toHaveBeenCalledTimes(1);
    expect(dictation().state).toEqual({ phase: 'idle' });
  });

  it('discard() after stop() took the words throws nothing away', async () => {
    const stt = fakeSpeechToText('pay the bill');
    loadModel.mockResolvedValue(stt as never);
    const dictation = await renderDictation();
    await act(() => dictation().start());

    let text: string | null = null;
    let discarded = true;
    await act(async () => {
      const stopping = dictation().stop();
      // A late Start over tap: the words are already on their way.
      discarded = dictation().discard();
      text = await stopping;
    });
    expect(discarded).toBe(false);
    expect(text).toBe('pay the bill');
    expect(stt.transcribeStop).not.toHaveBeenCalled();
  });
});
