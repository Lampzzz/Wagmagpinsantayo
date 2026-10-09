import type { Reminder } from '@/features/reminders';
import { isRecurring, parseWhen } from '@/utils/parse-when';

import type {
  Action,
  AssistantDeps,
  AssistantReply,
  Command,
  ConversationState,
  Focus,
  Listing,
  Outcome,
  Pending,
  PickOption,
  Question,
  Snapshot,
  Step,
  TurnInput,
} from '../types';
import {
  composeMessage,
  composeNotUnderstood,
  composeRecurring,
  composeReply,
} from './compose-reply';
import { matchTitle } from './match-title';
import { parseCommandRules } from './parse-command-rules';
import { resolveCommand, type ResolveContext } from './resolve-command';

export type TurnResult = { reply: AssistantReply; state: ConversationState };

type Work =
  | { kind: 'command'; command: Command; context?: Pick<ResolveContext, 'targetId' | 'confirmed'> }
  | { kind: 'execute'; action: Action };

type Answer =
  | { kind: 'cancel' }
  | { kind: 'pick'; option: PickOption }
  | { kind: 'confirm'; yes: boolean }
  | { kind: 'fill'; text: string }
  | { kind: 'new-request' };

const CANCEL_WORDS = /^(?:never ?mind|cancel|stop|forget it|forget about it)$/;
const YES_WORDS =
  /^(?:yes|yeah|yep|yup|sure|ok|okay|do it|go ahead|confirm|correct|right|yes please|please do|that's right|delete it)$/;
const NO_WORDS = /^(?:no|nope|nah|no thanks|don't|do not|keep it|leave it)$/;
const NO_DATE_WORDS = /^(?:no date|no due date|no deadline|none|skip|without a date)$/;
const ORDINALS = new Map([
  ['1', 0],
  ['first', 0],
  ['one', 0],
  ['2', 1],
  ['second', 1],
  ['two', 1],
  ['3', 2],
  ['third', 2],
  ['three', 2],
  ['4', 3],
  ['fourth', 3],
  ['four', 3],
]);

/**
 * Handles one message, typed or spoken, or one tap on a reply's buttons. Text and
 * voice take exactly this path. Returns the reply and the conversation state to keep.
 */
export async function runTurn(
  input: TurnInput,
  state: ConversationState,
  deps: AssistantDeps,
): Promise<TurnResult> {
  const now = deps.now();
  const { pending } = state;

  if (pending) {
    const answer = readAnswer(input, pending.question);
    switch (answer.kind) {
      case 'cancel':
        return {
          reply: composeMessage('Okay, never mind.'),
          state: { pending: null, focus: state.focus },
        };
      case 'new-request':
        if (input.kind !== 'text') break;
        return startRequest(input.text, ageFocus(state.focus), deps, now, [
          'I dropped the earlier question.',
        ]);
      default:
        return runWork(workForAnswer(answer, pending), state.focus, deps, now);
    }
  }

  if (input.kind !== 'text') {
    // A tap on a question that has since been dropped.
    return {
      reply: composeMessage('That question has expired. What would you like to do?'),
      state: { pending: null, focus: state.focus },
    };
  }
  return startRequest(input.text, ageFocus(state.focus), deps, now, []);
}

async function startRequest(
  text: string,
  focus: Focus | null,
  deps: AssistantDeps,
  now: number,
  preface: string[],
): Promise<TurnResult> {
  const nothingPending = (reply: AssistantReply): TurnResult => ({
    reply,
    state: { pending: null, focus },
  });
  if (isRecurring(text)) return nothingPending(composeRecurring(preface));

  let commands = parseCommandRules(text);
  let modelFailed = false;
  if (!commands && deps.interpretWithModel) {
    try {
      commands = await deps.interpretWithModel(text);
    } catch {
      modelFailed = true;
    }
  }
  if (!commands || commands.length === 0) {
    return nothingPending(
      composeNotUnderstood({
        preface,
        modelFailed,
        suggestSetup: !deps.interpretWithModel && Boolean(deps.canSetUpModel),
      }),
    );
  }
  const work = commands.map((command): Work => ({ kind: 'command', command }));
  return runWork({ work, skipped: [] }, focus, deps, now, preface);
}

async function runWork(
  { work, skipped }: { work: Work[]; skipped: Step[] },
  startFocus: Focus | null,
  deps: AssistantDeps,
  now: number,
  preface: string[] = [],
): Promise<TurnResult> {
  const steps: Step[] = [...skipped];
  let focus = startFocus;
  let pending: Pending | null = null;

  for (let index = 0; index < work.length; index++) {
    const item = work[index];
    // Fresh each time, so a command sees what the ones before it changed.
    const snapshot = await deps.loadSnapshot();
    let action: Action;
    if (item.kind === 'execute') {
      action = item.action;
    } else {
      const resolution = resolveCommand(item.command, snapshot, { now, focus, ...item.context });
      if (resolution.kind === 'ask') {
        pending = { question: resolution.question, rest: commandsIn(work.slice(index + 1)) };
        break;
      }
      if (resolution.kind === 'problem') {
        steps.push({ kind: 'problem', problem: resolution.problem });
        focus = null;
        continue;
      }
      if (resolution.kind === 'listed') {
        steps.push({ kind: 'listed', listing: resolution.listing });
        focus = focusOnListing(resolution.listing) ?? focus;
        continue;
      }
      action = resolution.action;
    }

    try {
      const outcome = await deps.execute(action);
      steps.push({
        kind: 'ran',
        action,
        outcome,
        remindersStillOn: remindersStillOn(action, snapshot, now),
      });
      focus = focusAfter(outcome, focus);
    } catch {
      // Stop: later commands may depend on this one. Say what didn't happen.
      steps.push({ kind: 'failed', action });
      for (const later of commandsIn(work.slice(index + 1))) {
        steps.push({ kind: 'not-attempted', command: later });
      }
      focus = null;
      pending = null;
      break;
    }
  }

  return {
    reply: composeReply({ steps, question: pending?.question ?? null, preface, now }),
    state: { pending, focus },
  };
}

function readAnswer(input: TurnInput, question: Question): Answer {
  if (input.kind === 'pick') {
    const option =
      question.kind === 'pick'
        ? question.options.find(
            ({ id, entity }) => id === input.option.id && entity === input.option.entity,
          )
        : undefined;
    return option ? { kind: 'pick', option } : { kind: 'new-request' };
  }
  if (input.kind === 'confirm') {
    return question.kind === 'confirm'
      ? { kind: 'confirm', yes: input.yes }
      : { kind: 'new-request' };
  }

  const text = input.text.trim();
  const words = text
    .toLowerCase()
    .replace(/[.!?,]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/^(?:the|number)\s+/, '')
    .replace(/\s+one$/, '');
  if (CANCEL_WORDS.test(words)) return { kind: 'cancel' };

  // Answers that can't be mistaken for a new request.
  switch (question.kind) {
    case 'confirm':
      if (YES_WORDS.test(words)) return { kind: 'confirm', yes: true };
      if (NO_WORDS.test(words)) return { kind: 'confirm', yes: false };
      break;
    case 'pick': {
      const index = ORDINALS.get(words) ?? (words === 'last' ? question.options.length - 1 : -1);
      if (index >= 0 && index < question.options.length) {
        return { kind: 'pick', option: question.options[index] };
      }
      if (question.options.length === 1 && YES_WORDS.test(words)) {
        return { kind: 'pick', option: question.options[0] };
      }
      break;
    }
    case 'fill':
      if (question.field === 'when' && parseWhen(text, { loose: true })) {
        return { kind: 'fill', text };
      }
      if (
        question.field === 'when' &&
        question.command.kind === 'add-task' &&
        (NO_WORDS.test(words) || NO_DATE_WORDS.test(words))
      ) {
        return { kind: 'fill', text: 'no date' };
      }
      break;
  }

  if (parseCommandRules(text)) return { kind: 'new-request' };

  // Looser answers, tried only once the text isn't a request of its own.
  if (question.kind === 'pick') {
    const labelled = question.options.map((option) => ({ title: option.label, option }));
    const { exact, strong } = matchTitle(text, labelled);
    const match = exact.length === 1 ? exact[0] : strong.length === 1 ? strong[0] : null;
    if (match) return { kind: 'pick', option: match.option };
  }
  if (question.kind === 'fill' && question.field === 'title' && text) {
    return { kind: 'fill', text };
  }
  return { kind: 'new-request' };
}

function workForAnswer(
  answer: Exclude<Answer, { kind: 'cancel' } | { kind: 'new-request' }>,
  { question, rest }: Pending,
): { work: Work[]; skipped: Step[] } {
  const later = rest.map((command): Work => ({ kind: 'command', command }));
  switch (answer.kind) {
    case 'pick': {
      if (question.kind !== 'pick') return { work: later, skipped: [] };
      // Choosing the item to delete counts as the confirmation.
      const context = { targetId: answer.option.id, confirmed: question.deleting };
      return {
        work: [{ kind: 'command', command: question.command, context }, ...later],
        skipped: [],
      };
    }
    case 'confirm':
      if (question.kind !== 'confirm') return { work: later, skipped: [] };
      return answer.yes
        ? { work: [{ kind: 'execute', action: question.action }, ...later], skipped: [] }
        : { work: later, skipped: [{ kind: 'skipped', action: question.action }] };
    case 'fill': {
      if (question.kind !== 'fill') return { work: later, skipped: [] };
      const command = { ...question.command, [question.field]: answer.text } as Command;
      return { work: [{ kind: 'command', command }, ...later], skipped: [] };
    }
  }
}

function commandsIn(work: readonly Work[]): Command[] {
  return work.flatMap((item) => (item.kind === 'command' ? [item.command] : []));
}

// Focus lasts for the next turn, then lapses, so "it" never reaches back too far.
function ageFocus(focus: Focus | null): Focus | null {
  return focus && focus.turnsLeft > 0 ? { ...focus, turnsLeft: focus.turnsLeft - 1 } : null;
}

function focusAfter(outcome: Outcome, previous: Focus | null): Focus | null {
  switch (outcome.kind) {
    case 'task-saved':
      return { entity: 'task', id: outcome.task.id, title: outcome.task.title, turnsLeft: 1 };
    case 'reminder-saved':
    case 'reminder-closed':
      return {
        entity: 'reminder',
        id: outcome.reminder.id,
        title: outcome.reminder.title,
        turnsLeft: 1,
      };
    case 'task-deleted':
    case 'reminder-deleted':
      return null;
    default:
      return previous;
  }
}

function focusOnListing(listing: Listing): Focus | null {
  const records = listing.entity === 'task' ? listing.tasks : listing.reminders;
  if (records.length !== 1) return null;
  const [record] = records;
  return { entity: listing.entity, id: record.id, title: record.title, turnsLeft: 1 };
}

// Reminders set for a task stay on when it's done or deleted. The reply says so.
function remindersStillOn(action: Action, snapshot: Snapshot, now: number): Reminder[] {
  const taskId =
    (action.kind === 'set-task-done' && action.done) || action.kind === 'delete-task'
      ? action.task.id
      : null;
  if (taskId === null) return [];
  return snapshot.reminders.filter(
    (reminder) =>
      reminder.taskId === taskId && reminder.status === 'scheduled' && reminder.scheduledAt > now,
  );
}
