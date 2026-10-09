import { isModelReplyFor, toReading } from './llm-commands';

const commandsOf = (reply: unknown, utterance: string) =>
  toReading(reply, utterance)?.commands ?? null;

describe('toReading', () => {
  it('maps actions to commands, including an empty title that means "it"', () => {
    const utterance = 'I need to pick up the dry cleaning on Friday, and ping me at 6 about it';
    const reply = {
      actions: [
        { do: 'add_task', title: 'pick up the dry cleaning', when: 'on Friday' },
        { do: 'add_reminder', title: '', when: 'at 6' },
      ],
    };
    expect(toReading(reply, utterance)).toEqual({
      commands: [
        { kind: 'add-task', title: 'pick up the dry cleaning', when: 'on Friday' },
        { kind: 'add-reminder', title: '', when: 'at 6' },
      ],
      reply: null,
    });
  });

  it('marks the kind as implied unless the user said "task" or "reminder"', () => {
    expect(
      commandsOf(
        { actions: [{ do: 'complete_task', target: 'slides' }] },
        "I'm done with the slides",
      ),
    ).toEqual([{ kind: 'complete-task', target: 'slides', impliedEntity: true }]);
    expect(
      commandsOf(
        { actions: [{ do: 'edit_reminder', target: 'dentist', when: 'Monday at 9' }] },
        'Push the dentist reminder to Monday at 9',
      ),
    ).toEqual([
      { kind: 'edit-reminder', target: 'dentist', impliedEntity: false, when: 'Monday at 9' },
    ]);
  });

  it('treats null fields as missing and maps priorities', () => {
    expect(
      commandsOf(
        { actions: [{ do: 'add_task', title: 'file taxes', when: null, priority: 'urgent' }] },
        'file taxes, it is urgent',
      ),
    ).toEqual([{ kind: 'add-task', title: 'file taxes', priority: 'high' }]);
  });

  it('reads list filters from the sentence', () => {
    expect(commandsOf({ actions: [{ do: 'list_tasks' }] }, 'What have I finished?')).toEqual([
      { kind: 'list-tasks', status: 'done' },
    ]);
    expect(
      commandsOf(
        { actions: [{ do: 'list_reminders', when: 'tomorrow' }] },
        'anything for tomorrow?',
      ),
    ).toEqual([{ kind: 'list-reminders', status: 'upcoming', when: 'tomorrow' }]);
  });

  it('accepts number words the user said as digits', () => {
    expect(
      commandsOf(
        { actions: [{ do: 'add_reminder', title: 'stretch', when: 'in 5 minutes' }] },
        'ping me in five minutes to stretch',
      ),
    ).toEqual([{ kind: 'add-reminder', title: 'stretch', when: 'in 5 minutes' }]);
  });

  it("uses the user's own time words when the model rewords them, or none", () => {
    expect(
      commandsOf(
        { actions: [{ do: 'add_reminder', title: 'call Mom', when: '7 PM' }] },
        'remind me to call Mom at 7 tonight',
      ),
    ).toEqual([{ kind: 'add-reminder', title: 'call Mom', when: 'at 7 tonight' }]);
    // Pinsan then asks when.
    expect(
      commandsOf(
        { actions: [{ do: 'add_reminder', title: 'stretch', when: 'tomorrow at 9' }] },
        'remind me to stretch',
      ),
    ).toEqual([{ kind: 'add-reminder', title: 'stretch' }]);
  });

  it('keeps the words of an item the user said, and drops what they never gave', () => {
    expect(
      commandsOf(
        { actions: [{ do: 'delete_task', target: 'buy milk' }] },
        "I don't need the milk task anymore",
      ),
    ).toEqual([{ kind: 'delete-task', target: 'milk', impliedEntity: false }]);
    expect(
      commandsOf(
        {
          actions: [
            {
              do: 'add_task',
              title: 'submit my report',
              when: 'Friday',
              priority: 'high',
              notes: "Don't forget!",
            },
          ],
        },
        'I need to submit my report by Friday',
      ),
    ).toEqual([{ kind: 'add-task', title: 'submit my report', when: 'Friday' }]);
  });

  it("reads Pinsan's answer when the user is only chatting", () => {
    expect(
      toReading(
        { actions: [{ do: 'say', text: "I'm sorry to hear that. Take it easy tonight." }] },
        'I had a rough day',
      ),
    ).toEqual({ commands: [], reply: "I'm sorry to hear that. Take it easy tonight." });
    expect(toReading({ actions: [] }, "What's the weather like?")).toEqual({
      commands: [],
      reply: null,
    });
  });

  it.each([
    ['claims something was saved', "Sure! I've added that to your list."],
    ['says a reminder is set', 'Your reminder is set for 7.'],
    ['is too long for the bubble', 'Okay. '.repeat(40)],
    ['is not text', 42],
  ])('drops a chat answer that %s', (_, text) => {
    expect(toReading({ actions: [{ do: 'say', text }] }, 'hmm')).toEqual({
      commands: [],
      reply: null,
    });
  });

  it("drops a chat answer that only says the user's words back", () => {
    expect(
      toReading(
        { actions: [{ do: 'say', text: 'The weather is nice today.' }] },
        'The weather is nice today.',
      ),
    ).toEqual({ commands: [], reply: null });
  });

  it('ignores a chat answer next to a request', () => {
    expect(
      toReading(
        {
          actions: [
            { do: 'add_task', title: 'buy bread' },
            { do: 'say', text: 'Got it!' },
          ],
        },
        'buy bread',
      ),
    ).toEqual({ commands: [{ kind: 'add-task', title: 'buy bread' }], reply: null });
  });

  it.each([
    ['an unknown action', { actions: [{ do: 'order_pizza' }] }, 'order a pizza'],
    ['a task without a title', { actions: [{ do: 'add_task' }] }, 'add a task'],
    [
      'a title the user never said, copied from an example',
      { actions: [{ do: 'add_task', title: 'the car wash', when: 'at 4' }] },
      'Salamat!',
    ],
    [
      'an item the user never named',
      { actions: [{ do: 'delete_task', target: 'groceries' }] },
      'delete that thing',
    ],
    ['more than five actions', { actions: Array(6).fill({ do: 'list_tasks' }) }, 'show tasks'],
    ['a field that is not text', { actions: [{ do: 'add_task', title: 42 }] }, 'add 42'],
    [
      'an unknown priority',
      { actions: [{ do: 'add_task', title: 'plan trip', priority: 'extreme' }] },
      'plan trip',
    ],
    ['a reply that is not an object', 'add_task', 'add milk'],
    [
      'one bad action among good ones',
      { actions: [{ do: 'list_tasks' }, { do: 'fly_away' }] },
      'show my tasks and fly away',
    ],
  ])('rejects %s', (_, reply, utterance) => {
    expect(toReading(reply, utterance)).toBeNull();
  });
});

describe('isModelReplyFor', () => {
  it('accepts only replies that turn into commands for that sentence', () => {
    const isValid = isModelReplyFor('remind me to stretch in 5 minutes');
    expect(
      isValid({ actions: [{ do: 'add_reminder', title: 'stretch', when: 'in 5 minutes' }] }),
    ).toBe(true);
    expect(isValid({ actions: [{ do: 'add_reminder', title: 'go for a run' }] })).toBe(false);
  });
});
