import { describe, test, expect, afterAll, beforeAll } from 'bun:test';
import { app } from '../src/index';
import { sql } from '../src/common/database/connection';
import { cleanUpUser, testPassword } from './helper';

describe('Product tutorial', () => {
  const timestamp = Date.now();
  const username = `tour_user_${timestamp}`;
  const email = `tour_user_${timestamp}@example.com`;
  let userId = '';
  let token = '';
  let previousRegistrationMode: string | null = null;

  async function signup() {
    const res = await app.handle(
      new Request('http://localhost/api/auth/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          Giftistry: {
            Auth: {
              Username: username,
              Email: email,
              Password: testPassword,
              FirstName: 'Tour',
              LastName: 'User',
            },
          },
        }),
      })
    );
    const body = await res.json() as {
      Meta?: { Status?: string };
      Result?: { Token?: string; User?: { Id?: string; Tour?: unknown } };
    };
    return { res, body };
  }

  async function patchTutorial(payload: Record<string, unknown>) {
    return app.handle(
      new Request('http://localhost/api/auth/tutorial', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          Giftistry: {
            Tutorial: payload,
          },
        }),
      })
    );
  }

  beforeAll(async () => {
    const [policyRow] = await sql<{ policy: unknown }[]>`
      SELECT policy FROM site_policy WHERE id = 1
    `;
    const existingPolicy =
      typeof policyRow?.policy === 'string'
        ? JSON.parse(policyRow.policy)
        : (policyRow?.policy as Record<string, unknown> | null) ?? {};
    previousRegistrationMode =
      typeof existingPolicy.RegistrationMode === 'string'
        ? existingPolicy.RegistrationMode
        : null;
    await sql`
      INSERT INTO site_policy (id, policy, updated_at)
      VALUES (
        1,
        ${JSON.stringify({ ...existingPolicy, RegistrationMode: 'open' })}::jsonb,
        CURRENT_TIMESTAMP
      )
      ON CONFLICT (id) DO UPDATE SET
        policy = ${JSON.stringify({ ...existingPolicy, RegistrationMode: 'open' })}::jsonb,
        updated_at = CURRENT_TIMESTAMP
    `;

    const { res, body } = await signup();
    expect(res.status).toBe(200);
    token = body.Result?.Token ?? '';
    userId = body.Result?.User?.Id ?? '';
    expect(token).toBeTruthy();
    expect(userId).toBeTruthy();
  });

  afterAll(async () => {
    await cleanUpUser(userId);
    if (previousRegistrationMode !== null) {
      const [policyRow] = await sql<{ policy: unknown }[]>`
        SELECT policy FROM site_policy WHERE id = 1
      `;
      const existingPolicy =
        typeof policyRow?.policy === 'string'
          ? JSON.parse(policyRow.policy)
          : (policyRow?.policy as Record<string, unknown> | null) ?? {};
      await sql`
        UPDATE site_policy
        SET policy = ${JSON.stringify({
          ...existingPolicy,
          RegistrationMode: previousRegistrationMode,
        })}::jsonb,
            updated_at = CURRENT_TIMESTAMP
        WHERE id = 1
      `;
    }
  });

  test('signup user has empty tour on /me', async () => {
    const res = await app.handle(
      new Request('http://localhost/api/auth/me', {
        method: 'GET',
        headers: { Authorization: `Bearer ${token}` },
      })
    );
    expect(res.status).toBe(200);
    const body = await res.json() as {
      Result?: { User?: { Tour?: { FirstRunDismissed?: boolean; Chapters?: Record<string, string> } } };
    };
    expect(body.Result?.User?.Tour?.FirstRunDismissed).toBe(false);
    expect(body.Result?.User?.Tour?.Chapters ?? {}).toEqual({});
  });

  test('PATCH tutorial completes and skips chapters', async () => {
    const completeRes = await patchTutorial({ CompleteChapter: 'demo' });
    expect(completeRes.status).toBe(200);
    const completeBody = await completeRes.json() as {
      Result?: { Tour?: { Chapters?: Record<string, string> } };
    };
    expect(completeBody.Result?.Tour?.Chapters?.demo).toBe('completed');

    const skipRes = await patchTutorial({ SkipChapter: 'beginner' });
    expect(skipRes.status).toBe(200);
    const skipBody = await skipRes.json() as {
      Result?: { Tour?: { Chapters?: Record<string, string> } };
    };
    expect(skipBody.Result?.Tour?.Chapters?.demo).toBe('completed');
    expect(skipBody.Result?.Tour?.Chapters?.beginner).toBe('skipped');
  });

  test('PATCH tutorial dismisses first run and resets chapter', async () => {
    const dismissRes = await patchTutorial({ FirstRunDismissed: true });
    expect(dismissRes.status).toBe(200);
    const dismissBody = await dismissRes.json() as {
      Result?: { Tour?: { FirstRunDismissed?: boolean } };
    };
    expect(dismissBody.Result?.Tour?.FirstRunDismissed).toBe(true);

    const resetRes = await patchTutorial({ ResetChapter: 'beginner' });
    expect(resetRes.status).toBe(200);
    const resetBody = await resetRes.json() as {
      Result?: { Tour?: { Chapters?: Record<string, string> } };
    };
    expect(resetBody.Result?.Tour?.Chapters?.beginner).toBeUndefined();
    expect(resetBody.Result?.Tour?.Chapters?.demo).toBe('completed');
  });

  test('PATCH tutorial ResetAll clears state', async () => {
    const res = await patchTutorial({ ResetAll: true });
    expect(res.status).toBe(200);
    const body = await res.json() as {
      Result?: { Tour?: { FirstRunDismissed?: boolean; Chapters?: Record<string, string> } };
    };
    expect(body.Result?.Tour?.FirstRunDismissed).toBe(false);
    expect(body.Result?.Tour?.Chapters ?? {}).toEqual({});
  });

  test('PATCH tutorial rejects invalid chapter', async () => {
    const res = await patchTutorial({ CompleteChapter: 'not-a-chapter' });
    expect(res.status).toBe(400);
  });

  test('PATCH tutorial requires auth', async () => {
    const res = await app.handle(
      new Request('http://localhost/api/auth/tutorial', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          Giftistry: {
            Tutorial: { CompleteChapter: 'demo' },
          },
        }),
      })
    );
    expect(res.status).toBe(401);
  });
});
