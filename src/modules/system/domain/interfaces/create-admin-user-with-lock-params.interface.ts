import type { CreateAdminUserParams } from './create-admin-user-params.interface';

export interface CreateAdminUserWithLockParams extends CreateAdminUserParams {
  lockKey: number;
}
