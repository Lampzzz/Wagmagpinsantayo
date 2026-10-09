import type { AssistantReply } from '@/features/assistant';

import { hidesOnItsOwn } from './auto-hide';

type Item = AssistantReply['items'][number];

const ITEM: Item = {
  entity: 'task',
  id: 1,
  title: 'Pay the bill',
  detail: 'Due tomorrow, 5:00 PM',
};

function reply(changes: Partial<AssistantReply> = {}): AssistantReply {
  return {
    text: 'Saved: Pay the bill.',
    speech: 'Saved.',
    items: [ITEM],
    question: null,
    buttons: [],
    isError: false,
    ...changes,
  };
}

describe('hidesOnItsOwn', () => {
  it('lets a done reply go, with or without the item it saved', () => {
    expect(hidesOnItsOwn(reply())).toBe(true);
    expect(hidesOnItsOwn(reply({ items: [] }))).toBe(true);
  });

  it('keeps a question up until it is answered', () => {
    const question: AssistantReply['question'] = {
      kind: 'fill',
      prompt: 'What time?',
      command: { kind: 'call-emergency' },
      field: 'when',
      suggestions: [],
    };
    expect(hidesOnItsOwn(reply({ question }))).toBe(false);
  });

  it('keeps an error, and a reply with buttons to tap', () => {
    expect(hidesOnItsOwn(reply({ isError: true }))).toBe(false);
    expect(hidesOnItsOwn(reply({ buttons: ['set-up-ai'] }))).toBe(false);
    expect(hidesOnItsOwn(reply({ buttons: ['open-settings'] }))).toBe(false);
  });

  it('keeps a list, to read and tap', () => {
    expect(hidesOnItsOwn(reply({ items: [ITEM, { ...ITEM, id: 2 }] }))).toBe(false);
  });

  it('lets what a Save made go, even a task and its reminder', () => {
    const reminder: Item = { ...ITEM, entity: 'reminder', id: 7 };
    expect(hidesOnItsOwn(reply({ items: [ITEM, reminder] }), { saved: true })).toBe(true);
    expect(hidesOnItsOwn(reply({ isError: true }), { saved: true })).toBe(false);
  });
});
