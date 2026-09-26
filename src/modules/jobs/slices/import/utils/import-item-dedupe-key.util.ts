export function importItemDedupeKey(name: string, linkUrl?: string | null): string {
  return `${name.trim().toLowerCase()}\0${(linkUrl || '').trim().toLowerCase()}`;
}
