import type { FriendRequest } from '../../domain/interfaces/friend-request.interface';
import type { FriendRequestStatus } from '../../domain/types/friend-request-status.type';
import type { FriendRequestRow } from '../interfaces/friend-request-row.interface';

export function mapFriendRequestRow(row: FriendRequestRow): FriendRequest {
  return {
    Id: row.Id,
    SenderId: row.SenderId,
    ReceiverId: row.ReceiverId,
    Status: row.Status as FriendRequestStatus,
    CreatedAt: new Date(row.CreatedAt),
    UpdatedAt: new Date(row.UpdatedAt),
  };
}
