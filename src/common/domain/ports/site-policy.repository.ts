import type { SitePolicy } from '../interfaces/site-policy.interface';

export interface SitePolicyRepository {
  get(): Promise<SitePolicy>;
  save(policy: SitePolicy): Promise<SitePolicy>;
  invalidateCache(): void;
}
