import type { FriendRequest } from './friend-request.interface';

export interface FriendRequestWithUser extends FriendRequest {
  SenderUsername?: string;
  SenderFirstName?: string;
  SenderLastName?: string;
  SenderAvatar?: string | null;
  ReceiverUsername?: string;
  ReceiverFirstName?: string;
  ReceiverLastName?: string;
  ReceiverAvatar?: string | null;
}
