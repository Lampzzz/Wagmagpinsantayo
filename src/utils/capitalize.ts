/** Uppercases the first letter: "today at 3 PM" → "Today at 3 PM". */
export function capitalize(text: string): string {
  return text.charAt(0).toUpperCase() + text.slice(1);
}
