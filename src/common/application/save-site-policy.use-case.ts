import type { SitePolicyRepository } from '@/common/domain/ports/site-policy.repository';
import type { SitePolicy } from '@/common/types/user-policy';

export class SaveSitePolicyUseCase {
  constructor(private sitePolicyRepo: SitePolicyRepository) {}

  async execute(policy: SitePolicy): Promise<SitePolicy> {
    return this.sitePolicyRepo.save(policy);
  }
}
