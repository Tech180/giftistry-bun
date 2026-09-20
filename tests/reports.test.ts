import { describe, test, expect, beforeAll, afterAll } from 'bun:test';
import { app } from '../src/index';
import { sql } from '../src/common/database/connection';
import { createTestUser } from './helper';

describe('Content reports', () => {
  const timestamp = Date.now();
  let userToken: string;
  let userId: string;
  let targetUserId: string;

  beforeAll(async () => {
    const reporter = await createTestUser(`report_r_${timestamp}`, `report_r_${timestamp}@example.com`);
    const target = await createTestUser(`report_t_${timestamp}`, `report_t_${timestamp}@example.com`);
    userToken = reporter.token;
    userId = reporter.userId;
    targetUserId = target.userId;
  });

  afterAll(async () => {
    await sql`DELETE FROM content_reports WHERE reporter_id = ${userId}`;
    await sql`DELETE FROM users WHERE id IN (${userId}, ${targetUserId})`;
  });

  test('authenticated user can submit a content report', async () => {
    const res = await app.handle(
      new Request('http://localhost/api/reports', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${userToken}`,
        },
        body: JSON.stringify({
          Giftistry: {
            Report: {
              TargetType: 'user',
              TargetId: targetUserId,
              Reason: 'spam',
            },
          },
        }),
      })
    );

    expect(res.status).toBe(200);
    const body = await res.json() as { Meta: { Status: string } };
    expect(body.Meta.Status).toBe('Success');

    const [row] = await sql<{ target_id: string; reason: string }[]>`
      SELECT target_id, reason FROM content_reports
      WHERE reporter_id = ${userId} AND target_id = ${targetUserId}
      ORDER BY created_at DESC
      LIMIT 1
    `;
    expect(row?.target_id).toBe(targetUserId);
    expect(row?.reason).toBe('spam');
  });

  test('unauthenticated request is rejected', async () => {
    const res = await app.handle(
      new Request('http://localhost/api/reports', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          Giftistry: {
            Report: {
              TargetType: 'user',
              TargetId: targetUserId,
            },
          },
        }),
      })
    );
    expect(res.status).toBe(401);
  });
});
