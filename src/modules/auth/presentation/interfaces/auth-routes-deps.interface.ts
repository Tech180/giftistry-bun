import type { ServerConfigRepository } from '@/modules/system';
import type { UserRepository } from '../../domain/ports/user.repository';
import type { UseCases } from './use-cases.interface';

export interface AuthRoutesDeps {
  useCases: UseCases;
  userRepo: UserRepository;
  serverConfigRepo: ServerConfigRepository;
}
