import type { FriendRequest, FriendRequestStatus, FriendRequestWithUser } from '../friend.entity';

export interface FriendRequestRepository {
  create(senderId: string, receiverId: string): Promise<FriendRequest>;
  findById(id: string): Promise<FriendRequest | null>;
  findPendingBetween(senderId: string, receiverId: string): Promise<FriendRequest | null>;
  updateStatus(id: string, status: FriendRequestStatus): Promise<FriendRequest>;
  listIncoming(userId: string): Promise<FriendRequestWithUser[]>;
  listOutgoing(userId: string): Promise<FriendRequestWithUser[]>;
}
