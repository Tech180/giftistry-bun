import type { FriendRequestWithUser } from '../../domain/interfaces/friend-request-with-user.interface';
import type { FriendRequestOutgoingRow } from '../interfaces/friend-request-outgoing-row.interface';
import { mapFriendRequestRow } from './map-friend-request-row.util';

export function mapFriendRequestOutgoingRow(row: FriendRequestOutgoingRow): FriendRequestWithUser {
  return {
    ...mapFriendRequestRow(row),
    ReceiverUsername: row.ReceiverUsername,
    ReceiverFirstName: row.ReceiverFirstName,
    ReceiverLastName: row.ReceiverLastName,
    ReceiverAvatar: row.ReceiverAvatar ?? null,
  };
}
