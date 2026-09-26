import type { InviteGuestRealtimePort } from '../../domain/ports/invite-guest-realtime.port';
import { notifyInviteWsRevoked } from '../stores/invite-ws.store';

export class InviteGuestRealtimeAdapter implements InviteGuestRealtimePort {
  notifyRevoked(token: string): void {
    notifyInviteWsRevoked(token, JSON.stringify({ Type: 'invite.revoked' }));
  }
}
