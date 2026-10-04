import { JSON_EXPORT_ALWAYS_KEYS } from '../constants/json-export-always-keys.constant';

export function omitEmptyExportValues<T extends Record<string, unknown>>(record: T): Partial<T> {
  const result: Partial<T> = {};

  for (const [key, value] of Object.entries(record)) {
    if (JSON_EXPORT_ALWAYS_KEYS.has(key)) {
      result[key as keyof T] = value as T[keyof T];
      continue;
    }

    if (value === null || value === undefined) {
      continue;
    }

    if (typeof value === 'string' && !value.trim()) {
      continue;
    }

    if (Array.isArray(value) && value.length === 0) {
      continue;
    }

    if (key === 'isFavorite' && value === false) {
      continue;
    }

    result[key as keyof T] = value as T[keyof T];
  }

  return result;
}
