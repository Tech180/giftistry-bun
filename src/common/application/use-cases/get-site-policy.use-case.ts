import type { SitePolicyRepository } from '@/common/domain/ports/site-policy.repository';
import type { SitePolicy } from '@/common/domain/interfaces/site-policy.interface';

export class GetSitePolicyUseCase {
  constructor(private sitePolicyRepo: SitePolicyRepository) {}

  async execute(): Promise<SitePolicy> {
    return this.sitePolicyRepo.get();
  }
}
