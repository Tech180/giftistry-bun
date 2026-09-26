import type { FriendRequestRow } from './friend-request-row.interface';

export interface FriendRequestIncomingRow extends FriendRequestRow {
  SenderUsername: string;
  SenderFirstName: string;
  SenderLastName: string;
  SenderAvatar: string | null;
}
