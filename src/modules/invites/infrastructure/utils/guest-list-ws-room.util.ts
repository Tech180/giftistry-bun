/** Elysia publish topic for guests subscribed via `/ws/invite/:token`. */
export function guestListWsRoom(listId: string): string {
  return `guest-list:${listId}`;
}
