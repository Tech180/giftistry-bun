import type { WishlistPresencePort } from '../../domain/ports/wishlist-presence.port';
import { isUserPresentOnList } from '../stores/wishlist-ws.store';

export class WishlistWsPresenceAdapter implements WishlistPresencePort {
  isUserPresentOnList(listId: string, userId: string): boolean {
    return isUserPresentOnList(listId, userId);
  }
}
