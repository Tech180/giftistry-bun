import type { InviteWsConnectionEntry } from '../interfaces/invite-ws-connection-entry.interface';

/** In-memory registry of active `/ws/invite/:token` connections keyed by invite token. */
export const INVITE_WS_CONNECTIONS = new Map<string, Map<string, InviteWsConnectionEntry>>();
