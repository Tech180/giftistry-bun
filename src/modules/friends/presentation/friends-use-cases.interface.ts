import type { ListFriendsUseCase } from '../application/list-friends.use-case';
import type { ListFriendRequestsUseCase } from '../application/list-friend-requests.use-case';
import type { SendFriendRequestUseCase } from '../application/send-friend-request.use-case';
import type { AcceptFriendRequestUseCase } from '../application/accept-friend-request.use-case';
import type { DeclineFriendRequestUseCase } from '../application/decline-friend-request.use-case';
import type { CancelFriendRequestUseCase } from '../application/cancel-friend-request.use-case';
import type { UnfriendUseCase } from '../application/unfriend.use-case';
import type { SearchUsersUseCase } from '../application/search-users.use-case';

export interface FriendsUseCases {
  listFriends: ListFriendsUseCase;
  listFriendRequests: ListFriendRequestsUseCase;
  sendFriendRequest: SendFriendRequestUseCase;
  acceptFriendRequest: AcceptFriendRequestUseCase;
  declineFriendRequest: DeclineFriendRequestUseCase;
  cancelFriendRequest: CancelFriendRequestUseCase;
  unfriend: UnfriendUseCase;
  searchUsers: SearchUsersUseCase;
}
