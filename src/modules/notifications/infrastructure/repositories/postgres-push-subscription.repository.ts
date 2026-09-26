import { sql } from '@/common/database';
import type { CreatePushSubscriptionInput } from '../../domain/interfaces/create-push-subscription-input.interface';
import type { PushSubscription } from '../../domain/interfaces/push-subscription.interface';
import type { PushSubscriptionRepository } from '../../domain/ports/push-subscription.repository';
import { PUSH_SUBSCRIPTION_SELECT } from '../constants/push-subscription-select.constant';
import type { PushSubscriptionRow } from '../interfaces/push-subscription-row.interface';
import { mapPushSubscriptionRow } from '../utils/map-push-subscription-row.util';

export class PostgresPushSubscriptionRepository implements PushSubscriptionRepository {
  async create(input: CreatePushSubscriptionInput): Promise<PushSubscription> {
    const [row] = await sql<PushSubscriptionRow[]>`
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
      RETURNING ${sql.unsafe(PUSH_SUBSCRIPTION_SELECT)}
    `;
    if (!row) {
      throw new Error('Failed to create push subscription');
    }
    return mapPushSubscriptionRow(row);
  }

  async findByUserId(userId: string): Promise<PushSubscription[]> {
    const rows = await sql<PushSubscriptionRow[]>`
      SELECT ${sql.unsafe(PUSH_SUBSCRIPTION_SELECT)}
      FROM user_push_subscriptions
      WHERE user_id = ${userId}
      ORDER BY created_at DESC
    `;
    return rows.map(mapPushSubscriptionRow);
  }

  async findById(id: string, userId: string): Promise<PushSubscription | null> {
    const [row] = await sql<PushSubscriptionRow[]>`
      SELECT ${sql.unsafe(PUSH_SUBSCRIPTION_SELECT)}
      FROM user_push_subscriptions
      WHERE id = ${id} AND user_id = ${userId}
    `;
    return row ? mapPushSubscriptionRow(row) : null;
  }

  async deleteById(id: string, userId: string): Promise<void> {
    await sql`DELETE FROM user_push_subscriptions WHERE id = ${id} AND user_id = ${userId}`;
  }

  async setPrimary(id: string, userId: string): Promise<PushSubscription> {
    await sql`
      UPDATE user_push_subscriptions SET is_primary = FALSE WHERE user_id = ${userId}
    `;
    const [row] = await sql<PushSubscriptionRow[]>`
      UPDATE user_push_subscriptions
      SET is_primary = TRUE, last_seen_at = CURRENT_TIMESTAMP
      WHERE id = ${id} AND user_id = ${userId}
      RETURNING ${sql.unsafe(PUSH_SUBSCRIPTION_SELECT)}
    `;
    if (!row) {
      throw new Error('Push subscription not found');
    }
    return mapPushSubscriptionRow(row);
  }

  async touchLastSeen(id: string, userId: string): Promise<void> {
    await sql`
      UPDATE user_push_subscriptions
      SET last_seen_at = CURRENT_TIMESTAMP
      WHERE id = ${id} AND user_id = ${userId}
    `;
  }
}
