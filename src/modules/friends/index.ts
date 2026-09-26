/** Public barrel for the friends module. Prefer this over deep imports. */
export type { FriendRepository } from './domain/ports/friend.repository';
export type { FriendRequestRepository } from './domain/ports/friend-request.repository';
export type { Friend } from './domain/interfaces/friend.interface';
export type { FriendRequest } from './domain/interfaces/friend-request.interface';
export type { FriendWithUser } from './domain/interfaces/friend-with-user.interface';
export type { FriendRequestWithUser } from './domain/interfaces/friend-request-with-user.interface';
export type { UserSearchResult } from './domain/interfaces/user-search-result.interface';
export type { FriendRequestStatus } from './domain/types/friend-request-status.type';
export type { FriendRequestsResult } from './application/use-cases/list-friend-requests.use-case';
export type { UseCases as FriendsUseCases } from './presentation/interfaces/use-cases.interface';
export type { FriendsModuleDeps } from './interfaces/friends-module-deps.interface';
export { FriendRequestEntity } from './domain/friend-request.entity';
export { FriendRequestSentEvent } from './domain/events/friend-request-sent.event';
export { FriendRequestAcceptedEvent } from './domain/events/friend-request-accepted.event';
export { createFriendsModule } from './friends.module';
