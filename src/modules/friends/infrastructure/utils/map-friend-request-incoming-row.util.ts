import type { FriendRequestWithUser } from '../../domain/interfaces/friend-request-with-user.interface';
import type { FriendRequestIncomingRow } from '../interfaces/friend-request-incoming-row.interface';
import { mapFriendRequestRow } from './map-friend-request-row.util';

export function mapFriendRequestIncomingRow(row: FriendRequestIncomingRow): FriendRequestWithUser {
  return {
    ...mapFriendRequestRow(row),
    SenderUsername: row.SenderUsername,
    SenderFirstName: row.SenderFirstName,
    SenderLastName: row.SenderLastName,
    SenderAvatar: row.SenderAvatar ?? null,
  };
}
