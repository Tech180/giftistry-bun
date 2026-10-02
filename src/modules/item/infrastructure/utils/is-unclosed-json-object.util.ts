/** True when text opens a JSON object (or string inside it) that never closes — typical of max_tokens truncation. */
export function isUnclosedJsonObject(text: string): boolean {
  const start = text.indexOf('{');
  if (start === -1) return false;

  let depth = 0;
  let inString = false;
  let escaped = false;
  for (let i = start; i < text.length; i += 1) {
    const ch = text[i];
    if (inString) {
      if (escaped) {
        escaped = false;
      } else if (ch === '\\') {
        escaped = true;
      } else if (ch === '"') {
        inString = false;
      }
      continue;
    }
    if (ch === '"') {
      inString = true;
    } else if (ch === '{') {
      depth += 1;
    } else if (ch === '}') {
      depth -= 1;
      if (depth === 0) return false;
    }
  }
  return true;
}
