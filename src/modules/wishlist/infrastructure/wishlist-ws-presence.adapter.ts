import type { WishlistPresencePort } from '../domain/ports/wishlist-presence.port';
import { isUserPresentOnList } from './wishlist-ws-registry';

export class WishlistWsPresenceAdapter implements WishlistPresencePort {
  isUserPresentOnList(listId: string, userId: string): boolean {
    return isUserPresentOnList(listId, userId);
  }
}
