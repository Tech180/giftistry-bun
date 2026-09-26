import type { FriendRequestRow } from './friend-request-row.interface';

export interface FriendRequestOutgoingRow extends FriendRequestRow {
  ReceiverUsername: string;
  ReceiverFirstName: string;
  ReceiverLastName: string;
  ReceiverAvatar: string | null;
}
