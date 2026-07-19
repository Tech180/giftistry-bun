import type {
  CreateAdminUserParams,
  ServerConfig,
  TransferTargetUser,
} from '../server-config.entity';

export interface CreateAdminUserWithLockParams extends CreateAdminUserParams {
  lockKey: number;
}

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
