import type { Note, NoteContent } from '@/features/notes';
import type {
  AlertOutcome,
  NewReminder,
  Reminder,
  ReminderChanges,
  ReminderRepeat,
} from '@/features/reminders';
import type { NewTask, Task, TaskChanges, TaskPriority } from '@/features/tasks';

export type Entity = 'task' | 'reminder';

export type TaskListStatus = 'pending' | 'overdue' | 'done' | 'all';
export type ReminderListStatus = 'upcoming' | 'past-due' | 'all';

type Target = {
  /** The user's words for an existing item. "it" means the item just touched; "" means the only one. */
  target: string;
  /** True when the user didn't say "task" or "reminder", so the other kind may be meant. */
  impliedEntity?: boolean;
};

/** What the user asked for, in their words. Dates and items are looked up later. */
export type Command =
  | {
      kind: 'add-task';
      title: string;
      when?: string;
      priority?: TaskPriority;
      notes?: string;
      /**
       * Quick Add: a bare sentence such as "Pay the bill tomorrow 5pm". The task is
       * shown back for a yes before it's saved, with a reminder at its due time.
       */
      quickAdd?: boolean;
    }
  /**
   * An empty title, or one with "it", links the reminder to the task just touched.
   * `repeat: 'daily'` rings every day at the time of day in `when`, and is shown back
   * for a yes before it's saved. `alarm` rings it like an alarm.
   */
  | {
      kind: 'add-reminder';
      title: string;
      when?: string;
      repeat?: ReminderRepeat;
      alarm?: boolean;
    }
  | {
      kind: 'list-tasks';
      status?: TaskListStatus;
      when?: string;
      search?: string;
      summary?: boolean;
    }
  | { kind: 'list-reminders'; status?: ReminderListStatus; when?: string; search?: string }
  | ({ kind: 'complete-task' | 'reopen-task' | 'delete-task' } & Target)
  | ({
      kind: 'complete-reminder' | 'dismiss-reminder' | 'cancel-reminder' | 'delete-reminder';
    } & Target)
  | ({
      kind: 'edit-task';
      title?: string;
      when?: string;
      priority?: TaskPriority;
      notes?: string;
    } & Target)
  | ({ kind: 'edit-reminder'; title?: string; when?: string } & Target)
  /** "Call 911", "I need help". Only code reads these phrases, never the model. */
  | { kind: 'call-emergency' }
  /** A journal entry in the user's own words: "Dear journal, …". Empty asks what to write. */
  | { kind: 'add-note'; text: string };

export type ClosedReminderStatus = 'completed' | 'dismissed' | 'cancelled';

/** A checked request, ready to run. */
export type Action =
  /** `remindAt` also sets a reminder for the new task at that time (Quick Add). */
  | { kind: 'create-task'; task: NewTask; remindAt?: number }
  | { kind: 'update-task'; task: Task; changes: TaskChanges }
  | { kind: 'set-task-done'; task: Task; done: boolean }
  | { kind: 'delete-task'; task: Task }
  | { kind: 'create-reminder'; reminder: NewReminder }
  | { kind: 'update-reminder'; reminder: Reminder; changes: ReminderChanges }
  | { kind: 'close-reminder'; reminder: Reminder; status: ClosedReminderStatus }
  | { kind: 'delete-reminder'; reminder: Reminder }
  /**
   * Opens the phone's dialer with `number` filled in; the user still taps Call. It runs
   * only after the user says yes, through `AssistantDeps.callEmergency`.
   */
  | { kind: 'call-emergency'; number: string }
  /** A journal entry: a note dated today, with the user's words as its body. */
  | { kind: 'create-note'; note: NoteContent };

/** The actions `AssistantDeps.execute` runs: everything but the emergency call. */
export type DataAction = Exclude<Action, { kind: 'call-emergency' }>;

/** What running an action did. */
export type Outcome =
  | { kind: 'task-saved'; task: Task }
  | { kind: 'task-deleted' }
  | { kind: 'reminder-saved'; reminder: Reminder; alert: AlertOutcome }
  /** `alertCleared` is false when the pending alert couldn't be cancelled. */
  | { kind: 'reminder-closed'; reminder: Reminder; alertCleared: boolean }
  | { kind: 'reminder-deleted'; alertCleared: boolean }
  | { kind: 'dialer-opened'; number: string }
  | { kind: 'note-saved'; note: Note };

/** Everything the assistant matches against, loaded fresh for each request. */
export type Snapshot = { tasks: Task[]; reminders: Reminder[] };

/** The record the user is talking about, so "it" and "that" make sense. */
export type Focus = { entity: Entity; id: number; title: string; turnsLeft: number };

export type PickOption = { entity: Entity; id: number; label: string; detail: string };

/** A question the assistant asks before it can go on. */
export type Question =
  | { kind: 'pick'; prompt: string; command: Command; options: PickOption[]; deleting: boolean }
  | { kind: 'confirm'; prompt: string; action: Action; yesLabel: string; noLabel: string }
  | {
      kind: 'fill';
      prompt: string;
      command: Command;
      /** `text` is a journal entry's words. */
      field: 'title' | 'when' | 'text';
      /** Ready-made answers, such as "In 10 minutes". */
      suggestions: string[];
    };

export type Pending = { question: Question; rest: Command[] };

export type ConversationState = { pending: Pending | null; focus: Focus | null };

/** What the user sent: typed or spoken text, or a tap on one of the reply's buttons. */
export type TurnInput =
  | { kind: 'text'; text: string }
  | { kind: 'pick'; option: PickOption }
  | { kind: 'confirm'; yes: boolean };

/**
 * Items to show for a list request. `adjective` and `qualifier` describe them
 * around the noun: "3 [pending] tasks [due today]".
 */
export type Listing =
  | { entity: 'task'; tasks: Task[]; adjective: string; qualifier: string; summary: boolean }
  | { entity: 'reminder'; reminders: Reminder[]; adjective: string; qualifier: string };

/** Why a command couldn't run. */
export type Problem =
  | { kind: 'not-found'; entity: Entity; target: string }
  | { kind: 'none'; entity: Entity; which: string }
  | { kind: 'already'; entity: Entity; title: string; state: string }
  | { kind: 'time-passed'; when: string }
  | { kind: 'bad-time'; when: string }
  | { kind: 'nothing-to-change'; title: string };

/** One line of a reply. */
export type Step =
  | { kind: 'ran'; action: Action; outcome: Outcome; remindersStillOn: Reminder[] }
  | { kind: 'listed'; listing: Listing }
  | { kind: 'problem'; problem: Problem }
  | { kind: 'skipped'; action: Action }
  | { kind: 'failed'; action: Action }
  | { kind: 'not-attempted'; command: Command };

export type ReplyItem = { entity: Entity; id: number; title: string; detail: string };

export type ReplyButton = 'open-settings' | 'set-up-ai';

export type AssistantReply = {
  text: string;
  /** A shorter version for reading aloud. */
  speech: string;
  items: ReplyItem[];
  question: Question | null;
  buttons: ReplyButton[];
  isError: boolean;
};

/** The outside world the assistant works through. Tests pass in fakes. */
export type AssistantDeps = {
  /** The on-device model, or null when it isn't set up or can't run on this phone. */
  interpretWithModel: ((text: string) => Promise<Command[]>) | null;
  /** True when the model isn't downloaded yet but this phone could run it. */
  canSetUpModel?: boolean;
  loadSnapshot: () => Promise<Snapshot>;
  execute: (action: DataAction) => Promise<Outcome>;
  /**
   * Opens the phone's dialer with the emergency number filled in, and says whether it
   * opened. It never dials by itself.
   */
  callEmergency: () => Promise<boolean>;
  now: () => number;
};
