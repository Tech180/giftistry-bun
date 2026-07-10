import { sql } from '@/common/database/connection';
import { mergeSitePolicy, type SitePolicy } from '@/common/types/user-policy';
import type { SitePolicyRepository } from '@/common/domain/ports/site-policy.repository';
import { SitePolicyVO } from '@/common/domain/site-policy.vo';

let cachedPolicy: SitePolicy | null = null;

export class PostgresSitePolicyRepository implements SitePolicyRepository {
  async get(): Promise<SitePolicy> {
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

    cachedPolicy = SitePolicyVO.default().value;
    return cachedPolicy;
  }

  async save(policy: SitePolicy): Promise<SitePolicy> {
    const merged = mergeSitePolicy(policy);
    await sql`
      INSERT INTO site_policy (id, policy, updated_at)
      VALUES (1, ${JSON.stringify(merged)}::jsonb, CURRENT_TIMESTAMP)
      ON CONFLICT (id) DO UPDATE SET policy = EXCLUDED.policy, updated_at = CURRENT_TIMESTAMP
    `;
    cachedPolicy = merged;
    return merged;
  }

  invalidateCache(): void {
    cachedPolicy = null;
  }
}
