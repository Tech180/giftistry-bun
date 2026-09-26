/** Notify invite-token WebSocket guests (e.g. on revoke). */
export interface InviteGuestRealtimePort {
  notifyRevoked(token: string): void;
}
