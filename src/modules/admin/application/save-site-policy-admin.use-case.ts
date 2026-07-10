import { SaveSitePolicyUseCase } from '@/common/application/save-site-policy.use-case';
import type { WriteAuditLogUseCase } from '@/common/application/write-audit-log.use-case';
import type { SitePolicy } from '@/common/types/user-policy';

export class SaveSitePolicyAdminUseCase {
  constructor(
    private saveSitePolicy: SaveSitePolicyUseCase,
    private writeAuditLog: WriteAuditLogUseCase
  ) {}

  async execute(actorId: string, policy: SitePolicy, ip?: string | null) {
    const saved = await this.saveSitePolicy.execute(policy);
    await this.writeAuditLog.execute({
      actorId,
      action: 'admin.site_policy_change',
      metadata: policy,
      ip,
    });
    return { Policy: saved };
  }
}
