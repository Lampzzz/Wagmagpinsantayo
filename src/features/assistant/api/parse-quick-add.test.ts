import { EXAMPLES } from './compose-reply';
import { parseCommandRules } from './parse-command-rules';
import { parseQuickAdd } from './parse-quick-add';

describe('parseQuickAdd', () => {
  it.each([
    // The five sentences from the Quick Add spec.
    ['Pay electric bill tomorrow 5pm', { title: 'Pay electric bill', when: 'tomorrow 5pm' }],
    ['Meeting with Carlo Monday 10am', { title: 'Meeting with Carlo', when: 'Monday 10am' }],
    ['Submit report Oct 15', { title: 'Submit report', when: 'Oct 15' }],
    ['Buy groceries', { title: 'Buy groceries' }],
    ['Call mom in 2 hours', { title: 'Call mom', when: 'in 2 hours' }],
    // More day and time words.
    ['Submit report next week', { title: 'Submit report', when: 'next week' }],
    ['Water the plants today', { title: 'Water the plants', when: 'today' }],
    ['Pay rent tomorrow 17:00', { title: 'Pay rent', when: 'tomorrow 17:00' }],
    ['Finish the report by Friday', { title: 'Finish the report', when: 'by Friday' }],
    ['Dentist appointment Friday at 2', { title: 'Dentist appointment', when: 'Friday at 2' }],
    // Time words first, or split around the title.
    [
      'Tomorrow at 5pm, pay the electric bill',
      { title: 'pay the electric bill', when: 'Tomorrow at 5pm' },
    ],
    ['Tomorrow call mom at 5pm', { title: 'call mom', when: 'Tomorrow at 5pm' }],
    // Lead-ins, polite words and priority.
    ["Don't forget to call Ana tonight", { title: 'call Ana', when: 'tonight' }],
    ['Please buy milk.', { title: 'buy milk' }],
    [
      "Call the bank tomorrow, it's urgent",
      { title: 'Call the bank', when: 'tomorrow', priority: 'high' },
    ],
    // A number in a title isn't a time.
    ['Read chapter 5', { title: 'Read chapter 5' }],
    ['Take 2 pills at 8', { title: 'Take 2 pills', when: 'at 8' }],
    [
      'Reserve a table for 4 people tomorrow',
      { title: 'Reserve a table for 4 people', when: 'tomorrow' },
    ],
    // As speech-to-text writes it.
    [
      'Pay electric bill tomorrow at 5 p.m.',
      { title: 'Pay electric bill', when: 'tomorrow at 5 p.m' },
    ],
    ['To-do: buy milk tomorrow', { title: 'buy milk', when: 'tomorrow' }],
    ['Exercise at 6pm', { title: 'Exercise', when: 'at 6pm' }],
  ])('reads %p as a to-do', (text, expected) => {
    expect(parseQuickAdd(text)).toEqual({ kind: 'add-task', ...expected, quickAdd: true });
  });

  it.each([
    // Questions, greetings and statements.
    "What's the weather like?",
    'Is the meeting tomorrow at 10am',
    'Pay the bill tomorrow?',
    'Hello',
    'Good morning',
    'Thanks',
    'I need to pick up the dry cleaning on Friday',
    'The meeting moved to Monday 10am',
    // No to-do verb, or an event with no date.
    'Groceries',
    'Groceries tomorrow',
    'Meeting with Carlo',
    'tomorrow at 5pm',
    // "Finish" alone may mean ticking off a saved task.
    'Finish the report',
    // About saved items or the item just mentioned.
    'Finish my React task',
    'Cancel my dentist task',
    'Finish it',
    'Take it off my list',
    'Check my schedule',
    // Asking Pinsan for something, or a verb with nothing to do.
    'Tell me a joke',
    'Help',
    'Check',
    // More than one request.
    'Call Ana then email Bob',
    // A date in the middle, which code can't take out of the title.
    'Pay the electric bill tomorrow at the bank',
    'Lunch at noon with Ana',
    'Meet Ana at 5 at the cafe',
    '',
  ])('leaves %p alone', (text) => {
    expect(parseQuickAdd(text)).toBeNull();
  });
});

describe('the examples Pinsan suggests', () => {
  it('are all read without the model', () => {
    const examples = [...EXAMPLES.matchAll(/"([^"]+)"/g)].map((match) => match[1]);
    expect(examples).toHaveLength(3);
    for (const example of examples) {
      expect(parseCommandRules(example) ?? parseQuickAdd(example)).not.toBeNull();
    }
  });
});
