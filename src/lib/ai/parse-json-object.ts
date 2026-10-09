// The first whole JSON object in the reply. A small model often writes on after it,
// sometimes another of its examples, so the text after its closing brace is left out.
export function parseJsonObject(text: string): unknown {
  const start = text.indexOf('{');
  if (start === -1) return undefined;
  const end = endOfObject(text, start) ?? text.lastIndexOf('}');
  if (end <= start) return undefined;
  try {
    return JSON.parse(text.slice(start, end + 1));
  } catch {
    return undefined;
  }
}

// Where the object that opens at `start` closes, skipping braces inside strings.
function endOfObject(text: string, start: number): number | null {
  let depth = 0;
  let inString = false;
  for (let index = start; index < text.length; index++) {
    const char = text[index];
    if (inString) {
      if (char === '\\') index++;
      else if (char === '"') inString = false;
    } else if (char === '"') {
      inString = true;
    } else if (char === '{') {
      depth++;
    } else if (char === '}' && --depth === 0) {
      return index;
    }
  }
  return null;
}
