import type { AcceptFriendRequestUseCase } from '../../application/use-cases/accept-friend-request.use-case';
import type { CancelFriendRequestUseCase } from '../../application/use-cases/cancel-friend-request.use-case';
import type { DeclineFriendRequestUseCase } from '../../application/use-cases/decline-friend-request.use-case';
import type { ListFriendRequestsUseCase } from '../../application/use-cases/list-friend-requests.use-case';
import type { ListFriendsUseCase } from '../../application/use-cases/list-friends.use-case';
import type { SearchUsersUseCase } from '../../application/use-cases/search-users.use-case';
import type { SendFriendRequestUseCase } from '../../application/use-cases/send-friend-request.use-case';
import type { UnfriendUseCase } from '../../application/use-cases/unfriend.use-case';

export interface UseCases {
  listFriends: ListFriendsUseCase;
  listFriendRequests: ListFriendRequestsUseCase;
  sendFriendRequest: SendFriendRequestUseCase;
  acceptFriendRequest: AcceptFriendRequestUseCase;
  declineFriendRequest: DeclineFriendRequestUseCase;
  cancelFriendRequest: CancelFriendRequestUseCase;
  unfriend: UnfriendUseCase;
  searchUsers: SearchUsersUseCase;
}
