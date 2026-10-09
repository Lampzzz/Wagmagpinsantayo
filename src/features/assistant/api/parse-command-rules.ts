import type { TaskPriority } from '@/features/tasks';
import { parseWhen, splitLeadingWhen, splitTrailingWhen } from '@/utils/parse-when';

import type { Command, Entity, ReminderListStatus, TaskListStatus } from '../types';

type TargetKind = Extract<Command, { target: string }>['kind'];
type SimpleTargetKind = Exclude<TargetKind, 'edit-task' | 'edit-reminder'>;

const POLITE_START =
  /^(?:(?:hey|hi|hello|yo|ok|okay|alright|so|also|actually|just|please|pls|can you|could you|would you|will you|can we|could we|let'?s|would you mind|do me a favou?r and|i want you to|i need you to|i'd like you to|i would like you to)\b[\s,]*)+/i;
const POLITE_END =
  /(?:[\s,]+(?:please|thanks|thank you|for me|instead|real quick|if you can|if you could|okay|ok))+$/i;

// Words that start a new request in a sentence like "…, then remind me to …".
const ANY_OPENER =
  '(?:remind me|set (?:me )?(?:a |an )?reminder|(?:add|create|make) (?:a |an |another )?(?:new )?(?:reminder|task|to-?do)|(?:set|start) (?:an?|my|the) (?:alarm|timer)|wake me|mark|check off|tick off|delete|remove|cancel|stop reminding|dismiss|reopen|move|reschedule|push|postpone|change|rename|show|list|what|which|find)';
// After a bare "and", only a new task, reminder or alarm starts a new request, so
// "remind me to email Bob and delete the draft" stays one reminder.
const CREATE_OPENER =
  '(?:remind me|set (?:me )?(?:a |an )?reminder|(?:add|create|make) (?:a |an |another )?(?:new )?(?:reminder|task|to-?do)|(?:set|start) (?:an?|my|the) (?:alarm|timer)|wake me)';
const CLAUSE_BREAK = new RegExp(
  `\\s*[,;.]\\s*(?:and then |then |and also |also |and )?(?=${ANY_OPENER}\\b)|\\s+(?:and then|then)\\s+(?=${ANY_OPENER}\\b)|\\s+(?:and also|also|and)\\s+(?=${CREATE_OPENER}\\b)`,
  'i',
);

const REMINDER_OPENER =
  /^(?:remind me|set (?:me )?(?:a |an )?reminder|(?:add|create|make) (?:a |an )?(?:new )?reminder|alert me|notify me|ping me|nudge me|tell me(?= to\b))(?:[\s,:]+(.*))?$/i;
const SUBJECT = /^(?:to|that|about|of)\s+(.+)$/i;
// Other ways to ask for a reminder, read as "remind me": "Don't let me forget my ID".
// Group 1 is set when "make sure I" already says "remember" or "don't forget".
const REMIND_ME_WAYS =
  /^(?:(?:don'?t|do not) let me forget|help me (?:to )?remember|make sure (?:that )?i(?!')(?: (remember|don'?t forget))?)\b[\s,]*(.*)$/i;
const MAKE_SURE = /^make sure/i;
// "Wake me up at 6", "Set an alarm for 5:30 tomorrow", "Set a timer for 10 minutes".
// They ring like an alarm.
const WAKE_ME = /^wake me(?: up)?\b[\s,]*(.*)$/i;
const ALARM = /^(?:set|start) (?:an?|my|the) (alarm|timer)(?: clock)?\b[\s,]*(.*)$/i;
// "Remind me to call Mom at 5 with an alarm" rings like an alarm too.
const WITH_ALARM = /[\s,]+(?:with|as)\s+(?:an?\s+)?alarm$/i;

const TASK_OPENER =
  /^(?:create|add|make|new|set up|put|start)\s+(?:(?:a|an|another)\s+)?(?:new\s+)?(?:(high|low|urgent|important)[\s-]priority\s+)?(?:task|to-?do)\b[\s,:-]*(?:(?:to|for|called|named|titled|saying)\b[\s:]*)?(.*)$/i;
const ADD_TO_LIST =
  /^(?:add|put)\s+(.+?)\s+(?:to|on)\s+(?:my\s+|the\s+)?(?:tasks|task list|to-?do list|to-?dos|(shopping|grocery|groceries) list|list)$/i;
const BUYING = /^(?:buy|get|pick up|grab|order)\b/i;
const TRAILING_PRIORITY =
  /[\s,]+(?:with\s+|as\s+)?(?:a\s+)?(high|low|normal|medium|top|urgent)\s+priority$|[\s,]+(?:it's\s+|it is\s+)?(urgent|important)$/i;

const SUMMARY =
  /^(?:summari[sz]e|sum up|give me (?:a )?(?:summary|rundown|overview) of|overview of)\s+(?:all\s+)?(?:of\s+)?(?:my\s+)?(?:tasks|to-?dos)$/i;
const SEARCH_ABOUT =
  /^(?:find|search(?: for)?|look for|look up|show me)\s+(?:my\s+|the\s+|any\s+)?(tasks?|reminders?|to-?dos?)\s+(?:about|for|with|called|named|mentioning|containing|matching)\s+(.+)$/i;
const SEARCH_NAMED =
  /^(?:find|search(?: for)?|look for|look up)\s+(?:my\s+|the\s+)?(.+?)\s+(tasks?|reminders?|to-?dos?)$/i;
const DETAILS =
  /^(?:show|open|view|see|get)\s+(?:me\s+)?(?:the\s+)?(?:details|info|information)\s+(?:of|for|about|on)\s+(.+)$/i;

const TASK_NOUNS = new Set(['task', 'tasks', 'todo', 'todos', 'to-do', 'to-dos']);
const REMINDER_NOUNS = new Set(['reminder', 'reminders']);
const TASK_STATUS = new Map<string, TaskListStatus>([
  ['pending', 'pending'],
  ['open', 'pending'],
  ['unfinished', 'pending'],
  ['incomplete', 'pending'],
  ['remaining', 'pending'],
  ['outstanding', 'pending'],
  ['active', 'pending'],
  ['done', 'done'],
  ['completed', 'done'],
  ['finished', 'done'],
  ['overdue', 'overdue'],
  ['late', 'overdue'],
]);
const REMINDER_STATUS = new Map<string, ReminderListStatus>([
  ['upcoming', 'upcoming'],
  ['scheduled', 'upcoming'],
  ['active', 'upcoming'],
  ['pending', 'upcoming'],
  ['past-due', 'past-due'],
  ['overdue', 'past-due'],
  ['missed', 'past-due'],
]);
// The only other words a list request may contain, so anything unusual goes to the model.
const LIST_WORDS = new Set([
  'all',
  'any',
  'are',
  'complete',
  'current',
  'display',
  'do',
  'does',
  'finish',
  'for',
  'get',
  'give',
  'got',
  'have',
  'i',
  'is',
  'left',
  'list',
  'me',
  'my',
  'need',
  'now',
  'of',
  'on',
  'see',
  'show',
  'still',
  'tell',
  'the',
  'there',
  'to',
  'view',
  'what',
  'which',
]);

// "What do I have today?", "What's on my schedule tomorrow?", "Anything due this week?":
// tasks and reminders both. The rest of the sentence may only say which day.
const AGENDA =
  /^(?:what (?:do|else do) i have(?: (?:going on|planned|scheduled|coming up))?|what(?:'s| is) (?:on )?(?:my|the) (?:schedule|agenda|plate|calendar|plans?)|what(?:'s| is) (?:planned|scheduled|coming up|happening|going on|next|up next)|(?:do i have|is there|have i got) (?:anything|something)(?: (?:due|planned|scheduled|coming up|going on))?|anything (?:due|planned|scheduled|coming up|going on)|how(?:'s| is| does) my (?:day|week|schedule)(?: look(?:ing)?)?(?: like)?|what(?:'s| does) my (?:day|week|schedule) look(?:ing)? like|am i free)\b\s*(.*)$/i;
// "What do I need to do today?", "Show me what I have to do": the tasks.
const TO_DO =
  /^(?:what (?:do|else do|should) i (?:still )?(?:need|have) to do|(?:show|tell) me what i (?:still )?(?:need|have) to do|what(?:'s| is) left(?: to do)?)\b\s*(.*)$/i;
const MISSED =
  /^(?:did i (?:miss|forget)|have i (?:missed|forgotten)) (?:anything|something)$|^anything (?:i missed|overdue)$/i;
// "on my list", "in my schedule": they say nothing about which items.
const ON_MY_LIST =
  /^(?:on|in|for) (?:my|the) (?:list|to-?do list|schedule|agenda|calendar|plate)\b\s*/i;

// News that it's done: "I'm done with the laundry", "The report is done", "I finished my
// homework, check it off", "I already paid the electric bill".
const DONE_WITH =
  /^(?:(?:i'm|i am|im|we're|we are)\s+)?(?:all\s+|finally\s+)?(?:done|finished|through)\s+with\s+(.+)$/i;
const IS_DONE =
  /^(.+?)\s+(?:is|are)\s+(?:all\s+|now\s+|finally\s+)?(?:done|finished|complete|completed|taken care of)$/i;
const I_FINISHED =
  /^i(?:'ve|\s+have)?\s+(?:already\s+|just\s+|finally\s+)?(?:finished|completed)\s+(.+?)(?:[\s,]+(?:check|tick|cross|mark)\s+it\s+off)?$/i;
// Only verbs that finish a to-do: "I just made dinner" is news, not a task done.
const ALREADY_DID =
  /^i(?:'ve|\s+have)?\s+(?:already|just|finally)\s+(?:paid|called|sent|submitted|emailed|texted|booked|returned|mailed|renewed|filed|deposited|transferred|signed|ordered|bought|fixed|cleaned|washed|watered|fed|packed|picked up|dropped off)\s+(.+)$/i;
// "Never mind the dentist reminder", "I don't need the milk task anymore".
const NEVER_MIND = /^(?:never ?mind|forget about|scratch)\s+(.+)$/i;
const NOT_NEEDED = /^i\s+(?:don'?t|do not|no longer)\s+need\s+(.+?)(?:\s+any ?more)?$/i;

const MARK_NOT_DONE =
  /^(?:mark|set)\s+(.+?)\s+(?:as\s+)?(?:not\s+(?:done|finished|complete|completed)|undone|incomplete|unfinished|pending|open)$/i;
const REOPEN = /^(?:reopen|uncheck|untick)\s+(.+)$/i;
const MARK_DONE =
  /^(?:mark|set|tick|check)\s+(.+?)\s+(?:as\s+)?(?:done|complete|completed|finished)$/i;
const CHECK_OFF = /^(?:check|tick|cross)\s+off\s+(.+)$/i;
// "finish" alone starts too many task titles, so it needs the word "task" or "reminder".
const FINISH_NAMED = /^(?:complete|finish)\s+(?:the\s+|my\s+)?(task|reminder)\s+(.+)$/i;
const DELETE =
  /^(?:delete|remove|erase|trash|get rid of)\s+(.+?)(?:\s+from\s+(?:my\s+)?(?:tasks|task list|reminders|list|to-?do list))?$/i;
const STOP_REMINDING = /^(?:stop|don't|do not)\s+remind(?:ing)?\s+me\s+(?:to|about|of)\s+(.+)$/i;
const CANCEL = /^(?:cancel|turn off|disable|switch off|call off)\s+(.+)$/i;
const DISMISS = /^dismiss\s+(.+)$/i;
const RENAME = /^(?:rename|retitle)\s+(.+?)\s+(?:to|as)\s+(.+)$/i;
const CHANGE_TITLE =
  /^(?:change|update|set)\s+(?:the\s+)?(?:title|name)\s+(?:of|for|on)\s+(.+?)\s+to\s+(.+)$/i;
const ADD_NOTE =
  /^(?:add|put)\s+(?:a\s+)?(?:note|notes|description|details)\s+(?:to|on|for)\s+(.+?)\s*(?::|saying|that says)\s*(.+)$/i;
const SET_NOTE =
  /^(?:set|change|update)\s+(?:the\s+)?(?:note|notes|description)\s+(?:of|for|on)\s+(.+?)\s+to\s+(.+)$/i;
const MAKE_PRIORITY =
  /^(?:make|set|mark)\s+(.+?)\s+(?:as\s+)?(?:a\s+)?(high|low|normal|medium|top)\s+priority$/i;
const MAKE_URGENT = /^(?:make|mark)\s+(.+?)\s+(?:as\s+)?(urgent|important)$/i;
const SET_PRIORITY =
  /^(?:set|change)\s+(?:the\s+)?priority\s+(?:of|for|on)\s+(.+?)\s+to\s+(high|low|normal|medium)$/i;
const DEADLINE =
  /^(?:change|move|set|update|push|shift)\s+(?:the\s+)?(?:deadline|due date|due time|due|date|time|reminder time)\s+(?:of|for|on)\s+(.+)$/i;
const MOVE = /^(?:move|reschedule|push|postpone|shift|change|delay)\s+(.+)$/i;
const MAKE_DUE = /^(?:make|set)\s+(.+?)\s+due\s+(.+)$/i;

const ENTITY_WORD = /\b(tasks?|to-?dos?|reminders?)\b/i;
const LEADING_FILLER =
  /^(?:my|the|a|an|this|that|about|called|named|titled|to|for|of|on|with|regarding|saying)\s+/i;

/**
 * Reads common requests word for word: "Remind me in 5 minutes to drink water",
 * "Mark my React Native task as done", "What tasks do I still need to finish today?".
 * Returns null unless every part of the sentence matches, so the model handles the rest.
 */
export function parseCommandRules(text: string): Command[] | null {
  const sentence = tidySentence(text);
  if (!sentence) return null;
  const agenda = parseAgenda(sentence);
  if (agenda) return agenda;
  const timeFirst = parseTimeFirst(sentence);
  if (timeFirst) return [timeFirst];

  const commands: Command[] = [];
  for (const clause of sentence.split(CLAUSE_BREAK)) {
    const command = parseClause(clause.replace(/^[\s,;.]+|[\s,;.]+$/g, ''));
    if (!command) return null;
    commands.push(command);
  }
  return commands.length > 0 ? commands : null;
}

/** Drops end punctuation and polite words: "Hey, can you pay the bill, please?" → "pay the bill". */
export function tidySentence(text: string): string {
  return text
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/[.!?]+$/, '')
    .replace(POLITE_START, '')
    .replace(POLITE_END, '')
    .trim();
}

/** Splits a priority off the end: "call the bank, it's urgent" → "call the bank", high. */
export function splitTrailingPriority(text: string): { rest: string; priority?: TaskPriority } {
  const match = TRAILING_PRIORITY.exec(text);
  if (!match) return { rest: text };
  return { rest: text.slice(0, match.index).trim(), priority: toPriority(match[1] ?? match[2]) };
}

function parseClause(clause: string): Command | null {
  if (!clause) return null;
  return (
    parseAddReminder(clause) ??
    parseAddTask(clause) ??
    parseList(clause) ??
    parseStatusChange(clause) ??
    parseDelete(clause) ??
    parseEdit(clause) ??
    null
  );
}

// "What do I have today?" lists tasks and reminders both; "Did I miss anything?" what's late.
function parseAgenda(sentence: string): Command[] | null {
  if (MISSED.test(sentence)) {
    return [
      { kind: 'list-tasks', status: 'overdue' },
      { kind: 'list-reminders', status: 'past-due' },
    ];
  }
  const match = AGENDA.exec(sentence);
  const day = match && readDay(match[1]);
  if (!day) return null;
  return [
    { kind: 'list-tasks', status: 'pending', ...day },
    { kind: 'list-reminders', status: 'upcoming', ...day },
  ];
}

// The words after a question about the day: nothing, "today", "on my list for tomorrow".
function readDay(rest: string): { when?: string } | null {
  const words = rest.replace(ON_MY_LIST, '').trim();
  if (!words) return {};
  return parseWhen(words) ? { when: words } : null;
}

// "Tomorrow at 9, remind me to call the bank": the time comes before the request.
function parseTimeFirst(sentence: string): Command | null {
  const leading = splitLeadingWhen(sentence);
  if (!leading) return null;
  const rest = leading.rest.replace(/^[\s,;:-]+/, '');
  const command = rest ? parseClause(rest) : null;
  if (command?.kind !== 'add-reminder' && command?.kind !== 'add-task') return null;
  const first = tidyWhen(leading.when);
  const when = command.when ? `${first} ${command.when}` : first;
  return parseWhen(when) ? { ...command, when } : null;
}

function parseAddReminder(clause: string): Command | null {
  const wake = WAKE_ME.exec(clause);
  if (wake) return ringing(remindAt(wake[1], 'Wake up'));
  const alarm = ALARM.exec(clause);
  if (alarm) {
    const timer = alarm[1].toLowerCase() === 'timer';
    // A timer "for 10 minutes" goes off in 10 minutes.
    return ringing(
      remindAt(timer ? alarm[2].replace(/^for\s+/i, 'in ') : alarm[2], timer ? 'Timer' : 'Alarm'),
    );
  }
  const withAlarm = WITH_ALARM.exec(clause);
  if (withAlarm) return ringing(parseAddReminder(clause.slice(0, withAlarm.index)));

  const match = REMINDER_OPENER.exec(asRemindMe(clause));
  if (!match) return null;
  const rest = (match[1] ?? '').trim();
  if (!rest) return { kind: 'add-reminder', title: '' };

  // In "set a reminder for 30 minutes to …" the "for" belongs to the opener.
  const afterFor = /^for\s+(.+)$/i.exec(rest)?.[1];
  if (parseWhen(rest)) return { kind: 'add-reminder', title: '', when: rest };
  if (afterFor && parseWhen(afterFor, { loose: true })) {
    return { kind: 'add-reminder', title: '', when: afterFor };
  }

  const leading =
    splitLeadingWhen(rest) ?? (afterFor ? splitLeadingWhen(afterFor, { loose: true }) : null);
  if (leading) {
    const subject = SUBJECT.exec(leading.rest);
    return subject
      ? { kind: 'add-reminder', title: subject[1], when: tidyWhen(leading.when) }
      : null;
  }

  const subject = SUBJECT.exec(rest);
  if (!subject) return null;
  const trailing = splitTrailingWhen(subject[1]);
  return trailing
    ? { kind: 'add-reminder', title: trailing.rest, when: tidyWhen(trailing.when) }
    : { kind: 'add-reminder', title: subject[1] };
}

// "Don't let me forget to call Ana" → "remind me to call Ana"; "…forget my ID" →
// "remind me about my ID"; "Make sure I call Lola" → "remind me to call Lola".
function asRemindMe(clause: string): string {
  const match = REMIND_ME_WAYS.exec(clause);
  if (!match) return clause;
  const rest = match[2];
  if (!rest || SUBJECT.test(rest) || splitLeadingWhen(rest)) return `remind me ${rest}`.trim();
  const linking = MAKE_SURE.test(clause) && !match[1] ? 'to' : 'about';
  return `remind me ${linking} ${rest}`;
}

// "Wake me up at 6", "Set an alarm for 6 to take my pills": a reminder at that time,
// called `title` unless it says what it's for.
function remindAt(rest: string, title: string): Command | null {
  const command = parseAddReminder(`remind me ${rest}`.trim());
  if (command?.kind !== 'add-reminder') return null;
  return command.title ? command : { ...command, title };
}

// A reminder that rings like an alarm, with Snooze and Done.
function ringing(command: Command | null): Command | null {
  return command?.kind === 'add-reminder' ? { ...command, alarm: true } : command;
}

// Speech-to-text punctuates pauses: "in 5 minutes," → "in 5 minutes".
export function tidyWhen(when: string): string {
  return when.replace(/[,;:]+$/, '');
}

function parseAddTask(clause: string): Command | null {
  let opened: string;
  let openerPriority: string | undefined;
  const opener = TASK_OPENER.exec(clause);
  if (opener) {
    openerPriority = opener[1];
    opened = opener[2].trim();
  } else {
    const listed = ADD_TO_LIST.exec(clause);
    if (!listed) return null;
    opened = listed[1].trim();
    // On a shopping list, "milk and eggs" are things to buy.
    if (listed[2] && !BUYING.test(opened)) opened = `buy ${opened}`;
  }

  const { rest, priority } = splitTrailingPriority(opened);
  const trailing = splitTrailingWhen(rest);
  return {
    kind: 'add-task',
    title: trailing ? trailing.rest : rest,
    when: trailing ? tidyWhen(trailing.when) : undefined,
    priority: priority ?? (openerPriority ? toPriority(openerPriority) : undefined),
  };
}

function parseList(clause: string): Command | null {
  if (SUMMARY.test(clause)) return { kind: 'list-tasks', status: 'pending', summary: true };
  const toDo = TO_DO.exec(clause);
  const toDoDay = toDo && readDay(toDo[1]);
  if (toDoDay) return { kind: 'list-tasks', status: 'pending', ...toDoDay };

  const about = SEARCH_ABOUT.exec(clause);
  if (about) return search(entityFromNoun(about[1]), about[2]);
  const named = SEARCH_NAMED.exec(clause);
  if (named) return search(entityFromNoun(named[2]), named[1]);
  const details = DETAILS.exec(clause);
  if (details) {
    const { target, entity } = cleanTarget(details[1]);
    return target ? search(entity ?? 'task', target) : null;
  }

  const words = clause
    .toLowerCase()
    .replace(/\bwhat's\b/g, 'what is')
    .replace(/\bpast due\b/g, 'past-due')
    .replace(/[?!.,]/g, ' ')
    .trim()
    .split(/\s+/);

  // A day at the end: "today", "for tomorrow", "this week".
  let when: string | undefined;
  let end = words.length;
  for (let start = 1; start < words.length; start++) {
    const tail = words.slice(start).join(' ');
    const parts = parseWhen(tail);
    if (parts?.kind === 'moment' && parts.day && (!parts.time || parts.time.kind === 'part')) {
      when = tail;
      end = start;
      break;
    }
  }

  let entity: Entity | null = null;
  let statusWord: string | null = null;
  let all = false;
  for (const word of words.slice(0, end)) {
    const noun: Entity | null = TASK_NOUNS.has(word)
      ? 'task'
      : REMINDER_NOUNS.has(word)
        ? 'reminder'
        : null;
    if (noun) {
      if (entity && entity !== noun) return null;
      entity = noun;
    } else if (word === 'all') {
      all = true;
    } else if (TASK_STATUS.has(word) || REMINDER_STATUS.has(word)) {
      statusWord = word;
    } else if (!LIST_WORDS.has(word)) {
      return null;
    }
  }

  if (entity === 'task') {
    const status = statusWord ? TASK_STATUS.get(statusWord) : undefined;
    if (statusWord && !status) return null;
    return { kind: 'list-tasks', status: status ?? (all && !when ? 'all' : 'pending'), when };
  }
  if (entity === 'reminder') {
    const status = statusWord ? REMINDER_STATUS.get(statusWord) : undefined;
    if (statusWord && !status) return null;
    return { kind: 'list-reminders', status: status ?? (all ? 'all' : 'upcoming'), when };
  }
  return null;
}

function parseStatusChange(clause: string): Command | null {
  const stop = STOP_REMINDING.exec(clause);
  if (stop) return { kind: 'cancel-reminder', target: cleanTarget(stop[1]).target };

  let match = MARK_NOT_DONE.exec(clause) ?? REOPEN.exec(clause);
  if (match) return targeted(match[1], { task: 'reopen-task', reminder: null }, 'task');

  match = MARK_DONE.exec(clause) ?? CHECK_OFF.exec(clause);
  if (match) {
    return targeted(match[1], { task: 'complete-task', reminder: 'complete-reminder' }, 'task');
  }
  match = FINISH_NAMED.exec(clause);
  if (match) {
    const kinds = { task: 'complete-task', reminder: 'complete-reminder' } as const;
    return { kind: kinds[entityFromNoun(match[1])], target: cleanTarget(match[2]).target };
  }
  match =
    DONE_WITH.exec(clause) ??
    I_FINISHED.exec(clause) ??
    ALREADY_DID.exec(clause) ??
    IS_DONE.exec(clause);
  if (match) {
    return targeted(match[1], { task: 'complete-task', reminder: 'complete-reminder' }, 'task');
  }

  match = CANCEL.exec(clause);
  if (match) return targeted(match[1], { task: null, reminder: 'cancel-reminder' }, 'reminder');
  match = DISMISS.exec(clause);
  if (match) return targeted(match[1], { task: null, reminder: 'dismiss-reminder' }, 'reminder');
  return null;
}

function parseDelete(clause: string): Command | null {
  const match = DELETE.exec(clause);
  if (match) {
    return targeted(match[1], { task: 'delete-task', reminder: 'delete-reminder' }, 'task');
  }
  // A task that isn't needed is deleted, once the user says yes; a reminder is called off.
  const dropped = NEVER_MIND.exec(clause) ?? NOT_NEEDED.exec(clause);
  if (!dropped) return null;
  return targeted(dropped[1], { task: 'delete-task', reminder: 'cancel-reminder' }, 'task');
}

function parseEdit(clause: string): Command | null {
  let match = RENAME.exec(clause) ?? CHANGE_TITLE.exec(clause);
  if (match) return edit(match[1], { title: match[2] });

  match = ADD_NOTE.exec(clause) ?? SET_NOTE.exec(clause);
  if (match) {
    const { target, entity } = cleanTarget(match[1]);
    if (entity === 'reminder') return null;
    return { kind: 'edit-task', target, impliedEntity: entity === null, notes: match[2] };
  }

  match = MAKE_PRIORITY.exec(clause) ?? MAKE_URGENT.exec(clause) ?? SET_PRIORITY.exec(clause);
  if (match) {
    const { target, entity } = cleanTarget(match[1]);
    if (entity === 'reminder') return null;
    return {
      kind: 'edit-task',
      target,
      impliedEntity: entity === null,
      priority: toPriority(match[2]),
    };
  }

  const deadline = DEADLINE.exec(clause);
  if (deadline) {
    const split = splitTargetAndWhen(deadline[1], true);
    return split ? edit(split.target, { when: split.when }) : null;
  }
  const due = MAKE_DUE.exec(clause);
  if (due && parseWhen(due[2])) return edit(due[1], { when: due[2] });
  const move = MOVE.exec(clause);
  if (move) {
    const split = splitTargetAndWhen(move[1], false);
    return split ? edit(split.target, { when: split.when }) : null;
  }
  return null;
}

// "my reminder to go to the gym to 6 PM": tries the last "to" first, keeping the
// longest target whose remainder is a time.
function splitTargetAndWhen(text: string, loose: boolean): { target: string; when: string } | null {
  const joints = [...text.matchAll(/\s+(?:to|until|till|for)\s+/gi)];
  for (const joint of joints.reverse()) {
    const index = joint.index ?? 0;
    const target = text.slice(0, index).trim();
    const when = text.slice(index + joint[0].length).trim();
    if (target && parseWhen(when, { loose })) return { target, when };
  }
  return null;
}

function edit(rawTarget: string, changes: { title?: string; when?: string }): Command {
  const { target, entity } = cleanTarget(rawTarget);
  const impliedEntity = entity === null;
  return entity === 'reminder'
    ? { kind: 'edit-reminder', target, impliedEntity, ...changes }
    : { kind: 'edit-task', target, impliedEntity, ...changes };
}

function targeted(
  rawTarget: string,
  kinds: Record<Entity, SimpleTargetKind | null>,
  fallback: Entity,
): Command | null {
  const { target, entity } = cleanTarget(rawTarget);
  const kind = kinds[entity ?? fallback];
  if (!kind) return null;
  return { kind, target, impliedEntity: entity === null };
}

function search(entity: Entity, words: string): Command {
  const query = cleanTarget(words).target || words.trim();
  return entity === 'task'
    ? { kind: 'list-tasks', status: 'all', search: query }
    : { kind: 'list-reminders', status: 'all', search: query };
}

/**
 * Pulls the item's name out of how the user referred to it:
 * "the task about studying React Native" → "studying React Native" (a task).
 */
function cleanTarget(raw: string): { target: string; entity: Entity | null } {
  let text = raw.trim().replace(/^["'“]+|["'”]+$/g, '');
  const noun = ENTITY_WORD.exec(text);
  const entity = noun ? entityFromNoun(noun[1]) : null;
  text = text.replace(new RegExp(ENTITY_WORD.source, 'gi'), ' ').replace(/\s+/g, ' ').trim();
  // Checked before the fillers go, or "that one" would become "one".
  if (/^(?:my\s+)?(?:it|that|this|them|that one|this one)$/i.test(text)) {
    return { target: 'it', entity };
  }
  let previous;
  do {
    previous = text;
    text = text.replace(LEADING_FILLER, '').trim();
  } while (text !== previous);
  return { target: text, entity };
}

function entityFromNoun(noun: string): Entity {
  return /^rem/i.test(noun) ? 'reminder' : 'task';
}

function toPriority(word: string): TaskPriority {
  const lower = word.toLowerCase();
  if (lower === 'low') return 'low';
  if (lower === 'normal' || lower === 'medium') return 'normal';
  return 'high';
}
