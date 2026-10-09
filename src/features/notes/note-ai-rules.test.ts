import {
  LONG_NOTE_WORDS,
  MIN_SUMMARY_WORDS,
  aiTimeoutMs,
  limitWords,
  measureNote,
  noteText,
} from './note-ai-rules';

function words(count: number): string {
  return Array.from({ length: count }, (_, index) => `word${index}`).join(' ');
}

describe('measureNote', () => {
  it('treats blank text as empty', () => {
    expect(measureNote('')).toMatchObject({ words: 0, empty: true });
    expect(measureNote(' \n\t ')).toMatchObject({ words: 0, empty: true });
  });

  it('calls a note under 50 words short, so Summarize skips the AI', () => {
    expect(MIN_SUMMARY_WORDS).toBe(50);
    expect(measureNote(words(49))).toMatchObject({ words: 49, empty: false, short: true });
    expect(measureNote(words(50)).short).toBe(false);
  });

  it('warns only over 1,500 words', () => {
    expect(LONG_NOTE_WORDS).toBe(1500);
    expect(measureNote(words(1500)).long).toBe(false);
    expect(measureNote(words(1501)).long).toBe(true);
  });

  it('counts words across lines and list markers', () => {
    expect(measureNote('Groceries\n\n- eggs\n- milk').words).toBe(5);
  });
});

describe('noteText', () => {
  it('puts the title before the body', () => {
    expect(noteText({ title: ' Trip ', body: 'Pack bags.\n' })).toBe('Trip\n\nPack bags.');
  });

  it('leaves out an empty title or body', () => {
    expect(noteText({ title: '', body: 'Pack bags.' })).toBe('Pack bags.');
    expect(noteText({ title: 'Trip', body: '  ' })).toBe('Trip');
    expect(noteText({ title: '', body: '' })).toBe('');
  });
});

describe('limitWords', () => {
  it('keeps text within the limit whole', () => {
    expect(limitWords('one two\nthree', 3)).toBe('one two\nthree');
    expect(limitWords('one two', 5)).toBe('one two');
  });

  it('cuts after the last allowed word and keeps line breaks', () => {
    expect(limitWords('one two\nthree four five', 3)).toBe('one two\nthree');
    expect(measureNote(limitWords(words(2000), LONG_NOTE_WORDS)).words).toBe(LONG_NOTE_WORDS);
  });
});

describe('aiTimeoutMs', () => {
  it('gives longer notes and longer replies more time', () => {
    const short = aiTimeoutMs(words(60), 320);
    expect(aiTimeoutMs(words(1500), 320)).toBeGreaterThan(short);
    expect(aiTimeoutMs(words(60), 512)).toBeGreaterThan(short);
  });
});
