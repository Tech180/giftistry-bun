import type { SitePolicy } from '@/common/types/user-policy';

export interface SitePolicyRepository {
  get(): Promise<SitePolicy>;
  save(policy: SitePolicy): Promise<SitePolicy>;
  invalidateCache(): void;
}
