import { GetSitePolicyUseCase } from '@/common/application/get-site-policy.use-case';

export class GetSitePolicyAdminUseCase {
  constructor(private getSitePolicy: GetSitePolicyUseCase) {}

  async execute() {
    const policy = await this.getSitePolicy.execute();
    return { Policy: policy };
  }
}
