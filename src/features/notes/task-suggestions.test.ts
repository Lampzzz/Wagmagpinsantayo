import {
  describeSave,
  dueLabel,
  isTaskReply,
  saveFailureText,
  saveLabel,
  toTaskSuggestions,
  type TaskReply,
} from './task-suggestions';
import type { TaskSuggestion } from './types';

// Wednesday, Oct 14 2026, 10:00 AM in the phone's time zone.
const NOW = new Date(2026, 9, 14, 10, 0).getTime();
const FEATURES_SENTENCE = 'Call Ana tomorrow, finish slides by Friday, buy printer ink.';

function endOfDay(month: number, day: number): number {
  return new Date(2026, month, day, 23, 59, 59, 999).getTime();
}

function summarize(suggestions: TaskSuggestion[]) {
  return suggestions.map(({ title, when, dueAt, dueHasTime }) => ({
    title,
    when,
    dueAt,
    dueHasTime,
  }));
}

const EXPECTED_SENTENCE_TASKS = [
  { title: 'Call Ana', when: 'tomorrow', dueAt: endOfDay(9, 15), dueHasTime: false },
  { title: 'Finish slides', when: 'by Friday', dueAt: endOfDay(9, 16), dueHasTime: false },
  { title: 'Buy printer ink', when: '', dueAt: null, dueHasTime: false },
];

describe('isTaskReply', () => {
  it.each([
    { tasks: [] },
    { tasks: [{ title: 'Call Ana', when: 'tomorrow' }] },
    { tasks: [{ title: 'Call Ana' }] },
    { tasks: [{ title: 'Call Ana', when: null }] },
  ])('accepts %j', (value) => {
    expect(isTaskReply(value)).toBe(true);
  });

  it.each([
    null,
    'Call Ana',
    [{ title: 'Call Ana' }],
    {},
    { tasks: 'Call Ana' },
    { tasks: ['Call Ana'] },
    { tasks: [{ when: 'tomorrow' }] },
    { tasks: [{ title: 7 }] },
    { tasks: [{ title: 'Call Ana', when: 5 }] },
  ])('rejects %j', (value) => {
    expect(isTaskReply(value)).toBe(false);
  });
});

describe('toTaskSuggestions', () => {
  it('resolves the FEATURES.md sentence with code, not the AI', () => {
    const reply: TaskReply = {
      tasks: [
        { title: 'Call Ana', when: 'tomorrow' },
        { title: 'Finish slides', when: 'by Friday' },
        { title: 'Buy printer ink', when: '' },
      ],
    };
    const suggestions = toTaskSuggestions(reply, FEATURES_SENTENCE, NOW);

    expect(summarize(suggestions)).toEqual(EXPECTED_SENTENCE_TASKS);
    // "by Friday" is this week's Friday.
    expect(new Date(suggestions[1].dueAt ?? 0).getDay()).toBe(5);
    expect(suggestions.map((suggestion) => dueLabel(suggestion, NOW))).toEqual([
      'Due tomorrow',
      'Due Fri, Oct 16',
      'No date',
    ]);
  });

  it('moves date words the AI left in a title out of it', () => {
    const reply: TaskReply = {
      tasks: [
        { title: 'Call Ana tomorrow', when: '' },
        { title: 'Finish slides by Friday', when: null },
        { title: 'buy printer ink.' },
      ],
    };
    expect(summarize(toTaskSuggestions(reply, FEATURES_SENTENCE, NOW))).toEqual(
      EXPECTED_SENTENCE_TASKS,
    );
  });

  it('keeps the date words from `when` when the title repeats them', () => {
    const reply: TaskReply = { tasks: [{ title: 'Finish slides by Friday', when: 'by Friday' }] };
    expect(summarize(toTaskSuggestions(reply, FEATURES_SENTENCE, NOW))).toEqual([
      EXPECTED_SENTENCE_TASKS[1],
    ]);
  });

  it('drops a date the note never mentions', () => {
    const reply: TaskReply = { tasks: [{ title: 'Buy printer ink', when: 'tomorrow' }] };
    expect(summarize(toTaskSuggestions(reply, 'Buy printer ink.', NOW))).toEqual([
      { title: 'Buy printer ink', when: '', dueAt: null, dueHasTime: false },
    ]);
  });

  it('drops tasks that are not in the note', () => {
    const reply: TaskReply = {
      tasks: [
        { title: 'Pay the rent', when: '' },
        { title: 'Buy 3 printer inks', when: '' },
        { title: 'Call Ana', when: 'tomorrow' },
      ],
    };
    expect(toTaskSuggestions(reply, FEATURES_SENTENCE, NOW).map((task) => task.title)).toEqual([
      'Call Ana',
    ]);
  });

  it('keeps a reworded title whose words come from the note', () => {
    const reply: TaskReply = { tasks: [{ title: 'Finishing the slide deck', when: '' }] };
    expect(toTaskSuggestions(reply, FEATURES_SENTENCE, NOW).map((task) => task.title)).toEqual([
      'Finishing the slide deck',
    ]);
  });

  it('drops repeats and titles that are only date words', () => {
    const reply: TaskReply = {
      tasks: [
        { title: 'Buy printer ink', when: '' },
        { title: '"buy printer ink"', when: '' },
        { title: 'Tomorrow', when: 'tomorrow' },
      ],
    };
    expect(toTaskSuggestions(reply, FEATURES_SENTENCE, NOW).map((task) => task.title)).toEqual([
      'Buy printer ink',
    ]);
  });

  it('keeps a time of day and gives a key to each task', () => {
    const reply: TaskReply = {
      tasks: [
        { title: 'Pay electric bill', when: 'tomorrow 5pm' },
        { title: 'Call mom', when: 'in 2 hours' },
      ],
    };
    const suggestions = toTaskSuggestions(
      reply,
      'Pay electric bill tomorrow 5pm. Call mom in 2 hours.',
      NOW,
    );
    expect(summarize(suggestions)).toEqual([
      {
        title: 'Pay electric bill',
        when: 'tomorrow 5pm',
        dueAt: new Date(2026, 9, 15, 17, 0).getTime(),
        dueHasTime: true,
      },
      { title: 'Call mom', when: 'in 2 hours', dueAt: NOW + 2 * 60 * 60_000, dueHasTime: true },
    ]);
    expect(dueLabel(suggestions[0], NOW)).toBe('Due tomorrow at 5:00 PM');
    expect(new Set(suggestions.map((suggestion) => suggestion.key)).size).toBe(2);
  });

  it('moves a time that already passed today to tomorrow', () => {
    const reply: TaskReply = { tasks: [{ title: 'Call the bank', when: 'at 9am' }] };
    expect(summarize(toTaskSuggestions(reply, 'Call the bank at 9am.', NOW))).toEqual([
      {
        title: 'Call the bank',
        when: 'at 9am',
        dueAt: new Date(2026, 9, 15, 9, 0).getTime(),
        dueHasTime: true,
      },
    ]);
  });

  it('reads "by Friday" on a Friday as today', () => {
    const friday = new Date(2026, 9, 16, 10, 0).getTime();
    const reply: TaskReply = { tasks: [{ title: 'Finish slides', when: 'by Friday' }] };
    expect(toTaskSuggestions(reply, FEATURES_SENTENCE, friday)[0].dueAt).toBe(endOfDay(9, 16));
  });

  it('saves repeating and unreadable dates without a due date', () => {
    const note = 'Water the plants every Monday. Plan the party this week.';
    const reply: TaskReply = {
      tasks: [
        { title: 'Water the plants every Monday', when: '' },
        { title: 'Plan the party', when: 'this week' },
      ],
    };
    const suggestions = toTaskSuggestions(reply, note, NOW);
    expect(summarize(suggestions)).toEqual([
      { title: 'Water the plants every Monday', when: '', dueAt: null, dueHasTime: false },
      { title: 'Plan the party', when: 'this week', dueAt: null, dueHasTime: false },
    ]);
    expect(dueLabel(suggestions[1], NOW)).toBe('No exact date (“this week”)');
  });

  it('finds nothing in a reply with no tasks', () => {
    expect(toTaskSuggestions({ tasks: [] }, 'Lovely weather today.', NOW)).toEqual([]);
  });
});

describe('describeSave', () => {
  it('says how many tasks were saved and which reminders were set', () => {
    expect(describeSave({ saved: 3, alerts: ['scheduled'] })).toEqual({
      title: 'Done! 3 tasks saved.',
      detail: 'Reminder set for 1 task.',
    });
    expect(describeSave({ saved: 2, alerts: ['scheduled', 'scheduled'] }).detail).toBe(
      'Reminders set for 2 tasks.',
    );
    expect(describeSave({ saved: 1, alerts: [] })).toEqual({
      title: 'Done! 1 task saved.',
      detail: '',
    });
  });

  it('says when a reminder cannot alert', () => {
    expect(
      describeSave({ saved: 2, alerts: ['no-permission', 'no-permission', 'failed', 'none'] }),
    ).toEqual({
      title: 'Done! 2 tasks saved.',
      detail:
        "Notifications are off, so 2 reminders can't alert you. Turn them on in Settings. " +
        "Couldn't schedule 1 reminder.",
    });
  });
});

describe('save sheet labels', () => {
  it('counts the tasks the button will save', () => {
    expect(saveLabel(3)).toBe('Save 3 tasks');
    expect(saveLabel(1)).toBe('Save 1 task');
    expect(saveLabel(0)).toBe('Save tasks');
  });

  it('says what was and wasn’t saved', () => {
    expect(saveFailureText(1, 2)).toBe(
      "Couldn't save 1 task. 2 tasks saved. Tap Save to try again.",
    );
    expect(saveFailureText(3, 0)).toBe("Couldn't save 3 tasks. Tap Save to try again.");
  });
});
