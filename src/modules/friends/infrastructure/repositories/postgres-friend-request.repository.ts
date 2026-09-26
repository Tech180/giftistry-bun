import { sql } from '@/common/database';
import type { FriendRequest } from '../../domain/interfaces/friend-request.interface';
import type { FriendRequestWithUser } from '../../domain/interfaces/friend-request-with-user.interface';
import type { FriendRequestRepository } from '../../domain/ports/friend-request.repository';
import type { FriendRequestStatus } from '../../domain/types/friend-request-status.type';
import { FRIEND_REQUEST_SELECT } from '../constants/friend-request-select.constant';
import type { FriendRequestIncomingRow } from '../interfaces/friend-request-incoming-row.interface';
import type { FriendRequestOutgoingRow } from '../interfaces/friend-request-outgoing-row.interface';
import type { FriendRequestRow } from '../interfaces/friend-request-row.interface';
import { mapFriendRequestIncomingRow } from '../utils/map-friend-request-incoming-row.util';
import { mapFriendRequestOutgoingRow } from '../utils/map-friend-request-outgoing-row.util';
import { mapFriendRequestRow } from '../utils/map-friend-request-row.util';

export class PostgresFriendRequestRepository implements FriendRequestRepository {
  async create(senderId: string, receiverId: string): Promise<FriendRequest> {
    const [row] = await sql<FriendRequestRow[]>`
      INSERT INTO friend_requests (sender_id, receiver_id, status)
      VALUES (${senderId}, ${receiverId}, 'pending')
      ON CONFLICT (sender_id, receiver_id) DO UPDATE
      SET status = 'pending', updated_at = CURRENT_TIMESTAMP
      RETURNING ${sql.unsafe(FRIEND_REQUEST_SELECT)}
    `;
    if (!row) {
      throw new Error('Failed to create friend request');
    }
    return mapFriendRequestRow(row);
  }

  async findById(id: string): Promise<FriendRequest | null> {
    const [row] = await sql<FriendRequestRow[]>`
      SELECT ${sql.unsafe(FRIEND_REQUEST_SELECT)}
      FROM friend_requests
      WHERE id = ${id}
    `;
    return row ? mapFriendRequestRow(row) : null;
  }

  async findPendingBetween(senderId: string, receiverId: string): Promise<FriendRequest | null> {
    const [row] = await sql<FriendRequestRow[]>`
      SELECT ${sql.unsafe(FRIEND_REQUEST_SELECT)}
      FROM friend_requests
      WHERE sender_id = ${senderId} AND receiver_id = ${receiverId} AND status = 'pending'
    `;
    return row ? mapFriendRequestRow(row) : null;
  }

  async updateStatus(id: string, status: FriendRequestStatus): Promise<FriendRequest> {
    const [row] = await sql<FriendRequestRow[]>`
      UPDATE friend_requests
      SET status = ${status}, updated_at = CURRENT_TIMESTAMP
      WHERE id = ${id}
      RETURNING ${sql.unsafe(FRIEND_REQUEST_SELECT)}
    `;
    if (!row) {
      throw new Error('Failed to update friend request');
    }
    return mapFriendRequestRow(row);
  }

  async listIncoming(userId: string): Promise<FriendRequestWithUser[]> {
    const rows = await sql<FriendRequestIncomingRow[]>`
      SELECT fr.id as "Id", fr.sender_id as "SenderId", fr.receiver_id as "ReceiverId",
             fr.status as "Status", fr.created_at as "CreatedAt", fr.updated_at as "UpdatedAt",
             su.username as "SenderUsername", su.first_name as "SenderFirstName",
             su.last_name as "SenderLastName", su.avatar as "SenderAvatar"
      FROM friend_requests fr
      JOIN users su ON fr.sender_id = su.id
      WHERE fr.receiver_id = ${userId} AND fr.status = 'pending'
      ORDER BY fr.created_at DESC
    `;
    return rows.map(mapFriendRequestIncomingRow);
  }

  async listOutgoing(userId: string): Promise<FriendRequestWithUser[]> {
    const rows = await sql<FriendRequestOutgoingRow[]>`
      SELECT fr.id as "Id", fr.sender_id as "SenderId", fr.receiver_id as "ReceiverId",
             fr.status as "Status", fr.created_at as "CreatedAt", fr.updated_at as "UpdatedAt",
             ru.username as "ReceiverUsername", ru.first_name as "ReceiverFirstName",
             ru.last_name as "ReceiverLastName", ru.avatar as "ReceiverAvatar"
      FROM friend_requests fr
      JOIN users ru ON fr.receiver_id = ru.id
      WHERE fr.sender_id = ${userId} AND fr.status = 'pending'
      ORDER BY fr.created_at DESC
    `;
    return rows.map(mapFriendRequestOutgoingRow);
  }
}
