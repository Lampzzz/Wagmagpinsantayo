import type { Note } from '@/features/notes';
import type { AlertOutcome, Reminder } from '@/features/reminders';
import type { Task } from '@/features/tasks';

import type {
  Action,
  AssistantDeps,
  AssistantReply,
  Command,
  ConversationState,
  DataAction,
  Outcome,
  TurnInput,
} from '../types';
import { runTurn } from './run-turn';

function at(year: number, month: number, day: number, hour = 0, minute = 0) {
  return new Date(year, month - 1, day, hour, minute).getTime();
}

function endOf(year: number, month: number, day: number) {
  return new Date(year, month - 1, day, 23, 59, 59, 999).getTime();
}

// Monday, Oct 5, 2026, 10:00 AM.
const NOW = at(2026, 10, 5, 10);
const DAY_MS = 24 * 60 * 60 * 1000;

/** An in-memory stand-in for the task, reminder and note services and the phone's dialer. */
function createWorld(options: { model?: AssistantDeps['interpretWithModel']; now?: number } = {}) {
  const now = options.now ?? NOW;
  const tasks: Task[] = [];
  const reminders: Reminder[] = [];
  const notes: Note[] = [];
  let nextId = 1;
  let alert: AlertOutcome = 'scheduled';
  let failNext: Action['kind'] | 'any' | null = null;
  let dialerOpens = true;
  let databaseWorks = true;
  const callEmergency = jest.fn(async () => dialerOpens);

  const execute = async (action: DataAction): Promise<Outcome> => {
    if (failNext === 'any' || failNext === action.kind) {
      failNext = null;
      throw new Error('Disk full');
    }
    switch (action.kind) {
      case 'create-task': {
        const task: Task = {
          id: nextId++,
          title: action.task.title,
          description: action.task.description ?? '',
          status: 'pending',
          priority: action.task.priority ?? 'normal',
          dueAt: action.task.dueAt ?? null,
          dueHasTime: action.task.dueHasTime ?? false,
          completedAt: null,
          createdAt: NOW,
          updatedAt: NOW,
        };
        tasks.push(task);
        return { kind: 'task-saved', task: { ...task } };
      }
      case 'update-task':
      case 'set-task-done': {
        const task = tasks.find(({ id }) => id === action.task.id);
        if (!task) throw new Error('Gone');
        if (action.kind === 'update-task') Object.assign(task, action.changes);
        else Object.assign(task, { status: action.done ? 'done' : 'pending', completedAt: NOW });
        return { kind: 'task-saved', task: { ...task } };
      }
      case 'delete-task':
        tasks.splice(
          tasks.findIndex(({ id }) => id === action.task.id),
          1,
        );
        reminders.forEach((reminder) => {
          if (reminder.taskId === action.task.id) reminder.taskId = null;
        });
        return { kind: 'task-deleted' };
      case 'create-reminder': {
        const taskId = action.reminder.taskId ?? null;
        const reminder: Reminder = {
          id: nextId++,
          title: action.reminder.title,
          scheduledAt: action.reminder.scheduledAt,
          repeat: action.reminder.repeat ?? null,
          alarm: action.reminder.alarm ?? false,
          status: 'scheduled',
          notificationId: alert === 'scheduled' ? 'reminder-x' : null,
          taskId,
          taskTitle: tasks.find(({ id }) => id === taskId)?.title ?? null,
          createdAt: NOW,
          updatedAt: NOW,
        };
        reminders.push(reminder);
        return { kind: 'reminder-saved', reminder: { ...reminder }, alert };
      }
      case 'update-reminder': {
        const reminder = reminders.find(({ id }) => id === action.reminder.id);
        if (!reminder) throw new Error('Gone');
        Object.assign(reminder, action.changes);
        return { kind: 'reminder-saved', reminder: { ...reminder }, alert };
      }
      case 'close-reminder': {
        const reminder = reminders.find(({ id }) => id === action.reminder.id);
        if (!reminder) throw new Error('Gone');
        if (reminder.repeat === 'daily' && action.status !== 'cancelled') {
          // Like the real service: a daily reminder skips today and stays scheduled.
          const endOfToday = new Date(now).setHours(23, 59, 59, 999);
          while (reminder.scheduledAt <= endOfToday) reminder.scheduledAt += DAY_MS;
        } else {
          reminder.status = action.status;
        }
        return { kind: 'reminder-closed', reminder: { ...reminder }, alertCleared: true };
      }
      case 'delete-reminder':
        reminders.splice(
          reminders.findIndex(({ id }) => id === action.reminder.id),
          1,
        );
        return { kind: 'reminder-deleted', alertCleared: true };
      case 'create-note': {
        const note: Note = { ...action.note, id: nextId++, createdAt: now, updatedAt: now };
        notes.push(note);
        return { kind: 'note-saved', note: { ...note } };
      }
    }
  };

  const deps: AssistantDeps = {
    interpretWithModel: options.model ?? null,
    canSetUpModel: true,
    loadSnapshot: async () => {
      if (!databaseWorks) throw new Error('Database is locked');
      return {
        tasks: tasks.map((task) => ({ ...task })),
        reminders: reminders.map((reminder) => ({ ...reminder })),
      };
    },
    execute,
    callEmergency,
    now: () => now,
  };

  let state: ConversationState = { pending: null, focus: null };
  async function send(input: string | TurnInput): Promise<AssistantReply> {
    const turn = typeof input === 'string' ? { kind: 'text' as const, text: input } : input;
    const result = await runTurn(turn, state, deps);
    state = result.state;
    return result.reply;
  }

  return {
    tasks,
    reminders,
    notes,
    send,
    get state() {
      return state;
    },
    setAlert(outcome: AlertOutcome) {
      alert = outcome;
    },
    /** Makes the next action fail, or the next one of this kind. */
    failNextAction(kind: Action['kind'] | 'any' = 'any') {
      failNext = kind;
    },
    /** The phone's dialer, as a mock. */
    callEmergency,
    /** Makes the dialer fail to open, as on a tablet with no phone app. */
    breakDialer() {
      dialerOpens = false;
    },
    /** Makes loading saved items throw. */
    breakDatabase() {
      databaseWorks = false;
    },
  };
}

describe('runTurn: tasks', () => {
  it('creates, lists, updates, completes and deletes tasks', async () => {
    const world = createWorld();

    expect((await world.send('Create a task to study React Native.')).text).toBe(
      'Added the task "Study React Native".',
    );
    expect((await world.send('Add a task to finish my project tomorrow.')).text).toBe(
      'Added the task "Finish my project", due tomorrow.',
    );

    const list = await world.send('Show me all my pending tasks.');
    expect(list.text).toBe('You have 2 pending tasks:');
    expect(list.speech).toBe(
      'You have 2 pending tasks: "Finish my project" and "Study React Native".',
    );
    expect(list.items.map(({ title }) => title)).toEqual([
      'Finish my project',
      'Study React Native',
    ]);

    expect((await world.send('Change the deadline of my project task to Friday.')).text).toBe(
      '"Finish my project" is now due Fri, Oct 9.',
    );
    expect((await world.send('Mark my React Native task as completed.')).text).toBe(
      'Marked "Study React Native" as done.',
    );
    expect((await world.send('What tasks do I still need to finish today?')).text).toBe(
      'You have no pending tasks due today.',
    );

    const confirm = await world.send('Delete the task about studying React Native.');
    expect(confirm.text).toBe('Delete the task "Study React Native"? This can\'t be undone.');
    expect(world.tasks).toHaveLength(2);
    expect((await world.send('yes')).text).toBe('Deleted the task "Study React Native".');
    expect(world.tasks.map(({ title }) => title)).toEqual(['Finish my project']);
  });

  it('says honestly when a task is already done', async () => {
    const world = createWorld();
    await world.send('Create a task to study React Native');
    await world.send('Mark my React Native task as done');
    expect((await world.send('Mark my React Native task as done')).text).toBe(
      '"Study React Native" is already done.',
    );
  });

  it('asks which task when several match, then acts on the pick', async () => {
    const world = createWorld();
    await world.send('Create a task to finish the project report');
    await world.send('Create a task to prepare the project kickoff');

    const question = await world.send('Mark my project task as done');
    expect(question.text).toBe('Which task do you mean?');
    // Equally good matches come newest first.
    expect(
      question.question?.kind === 'pick' && question.question.options.map((o) => o.label),
    ).toEqual(['Prepare the project kickoff', 'Finish the project report']);

    expect((await world.send('the second one')).text).toBe(
      'Marked "Finish the project report" as done.',
    );
    expect(world.tasks.map(({ status }) => status)).toEqual(['done', 'pending']);
  });

  it('treats picking an item to delete as the confirmation', async () => {
    const world = createWorld();
    await world.send('Create a task to finish the project report');
    await world.send('Create a task to prepare the project kickoff');

    const question = await world.send('Delete my project task');
    if (question.question?.kind !== 'pick') throw new Error('Expected a pick');
    const [first] = question.question.options;
    expect((await world.send({ kind: 'pick', option: first })).text).toBe(
      'Deleted the task "Prepare the project kickoff".',
    );
  });

  it('keeps the item when the user says no', async () => {
    const world = createWorld();
    await world.send('Create a task to study React Native');
    await world.send('Delete my React Native task');
    expect((await world.send({ kind: 'confirm', yes: false })).text).toBe(
      'Okay, I kept "Study React Native".',
    );
    expect(world.tasks).toHaveLength(1);
  });

  it("says a finished task's reminder is still on", async () => {
    const world = createWorld();
    await world.send('Create a task to study and remind me at 8 PM');
    expect(world.reminders[0]).toMatchObject({ title: 'Study', taskId: world.tasks[0].id });
    expect((await world.send('Mark my study task as done')).text).toBe(
      'Marked "Study" as done. Its reminder for today at 8:00 PM is still on.',
    );
    expect(world.reminders[0].status).toBe('scheduled');
  });
});

describe('runTurn: reminders', () => {
  it('creates, lists, moves and cancels reminders', async () => {
    const world = createWorld();

    expect((await world.send('Remind me in 5 minutes to drink water.')).text).toBe(
      'Reminder set for today at 10:05 AM (in 5 minutes): Drink water.',
    );
    expect((await world.send('Remind me tomorrow at 8 AM to prepare for work.')).text).toBe(
      'Reminder set for tomorrow at 8:00 AM (in 22 hours): Prepare for work.',
    );
    expect(
      (await world.send('Set a reminder for 30 minutes from now to check my laundry.')).text,
    ).toBe('Reminder set for today at 10:30 AM (in 30 minutes): Check my laundry.');

    const today = await world.send('What reminders do I have today?');
    expect(today.text).toBe('You have 2 reminders for today:');
    expect(today.items.map(({ title }) => title)).toEqual(['Drink water', 'Check my laundry']);

    expect((await world.send('Move my laundry reminder to 3 PM.')).text).toBe(
      'Moved "Check my laundry" to today at 3:00 PM (in 5 hours).',
    );
    expect((await world.send('Cancel my reminder to drink water.')).text).toBe(
      'Cancelled the reminder "Drink water".',
    );
    expect(world.reminders.map(({ status }) => status)).toEqual([
      'cancelled',
      'scheduled',
      'scheduled',
    ]);
  });

  it('asks when, then sets the reminder', async () => {
    const world = createWorld();
    const question = await world.send('Remind me to call mom');
    expect(question.text).toBe('When should I remind you?');
    expect(question.question).toMatchObject({ kind: 'fill', suggestions: expect.any(Array) });
    expect((await world.send('in 2 hours')).text).toBe(
      'Reminder set for today at 12:00 PM (in 2 hours): Call mom.',
    );
  });

  it('offers tomorrow for a time that already passed', async () => {
    const world = createWorld();
    const question = await world.send('Remind me at 9 AM to stretch');
    expect(question.text).toBe(
      'That time has already passed today. Did you mean tomorrow at 9:00 AM?',
    );
    expect((await world.send('yes')).text).toBe(
      'Reminder set for tomorrow at 9:00 AM (in 23 hours): Stretch.',
    );
  });

  it('is honest when notifications are off', async () => {
    const world = createWorld();
    world.setAlert('no-permission');
    const reply = await world.send('Remind me in 5 minutes to drink water');
    expect(reply.text).toBe(
      'I saved the reminder "Drink water" for today at 10:05 AM, but notifications are off, so it can\'t alert you.',
    );
    expect(reply.buttons).toEqual(['open-settings']);
  });

  it('finds a reminder when the user did not say which kind', async () => {
    const world = createWorld();
    await world.send('Remind me tomorrow at 9 AM to go to the dentist appointment');
    expect((await world.send('Delete my dentist appointment')).text).toBe(
      'Delete the reminder "Go to the dentist appointment"? This can\'t be undone.',
    );
    expect((await world.send('yes')).text).toBe(
      'Deleted the reminder "Go to the dentist appointment".',
    );
  });
});

describe('runTurn: several requests and follow-ups', () => {
  it('runs each request in order without linking unrelated ones', async () => {
    const world = createWorld();
    const reply = await world.send(
      'Create a task to buy groceries, then remind me in 10 minutes to check my shopping list',
    );
    expect(reply.text).toBe(
      [
        'Added the task "Buy groceries".',
        'Reminder set for today at 10:10 AM (in 10 minutes): Check my shopping list.',
      ].join('\n'),
    );
    expect(world.reminders[0].taskId).toBeNull();
  });

  it('links "it" to the task from the previous message', async () => {
    const world = createWorld();
    await world.send('Create a task to finish my assignment tonight');
    const reply = await world.send('Remind me in 5 minutes to review it');
    expect(reply.text).toBe(
      'Reminder set for today at 10:05 AM (in 5 minutes): Review "Finish my assignment".',
    );
    expect(world.reminders[0].taskId).toBe(world.tasks[0].id);
  });

  it('forgets what "it" meant after an unrelated message', async () => {
    const world = createWorld();
    await world.send('Create a task to finish my assignment');
    await world.send('What reminders do I have today?');
    await world.send('Remind me in 5 minutes to review it');
    expect(world.reminders[0]).toMatchObject({ title: 'Review it', taskId: null });
  });

  it('reports a part that failed alongside the part that worked', async () => {
    const world = createWorld();
    const reply = await world.send(
      'Mark my unicorn task done and remind me in 5 minutes to stretch',
    );
    expect(reply.text).toBe(
      [
        'I couldn\'t find a task matching "unicorn".',
        'Reminder set for today at 10:05 AM (in 5 minutes): Stretch.',
      ].join('\n'),
    );
    expect(reply.isError).toBe(false);
  });

  it('stops after an error and says what it did not get to', async () => {
    const world = createWorld();
    world.failNextAction();
    const reply = await world.send(
      'Create a task to pay rent, then remind me in 10 minutes to call the landlord',
    );
    expect(reply.text).toBe(
      [
        'Something went wrong, so I couldn\'t add the task "Pay rent".',
        "I didn't get to: set a reminder to call the landlord.",
      ].join('\n'),
    );
    expect(world.tasks).toHaveLength(0);
    expect(world.reminders).toHaveLength(0);
    expect(reply.isError).toBe(true);
  });

  it('drops a pending question when a new request comes in', async () => {
    const world = createWorld();
    await world.send('Remind me to call mom');
    const reply = await world.send('Create a task to buy milk');
    expect(reply.text).toBe(
      ['I dropped the earlier question.', 'Added the task "Buy milk".'].join('\n'),
    );
    expect(world.state.pending).toBeNull();
  });

  it('lets the user cancel a question', async () => {
    const world = createWorld();
    await world.send('Remind me to call mom');
    expect((await world.send('never mind')).text).toBe('Okay, never mind.');
    expect(world.reminders).toHaveLength(0);
  });
});

describe('runTurn: requests it cannot handle', () => {
  it.each([
    'Remind me every Monday at 8 to take out the trash',
    'Remind me every 2 hours to drink water',
    'Remind me every other day to water the plants',
    'Remind me weekly to call grandma',
  ])('refuses %p out loud, since only every day is supported', async (text) => {
    const world = createWorld();
    const reply = await world.send(text);
    expect(reply.text).toBe(
      'I can only repeat a reminder every day for now, like "Remind me every day at 8 AM to take my medicine".',
    );
    expect(reply.isError).toBe(true);
    expect(world.reminders).toHaveLength(0);
  });

  it('suggests setting up the AI when it is not downloaded', async () => {
    const world = createWorld();
    const reply = await world.send("What's the weather like?");
    expect(reply.text).toContain("I'm not sure what you mean.");
    expect(reply.buttons).toEqual(['set-up-ai']);
  });

  it('uses the model for wording the rules do not know', async () => {
    const commands: Command[] = [
      { kind: 'add-task', title: 'pick up the dry cleaning', when: 'on Friday' },
    ];
    const model = jest.fn(async () => commands);
    const world = createWorld({ model });
    const reply = await world.send(
      'I need to pick up the dry cleaning on Friday, put that on my list',
    );
    expect(model).toHaveBeenCalledTimes(1);
    expect(reply.text).toBe('Added the task "Pick up the dry cleaning", due Fri, Oct 9.');
  });

  it('never calls the model for wording the rules know', async () => {
    const model = jest.fn(async (): Promise<Command[]> => []);
    const world = createWorld({ model });
    await world.send('Create a task to study');
    expect(model).not.toHaveBeenCalled();
  });

  it('recovers when the model fails', async () => {
    const world = createWorld({
      model: async () => {
        throw new Error('timeout');
      },
    });
    const reply = await world.send('I need to pick up the dry cleaning on Friday');
    expect(reply.text).toContain("Sorry, I couldn't work that out.");
    expect(reply.buttons).toEqual([]);
    expect(world.tasks).toHaveLength(0);
  });
});

describe('runTurn: Smart Quick Add', () => {
  // Thursday, Oct 8, 2026, 2:30 PM.
  const THURSDAY = at(2026, 10, 8, 14, 30);

  it.each([
    [
      'Pay electric bill tomorrow 5pm',
      'Add "Pay electric bill" for tomorrow at 5:00 PM? I\'ll remind you then.',
      { title: 'Pay electric bill', dueAt: at(2026, 10, 9, 17), dueHasTime: true },
      at(2026, 10, 9, 17),
      [
        'Added the task "Pay electric bill", due tomorrow at 5:00 PM.',
        'Reminder set for tomorrow at 5:00 PM: Pay electric bill.',
      ],
    ],
    [
      'Meeting with Carlo Monday 10am',
      'Add "Meeting with Carlo" for Mon, Oct 12 at 10:00 AM? I\'ll remind you then.',
      { title: 'Meeting with Carlo', dueAt: at(2026, 10, 12, 10), dueHasTime: true },
      at(2026, 10, 12, 10),
      [
        'Added the task "Meeting with Carlo", due Mon, Oct 12 at 10:00 AM.',
        'Reminder set for Mon, Oct 12 at 10:00 AM: Meeting with Carlo.',
      ],
    ],
    [
      'Submit report Oct 15',
      'Add "Submit report" for Thu, Oct 15? I\'ll remind you at 9:00 AM that day.',
      { title: 'Submit report', dueAt: endOf(2026, 10, 15), dueHasTime: false },
      at(2026, 10, 15, 9),
      [
        'Added the task "Submit report", due Thu, Oct 15.',
        'Reminder set for Thu, Oct 15 at 9:00 AM: Submit report.',
      ],
    ],
    [
      'Buy groceries',
      'Add "Buy groceries" with no due date? I won\'t set a reminder.',
      { title: 'Buy groceries', dueAt: null, dueHasTime: false },
      null,
      ['Added the task "Buy groceries".'],
    ],
    [
      'Call mom in 2 hours',
      'Add "Call mom" for today at 4:30 PM? I\'ll remind you then.',
      { title: 'Call mom', dueAt: at(2026, 10, 8, 16, 30), dueHasTime: true },
      at(2026, 10, 8, 16, 30),
      [
        'Added the task "Call mom", due today at 4:30 PM.',
        'Reminder set for today at 4:30 PM (in 2 hours): Call mom.',
      ],
    ],
  ])('proposes %p, then saves it on Save', async (text, prompt, task, remindAt, saved) => {
    const world = createWorld({ now: THURSDAY });

    const proposal = await world.send(text);
    expect(proposal.text).toBe(prompt);
    expect(proposal.question).toMatchObject({
      kind: 'confirm',
      prompt,
      action: { kind: 'create-task', task },
      yesLabel: 'Save',
      noLabel: 'Cancel',
    });
    expect(world.tasks).toHaveLength(0);
    expect(world.reminders).toHaveLength(0);

    const reply = await world.send({ kind: 'confirm', yes: true });
    expect(reply.text).toBe(saved.join('\n'));
    expect(world.tasks).toEqual([expect.objectContaining({ ...task, priority: 'normal' })]);
    expect(world.reminders).toEqual(
      remindAt === null
        ? []
        : [
            expect.objectContaining({
              title: task.title,
              scheduledAt: remindAt,
              taskId: world.tasks[0].id,
            }),
          ],
    );
    expect(reply.items.map(({ entity }) => entity)).toEqual(
      remindAt === null ? ['task'] : ['task', 'reminder'],
    );
    expect(world.state.pending).toBeNull();
  });

  it('saves nothing when the user cancels', async () => {
    const world = createWorld({ now: THURSDAY });
    await world.send('Buy groceries');
    expect((await world.send({ kind: 'confirm', yes: false })).text).toBe(
      'Okay, I didn\'t add "Buy groceries".',
    );
    expect(world.tasks).toHaveLength(0);
  });

  it('takes a typed or spoken "save" as the Save button', async () => {
    const world = createWorld({ now: THURSDAY });
    await world.send('Pay electric bill tomorrow 5pm');
    await world.send('Save.');
    expect(world.tasks).toHaveLength(1);
    expect(world.reminders).toHaveLength(1);
  });

  it('asks about tomorrow when the time already passed today', async () => {
    const world = createWorld({ now: THURSDAY });
    const proposal = await world.send('Call mom at 9am');
    expect(proposal.text).toBe(
      'That time has already passed today. Add "Call mom" for tomorrow at 9:00 AM? I\'ll remind you then.',
    );
    expect(proposal.question).toMatchObject({ yesLabel: 'Yes, tomorrow', noLabel: 'No' });

    await world.send('yes');
    expect(world.tasks[0]).toMatchObject({ dueAt: at(2026, 10, 9, 9), dueHasTime: true });
    expect(world.reminders[0]).toMatchObject({ scheduledAt: at(2026, 10, 9, 9) });
  });

  it('sets no reminder for "today" once 9:00 AM has passed', async () => {
    const world = createWorld({ now: THURSDAY });
    expect((await world.send('Water the plants today')).text).toBe(
      'Add "Water the plants" for today? It\'s already past 9:00 AM, so I won\'t set a reminder.',
    );
    await world.send('yes');
    expect(world.tasks[0]).toMatchObject({ dueAt: endOf(2026, 10, 8), dueHasTime: false });
    expect(world.reminders).toHaveLength(0);
  });

  it('keeps "it" on the new task rather than its reminder', async () => {
    const world = createWorld({ now: THURSDAY });
    await world.send('Pay electric bill tomorrow 5pm');
    await world.send('yes');
    expect((await world.send('Mark it as done')).text).toBe(
      'Marked "Pay electric bill" as done. Its reminder for tomorrow at 5:00 PM is still on.',
    );
  });

  it('says so when the task saved but its reminder failed', async () => {
    const world = createWorld({ now: THURSDAY });
    await world.send('Pay electric bill tomorrow 5pm');
    world.failNextAction('create-reminder');
    const reply = await world.send('yes');
    expect(reply.text).toBe(
      [
        'Added the task "Pay electric bill", due tomorrow at 5:00 PM.',
        'Something went wrong, so I couldn\'t set the reminder "Pay electric bill".',
      ].join('\n'),
    );
    expect(world.tasks).toHaveLength(1);
    expect(world.reminders).toHaveLength(0);
    expect(reply.isError).toBe(false);
  });

  it('is honest when notifications are off', async () => {
    const world = createWorld({ now: THURSDAY });
    world.setAlert('no-permission');
    await world.send('Call mom in 2 hours');
    const reply = await world.send('yes');
    expect(reply.text).toBe(
      [
        'Added the task "Call mom", due today at 4:30 PM.',
        'I saved the reminder "Call mom" for today at 4:30 PM, but notifications are off, so it can\'t alert you.',
      ].join('\n'),
    );
    expect(reply.buttons).toEqual(['open-settings']);
  });

  it('never waits for the model on a clear to-do', async () => {
    const model = jest.fn(async (): Promise<Command[]> => []);
    const world = createWorld({ model, now: THURSDAY });
    const reply = await world.send('Pay electric bill tomorrow 5pm');
    expect(model).not.toHaveBeenCalled();
    expect(reply.question?.kind).toBe('confirm');
  });

  it('lets the model decide what an unclear sentence means', async () => {
    const model = jest.fn(async (): Promise<Command[]> => []);
    const world = createWorld({ model, now: THURSDAY });
    for (const text of ["What's the weather like?", 'Groceries tomorrow', 'Hello there']) {
      const reply = await world.send(text);
      expect(reply.text).toContain("I'm not sure what you mean.");
      expect(reply.question).toBeNull();
    }
    expect(model).toHaveBeenCalledTimes(3);
    expect(world.tasks).toHaveLength(0);
  });

  it('shows back a to-do the model read, with its reminder, before saving', async () => {
    const model = jest.fn(async (): Promise<Command[]> => [
      { kind: 'add-task', title: 'call Ana', when: 'tomorrow at 3' },
    ]);
    const world = createWorld({ model, now: THURSDAY });
    expect((await world.send('I need to call Ana tomorrow at 3')).text).toBe(
      'Add "Call Ana" for tomorrow at 3:00 PM? I\'ll remind you then.',
    );
    expect(world.tasks).toHaveLength(0);
    await world.send('yes');
    expect(world.tasks[0]).toMatchObject({ title: 'Call Ana', dueAt: at(2026, 10, 9, 15) });
    expect(world.reminders[0]).toMatchObject({ scheduledAt: at(2026, 10, 9, 15) });
  });

  it('suggests a wording when it cannot tell and the AI is not set up', async () => {
    const world = createWorld({ now: THURSDAY });
    const reply = await world.send('Groceries tomorrow');
    expect(reply.text).toContain("I'm not sure what you mean.");
    expect(reply.text).toContain('Try "Pay the electric bill tomorrow at 5 PM"');
    expect(reply.text).toContain('"Remind me tomorrow at 9 to call Ana"');
    expect(reply.buttons).toEqual(['set-up-ai']);
    expect(reply.question).toBeNull();
    expect(world.tasks).toHaveLength(0);
  });

  it('leaves the existing wordings on their old paths', async () => {
    const model = jest.fn(async (): Promise<Command[]> => []);
    const world = createWorld({ model, now: THURSDAY });

    const task = await world.send('Create a task to buy milk');
    expect(task.text).toBe('Added the task "Buy milk".');
    expect(task.question).toBeNull();

    const reminder = await world.send('Remind me in 10 minutes to stretch');
    expect(reminder.text).toBe('Reminder set for today at 2:40 PM (in 10 minutes): Stretch.');
    expect(reminder.question).toBeNull();

    const list = await world.send('What tasks do I have today?');
    expect(list.text).toBe('You have no pending tasks due today.');

    expect(model).not.toHaveBeenCalled();
    expect(world.tasks).toHaveLength(1);
    expect(world.reminders).toHaveLength(1);
    expect(world.reminders[0].taskId).toBeNull();
  });
});

describe('runTurn: emergency call', () => {
  it('asks first, then opens the dialer with 911 on "Call 911"', async () => {
    const world = createWorld();

    const question = await world.send('Call 911');
    expect(question.text).toBe('Call emergency services (911)?');
    expect(question.speech).toBe('Call emergency services (9 1 1)?');
    expect(question.question).toMatchObject({
      kind: 'confirm',
      action: { kind: 'call-emergency', number: '911' },
      yesLabel: 'Call 911',
      noLabel: 'Cancel',
    });
    expect(question.isError).toBe(false);
    expect(world.callEmergency).not.toHaveBeenCalled();

    const reply = await world.send({ kind: 'confirm', yes: true });
    expect(world.callEmergency).toHaveBeenCalledTimes(1);
    expect(reply.text).toBe("Opening your phone's dialer with 911.");
    expect(reply.speech).toBe("Opening your phone's dialer with 9 1 1.");
    expect(reply.isError).toBe(false);
    expect(reply.question).toBeNull();
    expect(world.state.pending).toBeNull();
  });

  it('never opens the dialer when the user taps Cancel', async () => {
    const world = createWorld();
    await world.send('I need help');
    const reply = await world.send({ kind: 'confirm', yes: false });
    expect(reply.text).toBe("Okay, I won't call.");
    expect(reply.isError).toBe(false);
    expect(world.callEmergency).not.toHaveBeenCalled();
    expect(world.state.pending).toBeNull();
  });

  it.each([
    ['no', "Okay, I won't call."],
    ['Cancel.', 'Okay, never mind.'],
    ['never mind', 'Okay, never mind.'],
  ])('takes a typed or spoken %p as a no', async (answer, text) => {
    const world = createWorld();
    await world.send('Emergency!');
    expect((await world.send(answer)).text).toBe(text);
    expect(world.callEmergency).not.toHaveBeenCalled();
  });

  it.each([
    'yes',
    'Call 911',
    'Yes, call.',
    'Call an ambulance!',
    'do it',
    'Help!',
    'Please, hurry up!',
  ])('takes a typed or spoken %p as a yes', async (answer) => {
    const world = createWorld();
    await world.send('Emergency!');
    expect((await world.send(answer)).text).toBe("Opening your phone's dialer with 911.");
    expect(world.callEmergency).toHaveBeenCalledTimes(1);
  });

  it('says how to dial by hand when the dialer does not open', async () => {
    const world = createWorld();
    world.breakDialer();
    await world.send('Call an ambulance');
    const reply = await world.send({ kind: 'confirm', yes: true });
    expect(world.callEmergency).toHaveBeenCalledTimes(1);
    expect(reply.text).toBe("I couldn't open the dialer. Dial 911 from your phone app.");
    expect(reply.speech).toBe("I couldn't open the dialer. Dial 9 1 1 from your phone app.");
    expect(reply.isError).toBe(true);
    expect(world.state.pending).toBeNull();
  });

  it('asks right away even while another question is waiting', async () => {
    const world = createWorld();
    expect((await world.send('Remind me at 5')).text).toBe('What should I remind you about?');
    const reply = await world.send('call 911');
    expect(reply.text).toBe('Call emergency services (911)?');
    expect(reply.question).toMatchObject({ kind: 'confirm', yesLabel: 'Call 911' });
    expect(world.reminders).toHaveLength(0);
  });

  it('still works when saved items cannot be read', async () => {
    const world = createWorld();
    world.breakDatabase();
    expect((await world.send('Call the police')).text).toBe('Call emergency services (911)?');
    expect((await world.send('yes')).text).toBe("Opening your phone's dialer with 911.");
  });

  it('never asks the model about a call for help', async () => {
    const model = jest.fn(async (): Promise<Command[]> => []);
    const world = createWorld({ model });
    await world.send('Call an ambulance');
    expect(model).not.toHaveBeenCalled();
  });

  it('leaves to-dos that mention emergencies on their usual paths', async () => {
    const world = createWorld();
    expect((await world.send('Create a task to buy an emergency kit')).text).toBe(
      'Added the task "Buy an emergency kit".',
    );
    expect((await world.send('Remind me to update my emergency contacts')).text).toBe(
      'When should I remind you?',
    );
    expect(world.callEmergency).not.toHaveBeenCalled();
  });
});

describe('runTurn: journal', () => {
  it('shows the entry back, then saves it to the journal on Save', async () => {
    const world = createWorld();
    const entry = 'Today I finished the slides and felt proud.';

    const question = await world.send(
      'Write in my journal: today I finished the slides and felt proud.',
    );
    expect(question.text).toBe(`Save this to today's journal?\n"${entry}"`);
    expect(question.question).toMatchObject({
      kind: 'confirm',
      action: { kind: 'create-note', note: { title: '', body: entry } },
      yesLabel: 'Save',
      noLabel: 'Cancel',
    });
    expect(world.notes).toHaveLength(0);

    const reply = await world.send({ kind: 'confirm', yes: true });
    expect(reply.text).toBe('Saved to your journal.');
    expect(reply.isError).toBe(false);
    expect(world.notes).toEqual([
      expect.objectContaining({ title: '', body: entry, createdAt: NOW }),
    ]);
    expect(world.state.pending).toBeNull();
  });

  it.each([
    ['Journal: had lunch with Ana', 'Had lunch with Ana'],
    ['Dear journal, the rain finally stopped.', 'The rain finally stopped.'],
    ['Note: the gate code is 4321', 'The gate code is 4321'],
    ['Take a note: I parked on level 3', 'I parked on level 3'],
    ['Make a note that the plumber comes back next week', 'The plumber comes back next week'],
    ['Note: call 911 if the alarm goes off', 'Call 911 if the alarm goes off'],
  ])('saves %p as %p', async (text, body) => {
    const world = createWorld();
    await world.send(text);
    await world.send('Save');
    expect(world.notes.map((note) => note.body)).toEqual([body]);
    expect(world.callEmergency).not.toHaveBeenCalled();
  });

  it('keeps every word, even ones that sound like requests', async () => {
    const world = createWorld();
    const question = await world.send(
      'Dear journal, I want to run every day, and tomorrow I will remind myself to stretch',
    );
    // Not refused as a repeating reminder: the whole entry is shown back.
    expect(question.question?.kind).toBe('confirm');
    await world.send('yes');
    expect(world.notes[0].body).toBe(
      'I want to run every day, and tomorrow I will remind myself to stretch',
    );
    expect(world.tasks).toHaveLength(0);
    expect(world.reminders).toHaveLength(0);
  });

  it('asks what to write when the entry is empty', async () => {
    const world = createWorld();
    const question = await world.send('Take a note');
    expect(question.text).toBe('What should I write in your journal?');
    expect(question.question).toMatchObject({ kind: 'fill', field: 'text', suggestions: [] });

    const confirm = await world.send('buy groceries after work');
    expect(confirm.text).toBe(`Save this to today's journal?\n"Buy groceries after work"`);
    expect(world.tasks).toHaveLength(0);
    await world.send('Save');
    expect(world.notes.map((note) => note.body)).toEqual(['Buy groceries after work']);
  });

  it('saves nothing when the user cancels', async () => {
    const world = createWorld();
    await world.send('Journal: a quiet day');
    const reply = await world.send({ kind: 'confirm', yes: false });
    expect(reply.text).toBe("Okay, I didn't save it to your journal.");
    expect(world.notes).toHaveLength(0);
  });

  it('says so when the entry cannot be saved', async () => {
    const world = createWorld();
    await world.send('Journal: a quiet day');
    world.failNextAction('create-note');
    const reply = await world.send('yes');
    expect(reply.text).toBe("Something went wrong, so I couldn't save that to your journal.");
    expect(reply.isError).toBe(true);
    expect(world.notes).toHaveLength(0);
  });

  it('never asks the model about a journal entry', async () => {
    const model = jest.fn(async (): Promise<Command[]> => []);
    const world = createWorld({ model });
    await world.send('Note to self: call the bank about the card');
    expect(model).not.toHaveBeenCalled();
    expect(world.state.pending?.question.kind).toBe('confirm');
  });

  it('still adds notes to tasks', async () => {
    const world = createWorld();
    await world.send('Create a task to finish the project report');
    expect((await world.send('Add a note to my project task: bring the slides')).text).toBe(
      'Updated the notes on "Finish the project report".',
    );
    expect(world.notes).toHaveLength(0);
  });
});

describe('runTurn: every-day reminders', () => {
  it('shows the daily reminder back, then saves it on Save', async () => {
    const world = createWorld();

    const proposal = await world.send('Remind me to take my medicine every day at 8 AM');
    expect(proposal.text).toBe(
      'Remind you every day at 8:00 AM: "Take my medicine"? The first one is tomorrow.',
    );
    expect(proposal.question).toMatchObject({
      kind: 'confirm',
      action: {
        kind: 'create-reminder',
        reminder: {
          title: 'Take my medicine',
          scheduledAt: at(2026, 10, 6, 8),
          taskId: null,
          repeat: 'daily',
        },
      },
      yesLabel: 'Save',
      noLabel: 'Cancel',
    });
    expect(world.reminders).toHaveLength(0);

    const reply = await world.send({ kind: 'confirm', yes: true });
    expect(reply.text).toBe(
      'Reminder set for every day at 8:00 AM, starting tomorrow: Take my medicine.',
    );
    expect(world.reminders).toEqual([
      expect.objectContaining({
        title: 'Take my medicine',
        scheduledAt: at(2026, 10, 6, 8),
        repeat: 'daily',
      }),
    ]);
    expect(reply.items).toEqual([expect.objectContaining({ detail: 'Every day at 8:00 AM' })]);
    expect(world.state.pending).toBeNull();
  });

  it.each([
    ['Remind me every morning at 8 to take my vitamins', 'Take my vitamins', 8, 0, 'tomorrow'],
    ['Remind me daily at 9pm to stretch', 'Stretch', 21, 0, 'today'],
    ['Remind me every night to take my meds', 'Take my meds', 20, 0, 'today'],
    ['Remind me to stretch every day at 5', 'Stretch', 17, 0, 'today'],
    ['Set a daily reminder at 7:30 to walk the dog', 'Walk the dog', 7, 30, 'tomorrow'],
    ['Take my medicine every day at 8 AM', 'Take my medicine', 8, 0, 'tomorrow'],
    ['Water the plants every evening', 'Water the plants', 18, 0, 'today'],
  ])('reads %p as %p every day at %p:%p', async (text, title, hour, minute, first) => {
    const world = createWorld();
    const scheduledAt = at(2026, 10, first === 'today' ? 5 : 6, hour, minute);
    const time = `${hour % 12 || 12}:${String(minute).padStart(2, '0')} ${hour < 12 ? 'AM' : 'PM'}`;

    const proposal = await world.send(text);
    expect(proposal.text).toBe(
      `Remind you every day at ${time}: "${title}"? The first one is ${first}.`,
    );
    await world.send('Save');
    expect(world.reminders).toEqual([
      expect.objectContaining({ title, scheduledAt, repeat: 'daily' }),
    ]);
    expect(world.tasks).toHaveLength(0);
  });

  it('asks what time when none is given', async () => {
    const world = createWorld();
    const question = await world.send('Remind me to drink water every day');
    expect(question.text).toBe('What time every day?');
    expect(question.question).toMatchObject({
      kind: 'fill',
      field: 'when',
      suggestions: ['At 8 AM', 'At 12 PM', 'At 6 PM', 'At 9 PM'],
    });

    expect((await world.send('At 6 PM')).text).toBe(
      'Remind you every day at 6:00 PM: "Drink water"? The first one is today.',
    );
    await world.send('yes');
    expect(world.reminders).toEqual([
      expect.objectContaining({ scheduledAt: at(2026, 10, 5, 18), repeat: 'daily' }),
    ]);
  });

  it('asks what about, then what time, keeping it daily', async () => {
    const world = createWorld();
    expect((await world.send('Remind me every day')).text).toBe('What should I remind you about?');
    expect((await world.send('take my pills')).text).toBe('What time every day?');
    expect((await world.send('8')).text).toBe(
      'Remind you every day at 8:00 AM: "Take my pills"? The first one is tomorrow.',
    );
  });

  it('saves nothing when the user cancels', async () => {
    const world = createWorld();
    await world.send('Remind me to take my medicine every day at 8 AM');
    expect((await world.send({ kind: 'confirm', yes: false })).text).toBe(
      'Okay, I didn\'t add "Take my medicine".',
    );
    expect(world.reminders).toHaveLength(0);
  });

  it('is honest when notifications are off', async () => {
    const world = createWorld();
    world.setAlert('no-permission');
    await world.send('Remind me to take my medicine every day at 8 AM');
    const reply = await world.send('Save');
    expect(reply.text).toBe(
      'I saved the reminder "Take my medicine" for every day at 8:00 AM, but notifications are off, so it can\'t alert you.',
    );
    expect(reply.buttons).toEqual(['open-settings']);
  });

  it('lists a daily reminder by its time of day', async () => {
    const world = createWorld();
    await world.send('Remind me to take my medicine every day at 8 AM');
    await world.send('Save');
    const list = await world.send('What reminders do I have?');
    expect(list.items).toEqual([
      expect.objectContaining({ title: 'Take my medicine', detail: 'Every day at 8:00 AM' }),
    ]);
  });

  it.each([
    ['Mark my stretch reminder as done', 'Done for today: "Stretch".'],
    ['Dismiss my stretch reminder', 'Skipped for today: "Stretch".'],
  ])('takes %p as for today only', async (text, skipped) => {
    const world = createWorld();
    await world.send('Remind me daily at 9pm to stretch');
    await world.send('Save');
    expect(world.reminders[0].scheduledAt).toBe(at(2026, 10, 5, 21));

    const reply = await world.send(text);
    expect(reply.text).toBe(`${skipped} I'll remind you again tomorrow at 9:00 PM.`);
    expect(reply.items).toEqual([expect.objectContaining({ detail: 'Every day at 9:00 PM' })]);
    expect(world.reminders[0]).toMatchObject({
      status: 'scheduled',
      scheduledAt: at(2026, 10, 6, 21),
    });
  });

  it('stops a daily reminder when it is cancelled', async () => {
    const world = createWorld();
    await world.send('Remind me daily at 9pm to stretch');
    await world.send('Save');
    expect((await world.send('Cancel my stretch reminder')).text).toBe(
      'Cancelled the reminder "Stretch".',
    );
    expect(world.reminders[0].status).toBe('cancelled');
  });

  it('says a finished task keeps its daily reminder', async () => {
    const world = createWorld();
    await world.send('Create a task to take my vitamins');
    await world.send('Remind me every day at 8 AM about it');
    await world.send('Save');
    expect(world.reminders[0]).toMatchObject({ taskId: world.tasks[0].id, repeat: 'daily' });
    expect((await world.send('Mark my vitamins task as done')).text).toBe(
      'Marked "Take my vitamins" as done. Its reminder for every day at 8:00 AM is still on.',
    );
  });

  it('never asks the model about a daily reminder', async () => {
    const model = jest.fn(async (): Promise<Command[]> => []);
    const world = createWorld({ model });
    await world.send('Remind me every morning at 8 to take my vitamins');
    expect(model).not.toHaveBeenCalled();
    expect(world.state.pending?.question.kind).toBe('confirm');
  });
});
