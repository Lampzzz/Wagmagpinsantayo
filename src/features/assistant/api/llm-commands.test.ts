import { isModelReplyFor, toCommands } from './llm-commands';

describe('toCommands', () => {
  it('maps actions to commands, including an empty title that means "it"', () => {
    const utterance = 'I need to pick up the dry cleaning on Friday, and ping me at 6 about it';
    const reply = {
      actions: [
        { do: 'add_task', title: 'pick up the dry cleaning', when: 'on Friday' },
        { do: 'add_reminder', title: '', when: 'at 6' },
      ],
    };
    expect(toCommands(reply, utterance)).toEqual([
      { kind: 'add-task', title: 'pick up the dry cleaning', when: 'on Friday' },
      { kind: 'add-reminder', title: '', when: 'at 6' },
    ]);
  });

  it('marks the kind as implied unless the user said "task" or "reminder"', () => {
    expect(
      toCommands(
        { actions: [{ do: 'complete_task', target: 'slides' }] },
        "I'm done with the slides",
      ),
    ).toEqual([{ kind: 'complete-task', target: 'slides', impliedEntity: true }]);
    expect(
      toCommands(
        { actions: [{ do: 'edit_reminder', target: 'dentist', when: 'Monday at 9' }] },
        'Push the dentist reminder to Monday at 9',
      ),
    ).toEqual([
      { kind: 'edit-reminder', target: 'dentist', impliedEntity: false, when: 'Monday at 9' },
    ]);
  });

  it('treats null fields as missing and maps priorities', () => {
    expect(
      toCommands(
        { actions: [{ do: 'add_task', title: 'file taxes', when: null, priority: 'urgent' }] },
        'file taxes, it is urgent',
      ),
    ).toEqual([{ kind: 'add-task', title: 'file taxes', priority: 'high' }]);
  });

  it('reads list filters from the sentence', () => {
    expect(toCommands({ actions: [{ do: 'list_tasks' }] }, 'What have I finished?')).toEqual([
      { kind: 'list-tasks', status: 'done' },
    ]);
    expect(
      toCommands(
        { actions: [{ do: 'list_reminders', when: 'tomorrow' }] },
        'anything for tomorrow?',
      ),
    ).toEqual([{ kind: 'list-reminders', status: 'upcoming', when: 'tomorrow' }]);
  });

  it('accepts number words the user said as digits', () => {
    expect(
      toCommands(
        { actions: [{ do: 'add_reminder', title: 'stretch', when: 'in 5 minutes' }] },
        'ping me in five minutes to stretch',
      ),
    ).toEqual([{ kind: 'add-reminder', title: 'stretch', when: 'in 5 minutes' }]);
  });

  it('returns no commands when the request is not about tasks or reminders', () => {
    expect(toCommands({ actions: [] }, "What's the weather like?")).toEqual([]);
  });

  it.each([
    ['an unknown action', { actions: [{ do: 'order_pizza' }] }, 'order a pizza'],
    ['a task without a title', { actions: [{ do: 'add_task' }] }, 'add a task'],
    [
      'a time the user never said',
      { actions: [{ do: 'add_reminder', title: 'stretch', when: 'tomorrow at 9' }] },
      'remind me to stretch',
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
    expect(toCommands(reply, utterance)).toBeNull();
  });
});

describe('isModelReplyFor', () => {
  it('accepts only replies that turn into commands for that sentence', () => {
    const isValid = isModelReplyFor('remind me to stretch in 5 minutes');
    expect(
      isValid({ actions: [{ do: 'add_reminder', title: 'stretch', when: 'in 5 minutes' }] }),
    ).toBe(true);
    expect(isValid({ actions: [{ do: 'add_reminder', title: 'stretch', when: 'at noon' }] })).toBe(
      false,
    );
  });
});
