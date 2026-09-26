import type { CreateAdminUserParams } from '../interfaces/create-admin-user-params.interface';
import type { CreateAdminUserWithLockParams } from '../interfaces/create-admin-user-with-lock-params.interface';
import type { ServerConfig } from '../interfaces/server-config.interface';
import type { TransferTargetUser } from '../interfaces/transfer-target-user.interface';

export interface ServerConfigRepository {
  load(): ServerConfig;
  save(config: ServerConfig): void;
  isSystemInitialized(): Promise<boolean>;
  findExistingUser(username: string, email: string | null): Promise<{ id: string } | null>;
  createAdminUser(params: CreateAdminUserParams): Promise<void>;
  /** Advisory-locked transactional admin create for first-boot race safety. */
  createAdminUserWithLock(params: CreateAdminUserWithLockParams): Promise<void>;
  isUserOwner(userId: string): Promise<boolean>;
  findTransferTarget(userId: string): Promise<TransferTargetUser | null>;
  transferOwnership(fromUserId: string, toUserId: string): Promise<void>;
  deleteAllServerData(): Promise<void>;
  initializeSchema(): Promise<void>;
}
