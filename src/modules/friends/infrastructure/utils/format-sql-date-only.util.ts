export function formatSqlDateOnly(value: Date | string | null | undefined): string | null {
  if (!value) {
    return null;
  }

  return value instanceof Date ? value.toISOString().split('T')[0]! : String(value);
}
