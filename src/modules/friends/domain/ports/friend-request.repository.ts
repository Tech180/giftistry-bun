import type { FriendRequest } from '../interfaces/friend-request.interface';
import type { FriendRequestWithUser } from '../interfaces/friend-request-with-user.interface';
import type { FriendRequestStatus } from '../types/friend-request-status.type';

export interface FriendRequestRepository {
  create(senderId: string, receiverId: string): Promise<FriendRequest>;
  findById(id: string): Promise<FriendRequest | null>;
  findPendingBetween(senderId: string, receiverId: string): Promise<FriendRequest | null>;
  updateStatus(id: string, status: FriendRequestStatus): Promise<FriendRequest>;
  listIncoming(userId: string): Promise<FriendRequestWithUser[]>;
  listOutgoing(userId: string): Promise<FriendRequestWithUser[]>;
}
