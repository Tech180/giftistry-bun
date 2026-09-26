import { initializeSchema, loadConfig, saveConfig, sql } from '@/common/database';
import { AppError } from '@/common/domain/errors/app-error';
import type { CreateAdminUserParams } from '../../domain/interfaces/create-admin-user-params.interface';
import type { CreateAdminUserWithLockParams } from '../../domain/interfaces/create-admin-user-with-lock-params.interface';
import type { ServerConfig } from '../../domain/interfaces/server-config.interface';
import type { TransferTargetUser } from '../../domain/interfaces/transfer-target-user.interface';
import type { ServerConfigRepository } from '../../domain/ports/server-config.repository';
import type { TransferTargetUserRow } from '../interfaces/transfer-target-user-row.interface';
import { mapTransferTargetUserRow } from '../utils/map-transfer-target-user-row.util';

export class PostgresServerConfigRepository implements ServerConfigRepository {
  load(): ServerConfig {
    return loadConfig();
  }

  save(config: ServerConfig): void {
    saveConfig(config);
  }

  async isSystemInitialized(): Promise<boolean> {
    try {
      const [row] = await sql<{ exists: boolean }[]>`
        SELECT EXISTS (
          SELECT FROM information_schema.tables
          WHERE table_name = 'users'
        ) as exists
      `;
      if (row?.exists) {
        const [countRow] = await sql<{ count: number }[]>`
          SELECT COUNT(*)::integer as count FROM users
        `;
        return !!(countRow && countRow.count > 0);
      }
    } catch {
      return false;
    }
    return false;
  }

  async findExistingUser(username: string, email: string | null): Promise<{ id: string } | null> {
    if (email) {
      const [existing] = await sql<{ id: string }[]>`
        SELECT id FROM users WHERE username = ${username} OR email = ${email}
      `;
      return existing ?? null;
    }
    const [existing] = await sql<{ id: string }[]>`
      SELECT id FROM users WHERE username = ${username}
    `;
    return existing ?? null;
  }

  async createAdminUser(params: CreateAdminUserParams): Promise<void> {
    await sql`
      INSERT INTO users (username, email, first_name, last_name, auth_hash, is_admin, is_owner, email_verified)
      VALUES (
        ${params.username},
        ${params.email},
        ${params.firstName},
        ${params.lastName},
        ${params.authHash},
        true,
        true,
        true
      )
    `;
  }

  async createAdminUserWithLock(params: CreateAdminUserWithLockParams): Promise<void> {
    await sql.begin(async (tx) => {
      await tx`SELECT pg_advisory_xact_lock(${params.lockKey})`;

      const [countRow] = await tx<{ count: number }[]>`
        SELECT COUNT(*)::integer as count FROM users
      `;
      if (countRow && countRow.count > 0) {
        throw new AppError('Forbidden: System already setup', 400, 'BAD_REQUEST');
      }

      if (params.email) {
        const [existing] = await tx<{ id: string }[]>`
          SELECT id FROM users WHERE username = ${params.username} OR email = ${params.email}
        `;
        if (existing) {
          throw new AppError('User already exists in setup phase', 400, 'BAD_REQUEST');
        }
      } else {
        const [existing] = await tx<{ id: string }[]>`
          SELECT id FROM users WHERE username = ${params.username}
        `;
        if (existing) {
          throw new AppError('User already exists in setup phase', 400, 'BAD_REQUEST');
        }
      }

      await tx`
        INSERT INTO users (username, email, first_name, last_name, auth_hash, is_admin, is_owner, email_verified)
        VALUES (
          ${params.username},
          ${params.email},
          ${params.firstName},
          ${params.lastName},
          ${params.authHash},
          true,
          true,
          true
        )
      `;
    });
  }

  async isUserOwner(userId: string): Promise<boolean> {
    const [row] = await sql<{ IsOwner: boolean }[]>`
      SELECT is_owner as "IsOwner" FROM users WHERE id = ${userId}
    `;
    return !!row?.IsOwner;
  }

  async findTransferTarget(userId: string): Promise<TransferTargetUser | null> {
    const [target] = await sql<TransferTargetUserRow[]>`
      SELECT id, username, is_disabled as "IsDisabled"
      FROM users WHERE id = ${userId}
    `;
    return target ? mapTransferTargetUserRow(target) : null;
  }

  async transferOwnership(fromUserId: string, toUserId: string): Promise<void> {
    await sql.begin(async (tx) => {
      await tx`UPDATE users SET is_owner = false WHERE id = ${fromUserId}`;
      await tx`UPDATE users SET is_owner = true, is_admin = true WHERE id = ${toUserId}`;
    });
  }

  async deleteAllServerData(): Promise<void> {
    await sql`DELETE FROM user_passkeys`;
    await sql`DELETE FROM users`;
  }

  async initializeSchema(): Promise<void> {
    await initializeSchema(sql);
  }
}
