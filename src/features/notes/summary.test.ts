import {
  cleanSummary,
  formatSummary,
  isSummaryReply,
  isUsableSummary,
  prependSummary,
} from './summary';

const NOTE =
  'Team sync on Monday. Ana presents the budget of 2,500 pesos. Ben books the venue for ' +
  '40 people and buys 2.5 kg of rice. Slides are due Friday.';

describe('isSummaryReply', () => {
  it('accepts an object with a list of strings', () => {
    expect(isSummaryReply({ bullets: ['One point', 'Another'] })).toBe(true);
    expect(isSummaryReply({ bullets: [] })).toBe(true);
  });

  it.each([null, 'text', ['a'], {}, { bullets: 'a' }, { bullets: [1, 2] }, { points: ['a'] }])(
    'rejects %p',
    (value) => {
      expect(isSummaryReply(value)).toBe(false);
    },
  );
});

describe('cleanSummary', () => {
  it('strips list markers and extra spaces', () => {
    expect(
      cleanSummary(
        ['- Team sync on Monday.', '•  Ana presents  the budget', '2) Slides due Friday'],
        NOTE,
      ),
    ).toEqual(['Team sync on Monday.', 'Ana presents the budget', 'Slides due Friday']);
  });

  it('keeps a number that starts a bullet', () => {
    expect(cleanSummary(['2.5 kg of rice for the team'], NOTE)).toEqual([
      '2.5 kg of rice for the team',
    ]);
  });

  it('drops empty and repeated bullets', () => {
    expect(cleanSummary(['Team sync', ' ', '- ', 'team sync', 'Venue booked'], NOTE)).toEqual([
      'Team sync',
      'Venue booked',
    ]);
  });

  it('drops bullets that add a number or date the note never mentions', () => {
    expect(
      cleanSummary(
        [
          'Ben books the venue for 50 people.',
          'Slides are due Thursday.',
          'The budget is 2,500 pesos.',
          'Ben books a venue for forty people.',
        ],
        NOTE,
      ),
    ).toEqual(['The budget is 2,500 pesos.', 'Ben books a venue for forty people.']);
  });

  it('keeps at most five bullets', () => {
    const bullets = ['Team sync', 'Budget', 'Venue', 'Rice', 'Slides', 'Monday', 'Ana'];
    expect(cleanSummary(bullets, NOTE)).toEqual(['Team sync', 'Budget', 'Venue', 'Rice', 'Slides']);
  });
});

describe('isUsableSummary', () => {
  it('needs at least two bullets that stick to the note', () => {
    expect(isUsableSummary({ bullets: ['Team sync on Monday', 'Slides due Friday'] }, NOTE)).toBe(
      true,
    );
    expect(isUsableSummary({ bullets: ['Team sync on Monday'] }, NOTE)).toBe(false);
    expect(isUsableSummary({ bullets: ['Team sync on Monday', 'Party on Sunday'] }, NOTE)).toBe(
      false,
    );
    expect(isUsableSummary({ text: 'Team sync' }, NOTE)).toBe(false);
  });
});

describe('prependSummary', () => {
  const bullets = ['Team sync on Monday', 'Slides due Friday'];

  it('formats the summary as a short list', () => {
    expect(formatSummary(bullets)).toBe('Summary:\n- Team sync on Monday\n- Slides due Friday');
  });

  it('adds the summary above the body and keeps the title', () => {
    expect(prependSummary({ title: 'Sync', body: NOTE }, bullets)).toEqual({
      title: 'Sync',
      body: `Summary:\n- Team sync on Monday\n- Slides due Friday\n\n${NOTE}`,
    });
  });

  it('adds no blank lines to an empty body', () => {
    expect(prependSummary({ title: 'Sync', body: ' ' }, bullets).body).toBe(
      'Summary:\n- Team sync on Monday\n- Slides due Friday',
    );
  });
});
