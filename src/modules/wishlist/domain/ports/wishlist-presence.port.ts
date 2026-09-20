export interface WishlistPresencePort {
  isUserPresentOnList(listId: string, userId: string): boolean;
}
