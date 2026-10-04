import type { AssertUserCanUseCase } from '@/common/application/use-cases/user-policy.use-cases';
import type { ServerConfigRepository } from '@/modules/system/domain/ports/server-config.repository';

export interface GiphyModuleDeps {
  serverConfigRepo: ServerConfigRepository;
  assertUserCanUseCase: AssertUserCanUseCase;
}
