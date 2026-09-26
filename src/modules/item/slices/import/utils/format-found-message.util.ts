export function formatFoundMessage(count: number): string {
  return `Found ${count} item${count === 1 ? '' : 's'}`;
}
