import type { FriendRequestRepository } from '../domain/ports/friend-request.repository';
import type { FriendRequest, FriendRequestStatus, FriendRequestWithUser } from '../domain/friend.entity';
import { sql } from '@/common/database/connection';

export class PostgresFriendRequestRepository implements FriendRequestRepository {
  async create(senderId: string, receiverId: string): Promise<FriendRequest> {
    const [row] = await sql<any[]>`
      INSERT INTO friend_requests (sender_id, receiver_id, status)
      VALUES (${senderId}, ${receiverId}, 'pending')
      ON CONFLICT (sender_id, receiver_id) DO UPDATE
      SET status = 'pending', updated_at = CURRENT_TIMESTAMP
      RETURNING id as "Id", sender_id as "SenderId", receiver_id as "ReceiverId",
                status as "Status", created_at as "CreatedAt", updated_at as "UpdatedAt"
    `;
    if (!row) throw new Error('Failed to create friend request');
    return this.mapRequest(row);
  }

  async findById(id: string): Promise<FriendRequest | null> {
    const [row] = await sql<any[]>`
      SELECT id as "Id", sender_id as "SenderId", receiver_id as "ReceiverId",
             status as "Status", created_at as "CreatedAt", updated_at as "UpdatedAt"
      FROM friend_requests
      WHERE id = ${id}
    `;
    return row ? this.mapRequest(row) : null;
  }

  async findPendingBetween(senderId: string, receiverId: string): Promise<FriendRequest | null> {
    const [row] = await sql<any[]>`
      SELECT id as "Id", sender_id as "SenderId", receiver_id as "ReceiverId",
             status as "Status", created_at as "CreatedAt", updated_at as "UpdatedAt"
      FROM friend_requests
      WHERE sender_id = ${senderId} AND receiver_id = ${receiverId} AND status = 'pending'
    `;
    return row ? this.mapRequest(row) : null;
  }

  async updateStatus(id: string, status: FriendRequestStatus): Promise<FriendRequest> {
    const [row] = await sql<any[]>`
      UPDATE friend_requests
      SET status = ${status}, updated_at = CURRENT_TIMESTAMP
      WHERE id = ${id}
      RETURNING id as "Id", sender_id as "SenderId", receiver_id as "ReceiverId",
                status as "Status", created_at as "CreatedAt", updated_at as "UpdatedAt"
    `;
    if (!row) throw new Error('Failed to update friend request');
    return this.mapRequest(row);
  }

  async listIncoming(userId: string): Promise<FriendRequestWithUser[]> {
    const rows = await sql<any[]>`
      SELECT fr.id as "Id", fr.sender_id as "SenderId", fr.receiver_id as "ReceiverId",
             fr.status as "Status", fr.created_at as "CreatedAt", fr.updated_at as "UpdatedAt",
             su.username as "SenderUsername", su.first_name as "SenderFirstName",
             su.last_name as "SenderLastName", su.avatar as "SenderAvatar"
      FROM friend_requests fr
      JOIN users su ON fr.sender_id = su.id
      WHERE fr.receiver_id = ${userId} AND fr.status = 'pending'
      ORDER BY fr.created_at DESC
    `;
    return rows.map(row => ({
      ...this.mapRequest(row),
      SenderUsername: row.SenderUsername,
      SenderFirstName: row.SenderFirstName,
      SenderLastName: row.SenderLastName,
      SenderAvatar: row.SenderAvatar ?? null,
    }));
  }

  async listOutgoing(userId: string): Promise<FriendRequestWithUser[]> {
    const rows = await sql<any[]>`
      SELECT fr.id as "Id", fr.sender_id as "SenderId", fr.receiver_id as "ReceiverId",
             fr.status as "Status", fr.created_at as "CreatedAt", fr.updated_at as "UpdatedAt",
             ru.username as "ReceiverUsername", ru.first_name as "ReceiverFirstName",
             ru.last_name as "ReceiverLastName", ru.avatar as "ReceiverAvatar"
      FROM friend_requests fr
      JOIN users ru ON fr.receiver_id = ru.id
      WHERE fr.sender_id = ${userId} AND fr.status = 'pending'
      ORDER BY fr.created_at DESC
    `;
    return rows.map(row => ({
      ...this.mapRequest(row),
      ReceiverUsername: row.ReceiverUsername,
      ReceiverFirstName: row.ReceiverFirstName,
      ReceiverLastName: row.ReceiverLastName,
      ReceiverAvatar: row.ReceiverAvatar ?? null,
    }));
  }

  private mapRequest(row: any): FriendRequest {
    return {
      Id: row.Id,
      SenderId: row.SenderId,
      ReceiverId: row.ReceiverId,
      Status: row.Status as FriendRequestStatus,
      CreatedAt: new Date(row.CreatedAt),
      UpdatedAt: new Date(row.UpdatedAt),
    };
  }
}
