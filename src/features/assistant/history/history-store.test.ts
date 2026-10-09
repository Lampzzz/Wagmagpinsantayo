import { clearHistory, historySaved, listHistory, saveToHistory } from './history-store';

// An in-memory stand-in for the database. Jest lets mock factories use only names that
// start with "mock".
type MockRow = { id: number; role: string; text: string; spoken: number; created_at: number };

const mockRows: MockRow[] = [];
const mockDb = {
  failNext: false,
  nextId: 1,
  async runAsync(sql: string, ...values: (string | number)[]) {
    if (mockDb.failNext) {
      mockDb.failNext = false;
      throw new Error('disk full');
    }
    if (sql.startsWith('DELETE')) {
      const changes = mockRows.length;
      mockRows.length = 0;
      return { changes, lastInsertRowId: 0 };
    }
    const [role, text, spoken, createdAt] = values;
    const id = mockDb.nextId++;
    mockRows.push({
      id,
      role: String(role),
      text: String(text),
      spoken: Number(spoken),
      created_at: Number(createdAt),
    });
    return { changes: 1, lastInsertRowId: id };
  },
  async getAllAsync() {
    return mockRows.map((row) => ({ ...row }));
  },
};

jest.mock('@/lib/db', () => ({
  getDatabase: async () => mockDb,
}));

let warn: jest.SpyInstance;

beforeEach(() => {
  mockRows.length = 0;
  mockDb.failNext = false;
  mockDb.nextId = 1;
  // A failed save is logged in development; keep the test output clean.
  warn = jest.spyOn(console, 'warn').mockImplementation(() => undefined);
});

afterEach(() => {
  warn.mockRestore();
});

describe('saveToHistory', () => {
  it('stores lines in the order they were said, with what was shown', async () => {
    saveToHistory({ role: 'user', text: '  Remind me to stretch ', spoken: true });
    saveToHistory({ role: 'pinsan', text: 'When should I remind you?', spoken: false });
    saveToHistory({ role: 'user', text: 'Save', spoken: false });
    await historySaved();

    const lines = await listHistory();
    expect(lines.map(({ role, text, spoken }) => [role, text, spoken])).toEqual([
      ['user', 'Remind me to stretch', true],
      ['pinsan', 'When should I remind you?', false],
      ['user', 'Save', false],
    ]);
    expect(lines.every(({ createdAt }) => typeof createdAt === 'number')).toBe(true);
  });

  it('never throws or rejects when a save fails, and later saves still go through', async () => {
    mockDb.failNext = true;
    expect(() => saveToHistory({ role: 'user', text: 'Lost', spoken: false })).not.toThrow();
    saveToHistory({ role: 'pinsan', text: 'Kept', spoken: false });
    await expect(historySaved()).resolves.toBeUndefined();

    expect((await listHistory()).map(({ text }) => text)).toEqual(['Kept']);
    expect(warn).toHaveBeenCalledTimes(1);
  });

  it('skips blank lines and never marks a reply as spoken', async () => {
    saveToHistory({ role: 'user', text: '   ', spoken: true });
    saveToHistory({ role: 'pinsan', text: 'Done!', spoken: true });
    await historySaved();

    expect(await listHistory()).toEqual([
      expect.objectContaining({ text: 'Done!', spoken: false }),
    ]);
  });
});

describe('clearHistory', () => {
  it('deletes every line, including one still being saved', async () => {
    saveToHistory({ role: 'user', text: 'Hello', spoken: false });
    await clearHistory();
    expect(await listHistory()).toEqual([]);
  });
});
