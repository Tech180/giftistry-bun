import { parseJsonValue } from '@/common/utils/parse-json-field.util';

export function parseVisibleToUserIds(value: unknown): string[] | null {
  if (value == null) return null;

  const parsed = Array.isArray(value) ? value : parseJsonValue(value);
  if (!Array.isArray(parsed)) return null;

  return parsed.filter((id): id is string => typeof id === 'string');
}
