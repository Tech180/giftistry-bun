import { Elysia } from 'elysia';
import type { FriendRepository } from './domain/ports/friend.repository';
import type { FriendRequestRepository } from './domain/ports/friend-request.repository';
import type { UserRepository } from '@/modules/auth/domain/ports/user.repository';
import type { AssertUserCanUseCase } from '@/common/application/user-policy.use-cases';
import type { EventBus } from '@/common/domain/events/event-bus.port';
import { ListFriendsUseCase } from './application/list-friends.use-case';
import { ListFriendRequestsUseCase } from './application/list-friend-requests.use-case';
import { SendFriendRequestUseCase } from './application/send-friend-request.use-case';
import { AcceptFriendRequestUseCase } from './application/accept-friend-request.use-case';
import { DeclineFriendRequestUseCase } from './application/decline-friend-request.use-case';
import { CancelFriendRequestUseCase } from './application/cancel-friend-request.use-case';
import { UnfriendUseCase } from './application/unfriend.use-case';
import { SearchUsersUseCase } from './application/search-users.use-case';
import { friendsRoutes } from './presentation/friends.routes';

export interface FriendsModuleDeps {
  friendRepo: FriendRepository;
  friendRequestRepo: FriendRequestRepository;
  userRepo: UserRepository;
  assertUserCanUseCase: AssertUserCanUseCase;
  eventBus: EventBus;
}

export function createFriendsModule(deps: FriendsModuleDeps) {
  return new Elysia().use(
    friendsRoutes({
      listFriends: new ListFriendsUseCase(deps.friendRepo),
      listFriendRequests: new ListFriendRequestsUseCase(deps.friendRequestRepo),
      sendFriendRequest: new SendFriendRequestUseCase(
        deps.friendRequestRepo,
        deps.friendRepo,
        deps.userRepo,
        deps.eventBus,
        deps.assertUserCanUseCase
      ),
      acceptFriendRequest: new AcceptFriendRequestUseCase(
        deps.friendRequestRepo,
        deps.friendRepo,
        deps.eventBus
      ),
      declineFriendRequest: new DeclineFriendRequestUseCase(deps.friendRequestRepo),
      cancelFriendRequest: new CancelFriendRequestUseCase(deps.friendRequestRepo),
      unfriend: new UnfriendUseCase(deps.friendRepo),
      searchUsers: new SearchUsersUseCase(deps.userRepo, deps.friendRepo),
    })
  );
}
