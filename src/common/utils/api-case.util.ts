/**
 * Converts API JSON keys to PascalCase for client-facing responses.
 * Keys that already start with an uppercase letter are left unchanged.
 */

export function toPascalCaseKey(key: string): string {
  if (!key) return key;
  if (/^[A-Z]/.test(key)) return key;

  return key
    .split(/[-_]/)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join('');
}

export function pascalizeKeys(value: unknown): unknown {
  if (value === null || value === undefined) return value;
  if (value instanceof Date) return value;
  if (Array.isArray(value)) return value.map(pascalizeKeys);
  if (typeof value !== 'object') return value;

  const result: Record<string, unknown> = {};
  for (const [key, nested] of Object.entries(value as Record<string, unknown>)) {
    result[toPascalCaseKey(key)] = pascalizeKeys(nested);
  }
  return result;
}
