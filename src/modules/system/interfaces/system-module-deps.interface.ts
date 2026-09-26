import type { GetSitePolicyUseCase } from '@/common/application/use-cases/get-site-policy.use-case';
import type { SaveSitePolicyUseCase } from '@/common/application/use-cases/save-site-policy.use-case';
import type { WriteAuditLogUseCase } from '@/common/application/use-cases/write-audit-log.use-case';
import type { ServerConfigRepository } from '../domain/ports/server-config.repository';

export interface SystemModuleDeps {
  serverConfigRepo: ServerConfigRepository;
  getSitePolicyUseCase: GetSitePolicyUseCase;
  saveSitePolicyUseCase: SaveSitePolicyUseCase;
  writeAuditLogUseCase: WriteAuditLogUseCase;
}
