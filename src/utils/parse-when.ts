/** A part of the day. Alone it sets a default time; with a bare hour it picks AM or PM. */
export type DayPart = 'morning' | 'afternoon' | 'evening' | 'night';

/** A day named by a phrase, before it is anchored to a date. */
export type DayRef =
  | { kind: 'in-days'; days: number } // today 0, tomorrow 1, "in 3 days" 3
  | { kind: 'weekday'; weekday: number; next: boolean } // 0 = Sunday
  | { kind: 'date'; month: number; day: number; year?: number } // month 0 = January
  | { kind: 'next-week' }
  | { kind: 'this-week' };

/** A time of day. `bare` is an hour said without am/pm, such as "at 8". */
export type TimeRef =
  | { kind: 'clock'; hour: number; minute: number } // hour 0–23, or 24 for midnight
  | { kind: 'bare'; hour: number; minute: number } // hour 1–12
  | { kind: 'part'; part: DayPart };

/** What a time phrase says. `resolveWhen` turns it into a real time. */
export type WhenParts =
  | { kind: 'offset'; minutes: number }
  | { kind: 'moment'; day: DayRef | null; time: TimeRef | null };

type ParseWhenOptions = {
  /** Also accept a lone hour ("8") or duration ("10 minutes"), as in an answer to "When?". */
  loose?: boolean;
};

type DayMatch = { day: DayRef; part?: DayPart };

const WEEKDAYS: Record<string, number> = {
  sunday: 0,
  sun: 0,
  monday: 1,
  mon: 1,
  tuesday: 2,
  tues: 2,
  tue: 2,
  wednesday: 3,
  wed: 3,
  thursday: 4,
  thurs: 4,
  thur: 4,
  thu: 4,
  friday: 5,
  fri: 5,
  saturday: 6,
  sat: 6,
};

const MONTHS: Record<string, number> = {
  january: 0,
  jan: 0,
  february: 1,
  feb: 1,
  march: 2,
  mar: 2,
  april: 3,
  apr: 3,
  may: 4,
  june: 5,
  jun: 5,
  july: 6,
  jul: 6,
  august: 7,
  aug: 7,
  september: 8,
  sept: 8,
  sep: 8,
  october: 9,
  oct: 9,
  november: 10,
  nov: 10,
  december: 11,
  dec: 11,
};

const NUMBER_WORDS: Record<string, number> = {
  one: 1,
  two: 2,
  three: 3,
  four: 4,
  five: 5,
  six: 6,
  seven: 7,
  eight: 8,
  nine: 9,
  ten: 10,
  eleven: 11,
  twelve: 12,
  thirteen: 13,
  fourteen: 14,
  fifteen: 15,
  sixteen: 16,
  seventeen: 17,
  eighteen: 18,
  nineteen: 19,
  twenty: 20,
  thirty: 30,
  forty: 40,
  fifty: 50,
  sixty: 60,
};

const MAX_OFFSET_DAYS = 366;
const DAY_PART = '(morning|afternoon|evening|night)';
const WEEKDAY = alternation(Object.keys(WEEKDAYS));
const MONTH = alternation(Object.keys(MONTHS));
const TIME_LEAD = '(?:(?:at|by|around|about|before|for|until|till) )';
const UNIT = '(minutes?|mins?|hours?|hrs?|days?|weeks?)';

const DURATION = new RegExp(`^(\\d+(?:\\.\\d+)?) ${UNIT}$`);
const DURATION_AND_A_HALF = new RegExp(`^(\\d+) and an? half ${UNIT}$`);
const DURATION_UNIT_AND_A_HALF = new RegExp(`^(\\d+) ${UNIT} and an? half$`);
const SINGLE_UNIT = new RegExp(`^an? ${UNIT}( and an? half)?$`);
const HALF_HOUR = /^(?:half an?|an? half) hour$/;
const COMPOUND_NUMBER =
  /\b(twenty|thirty|forty|fifty)[\s-](one|two|three|four|five|six|seven|eight|nine)\b/g;
const NUMBER_WORD = new RegExp(`\\b(${alternation(Object.keys(NUMBER_WORDS))})\\b`, 'g');
const DAY_LEAD = /^(?:on|by|before|until|till|for|due) /;
const WEEKDAY_DAY = new RegExp(`^(?:(this|next|coming) )?(${WEEKDAY})(?: ${DAY_PART})?$`);
// A leading weekday is allowed, so "Fri, Oct 16" (how dates are shown) reads back.
const MONTH_FIRST_DATE = new RegExp(
  `^(?:(?:${WEEKDAY}) )?(?:the )?(${MONTH}) (\\d{1,2})(?:st|nd|rd|th)?(?: (\\d{4}))?$`,
);
const DAY_FIRST_DATE = new RegExp(
  `^(?:(?:${WEEKDAY}) )?(?:the )?(\\d{1,2})(?:st|nd|rd|th)? (?:of )?(${MONTH})(?: (\\d{4}))?$`,
);
const CLOCK_WITH_MERIDIEM = new RegExp(`^${TIME_LEAD}?(\\d{1,2})(?::(\\d{2}))? (am|pm)$`);
const HOUR_IN_PART = new RegExp(
  `^${TIME_LEAD}?(\\d{1,2})(?::(\\d{2}))? (?:in the (morning|afternoon|evening)|at (night))$`,
);
const CLOCK_WITH_MINUTES = new RegExp(`^${TIME_LEAD}?(\\d{1,2}):(\\d{2})$`);
const NAMED_TIME = new RegExp(`^${TIME_LEAD}?(noon|midday|midnight)$`);
const PART_ONLY = /^(?:in the (morning|afternoon|evening)|(?:at )?(night))$/;
const HOUR_WITH_LEAD = new RegExp(`^${TIME_LEAD}(\\d{1,2})$`);
const HOUR_ONLY = /^(\d{1,2})$/;
const RECURRING = new RegExp(
  `\\b(?:every|each) (?:other )?(?:\\d+ )?(?:day|days|morning|mornings|afternoons?|evenings?|nights?|weeks?|weekdays?|weekends?|months?|years?|hours?|minutes?|${WEEKDAY})\\b|\\b(?:daily|weekly|monthly|yearly|hourly|everyday|recurring|repeating)\\b`,
);

/**
 * Reads a time phrase such as "tomorrow at 8 am", "in 5 minutes" or "Oct 15".
 * Only a phrase it can read completely is accepted; anything else returns null.
 */
export function parseWhen(
  text: string,
  { loose = false }: ParseWhenOptions = {},
): WhenParts | null {
  const phrase = normalizeWhenText(text);
  if (!phrase) return null;
  return parseOffset(phrase, loose) ?? parseMoment(phrase, loose);
}

/** True for repeating requests such as "every day at 8" or "weekly", which aren't supported. */
export function isRecurring(text: string): boolean {
  return RECURRING.test(normalizeWhenText(text));
}

// Words a time phrase can't be cut away from: "the meeting moved to | 3 PM".
const DANGLING_WORDS = new Set([
  'a',
  'about',
  'after',
  'an',
  'and',
  'are',
  'at',
  'be',
  'before',
  'by',
  'for',
  'from',
  'her',
  'his',
  'in',
  'is',
  'moved',
  'my',
  'of',
  'on',
  'or',
  'our',
  'starts',
  'that',
  'the',
  'their',
  'till',
  'to',
  'until',
  'was',
  'were',
  'with',
  'your',
]);

/**
 * Splits a time phrase off the end of a sentence:
 * "Pay the bill tomorrow 5pm" → { rest: "Pay the bill", when: "tomorrow 5pm" }.
 * Takes the longest ending that parses, unless that would leave the rest hanging.
 */
export function splitTrailingWhen(text: string): { rest: string; when: string } | null {
  const words = text.trim().split(/\s+/);
  for (let start = 1; start < words.length; start++) {
    const when = words.slice(start).join(' ');
    if (!parseWhen(when)) continue;
    const rest = words.slice(0, start).join(' ');
    const lastWord = normalizeWhenText(words[start - 1]);
    if (DANGLING_WORDS.has(lastWord)) continue;
    return { rest, when };
  }
  return null;
}

/**
 * Splits a time phrase off the start of a sentence:
 * "in 5 minutes to drink water" → { when: "in 5 minutes", rest: "to drink water" }.
 */
export function splitLeadingWhen(
  text: string,
  options?: ParseWhenOptions,
): { when: string; rest: string } | null {
  const words = text.trim().split(/\s+/);
  for (let end = words.length - 1; end >= 1; end--) {
    const when = words.slice(0, end).join(' ');
    if (parseWhen(when, options)) return { when, rest: words.slice(end).join(' ') };
  }
  return null;
}

/** Lowercases a phrase and spells it the way the parser reads it: "Five P.M." → "5 pm". */
export function normalizeWhenText(text: string): string {
  return text
    .toLowerCase()
    .replace(/\b([ap])\.\s?m\b\.?/g, '$1m')
    .replace(/\bo['’]?clock\b/g, ' ')
    .replace(/[,;!?]|\.(?=\s|$)/g, ' ')
    .replace(/(\d)(am|pm)\b/g, '$1 $2')
    .replace(COMPOUND_NUMBER, (_, tens: string, unit: string) =>
      String(NUMBER_WORDS[tens] + NUMBER_WORDS[unit]),
    )
    .replace(NUMBER_WORD, (word: string) => String(NUMBER_WORDS[word]))
    .replace(/\s+/g, ' ')
    .trim();
}

function parseOffset(phrase: string, loose: boolean): WhenParts | null {
  let rest = phrase;
  const hasTail = / (?:from now|later)$/.test(rest);
  rest = rest.replace(/ (?:from now|later)$/, '');
  // "for 30 minutes" alone is a duration ("stretch for 30 minutes"), not a time.
  const leadPattern = hasTail ? /^(?:in|after|within|for) / : /^(?:in|after|within) /;
  const hasLead = leadPattern.test(rest);
  rest = rest.replace(leadPattern, '');
  if (!hasLead && !hasTail && !loose) return null;
  rest = rest.replace(/^(?:about|around|another) /, '');

  const duration = parseDuration(rest);
  if (!duration) return null;
  const { amount, unit } = duration;
  if (unit === 'minute' || unit === 'hour') {
    const minutes = Math.round(amount * (unit === 'hour' ? 60 : 1));
    if (minutes < 1 || minutes > MAX_OFFSET_DAYS * 24 * 60) return null;
    return { kind: 'offset', minutes };
  }
  const days = amount * (unit === 'week' ? 7 : 1);
  if (!Number.isInteger(days) || days < 1 || days > MAX_OFFSET_DAYS) return null;
  return { kind: 'moment', day: { kind: 'in-days', days }, time: null };
}

type Duration = { amount: number; unit: 'minute' | 'hour' | 'day' | 'week' };

function parseDuration(text: string): Duration | null {
  let match = DURATION.exec(text);
  if (match) return duration(Number(match[1]), match[2]);
  match = DURATION_AND_A_HALF.exec(text) ?? DURATION_UNIT_AND_A_HALF.exec(text);
  if (match) return duration(Number(match[1]) + 0.5, match[2]);
  match = SINGLE_UNIT.exec(text);
  if (match) return duration(match[2] ? 1.5 : 1, match[1]);
  if (HALF_HOUR.test(text)) return { amount: 0.5, unit: 'hour' };
  return null;
}

function duration(amount: number, unitWord: string): Duration {
  if (unitWord.startsWith('min')) return { amount, unit: 'minute' };
  if (unitWord.startsWith('h')) return { amount, unit: 'hour' };
  if (unitWord.startsWith('d')) return { amount, unit: 'day' };
  return { amount, unit: 'week' };
}

function parseMoment(phrase: string, loose: boolean): WhenParts | null {
  const day = matchDay(phrase);
  if (day) return { kind: 'moment', day: day.day, time: partTime(day.part) };
  const time = matchTime(phrase, loose);
  if (time) return { kind: 'moment', day: null, time };

  // A day and a time, in either order: "tomorrow at 8 am", "5pm on friday".
  const words = phrase.split(' ');
  for (let split = 1; split < words.length; split++) {
    const left = words.slice(0, split).join(' ');
    const right = words.slice(split).join(' ');
    const moment = combine(matchDay(left), right) ?? combine(matchDay(right), left);
    if (moment) return moment;
  }
  return null;
}

function combine(day: DayMatch | null, timeText: string): WhenParts | null {
  if (!day) return null;
  // A bare hour needs a lead word ("at 8"), unless the day names a part of it ("8 tonight").
  const time = matchTime(timeText, day.part !== undefined);
  if (!time) return null;
  return { kind: 'moment', day: day.day, time: applyPart(time, day.part) };
}

function matchDay(text: string): DayMatch | null {
  const phrase = text.replace(DAY_LEAD, '');
  switch (phrase) {
    case 'today':
      return { day: inDays(0) };
    case 'tonight':
      return { day: inDays(0), part: 'night' };
    case 'tomorrow':
      return { day: inDays(1) };
    case 'day after tomorrow':
    case 'the day after tomorrow':
      return { day: inDays(2) };
    case 'next week':
      return { day: { kind: 'next-week' } };
    case 'this week':
      return { day: { kind: 'this-week' } };
  }

  let match = /^this (morning|afternoon|evening)$/.exec(phrase);
  if (match) return { day: inDays(0), part: match[1] as DayPart };
  match = new RegExp(`^(today|tomorrow) ${DAY_PART}$`).exec(phrase);
  if (match) return { day: inDays(match[1] === 'today' ? 0 : 1), part: match[2] as DayPart };

  match = WEEKDAY_DAY.exec(phrase);
  if (match) {
    const day: DayRef = { kind: 'weekday', weekday: WEEKDAYS[match[2]], next: match[1] === 'next' };
    return match[3] ? { day, part: match[3] as DayPart } : { day };
  }

  match = MONTH_FIRST_DATE.exec(phrase);
  if (match) return calendarDate(MONTHS[match[1]], Number(match[2]), match[3]);
  match = DAY_FIRST_DATE.exec(phrase);
  if (match) return calendarDate(MONTHS[match[2]], Number(match[1]), match[3]);
  return null;
}

function calendarDate(month: number, day: number, yearText: string | undefined): DayMatch | null {
  const year = yearText === undefined ? undefined : Number(yearText);
  if (year !== undefined && (year < 2000 || year > 2100)) return null;
  // Without a year, Feb 29 is allowed here; resolveWhen checks the year it lands in.
  const daysInMonth = new Date(year ?? 2024, month + 1, 0).getDate();
  if (day < 1 || day > daysInMonth) return null;
  return {
    day: year === undefined ? { kind: 'date', month, day } : { kind: 'date', month, day, year },
  };
}

function matchTime(text: string, allowBareHour: boolean): TimeRef | null {
  let match = CLOCK_WITH_MERIDIEM.exec(text);
  if (match) {
    const hour = Number(match[1]);
    const minute = Number(match[2] ?? 0);
    if (hour < 1 || hour > 12 || minute > 59) return null;
    return { kind: 'clock', hour: (hour % 12) + (match[3] === 'pm' ? 12 : 0), minute };
  }

  match = HOUR_IN_PART.exec(text);
  if (match) {
    const hour = Number(match[1]);
    const minute = Number(match[2] ?? 0);
    if (hour < 1 || hour > 12 || minute > 59) return null;
    const part = (match[3] ?? match[4]) as DayPart;
    return applyPart({ kind: 'bare', hour, minute }, part);
  }

  match = NAMED_TIME.exec(text);
  if (match) {
    return match[1] === 'midnight'
      ? { kind: 'clock', hour: 24, minute: 0 }
      : { kind: 'clock', hour: 12, minute: 0 };
  }

  match = CLOCK_WITH_MINUTES.exec(text);
  if (match) return hourAndMinute(Number(match[1]), Number(match[2]));

  match = PART_ONLY.exec(text);
  if (match) return { kind: 'part', part: (match[1] ?? match[2]) as DayPart };

  match = HOUR_WITH_LEAD.exec(text) ?? (allowBareHour ? HOUR_ONLY.exec(text) : null);
  if (match) return hourAndMinute(Number(match[1]), 0);
  return null;
}

// 1–12 is a bare hour; 0 or 13–23 can only be a 24-hour time.
function hourAndMinute(hour: number, minute: number): TimeRef | null {
  if (hour > 23 || minute > 59) return null;
  if (hour === 0 || hour > 12) return { kind: 'clock', hour, minute };
  return { kind: 'bare', hour, minute };
}

function applyPart(time: TimeRef, part: DayPart | undefined): TimeRef {
  if (part === undefined || time.kind !== 'bare') return time;
  return { kind: 'clock', hour: hourInPart(time.hour, part), minute: time.minute };
}

function hourInPart(hour: number, part: DayPart): number {
  if (part === 'morning') return hour % 12;
  // "12 tonight" is midnight at the end of the day.
  if (part === 'night' && hour === 12) return 24;
  return (hour % 12) + 12;
}

function partTime(part: DayPart | undefined): TimeRef | null {
  return part === undefined ? null : { kind: 'part', part };
}

function inDays(days: number): DayRef {
  return { kind: 'in-days', days };
}

// Longest names first, so "thursday" wins over "thu".
function alternation(words: string[]): string {
  return [...words].sort((a, b) => b.length - a.length).join('|');
}
