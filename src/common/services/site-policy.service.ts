import { sql } from '@/common/database/connection';
import { DEFAULT_SITE_POLICY, mergeSitePolicy, type SitePolicy } from '@/common/types/user-policy';

let cachedPolicy: SitePolicy | null = null;

export async function getSitePolicy(): Promise<SitePolicy> {
  if (cachedPolicy) return cachedPolicy;

  try {
    const [row] = await sql<any[]>`
      SELECT policy FROM site_policy WHERE id = 1
    `;
    if (row?.policy) {
      const parsed = typeof row.policy === 'string' ? JSON.parse(row.policy) : row.policy;
      cachedPolicy = mergeSitePolicy(parsed);
      return cachedPolicy;
    }
  } catch {
    // table may not exist yet during early boot
  }

  cachedPolicy = { ...DEFAULT_SITE_POLICY, defaultUserPolicy: { ...DEFAULT_SITE_POLICY.defaultUserPolicy } };
  return cachedPolicy;
}

export async function saveSitePolicy(policy: SitePolicy): Promise<SitePolicy> {
  const merged = mergeSitePolicy(policy);
  await sql`
    INSERT INTO site_policy (id, policy, updated_at)
    VALUES (1, ${JSON.stringify(merged)}::jsonb, CURRENT_TIMESTAMP)
    ON CONFLICT (id) DO UPDATE SET policy = EXCLUDED.policy, updated_at = CURRENT_TIMESTAMP
  `;
  cachedPolicy = merged;
  return merged;
}

export function invalidateSitePolicyCache(): void {
  cachedPolicy = null;
}
