import type { FriendRequestWithUser } from '../../domain/interfaces/friend-request-with-user.interface';
export interface FriendRequestsResult {
  incoming: FriendRequestWithUser[];
  outgoing: FriendRequestWithUser[];
}
