import {
  dayKey,
  dayTile,
  entryText,
  filterEntries,
  groupByDay,
  journalDayTitle,
  startOfLocalDay,
} from './journal';
import type { JournalEntry } from './types';

// Local-time dates, so the tests pass in any time zone.
function at(year: number, month: number, day: number, hour = 0, minute = 0, second = 0, ms = 0) {
  return new Date(year, month - 1, day, hour, minute, second, ms).getTime();
}

// Saturday, Oct 10, 2026, 2:30 PM.
const NOW = at(2026, 10, 10, 14, 30);

function entry(id: number, createdAt: number, changes: Partial<JournalEntry> = {}): JournalEntry {
  return { id, title: `Entry ${id}`, body: '', createdAt, ...changes };
}

function shape(entries: JournalEntry[], now = NOW) {
  return groupByDay(entries, now).map((day) => [day.title, day.entries.map(({ id }) => id)]);
}

describe('groupByDay', () => {
  it('puts the newest day first and the newest entry first within a day', () => {
    const entries = [
      entry(1, at(2026, 10, 5, 9)),
      entry(2, at(2026, 10, 10, 8, 15)),
      entry(3, at(2026, 10, 9, 21)),
      entry(4, at(2026, 10, 10, 13, 45)),
      entry(5, at(2026, 10, 5, 22, 10)),
      entry(6, at(2025, 12, 31, 23)),
    ];
    expect(shape(entries)).toEqual([
      ['Today', [4, 2]],
      ['Yesterday', [3]],
      ['Mon, Oct 5', [5, 1]],
      ['Wed, Dec 31, 2025', [6]],
    ]);
  });

  it('splits days at local midnight', () => {
    const entries = [
      entry(1, at(2026, 10, 10, 0, 0)),
      entry(2, at(2026, 10, 9, 23, 59, 59, 999)),
      entry(3, at(2026, 10, 9, 0, 0)),
      entry(4, at(2026, 10, 8, 23, 59, 59, 999)),
    ];
    expect(shape(entries)).toEqual([
      ['Today', [1]],
      ['Yesterday', [2, 3]],
      ['Thu, Oct 8', [4]],
    ]);
  });

  it('breaks a tie in time by putting the later-saved entry first', () => {
    const same = at(2026, 10, 10, 9);
    expect(shape([entry(7, same), entry(9, same), entry(8, same)])).toEqual([['Today', [9, 8, 7]]]);
  });

  it('gives each day a stable key and its local midnight', () => {
    const [today, earlier] = groupByDay(
      [entry(1, at(2026, 10, 10, 9)), entry(2, at(2026, 1, 3, 18))],
      NOW,
    );
    expect(today).toMatchObject({ key: '2026-10-10', startsAt: at(2026, 10, 10) });
    expect(earlier).toMatchObject({ key: '2026-01-03', startsAt: at(2026, 1, 3) });
  });

  it('labels days from the point of view of `now`', () => {
    const entries = [entry(1, at(2026, 10, 10, 9))];
    expect(shape(entries, at(2026, 10, 11, 7))).toEqual([['Yesterday', [1]]]);
    expect(shape(entries, at(2026, 10, 12, 7))).toEqual([['Sat, Oct 10', [1]]]);
    expect(shape(entries, at(2027, 1, 2, 7))).toEqual([['Sat, Oct 10, 2026', [1]]]);
  });

  it('returns no days for no entries, and leaves the input alone', () => {
    expect(groupByDay([], NOW)).toEqual([]);
    const entries = [entry(1, at(2026, 10, 9)), entry(2, at(2026, 10, 10))];
    groupByDay(entries, NOW);
    expect(entries.map(({ id }) => id)).toEqual([1, 2]);
  });
});

describe('journalDayTitle', () => {
  it('reads Today, Yesterday, then the weekday and date, adding the year for another year', () => {
    expect(journalDayTitle(at(2026, 10, 10, 23, 59), NOW)).toBe('Today');
    expect(journalDayTitle(at(2026, 10, 9, 0, 1), NOW)).toBe('Yesterday');
    expect(journalDayTitle(at(2026, 10, 5, 12), NOW)).toBe('Mon, Oct 5');
    expect(journalDayTitle(at(2026, 1, 1, 12), NOW)).toBe('Thu, Jan 1');
    expect(journalDayTitle(at(2025, 12, 31, 12), NOW)).toBe('Wed, Dec 31, 2025');
  });
});

describe('dayTile', () => {
  it('splits a day into weekday, day of the month and month', () => {
    expect(dayTile(at(2026, 9, 28, 17))).toEqual({ weekday: 'Mon', day: '28', month: 'Sep' });
  });
});

describe('dayKey and startOfLocalDay', () => {
  it('use the local calendar day', () => {
    expect(dayKey(at(2026, 3, 7, 23, 59))).toBe('2026-03-07');
    expect(startOfLocalDay(at(2026, 3, 7, 23, 59))).toBe(at(2026, 3, 7));
  });
});

describe('entryText', () => {
  it('heads an entry with its title and previews its text on one line', () => {
    expect(entryText({ title: ' Beach day ', body: 'Swam.\n\n  Ate mangoes. ' })).toEqual({
      heading: 'Beach day',
      preview: 'Swam. Ate mangoes.',
    });
  });

  it('heads an untitled entry with its first line', () => {
    expect(entryText({ title: '', body: '\n Walked to the market\nBought rice' })).toEqual({
      heading: 'Walked to the market',
      preview: 'Bought rice',
    });
    expect(entryText({ title: '  ', body: ' ' })).toEqual({ heading: 'Untitled', preview: '' });
  });
});

describe('filterEntries', () => {
  const entries = [
    entry(1, at(2026, 10, 10), { title: 'Beach day', body: 'Swam with Lola at sunset.' }),
    entry(2, at(2026, 10, 9), { title: '', body: 'Market run: rice, MANGOES, eggs' }),
    entry(3, at(2026, 10, 8), { title: 'Mango shake', body: 'Too sweet.' }),
  ];
  const ids = (query: string) => filterEntries(entries, query).map(({ id }) => id);

  it('keeps every entry for a blank query', () => {
    expect(ids('')).toEqual([1, 2, 3]);
    expect(ids('   ')).toEqual([1, 2, 3]);
  });

  it('matches the title or the text, ignoring case', () => {
    expect(ids('mango')).toEqual([2, 3]);
    expect(ids('LOLA')).toEqual([1]);
  });

  it('needs every word to match, in any order', () => {
    expect(ids('sunset beach')).toEqual([1]);
    expect(ids('mango sweet')).toEqual([3]);
    expect(ids('mango beach')).toEqual([]);
  });
});
