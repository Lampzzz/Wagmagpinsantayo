import { findNewFacts } from './find-new-facts';

describe('findNewFacts', () => {
  describe('accepts a faithful tidy-up', () => {
    it.each([
      ['a bullet list', 'um list this eggs milk and uh bread', '- Eggs\n- Milk\n- Bread'],
      ['a numbered list', 'first call the bank then email sam', '1. Call the bank\n2. Email Sam'],
      [
        'a time written differently',
        'meet ana at 3 p.m. tomorrow',
        'Meet Ana at 3:00 PM tomorrow.',
      ],
      ['a spoken number as digits', 'pay twenty five dollars', 'Pay $25.'],
      ['a long spoken number', 'order one hundred and five chairs', 'Order 105 chairs.'],
      ['a thousands separator', 'the budget is 2500 pesos', 'Budget: 2,500 pesos'],
      ['a month abbreviation', 'the report is due october 15th', 'Report due Oct 15.'],
      ['a spoken time as digits', 'call mom at ten thirty', 'Call Mom at 10:30.'],
      ['a plural weekday', 'gym on mondays', 'Gym every Monday.'],
      ['"may" as a verb', 'i may be late to the meeting', 'I may be late to the meeting.'],
      ['"am" as a verb', "i'm heading home", 'I am heading home.'],
    ])('%s', (_name, source, output) => {
      expect(findNewFacts(source, output)).toEqual([]);
    });
  });

  describe('flags added facts', () => {
    it.each([
      ['an invented time', 'meet ana tomorrow', 'Meet Ana tomorrow at 3pm.', ['3', 'pm']],
      ['an invented weekday', 'finish the slides', 'Finish the slides by Fri.', ['friday']],
      ['an invented day', 'finish the slides', 'Finish the slides tomorrow.', ['tomorrow']],
      ['a calculated amount', 'buy 2 dozen eggs', 'Buy 24 eggs.', ['24']],
      ['separate numbers merged', 'pick one and two', 'Pick 3.', ['3']],
      ['a changed number', 'the meeting is at 4', 'The meeting is at 5.', ['5']],
      ['a count in a title', 'eggs milk and bread', '3 Things to Buy', ['3']],
    ])('%s', (_name, source, output, expected) => {
      expect(findNewFacts(source, output)).toEqual(expected);
    });
  });
});
