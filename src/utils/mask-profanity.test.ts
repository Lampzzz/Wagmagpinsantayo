import { maskProfanity } from './mask-profanity';

// A slur speech-to-text wrote on the demo phone, spelled in pieces here.
const SLUR = ['n', 'i', 'g', 'g', 'a'].join('');

describe('maskProfanity', () => {
  it.each([
    [`Hello ${SLUR}, tell me a joke.`, 'Hello n****, tell me a joke.'],
    ['This is FUCKING great', 'This is F****** great'],
    ['Oh shit, I forgot', 'Oh s***, I forgot'],
    ['Putangina, remind me at 5', 'P********, remind me at 5'],
  ])('covers up %p', (text, masked) => {
    expect(maskProfanity(text)).toBe(masked);
  });

  it.each([
    'Remind me to call Mom at 7',
    'Buy shiitake mushrooms',
    'Pass the class',
    'Scunthorpe trip on Friday',
  ])('leaves %p as it is', (text) => {
    expect(maskProfanity(text)).toBe(text);
  });
});
