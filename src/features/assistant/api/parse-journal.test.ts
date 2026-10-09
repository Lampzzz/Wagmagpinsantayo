import { parseJournalEntry } from './parse-journal';

describe('parseJournalEntry', () => {
  it.each([
    ['Write in my journal: today was a good day', 'today was a good day'],
    ['write in my journal that I finally fixed the bug', 'I finally fixed the bug'],
    ['Write in my journal: that was fun', 'that was fun'],
    ['Add to my journal: met Carlo at the café', 'met Carlo at the café'],
    ["Put this in today's journal - long walk by the bay", 'long walk by the bay'],
    ['Write in my diary, the exam went well', 'the exam went well'],
    ['Add a journal entry: tried the new recipe', 'tried the new recipe'],
    ['Journal: had lunch with Ana', 'had lunch with Ana'],
    ['journal entry, the kids slept early', 'the kids slept early'],
    ['Dear journal, today I felt calm.', 'today I felt calm.'],
    ['Dear diary I passed the exam', 'I passed the exam'],
    ['Note: the gate code is 4321', 'the gate code is 4321'],
    ['Note: call 911 if the alarm goes off', 'call 911 if the alarm goes off'],
    ['Note to self: water the orchids on Sunday', 'water the orchids on Sunday'],
    ['note to self buy more rice', 'buy more rice'],
    ['Note that the wifi password changed', 'the wifi password changed'],
    ['Take a note: I parked on level 3', 'I parked on level 3'],
    ['take a note I parked on level 3', 'I parked on level 3'],
    ['Make a note that the plumber comes back next week', 'the plumber comes back next week'],
    ['Make a note of my blood pressure, 120 over 80', 'my blood pressure, 120 over 80'],
    ['Hey Pinsan, please take a note: buy rice', 'buy rice'],
    ['Can you write in my journal: rainy day', 'rainy day'],
    ['Journal:\nFirst line\nSecond line', 'First line\nSecond line'],
  ])('reads %p as an entry', (text, entry) => {
    expect(parseJournalEntry(text)).toEqual({ kind: 'add-note', text: entry });
  });

  it.each([
    'Take a note',
    'Make a note',
    'Write in my journal',
    'Dear journal',
    'Journal.',
    'Note',
  ])('reads %p as an entry still to be written', (text) => {
    expect(parseJournalEntry(text)).toEqual({ kind: 'add-note', text: '' });
  });

  it.each([
    'Add a note to my project task: bring the slides',
    'Make a note to call Ana tomorrow',
    'Write a note to the teacher',
    'Take a note to the office',
    'Show my journal',
    "What's in my journal?",
    'Create a task to buy a new journal',
    'Remind me to write in my journal at 9 PM',
    'journal about my day',
    'notes',
    'Buy a notebook',
    '',
  ])('leaves %p alone', (text) => {
    expect(parseJournalEntry(text)).toBeNull();
  });
});
