import { loadConfig, saveConfig, sql } from '@/common/database/connection';
import { initializeSchema } from '@/common/database/init-schema';
import type { ServerConfigRepository } from '../domain/ports/server-config.repository';
import type {
  CreateAdminUserParams,
  ServerConfig,
  TransferTargetUser,
} from '../domain/server-config.entity';

export class PostgresServerConfigRepository implements ServerConfigRepository {
  load(): ServerConfig {
    return loadConfig();
  }

  save(config: ServerConfig): void {
    saveConfig(config);
  }

  async isSystemInitialized(): Promise<boolean> {
    try {
      const [row] = await sql<any[]>`
        SELECT EXISTS (
          SELECT FROM information_schema.tables
          WHERE table_name = 'users'
        ) as exists
      `;
      if (row?.exists) {
        const [countRow] = await sql<any[]>`SELECT COUNT(*)::integer as count FROM users`;
        return !!(countRow && countRow.count > 0);
      }
    } catch {
      return false;
    }
    return false;
  }

  async findExistingUser(username: string, email: string): Promise<{ id: string } | null> {
    const [existing] = await sql<{ id: string }[]>`
      SELECT id FROM users WHERE username = ${username} OR email = ${email}
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

  async isUserOwner(userId: string): Promise<boolean> {
    const [row] = await sql<{ IsOwner: boolean }[]>`
      SELECT is_owner as "IsOwner" FROM users WHERE id = ${userId}
    `;
    return !!row?.IsOwner;
  }

  async findTransferTarget(userId: string): Promise<TransferTargetUser | null> {
    const [target] = await sql<{ id: string; username: string; IsDisabled: boolean }[]>`
      SELECT id, username, is_disabled as "IsDisabled"
      FROM users WHERE id = ${userId}
    `;
    if (!target) return null;
    return {
      id: target.id,
      username: target.username,
      isDisabled: target.IsDisabled,
    };
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
