import type {
  CreatePushSubscriptionInput,
  PushSubscriptionRepository,
} from '../domain/ports/push-subscription.repository';
import type { PushSubscription } from '../domain/push-subscription.entity';
import { sql } from '@/common/database/connection';

export class PostgresPushSubscriptionRepository implements PushSubscriptionRepository {
  async create(input: CreatePushSubscriptionInput): Promise<PushSubscription> {
    const [row] = await sql<any[]>`
      INSERT INTO user_push_subscriptions (
        user_id, platform, transport, endpoint, endpoint_auth, p256dh, is_primary
      )
      VALUES (
        ${input.userId},
        ${input.platform},
        ${input.transport},
        ${input.endpoint},
        ${input.endpointAuth ?? null},
        ${input.p256dh ?? null},
        ${input.isPrimary === true}
      )
      RETURNING id as "Id", user_id as "UserId", platform as "Platform", transport as "Transport",
                endpoint as "Endpoint", endpoint_auth as "EndpointAuth", p256dh as "P256dh",
                is_primary as "IsPrimary", created_at as "CreatedAt", last_seen_at as "LastSeenAt"
    `;
    if (!row) throw new Error('Failed to create push subscription');
    return this.map(row);
  }

  async findByUserId(userId: string): Promise<PushSubscription[]> {
    const rows = await sql<any[]>`
      SELECT id as "Id", user_id as "UserId", platform as "Platform", transport as "Transport",
             endpoint as "Endpoint", endpoint_auth as "EndpointAuth", p256dh as "P256dh",
             is_primary as "IsPrimary", created_at as "CreatedAt", last_seen_at as "LastSeenAt"
      FROM user_push_subscriptions
      WHERE user_id = ${userId}
      ORDER BY created_at DESC
    `;
    return rows.map((row) => this.map(row));
  }

  async findById(id: string, userId: string): Promise<PushSubscription | null> {
    const [row] = await sql<any[]>`
      SELECT id as "Id", user_id as "UserId", platform as "Platform", transport as "Transport",
             endpoint as "Endpoint", endpoint_auth as "EndpointAuth", p256dh as "P256dh",
             is_primary as "IsPrimary", created_at as "CreatedAt", last_seen_at as "LastSeenAt"
      FROM user_push_subscriptions
      WHERE id = ${id} AND user_id = ${userId}
    `;
    return row ? this.map(row) : null;
  }

  async deleteById(id: string, userId: string): Promise<void> {
    await sql`DELETE FROM user_push_subscriptions WHERE id = ${id} AND user_id = ${userId}`;
  }

  async setPrimary(id: string, userId: string): Promise<PushSubscription> {
    await sql`
      UPDATE user_push_subscriptions SET is_primary = FALSE WHERE user_id = ${userId}
    `;
    const [row] = await sql<any[]>`
      UPDATE user_push_subscriptions
      SET is_primary = TRUE, last_seen_at = CURRENT_TIMESTAMP
      WHERE id = ${id} AND user_id = ${userId}
      RETURNING id as "Id", user_id as "UserId", platform as "Platform", transport as "Transport",
                endpoint as "Endpoint", endpoint_auth as "EndpointAuth", p256dh as "P256dh",
                is_primary as "IsPrimary", created_at as "CreatedAt", last_seen_at as "LastSeenAt"
    `;
    if (!row) throw new Error('Push subscription not found');
    return this.map(row);
  }

  async touchLastSeen(id: string, userId: string): Promise<void> {
    await sql`
      UPDATE user_push_subscriptions
      SET last_seen_at = CURRENT_TIMESTAMP
      WHERE id = ${id} AND user_id = ${userId}
    `;
  }

  private map(row: any): PushSubscription {
    return {
      Id: row.Id,
      UserId: row.UserId,
      Platform: row.Platform,
      Transport: row.Transport,
      Endpoint: row.Endpoint,
      EndpointAuth: row.EndpointAuth ?? null,
      P256dh: row.P256dh ?? null,
      IsPrimary: !!row.IsPrimary,
      CreatedAt: new Date(row.CreatedAt),
      LastSeenAt: row.LastSeenAt ? new Date(row.LastSeenAt) : null,
    };
  }
}
