// Sounds speech-to-text writes down that aren't words: "Um, remind me to, uh, buy eggs".
const FILLERS = /(?:^|[\s,]+)(?:um+|uh+m*|hm+|mm+|erm+)(?=[\s,.!?]|$)[,.]?/gi;

// Pinsan, however speech-to-text spells him: "Pinsan", "Pin San", "Pinson", "Pinsen".
const NAME = String.raw`p[iey]n[\s-]?[sz][aeiou]n`;
// Calling him first: "Pinsan, …", "Hey Pinsan, …". The greeting stays, the name goes.
const CALLED_FIRST = new RegExp(
  String.raw`^(?:(hey|hi|hello|yo|ok|okay|oh|so)[\s,]+)?${NAME}\b[\s,.!:;-]*`,
  'i',
);
// Calling him last, after a comma: "…, Pinsan."
const CALLED_LAST = new RegExp(String.raw`,\s*${NAME}\s*([.!?]*)$`, 'i');
// Speech-to-text can mishear his name as some other word, even a covered-up one
// ("Hello n****, …"). One word between a greeting and a comma is still him.
const MISHEARD_FIRST = /^(hey|hi|hello|yo)[\s,]+[^\s,]+,\s*(?=\S)/i;
const COVERED_LAST = /,\s*[a-z]\*+\s*([.!?]*)$/i;

/**
 * Takes out what isn't part of the request: fillers like "um" and "uh", and Pinsan's name
 * when he's called by it. "Um, hey Pinsan, remind me to, uh, call Mom." → "hey, remind me
 * to call Mom." His name alone ("Pinsan?") is kept, so it can still be answered.
 */
export function tidySpeech(text: string): string {
  const words = text.replace(FILLERS, ' ').replace(/\s+/g, ' ').trim();
  const tidy = words
    .replace(CALLED_FIRST, (_, greeting?: string) => (greeting ? `${greeting}, ` : ''))
    .replace(MISHEARD_FIRST, '$1, ')
    .replace(CALLED_LAST, '$1')
    .replace(COVERED_LAST, '$1')
    .replace(/^[\s,.;:!?-]+/, '')
    .trim();
  return /[a-z0-9]/i.test(tidy) ? tidy : words.replace(/^[\s,.;:!?-]+/, '');
}
