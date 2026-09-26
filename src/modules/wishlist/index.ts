/** Public barrel for the wishlist module. Prefer this over deep imports. */
export type { WishlistRepository } from './domain/ports/wishlist.repository';
export type { ListShareRepository } from './domain/ports/list-share.repository';
export type { ListChangedPublisher } from './domain/ports/list-changed-publisher.port';
export type { WishlistPresencePort } from './domain/ports/wishlist-presence.port';
export type { WishlistLookupPort } from './domain/ports/wishlist-lookup.port';
export type { WishlistRef } from './domain/interfaces/wishlist-ref.interface';
export { toWishlistRef } from './domain/utils/to-wishlist-ref.util';
export type { Wishlist } from './domain/interfaces/wishlist.interface';
export type { Priority } from './domain/interfaces/priority.interface';
export { WishlistEntity } from './domain/wishlist.entity';
export type { ListShare } from './domain/interfaces/list-share.interface';
export type { ShareRole } from './domain/types/share-role.type';
export { assertWishlistMutable } from './domain/utils/assert-wishlist-mutable.util';
export { WishlistSharedEvent } from './domain/events/wishlist-shared.event';
export { CheckListAccessUseCase } from './slices/access/use-cases/check-list-access.use-case';
export { CreateWishlistUseCase } from './slices/lists/use-cases/create-wishlist.use-case';
export {
  createWishlistModule,
  createCheckListAccessUseCase,
} from './wishlist.module';
export {
  addWishlistWsConnection,
  getOnlineUsers,
  removeWishlistWsConnection,
  getWishlistWsRoom,
} from './infrastructure/stores/wishlist-ws.store';
export type { WishlistWsRoomEntry } from './infrastructure/interfaces/wishlist-ws-room-entry.type';
