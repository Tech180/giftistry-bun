import { getOnlineUsers } from '@/modules/wishlist/infrastructure/stores/wishlist-ws.store';
import type { WishlistPresencePublishTransport } from '@/boot/interfaces/wishlist-presence-publish-transport.interface';

export function publishPresence(listId: string, ws?: WishlistPresencePublishTransport): void {
  const users = getOnlineUsers(listId);
  const payload = JSON.stringify({ Type: 'presence', Users: users });

  if (ws?.publish) {
    ws.publish(listId, payload);
  }
  if (ws?.send) {
    ws.send(payload);
  }
}
