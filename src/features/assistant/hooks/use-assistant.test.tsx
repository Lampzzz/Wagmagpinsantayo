import { useEffect } from 'react';
import { act, create, type ReactTestRenderer } from 'react-test-renderer';

import type { AssistantReply, ConversationState } from '../types';
import { useAssistant } from './use-assistant';

// Stand-ins for the model, the phone and the database. Each turn waits until the test
// answers it, like a slow model. Jest lets mock factories use only names that start with "mock".
type MockTurn = { text: string | null; answer: (reply: AssistantReply) => void };

const mockTurns: MockTurn[] = [];
const mockConfirmEmergencyCall = jest.fn();
const mockSaveToHistory = jest.fn();

jest.mock('@/features/ai-setup', () => ({ useAiAvailability: () => 'ready' }));
jest.mock('@/features/menu', () => ({
  confirmEmergencyCall: () => mockConfirmEmergencyCall(),
}));
jest.mock('@/lib/audio/speak', () => ({ speak: () => undefined, stopSpeaking: () => undefined }));
jest.mock('../api/assistant-deps', () => ({ createAssistantDeps: () => ({}) }));
jest.mock('../api/run-turn', () => ({
  runTurn: (input: { kind: string; text?: string }, state: ConversationState) =>
    new Promise((resolve) => {
      mockTurns.push({
        text: input.kind === 'text' ? (input.text ?? null) : null,
        answer: (reply) => resolve({ reply, state }),
      });
    }),
}));
jest.mock('../history/history-store', () => ({
  saveToHistory: (message: unknown) => mockSaveToHistory(message),
}));

function reply(text: string): AssistantReply {
  return { text, speech: text, items: [], question: null, buttons: [], isError: false };
}

let assistant: ReturnType<typeof useAssistant>;
let renderer: ReactTestRenderer;

// Hands the hook's latest result to the test after each render.
function Probe() {
  const latest = useAssistant();
  useEffect(() => {
    assistant = latest;
  });
  return null;
}

beforeEach(async () => {
  mockTurns.length = 0;
  mockConfirmEmergencyCall.mockClear();
  mockSaveToHistory.mockClear();
  await act(async () => {
    renderer = create(<Probe />);
  });
});

afterEach(async () => {
  await act(async () => {
    renderer.unmount();
  });
});

/**
 * Sends a request and leaves it waiting for its answer, like a slow model turn. The
 * reply's promise comes back in an object, so awaiting this doesn't wait for the answer.
 */
async function startSlowTurn(text: string) {
  const turn: { done: Promise<AssistantReply | null> } = { done: Promise.resolve(null) };
  await act(async () => {
    turn.done = assistant.send(text);
  });
  expect(assistant.busy).toBe(true);
  return turn;
}

describe('while a reply is on its way', () => {
  it('offers to call for help at once instead of dropping the request', async () => {
    const slow = await startSlowTurn('What tasks do I have today?');

    let urgent: AssistantReply | null | undefined;
    await act(async () => {
      urgent = await assistant.send('Call 911!');
    });
    expect(urgent).toBeNull();
    expect(mockConfirmEmergencyCall).toHaveBeenCalledTimes(1);
    expect(mockTurns.map(({ text }) => text)).toEqual(['What tasks do I have today?']);

    // The slow answer still arrives as usual.
    await act(async () => {
      mockTurns[0].answer(reply('You have no tasks today.'));
      await slow.done;
    });
    expect(assistant.busy).toBe(false);
    expect(assistant.messages.map((message) => message.from)).toEqual(['user', 'assistant']);
  });

  it('still drops anything else, without the emergency prompt', async () => {
    const slow = await startSlowTurn('What tasks do I have today?');
    let other: AssistantReply | null | undefined;
    await act(async () => {
      other = await assistant.send('Remind me to update my emergency contacts');
    });
    expect(other).toBeNull();
    expect(mockConfirmEmergencyCall).not.toHaveBeenCalled();
    expect(mockTurns).toHaveLength(1);

    await act(async () => {
      mockTurns[0].answer(reply('You have no tasks today.'));
      await slow.done;
    });
  });
});

describe('history', () => {
  it('saves each line as it is shown: yours, then Pinsan’s reply', async () => {
    const slow = await startSlowTurn('Remind me to stretch');
    expect(mockSaveToHistory.mock.calls).toEqual([
      [{ role: 'user', text: 'Remind me to stretch', spoken: false }],
    ]);

    await act(async () => {
      mockTurns[0].answer(reply('When should I remind you?'));
      await slow.done;
    });
    // A tapped answer is saved as the words shown for it.
    await act(async () => {
      const tapped = assistant.confirm(true, 'Save');
      mockTurns[1].answer(reply('Saved.'));
      await tapped;
    });

    expect(mockSaveToHistory.mock.calls.map(([line]) => line)).toEqual([
      { role: 'user', text: 'Remind me to stretch', spoken: false },
      { role: 'pinsan', text: 'When should I remind you?', spoken: false },
      { role: 'user', text: 'Save', spoken: false },
      { role: 'pinsan', text: 'Saved.', spoken: false },
    ]);
  });

  it('marks a spoken request as spoken', async () => {
    await act(async () => {
      const said = assistant.send('  What reminders do I have today? ', true);
      mockTurns[0].answer(reply('None today.'));
      await said;
    });
    expect(mockSaveToHistory).toHaveBeenCalledWith({
      role: 'user',
      text: 'What reminders do I have today?',
      spoken: true,
    });
  });
});
