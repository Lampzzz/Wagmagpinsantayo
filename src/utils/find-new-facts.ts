// Numbers (with thousands separators, decimals or times like 3:30) and words.
const TOKEN_PATTERN = /(?:\d{1,3}(?:,\d{3})+|\d+)(?:[.:]\d+)*|[a-z]+/g;
const LIST_MARKER_PATTERN = /^[ \t]*(?:[-*•]|\d{1,2}[.)])[ \t]+/gm;
// "3 p.m." and "3p.m." become "3 pm" and "3pm".
const DOTTED_MERIDIEM_PATTERN = /([\d\s])([ap])\.\s?m\b\.?/g;

const NUMBER_WORDS = new Map<string, number>([
  ['zero', 0],
  ['one', 1],
  ['two', 2],
  ['three', 3],
  ['four', 4],
  ['five', 5],
  ['six', 6],
  ['seven', 7],
  ['eight', 8],
  ['nine', 9],
  ['ten', 10],
  ['eleven', 11],
  ['twelve', 12],
  ['thirteen', 13],
  ['fourteen', 14],
  ['fifteen', 15],
  ['sixteen', 16],
  ['seventeen', 17],
  ['eighteen', 18],
  ['nineteen', 19],
  ['twenty', 20],
  ['thirty', 30],
  ['forty', 40],
  ['fifty', 50],
  ['sixty', 60],
  ['seventy', 70],
  ['eighty', 80],
  ['ninety', 90],
  ['third', 3],
  ['fourth', 4],
  ['fifth', 5],
  ['sixth', 6],
  ['seventh', 7],
  ['eighth', 8],
  ['ninth', 9],
  ['tenth', 10],
  ['eleventh', 11],
  ['twelfth', 12],
  ['thirteenth', 13],
  ['fourteenth', 14],
  ['fifteenth', 15],
  ['sixteenth', 16],
  ['seventeenth', 17],
  ['eighteenth', 18],
  ['nineteenth', 19],
  ['twentieth', 20],
  ['thirtieth', 30],
]);
// Counted only in what the user said. In a tidied note they usually order steps
// ("First, call the bank") or mean a moment ("wait a second").
const SEQUENCE_WORDS = new Map<string, number>([
  ['first', 1],
  ['second', 2],
]);
const MULTIPLIERS = new Map<string, number>([
  ['hundred', 100],
  ['dozen', 12],
]);
const SCALES = new Map<string, number>([
  ['thousand', 1_000],
  ['million', 1_000_000],
  ['billion', 1_000_000_000],
]);

// Each spelling maps to one name, so "Oct" matches "October". "may" is left out
// because it is usually a verb, and "sat"/"sun" because they are usually words.
const DATE_WORDS = new Map<string, string>([
  ['january', 'january'],
  ['jan', 'january'],
  ['february', 'february'],
  ['feb', 'february'],
  ['march', 'march'],
  ['mar', 'march'],
  ['april', 'april'],
  ['apr', 'april'],
  ['june', 'june'],
  ['jun', 'june'],
  ['july', 'july'],
  ['jul', 'july'],
  ['august', 'august'],
  ['aug', 'august'],
  ['september', 'september'],
  ['sep', 'september'],
  ['sept', 'september'],
  ['october', 'october'],
  ['oct', 'october'],
  ['november', 'november'],
  ['nov', 'november'],
  ['december', 'december'],
  ['dec', 'december'],
  ['monday', 'monday'],
  ['mon', 'monday'],
  ['tuesday', 'tuesday'],
  ['tue', 'tuesday'],
  ['tues', 'tuesday'],
  ['wednesday', 'wednesday'],
  ['wed', 'wednesday'],
  ['thursday', 'thursday'],
  ['thu', 'thursday'],
  ['thur', 'thursday'],
  ['thurs', 'thursday'],
  ['friday', 'friday'],
  ['fri', 'friday'],
  ['saturday', 'saturday'],
  ['sunday', 'sunday'],
  ['today', 'today'],
  ['tonight', 'tonight'],
  ['tomorrow', 'tomorrow'],
  ['yesterday', 'yesterday'],
  ['noon', 'noon'],
  ['midnight', 'midnight'],
]);
const MERIDIEMS = new Set(['am', 'pm']);

type Side = 'source' | 'output';

/**
 * Lists the numbers and date words in `output` that `source` never mentions,
 * so code can catch AI text that adds facts. Rewording, reordering and dropping
 * words is fine, and so is changing how a number is written ("twenty five" to
 * "25", "3 p.m." to "3:00 PM"). Inventing a time, amount or day is not.
 * Names and other words aren't checked.
 */
export function findNewFacts(source: string, output: string): string[] {
  const known = collectFacts(normalize(source), 'source');
  const added = collectFacts(normalize(output.replace(LIST_MARKER_PATTERN, '')), 'output');
  return [...added].filter((fact) => !known.has(fact));
}

function normalize(text: string) {
  return text.toLowerCase().replace(DOTTED_MERIDIEM_PATTERN, '$1$2m');
}

/**
 * The source side is generous: it also counts each number word on its own, so
 * "three thirty" covers "3:30". The output side counts only whole phrases.
 */
function collectFacts(text: string, side: Side): Set<string> {
  const facts = new Set<string>();
  const tokens = text.match(TOKEN_PATTERN) ?? [];
  let phrase: string[] = [];

  const closePhrase = () => {
    if (phrase.length > 0) facts.add(String(phraseValue(phrase)));
    phrase = [];
  };

  tokens.forEach((token, index) => {
    if (isDigits(token)) {
      closePhrase();
      digitValues(token).forEach((value) => facts.add(value));
      return;
    }
    if (isNumberWord(token, side)) {
      phrase.push(token);
      if (side === 'source') facts.add(String(phraseValue([token])));
      return;
    }
    // "one hundred and five" is one number, but "one and two" is two.
    if (token === 'and' && continuesPhrase(phrase, tokens[index + 1], side)) return;
    closePhrase();

    const dateWord = toDateWord(token);
    if (dateWord) {
      facts.add(dateWord);
    } else if (MERIDIEMS.has(token) && (side === 'source' || followsNumber(tokens, index))) {
      // In the output, "am" only counts after a number, so "I am" isn't a time.
      facts.add(token);
    }
  });
  closePhrase();
  return facts;
}

function isDigits(token: string | undefined) {
  return token !== undefined && /^\d/.test(token);
}

// "2,500.75" gives 2500 and 75. The "00" in "3:00" says nothing new, so it is skipped.
function digitValues(token: string): string[] {
  return token
    .replace(/,/g, '')
    .split(/[.:]/)
    .filter((part) => !/^0{2,}$/.test(part))
    .map((part) => String(Number(part)));
}

function isNumberWord(token: string | undefined, side: Side) {
  if (token === undefined) return false;
  return (
    NUMBER_WORDS.has(token) ||
    MULTIPLIERS.has(token) ||
    SCALES.has(token) ||
    (side === 'source' && SEQUENCE_WORDS.has(token))
  );
}

function continuesPhrase(phrase: readonly string[], next: string | undefined, side: Side) {
  const last = phrase.at(-1);
  return (
    last !== undefined && (MULTIPLIERS.has(last) || SCALES.has(last)) && isNumberWord(next, side)
  );
}

function followsNumber(tokens: readonly string[], index: number) {
  const previous = tokens[index - 1];
  return isDigits(previous) || isNumberWord(previous, 'output');
}

function phraseValue(words: readonly string[]): number {
  let total = 0;
  let current = 0;
  for (const word of words) {
    const scale = SCALES.get(word);
    const multiplier = MULTIPLIERS.get(word);
    if (scale !== undefined) {
      total += (current || 1) * scale;
      current = 0;
    } else if (multiplier !== undefined) {
      current = (current || 1) * multiplier;
    } else {
      current += NUMBER_WORDS.get(word) ?? SEQUENCE_WORDS.get(word) ?? 0;
    }
  }
  return total + current;
}

// Plurals of full names count too: "Mondays" is "monday".
function toDateWord(token: string) {
  const dateWord = DATE_WORDS.get(token);
  if (dateWord || !token.endsWith('s')) return dateWord;
  const singular = token.slice(0, -1);
  return DATE_WORDS.get(singular) === singular ? singular : undefined;
}
