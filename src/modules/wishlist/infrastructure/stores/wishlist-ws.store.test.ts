import { describe, expect, it } from 'bun:test';
import {
  addWishlistWsConnection,
  clearWishlistWsRegistry,
  isUserPresentOnList,
  removeWishlistWsConnection,
} from './wishlist-ws.store';

describe('wishlist-ws.store', () => {
  it('tracks presence by user on a list', () => {
    clearWishlistWsRegistry();
    expect(isUserPresentOnList('list-1', 'user-1')).toBe(false);

    addWishlistWsConnection('list-1', 'ws-a', {
      userId: 'user-1',
      username: 'alice',
      send: () => {},
    });
    expect(isUserPresentOnList('list-1', 'user-1')).toBe(true);
    expect(isUserPresentOnList('list-1', 'user-2')).toBe(false);

    removeWishlistWsConnection('list-1', 'ws-a');
    expect(isUserPresentOnList('list-1', 'user-1')).toBe(false);
  });
});
