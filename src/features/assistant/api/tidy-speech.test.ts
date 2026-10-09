import { tidySpeech } from './tidy-speech';

describe('tidySpeech', () => {
  it.each([
    ['Um, remind me to, uh, buy eggs later.', 'remind me to buy eggs later.'],
    ['Hmm, what do I have today?', 'what do I have today?'],
    ['Pinsan, remind me to call Mom.', 'remind me to call Mom.'],
    ['Hey Pinsan, can you remind me at 5?', 'Hey, can you remind me at 5?'],
    ['Hey Pinson, remind me to call Mom at 7.', 'Hey, remind me to call Mom at 7.'],
    ['Pin San, what are my tasks?', 'what are my tasks?'],
    ['Remind me to stretch, Pinsan.', 'Remind me to stretch.'],
    ['Thank you, Pinsan!', 'Thank you!'],
    ['Hi Pinsan!', 'Hi,'],
  ])('tidies %p', (text, tidy) => {
    expect(tidySpeech(text)).toBe(tidy);
  });

  it.each([
    'Buy a gift for Pinsan',
    'Take Mom to the ER',
    'Drum practice at 5',
    'Write in my journal: Pinsan was cute today',
  ])('leaves %p as it is', (text) => {
    expect(tidySpeech(text)).toBe(text);
  });

  it('keeps his name when it is all that was said', () => {
    expect(tidySpeech('Pinsan?')).toBe('Pinsan?');
  });
});
