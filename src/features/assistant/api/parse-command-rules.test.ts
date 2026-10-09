import { parseCommandRules } from './parse-command-rules';

describe('parseCommandRules', () => {
  it.each([
    ['Create a task to study React Native.', [{ kind: 'add-task', title: 'study React Native' }]],
    [
      'Add a task to finish my project tomorrow.',
      [{ kind: 'add-task', title: 'finish my project', when: 'tomorrow' }],
    ],
    ['Show me all my pending tasks.', [{ kind: 'list-tasks', status: 'pending' }]],
    [
      'Mark my React Native task as completed.',
      [{ kind: 'complete-task', target: 'React Native', impliedEntity: false }],
    ],
    [
      'Change the deadline of my project task to Friday.',
      [{ kind: 'edit-task', target: 'project', impliedEntity: false, when: 'Friday' }],
    ],
    [
      'What tasks do I still need to finish today?',
      [{ kind: 'list-tasks', status: 'pending', when: 'today' }],
    ],
    [
      'Delete the task about studying React Native.',
      [{ kind: 'delete-task', target: 'studying React Native', impliedEntity: false }],
    ],
    [
      'Remind me in 5 minutes to drink water.',
      [{ kind: 'add-reminder', title: 'drink water', when: 'in 5 minutes' }],
    ],
    [
      'Remind me tomorrow at 8 AM to prepare for work.',
      [{ kind: 'add-reminder', title: 'prepare for work', when: 'tomorrow at 8 AM' }],
    ],
    [
      'Set a reminder for 30 minutes from now to check my laundry.',
      [{ kind: 'add-reminder', title: 'check my laundry', when: 'for 30 minutes from now' }],
    ],
    [
      'What reminders do I have today?',
      [{ kind: 'list-reminders', status: 'upcoming', when: 'today' }],
    ],
    [
      'Cancel my reminder to drink water.',
      [{ kind: 'cancel-reminder', target: 'drink water', impliedEntity: false }],
    ],
    [
      'Move my meeting reminder to 3 PM.',
      [{ kind: 'edit-reminder', target: 'meeting', impliedEntity: false, when: '3 PM' }],
    ],
    [
      'Create a task to finish my assignment tonight.',
      [{ kind: 'add-task', title: 'finish my assignment', when: 'tonight' }],
    ],
    [
      'Remind me in 5 minutes to review it.',
      [{ kind: 'add-reminder', title: 'review it', when: 'in 5 minutes' }],
    ],
    ['Create a task to call my dentist.', [{ kind: 'add-task', title: 'call my dentist' }]],
    [
      'Remind me in 5 minutes to call my dentist.',
      [{ kind: 'add-reminder', title: 'call my dentist', when: 'in 5 minutes' }],
    ],
    [
      'Mark my assignment as completed.',
      [{ kind: 'complete-task', target: 'assignment', impliedEntity: true }],
    ],
    [
      'Cancel my reminder for the meeting.',
      [{ kind: 'cancel-reminder', target: 'meeting', impliedEntity: false }],
    ],
  ])('reads %p', (text, expected) => {
    expect(parseCommandRules(text)).toEqual(expected);
  });

  describe('several requests in one sentence', () => {
    it('splits before a new request', () => {
      expect(
        parseCommandRules(
          'Create a task to buy groceries, then remind me in 10 minutes to check my shopping list.',
        ),
      ).toEqual([
        { kind: 'add-task', title: 'buy groceries' },
        { kind: 'add-reminder', title: 'check my shopping list', when: 'in 10 minutes' },
      ]);
    });

    it('leaves the reminder title empty when it refers to the task', () => {
      expect(parseCommandRules('Create a task to study and remind me at 8 PM.')).toEqual([
        { kind: 'add-task', title: 'study' },
        { kind: 'add-reminder', title: '', when: 'at 8 PM' },
      ]);
    });

    it('keeps "and" inside a title', () => {
      expect(parseCommandRules('Create a task to buy bread and milk')).toEqual([
        { kind: 'add-task', title: 'buy bread and milk' },
      ]);
      expect(parseCommandRules('Remind me to email Bob and delete the old draft')).toEqual([
        { kind: 'add-reminder', title: 'email Bob and delete the old draft' },
      ]);
    });

    it('gives up on the whole sentence when one part is unclear', () => {
      expect(parseCommandRules('Create a task to call Ana, then show me the weather')).toBeNull();
    });
  });

  describe('time words', () => {
    it.each([
      ['Add a task to pay electric bill tomorrow 5pm', 'pay electric bill', 'tomorrow 5pm'],
      ['Add a task to meet with Carlo Monday 10am', 'meet with Carlo', 'Monday 10am'],
      ['Add a task to submit report Oct 15', 'submit report', 'Oct 15'],
      ['Add a task to call mom in 2 hours', 'call mom', 'in 2 hours'],
    ])('splits the time off %p', (text, title, when) => {
      expect(parseCommandRules(text)).toEqual([{ kind: 'add-task', title, when }]);
    });

    it('asks later rather than cutting a title in the wrong place', () => {
      expect(parseCommandRules('Remind me to tell Ana the meeting moved to 3 PM')).toEqual([
        { kind: 'add-reminder', title: 'tell Ana the meeting moved to 3 PM' },
      ]);
    });

    it('reads a time-first reminder with commas, as speech-to-text writes it', () => {
      expect(parseCommandRules('Remind me, in 5 minutes, to drink water.')).toEqual([
        { kind: 'add-reminder', title: 'drink water', when: 'in 5 minutes' },
      ]);
    });

    it('reads "set a reminder for" with a bare duration', () => {
      expect(parseCommandRules('Set a reminder for 30 minutes to stretch')).toEqual([
        { kind: 'add-reminder', title: 'stretch', when: '30 minutes' },
      ]);
    });
  });

  it.each([
    [
      'Mark my project task as not done',
      [{ kind: 'reopen-task', target: 'project', impliedEntity: false }],
    ],
    ['Check off buy milk', [{ kind: 'complete-task', target: 'buy milk', impliedEntity: true }]],
    [
      'Dismiss the laundry reminder',
      [{ kind: 'dismiss-reminder', target: 'laundry', impliedEntity: false }],
    ],
    ['Stop reminding me to drink water', [{ kind: 'cancel-reminder', target: 'drink water' }]],
    [
      'Rename my project task to Final report',
      [{ kind: 'edit-task', target: 'project', impliedEntity: false, title: 'Final report' }],
    ],
    [
      'Make my project task high priority',
      [{ kind: 'edit-task', target: 'project', impliedEntity: false, priority: 'high' }],
    ],
    [
      'Add a note to my project task: bring the slides',
      [{ kind: 'edit-task', target: 'project', impliedEntity: false, notes: 'bring the slides' }],
    ],
    [
      'Move my reminder to go to the gym to 6 PM',
      [{ kind: 'edit-reminder', target: 'go to the gym', impliedEntity: false, when: '6 PM' }],
    ],
    ['Find my tasks about groceries', [{ kind: 'list-tasks', status: 'all', search: 'groceries' }]],
    ['Summarize my tasks', [{ kind: 'list-tasks', status: 'pending', summary: true }]],
    [
      'Show me the details of my project task',
      [{ kind: 'list-tasks', status: 'all', search: 'project' }],
    ],
    ['Show my overdue tasks', [{ kind: 'list-tasks', status: 'overdue' }]],
    ['Show all my tasks', [{ kind: 'list-tasks', status: 'all' }]],
    [
      'Add a high priority task to call the bank',
      [{ kind: 'add-task', title: 'call the bank', priority: 'high' }],
    ],
    ['Add buy milk to my list', [{ kind: 'add-task', title: 'buy milk' }]],
    [
      'Can you please remind me in 10 minutes to stretch, thanks',
      [{ kind: 'add-reminder', title: 'stretch', when: 'in 10 minutes' }],
    ],
    ['Mark it as done', [{ kind: 'complete-task', target: 'it', impliedEntity: true }]],
  ])('reads %p', (text, expected) => {
    expect(parseCommandRules(text)).toEqual(expected);
  });

  describe('alarms', () => {
    it.each([
      [
        'Set an alarm for 7 AM to take my medicine.',
        { title: 'take my medicine', when: 'for 7 AM' },
      ],
      ['Wake me up at 6 AM', { title: 'Wake up', when: 'at 6 AM' }],
      ['Wake me up', { title: 'Wake up' }],
      ['Set an alarm for 6:30 tomorrow', { title: 'Alarm', when: 'for 6:30 tomorrow' }],
      ['Remind me to call Mom at 5 PM with an alarm', { title: 'call Mom', when: 'at 5 PM' }],
    ])('reads %p as a reminder that rings like an alarm', (text, fields) => {
      expect(parseCommandRules(text)).toEqual([{ kind: 'add-reminder', ...fields, alarm: true }]);
    });

    it('splits an alarm off another request', () => {
      expect(parseCommandRules('Create a task to buy milk and set an alarm for 7 AM')).toEqual([
        { kind: 'add-task', title: 'buy milk' },
        { kind: 'add-reminder', title: 'Alarm', when: 'for 7 AM', alarm: true },
      ]);
    });

    it('leaves a plain reminder plain', () => {
      expect(parseCommandRules('Remind me at 5 PM to call Mom')).toEqual([
        { kind: 'add-reminder', title: 'call Mom', when: 'at 5 PM' },
      ]);
    });
  });

  it.each([
    'Finish the report by Friday',
    "What's the weather like?",
    'hello',
    'I need to pick up the dry cleaning on Friday',
    'Cancel my dentist task',
    '',
  ])('leaves %p to the model', (text) => {
    expect(parseCommandRules(text)).toBeNull();
  });
});
