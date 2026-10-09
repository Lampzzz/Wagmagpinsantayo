// Words that say nothing about which item is meant.
const STOPWORDS = new Set([
  'a',
  'about',
  'an',
  'and',
  'at',
  'called',
  'for',
  'in',
  'it',
  'me',
  'my',
  'named',
  'of',
  'on',
  'one',
  'or',
  'our',
  'please',
  'reminder',
  'reminders',
  'task',
  'tasks',
  'that',
  'the',
  'this',
  'titled',
  'to',
  'todo',
  'todos',
  'with',
  'your',
]);

export type TitleMatches<T> = {
  /** Titles with exactly the query's words. */
  exact: T[];
  /** Titles containing every word of the query. */
  strong: T[];
  /** Titles containing at least half of the query's words. */
  weak: T[];
};

/**
 * Finds items whose titles contain the words of `query`, best first: "studying"
 * finds "Study React Native" and "meeting" finds "Team meetings".
 */
export function matchTitle<T extends { title: string }>(
  query: string,
  items: readonly T[],
): TitleMatches<T> {
  const wanted = titleWords(query);
  if (wanted.length === 0) return { exact: [], strong: [], weak: [] };
  const wantedKey = [...wanted].sort().join(' ');

  const scored = items.flatMap((item) => {
    const words = titleWords(item.title);
    const have = new Set(words);
    const found = wanted.filter((word) => have.has(word)).length;
    const score = found / wanted.length;
    if (score < 0.5) return [];
    const exact = [...words].sort().join(' ') === wantedKey;
    // Fewer unmatched title words means a closer match.
    return [{ item, score, exact, extra: words.length - found }];
  });
  scored.sort((a, b) => b.score - a.score || a.extra - b.extra);

  return {
    exact: scored.filter((match) => match.exact).map((match) => match.item),
    strong: scored.filter((match) => match.score === 1).map((match) => match.item),
    weak: scored.filter((match) => match.score < 1).map((match) => match.item),
  };
}

/** True when `query` has no words that could pick out an item, such as "my task". */
export function isBlankQuery(query: string): boolean {
  return titleWords(query).length === 0;
}

function titleWords(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/['’]s\b|['’]/g, '')
    .split(/[^a-z0-9]+/)
    .filter((word) => word !== '' && !STOPWORDS.has(word))
    .map(stem);
}

// Light stemming, enough for "studies", "studying" and "studied" to meet at "study".
function stem(word: string): string {
  let result = word;
  if (result.length > 4 && result.endsWith('ies')) result = `${result.slice(0, -3)}y`;
  else if (result.length > 4 && /(?:ss|x|ch|sh|z)es$/.test(result)) result = result.slice(0, -2);
  else if (result.length > 3 && result.endsWith('s') && !result.endsWith('ss')) {
    result = result.slice(0, -1);
  }

  let trimmedEnding = false;
  if (result.length > 5 && result.endsWith('ied')) {
    result = `${result.slice(0, -3)}y`;
  } else if (result.length > 4 && result.endsWith('ing')) {
    result = result.slice(0, -3);
    trimmedEnding = true;
  } else if (result.length > 4 && result.endsWith('ed')) {
    result = result.slice(0, -2);
    trimmedEnding = true;
  }
  // "running" → "runn" → "run".
  if (trimmedEnding && /([bgmnprt])\1$/.test(result)) result = result.slice(0, -1);
  // "take" and "taking" both become "tak".
  if (result.length > 3 && result.endsWith('e')) result = result.slice(0, -1);
  return result;
}
