/** Deduplicate and trim room ids for fanout publish. */
export function uniqueFanoutRooms(
  rooms: Array<string | null | undefined>
): string[] {
  return Array.from(
    new Set(
      rooms
        .map((room) => (typeof room === 'string' ? room.trim() : ''))
        .filter(Boolean)
    )
  );
}
