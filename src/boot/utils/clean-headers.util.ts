export function cleanHeaders(headers: unknown): Record<string, string> {
  const result: Record<string, string> = { 'Content-Type': 'application/json' };
  if (headers && typeof headers === 'object') {
    for (const [key, value] of Object.entries(headers)) {
      if (value !== undefined && value !== null) {
        result[key] = String(value);
      }
    }
  }
  return result;
}
