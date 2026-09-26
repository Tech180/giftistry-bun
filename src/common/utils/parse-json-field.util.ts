/**
 * Decode jsonb columns that may be a string, object, null, or double-encoded string.
 * Returns `null` when a string value cannot be parsed.
 */
export function parseJsonValue(raw: unknown, maxDecodePasses = 2): unknown {
  if (raw === null || raw === undefined) {
    return raw;
  }

  let value: unknown = raw;
  for (let i = 0; i < maxDecodePasses && typeof value === 'string'; i++) {
    try {
      value = JSON.parse(value);
    } catch {
      return null;
    }
  }

  return value;
}

/** Parse a jsonb column with a typed fallback when missing or invalid. */
export function parseJsonField<T>(value: unknown, fallback: T, maxDecodePasses = 2): T {
  if (value === null || value === undefined) {
    return fallback;
  }

  const parsed = parseJsonValue(value, maxDecodePasses);
  if (parsed === null || parsed === undefined) {
    return fallback;
  }

  if (typeof parsed === 'object') {
    return parsed as T;
  }

  return fallback;
}
