import { isEmptyNote, parseNoteId, planNoteSave, type NoteSavePlan } from './note-rules';
import type { NoteContent } from './types';

const EMPTY: NoteContent = { title: '', body: '' };
const BLANK: NoteContent = { title: '  ', body: '\n\t ' };
const NOTE: NoteContent = { title: 'Groceries', body: '- Eggs' };
const EDITED: NoteContent = { title: 'Groceries', body: '- Eggs\n- Milk' };

describe('isEmptyNote', () => {
  it('treats whitespace as empty', () => {
    expect(isEmptyNote(EMPTY)).toBe(true);
    expect(isEmptyNote(BLANK)).toBe(true);
  });

  it('keeps a note with only a title or only a body', () => {
    expect(isEmptyNote({ title: 'Hi', body: '' })).toBe(false);
    expect(isEmptyNote({ title: '', body: 'Hi' })).toBe(false);
  });
});

describe('planNoteSave', () => {
  const cases: [string, NoteSavePlan, NoteContent, NoteContent | null, boolean][] = [
    ['new and empty', 'skip', EMPTY, null, false],
    ['new and empty, leaving', 'skip', EMPTY, null, true],
    ['new with text', 'create', NOTE, null, false],
    ['new with text, leaving', 'create', NOTE, null, true],
    ['stored and unchanged', 'skip', NOTE, NOTE, false],
    ['stored and unchanged, leaving', 'skip', NOTE, NOTE, true],
    ['stored and edited', 'update', EDITED, NOTE, false],
    ['stored and edited, leaving', 'update', EDITED, NOTE, true],
    ['stored and emptied, still editing', 'skip', EMPTY, NOTE, false],
    ['stored and emptied, leaving', 'delete', EMPTY, NOTE, true],
    ['stored and left with only whitespace', 'delete', BLANK, NOTE, true],
  ];

  it.each(cases)('%s → %s', (_name, expected, content, saved, leaving) => {
    expect(planNoteSave({ content, saved, leaving })).toBe(expected);
  });
});

describe('parseNoteId', () => {
  it('reads a plain positive integer', () => {
    expect(parseNoteId('7')).toBe(7);
    expect(parseNoteId('120')).toBe(120);
  });

  it.each(['', '0', '-1', '1.5', ' 7', '7 ', '007', 'abc', '1e3', '9007199254740993'])(
    'rejects %p',
    (param) => {
      expect(parseNoteId(param)).toBeNull();
    },
  );

  it('rejects a missing param', () => {
    expect(parseNoteId(undefined)).toBeNull();
  });
});
