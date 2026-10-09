import { dayKey, groupByDay, historyDayTitle, startOfLocalDay } from './group-by-day';
import type { HistoryMessage } from './types';

// Local-time dates, so the tests pass in any time zone.
function at(year: number, month: number, day: number, hour = 0, minute = 0, second = 0, ms = 0) {
  return new Date(year, month - 1, day, hour, minute, second, ms).getTime();
}

// Saturday, Oct 10, 2026, 2:30 PM.
const NOW = at(2026, 10, 10, 14, 30);

function line(
  id: number,
  createdAt: number,
  changes: Partial<HistoryMessage> = {},
): HistoryMessage {
  return {
    id,
    role: id % 2 === 1 ? 'user' : 'pinsan',
    text: `Line ${id}`,
    spoken: false,
    createdAt,
    ...changes,
  };
}

function shape(messages: HistoryMessage[], now = NOW) {
  return groupByDay(messages, now).map((day) => [day.title, day.messages.map(({ id }) => id)]);
}

describe('groupByDay', () => {
  it('puts the newest day first and the oldest line first within a day', () => {
    const messages = [
      line(5, at(2026, 10, 10, 13, 45)),
      line(1, at(2026, 10, 8, 9)),
      line(3, at(2026, 10, 10, 8, 15)),
      line(2, at(2026, 10, 8, 9, 1)),
      line(4, at(2026, 10, 9, 21)),
      line(6, at(2026, 10, 10, 13, 46)),
      line(7, at(2025, 12, 31, 23)),
    ];
    expect(shape(messages)).toEqual([
      ['Today', [3, 5, 6]],
      ['Yesterday', [4]],
      ['Thu, Oct 8', [1, 2]],
      ['Wed, Dec 31, 2025', [7]],
    ]);
  });

  it('splits days at local midnight', () => {
    const messages = [
      line(1, at(2026, 10, 8, 23, 59, 59, 999)),
      line(2, at(2026, 10, 9, 0, 0)),
      line(3, at(2026, 10, 9, 23, 59, 59, 999)),
      line(4, at(2026, 10, 10, 0, 0)),
    ];
    expect(shape(messages)).toEqual([
      ['Today', [4]],
      ['Yesterday', [2, 3]],
      ['Thu, Oct 8', [1]],
    ]);
  });

  it('keeps lines said in the same millisecond in the order they were saved', () => {
    const same = at(2026, 10, 10, 9);
    expect(shape([line(9, same), line(7, same), line(8, same)])).toEqual([['Today', [7, 8, 9]]]);
  });

  it('labels days from the point of view of `now`', () => {
    const messages = [line(1, at(2026, 10, 10, 9))];
    expect(shape(messages, at(2026, 10, 11, 7))).toEqual([['Yesterday', [1]]]);
    expect(shape(messages, at(2026, 10, 12, 7))).toEqual([['Sat, Oct 10', [1]]]);
    expect(shape(messages, at(2027, 1, 2, 7))).toEqual([['Sat, Oct 10, 2026', [1]]]);
  });

  it('gives each day a stable key and keeps every line as it was saved', () => {
    const spoken = line(1, at(2026, 10, 10, 9), { text: 'Remind me to stretch', spoken: true });
    const reply = line(2, at(2026, 10, 10, 9, 0, 2), { role: 'pinsan', text: 'Okay!' });
    const [today, earlier] = groupByDay([reply, spoken, line(3, at(2026, 1, 3, 18))], NOW);
    expect(today).toEqual({ key: '2026-10-10', title: 'Today', messages: [spoken, reply] });
    expect(earlier).toMatchObject({ key: '2026-01-03', title: 'Sat, Jan 3' });
  });

  it('returns no days for no lines, and leaves the input alone', () => {
    expect(groupByDay([], NOW)).toEqual([]);
    const messages = [line(2, at(2026, 10, 10)), line(1, at(2026, 10, 9))];
    groupByDay(messages, NOW);
    expect(messages.map(({ id }) => id)).toEqual([2, 1]);
  });
});

describe('historyDayTitle', () => {
  it('reads Today, Yesterday, then the weekday and date, adding the year for another year', () => {
    expect(historyDayTitle(at(2026, 10, 10, 23, 59), NOW)).toBe('Today');
    expect(historyDayTitle(at(2026, 10, 9, 0, 1), NOW)).toBe('Yesterday');
    expect(historyDayTitle(at(2026, 10, 8, 12), NOW)).toBe('Thu, Oct 8');
    expect(historyDayTitle(at(2025, 12, 31, 12), NOW)).toBe('Wed, Dec 31, 2025');
  });
});

describe('dayKey and startOfLocalDay', () => {
  it('use the local calendar day', () => {
    expect(dayKey(at(2026, 3, 7, 23, 59))).toBe('2026-03-07');
    expect(startOfLocalDay(at(2026, 3, 7, 23, 59))).toBe(at(2026, 3, 7));
  });
});
