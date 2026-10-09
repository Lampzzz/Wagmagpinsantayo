// Slurs and strong swearing, as speech-to-text spells them.
const BLOCKED =
  /\b(?:nigg(?:a|er)s?|(?:mother)?fuck(?:s|ed|er|ers|ing|in)?|(?:bull)?shit(?:s|ty)?|bitch(?:es)?|assholes?|cunts?|fag(?:got)?s?|retard(?:ed|s)?|whores?|sluts?|putang ?ina|tangina)\b/gi;

/** Covers slurs and strong swearing with asterisks, keeping the first letter: "f***". */
export function maskProfanity(text: string): string {
  return text.replace(BLOCKED, (word) => word[0] + '*'.repeat(word.length - 1));
}
