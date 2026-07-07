import { Elysia } from 'elysia';
import { PostgresFriendRepository } from './infrastructure/postgres-friend.repository';
import { PostgresFriendRequestRepository } from './infrastructure/postgres-friend-request.repository';
import { ListFriendsUseCase } from './application/list-friends.use-case';
import { ListFriendRequestsUseCase } from './application/list-friend-requests.use-case';
import { SendFriendRequestUseCase } from './application/send-friend-request.use-case';
import { AcceptFriendRequestUseCase } from './application/accept-friend-request.use-case';
import { DeclineFriendRequestUseCase } from './application/decline-friend-request.use-case';
import { CancelFriendRequestUseCase } from './application/cancel-friend-request.use-case';
import { UnfriendUseCase } from './application/unfriend.use-case';
import { SearchUsersUseCase } from './application/search-users.use-case';
import { friendsRoutes } from './presentation/friends.routes';

const friendRepo = new PostgresFriendRepository();
const friendRequestRepo = new PostgresFriendRequestRepository();

const listFriendsUseCase = new ListFriendsUseCase(friendRepo);
const listFriendRequestsUseCase = new ListFriendRequestsUseCase(friendRequestRepo);
const sendFriendRequestUseCase = new SendFriendRequestUseCase(friendRequestRepo, friendRepo);
const acceptFriendRequestUseCase = new AcceptFriendRequestUseCase(friendRequestRepo, friendRepo);
const declineFriendRequestUseCase = new DeclineFriendRequestUseCase(friendRequestRepo);
const cancelFriendRequestUseCase = new CancelFriendRequestUseCase(friendRequestRepo);
const unfriendUseCase = new UnfriendUseCase(friendRepo);
const searchUsersUseCase = new SearchUsersUseCase();

export const friendsModule = new Elysia()
  .use(friendsRoutes({
    listFriends: listFriendsUseCase,
    listFriendRequests: listFriendRequestsUseCase,
    sendFriendRequest: sendFriendRequestUseCase,
    acceptFriendRequest: acceptFriendRequestUseCase,
    declineFriendRequest: declineFriendRequestUseCase,
    cancelFriendRequest: cancelFriendRequestUseCase,
    unfriend: unfriendUseCase,
    searchUsers: searchUsersUseCase,
  }));

export { friendRepo as sharedPostgresFriendRepository };
