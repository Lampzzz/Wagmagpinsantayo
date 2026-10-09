import {
  isRecurring,
  parseWhen,
  splitLeadingWhen,
  splitTrailingWhen,
  type DayRef,
  type TimeRef,
} from './parse-when';

function moment(day: DayRef | null, time: TimeRef | null) {
  return { kind: 'moment', day, time };
}

const TODAY: DayRef = { kind: 'in-days', days: 0 };
const TOMORROW: DayRef = { kind: 'in-days', days: 1 };
const FRIDAY: DayRef = { kind: 'weekday', weekday: 5, next: false };
const OCT_15: DayRef = { kind: 'date', month: 9, day: 15 };

function clock(hour: number, minute = 0): TimeRef {
  return { kind: 'clock', hour, minute };
}

describe('parseWhen', () => {
  it.each([
    ['in 5 minutes', 5],
    ['in five minutes', 5],
    ['in forty-five minutes', 45],
    ['in 2 hours', 120],
    ['in an hour', 60],
    ['in half an hour', 30],
    ['in an hour and a half', 90],
    ['in 2 and a half hours', 150],
    ['in 1.5 hours', 90],
    ['30 minutes from now', 30],
    ['for 30 minutes from now', 30],
    ['after 10 mins', 10],
  ])('reads %p as an offset of %p minutes', (text, minutes) => {
    expect(parseWhen(text)).toEqual({ kind: 'offset', minutes });
  });

  it.each([
    ['in 3 days', { kind: 'in-days', days: 3 }],
    ['in 2 weeks', { kind: 'in-days', days: 14 }],
    ['today', TODAY],
    ['tomorrow', TOMORROW],
    ['the day after tomorrow', { kind: 'in-days', days: 2 }],
    ['friday', FRIDAY],
    ['this Friday', FRIDAY],
    ['on Friday', FRIDAY],
    ['by Friday', FRIDAY],
    ['next Friday', { kind: 'weekday', weekday: 5, next: true }],
    ['Oct 15', OCT_15],
    ['October 15th', OCT_15],
    ['15 October', OCT_15],
    ['the 15th of October', OCT_15],
    ['Oct 15 2027', { kind: 'date', month: 9, day: 15, year: 2027 }],
    ['next week', { kind: 'next-week' }],
    ['this week', { kind: 'this-week' }],
  ])('reads %p as a day', (text, day) => {
    expect(parseWhen(text)).toEqual(moment(day as DayRef, null));
  });

  it.each([
    ['tonight', moment(TODAY, { kind: 'part', part: 'night' })],
    ['this afternoon', moment(TODAY, { kind: 'part', part: 'afternoon' })],
    ['tomorrow morning', moment(TOMORROW, { kind: 'part', part: 'morning' })],
    ['in the evening', moment(null, { kind: 'part', part: 'evening' })],
  ])('reads %p as a part of the day', (text, expected) => {
    expect(parseWhen(text)).toEqual(expected);
  });

  it.each([
    ['8am', clock(8)],
    ['8 a.m.', clock(8)],
    ['at 8:30 pm', clock(20, 30)],
    ['12 am', clock(0)],
    ['12pm', clock(12)],
    ['17:00', clock(17)],
    ['noon', clock(12)],
    ['at midnight', clock(24)],
    ['at 8 in the morning', clock(8)],
    ['8 at night', clock(20)],
    ['at 8', { kind: 'bare', hour: 8, minute: 0 }],
    ["at 9 o'clock", { kind: 'bare', hour: 9, minute: 0 }],
    ['at 8:30', { kind: 'bare', hour: 8, minute: 30 }],
  ])('reads %p as a time', (text, time) => {
    expect(parseWhen(text)).toEqual(moment(null, time as TimeRef));
  });

  it.each([
    ['tomorrow at 8 AM', moment(TOMORROW, clock(8))],
    ['8 AM tomorrow', moment(TOMORROW, clock(8))],
    ['Friday 5pm', moment(FRIDAY, clock(17))],
    ['5pm on Friday', moment(FRIDAY, clock(17))],
    ['tomorrow morning at 8', moment(TOMORROW, clock(8))],
    ['tonight at 8', moment(TODAY, clock(20))],
    ['8 tonight', moment(TODAY, clock(20))],
    ['Oct 15 at 3pm', moment(OCT_15, clock(15))],
    ['Thu, Oct 15 at 9:00 AM', moment(OCT_15, clock(9))],
    ['Tue, Jan 5, 2027', moment({ kind: 'date', month: 0, day: 5, year: 2027 }, null)],
    ['tomorrow at 6', moment(TOMORROW, { kind: 'bare', hour: 6, minute: 0 })],
  ])('reads %p as a day and a time', (text, expected) => {
    expect(parseWhen(text)).toEqual(expected);
  });

  it.each([
    '',
    'whenever',
    'to 3 PM',
    '5',
    'chapter 5',
    'tomorrow 9',
    'Friday report',
    'Feb 30',
    '13 pm',
    'at 25',
    'for 30 minutes',
    'stretch for 5 minutes',
  ])('rejects %p', (text) => {
    expect(parseWhen(text)).toBeNull();
  });

  it('accepts a lone hour or duration only when loose', () => {
    expect(parseWhen('8')).toBeNull();
    expect(parseWhen('8', { loose: true })).toEqual(
      moment(null, { kind: 'bare', hour: 8, minute: 0 }),
    );
    expect(parseWhen('10 minutes')).toBeNull();
    expect(parseWhen('10 minutes', { loose: true })).toEqual({ kind: 'offset', minutes: 10 });
  });
});

describe('isRecurring', () => {
  it.each([
    'every day at 8',
    'remind me daily to stretch',
    'every Monday',
    'every 2 hours',
    'weekly',
  ])('flags %p', (text) => {
    expect(isRecurring(text)).toBe(true);
  });

  it.each(['remind me tomorrow at 8', 'check every room', 'show every task'])(
    'leaves %p alone',
    (text) => {
      expect(isRecurring(text)).toBe(false);
    },
  );
});

describe('splitTrailingWhen', () => {
  it.each([
    ['Pay electric bill tomorrow 5pm', 'Pay electric bill', 'tomorrow 5pm'],
    ['Meeting with Carlo Monday 10am', 'Meeting with Carlo', 'Monday 10am'],
    ['Submit report Oct 15', 'Submit report', 'Oct 15'],
    ['Call mom in 2 hours', 'Call mom', 'in 2 hours'],
    ['finish my assignment tonight', 'finish my assignment', 'tonight'],
    ['Read chapter 5 tomorrow', 'Read chapter 5', 'tomorrow'],
    ['call mom at 5pm tomorrow', 'call mom', 'at 5pm tomorrow'],
  ])('splits %p', (text, rest, when) => {
    expect(splitTrailingWhen(text)).toEqual({ rest, when });
  });

  it.each([
    'Buy groceries',
    'tell Ana the meeting moved to 3 PM',
    'the meeting is at 3 PM',
    'Stretch for 5 minutes',
    'tomorrow',
  ])('leaves %p whole', (text) => {
    expect(splitTrailingWhen(text)).toBeNull();
  });
});

describe('splitLeadingWhen', () => {
  it.each([
    ['in 5 minutes to drink water', 'in 5 minutes', 'to drink water'],
    ['tomorrow at 8 AM to prepare for work', 'tomorrow at 8 AM', 'to prepare for work'],
    [
      'for 30 minutes from now to check my laundry',
      'for 30 minutes from now',
      'to check my laundry',
    ],
  ])('splits %p', (text, when, rest) => {
    expect(splitLeadingWhen(text)).toEqual({ when, rest });
  });

  it('reads a bare duration only when loose', () => {
    expect(splitLeadingWhen('30 minutes to check my laundry')).toBeNull();
    expect(splitLeadingWhen('30 minutes to check my laundry', { loose: true })).toEqual({
      when: '30 minutes',
      rest: 'to check my laundry',
    });
  });

  it('returns null without a leading time', () => {
    expect(splitLeadingWhen('to drink water')).toBeNull();
  });
});
