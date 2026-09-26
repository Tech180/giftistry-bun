import { INVITE_WS_CONNECTIONS } from '../constants/invite-ws-connections.constant';
import type { InviteWsConnectionEntry } from '../interfaces/invite-ws-connection-entry.interface';

export function addInviteWsConnection(
  token: string,
  wsId: string,
  entry: InviteWsConnectionEntry
): void {
  if (!INVITE_WS_CONNECTIONS.has(token)) {
    INVITE_WS_CONNECTIONS.set(token, new Map());
  }
  INVITE_WS_CONNECTIONS.get(token)!.set(wsId, entry);
}

export function removeInviteWsConnection(token: string, wsId: string): void {
  const room = INVITE_WS_CONNECTIONS.get(token);
  if (!room) return;
  room.delete(wsId);
  if (room.size === 0) {
    INVITE_WS_CONNECTIONS.delete(token);
  }
}

/** Send a frame to every connection for this invite token, then close them. */
export function notifyInviteWsRevoked(token: string, payloadJson: string): void {
  const room = INVITE_WS_CONNECTIONS.get(token);
  if (!room) return;

  for (const entry of room.values()) {
    try {
      entry.send(payloadJson);
    } catch {
      /* ignore send failures on closing sockets */
    }
    try {
      entry.close();
    } catch {
      /* ignore close failures */
    }
  }
  INVITE_WS_CONNECTIONS.delete(token);
}

/** Test-only helper */
export function clearInviteWsRegistry(): void {
  INVITE_WS_CONNECTIONS.clear();
}
