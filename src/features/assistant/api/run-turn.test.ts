import type { AlertOutcome, Reminder } from '@/features/reminders';
import type { Task } from '@/features/tasks';

import type {
  Action,
  AssistantDeps,
  AssistantReply,
  Command,
  ConversationState,
  Outcome,
  TurnInput,
} from '../types';
import { runTurn } from './run-turn';

function at(year: number, month: number, day: number, hour = 0, minute = 0) {
  return new Date(year, month - 1, day, hour, minute).getTime();
}

// Monday, Oct 5, 2026, 10:00 AM.
const NOW = at(2026, 10, 5, 10);

/** An in-memory stand-in for the task and reminder services. */
function createWorld(options: { model?: AssistantDeps['interpretWithModel'] } = {}) {
  const tasks: Task[] = [];
  const reminders: Reminder[] = [];
  let nextId = 1;
  let alert: AlertOutcome = 'scheduled';
  let failNext = false;

  const execute = async (action: Action): Promise<Outcome> => {
    if (failNext) {
      failNext = false;
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
        reminder.status = action.status;
        return { kind: 'reminder-closed', reminder: { ...reminder }, alertCleared: true };
      }
      case 'delete-reminder':
        reminders.splice(
          reminders.findIndex(({ id }) => id === action.reminder.id),
          1,
        );
        return { kind: 'reminder-deleted', alertCleared: true };
    }
  };

  const deps: AssistantDeps = {
    interpretWithModel: options.model ?? null,
    canSetUpModel: true,
    loadSnapshot: async () => ({
      tasks: tasks.map((task) => ({ ...task })),
      reminders: reminders.map((reminder) => ({ ...reminder })),
    }),
    execute,
    now: () => NOW,
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
    send,
    get state() {
      return state;
    },
    setAlert(outcome: AlertOutcome) {
      alert = outcome;
    },
    failNextAction() {
      failNext = true;
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
  it('refuses repeating reminders out loud', async () => {
    const world = createWorld();
    const reply = await world.send('Remind me every day at 8 to take my pills');
    expect(reply.text).toContain("Repeating reminders aren't supported yet.");
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
