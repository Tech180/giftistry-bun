import { Elysia } from 'elysia';
import { AcceptFriendRequestUseCase } from './application/use-cases/accept-friend-request.use-case';
import { CancelFriendRequestUseCase } from './application/use-cases/cancel-friend-request.use-case';
import { DeclineFriendRequestUseCase } from './application/use-cases/decline-friend-request.use-case';
import { ListFriendRequestsUseCase } from './application/use-cases/list-friend-requests.use-case';
import { ListFriendsUseCase } from './application/use-cases/list-friends.use-case';
import { SearchUsersUseCase } from './application/use-cases/search-users.use-case';
import { SendFriendRequestUseCase } from './application/use-cases/send-friend-request.use-case';
import { UnfriendUseCase } from './application/use-cases/unfriend.use-case';
import type { FriendsModuleDeps } from './interfaces/friends-module-deps.interface';
import { friendsRoutes } from './presentation/friends.routes';

export function createFriendsModule(deps: FriendsModuleDeps) {
  return new Elysia().use(
    friendsRoutes({
      useCases: {
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
      },
    })
  );
}
