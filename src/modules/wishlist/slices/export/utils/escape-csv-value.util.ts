export function escapeCsvValue(val: unknown): string {
  if (val === null || val === undefined) {
    return '""';
  }
  const str = String(val);
  return `"${str.replace(/"/g, '""')}"`;
}
