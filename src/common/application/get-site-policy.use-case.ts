import type { SitePolicyRepository } from '@/common/domain/ports/site-policy.repository';
import type { SitePolicy } from '@/common/types/user-policy';

export class GetSitePolicyUseCase {
  constructor(private sitePolicyRepo: SitePolicyRepository) {}

  async execute(): Promise<SitePolicy> {
    return this.sitePolicyRepo.get();
  }
}
