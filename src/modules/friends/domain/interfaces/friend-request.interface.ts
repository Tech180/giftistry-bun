import type { FriendRequestStatus } from '../types/friend-request-status.type';

export interface FriendRequest {
  Id: string;
  SenderId: string;
  ReceiverId: string;
  Status: FriendRequestStatus;
  CreatedAt: Date;
  UpdatedAt: Date;
}
