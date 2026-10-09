import { isBlankQuery, matchTitle } from './match-title';

function titles(...names: string[]) {
  return names.map((title, index) => ({ id: index + 1, title }));
}

function ids(items: readonly { id: number }[]) {
  return items.map((item) => item.id);
}

describe('matchTitle', () => {
  it('matches word forms of the same word', () => {
    const items = titles('Study React Native', 'Team meetings', 'Take out the trash');
    expect(ids(matchTitle('studying React Native', items).strong)).toEqual([1]);
    expect(ids(matchTitle('meeting', items).strong)).toEqual([2]);
    expect(ids(matchTitle('taking out trash', items).strong)).toEqual([3]);
  });

  it('treats a partial query as a strong match', () => {
    const items = titles('Finish my project report');
    expect(ids(matchTitle('project', items).strong)).toEqual([1]);
  });

  it('reports several strong matches, closest first', () => {
    const items = titles('Project kickoff prep', 'Project');
    const matches = matchTitle('project', items);
    expect(ids(matches.strong)).toEqual([2, 1]);
    expect(ids(matches.exact)).toEqual([2]);
  });

  it('counts a title with at least half the words as a weak match', () => {
    const items = titles('Call the dentist', 'Buy milk');
    const matches = matchTitle('dentist appointment', items);
    expect(matches.strong).toEqual([]);
    expect(ids(matches.weak)).toEqual([1]);
  });

  it('ignores filler words on both sides', () => {
    const items = titles('Drink water');
    expect(ids(matchTitle('my reminder to drink water', items).exact)).toEqual([1]);
  });

  it('finds nothing for a query made only of filler words', () => {
    expect(matchTitle('my task', titles('Anything'))).toEqual({ exact: [], strong: [], weak: [] });
    expect(isBlankQuery('my task')).toBe(true);
    expect(isBlankQuery('groceries')).toBe(false);
  });
});
