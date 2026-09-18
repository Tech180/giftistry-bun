import type {
  CreateRegistrationInviteInput,
  RegistrationInviteRepository,
} from '../domain/ports/registration-invite.repository';
import type { RegistrationInvite } from '../domain/registration-invite.entity';
import { sql } from '@/common/database/connection';

export class PostgresRegistrationInviteRepository implements RegistrationInviteRepository {
  async findActive(): Promise<RegistrationInvite | null> {
    const [row] = await sql<any[]>`
      SELECT id as "Id", token_hash as "TokenHash", token as "Token", expires_at as "ExpiresAt",
             max_uses as "MaxUses", use_count as "UseCount", created_by as "CreatedBy",
             created_at as "CreatedAt", revoked_at as "RevokedAt"
      FROM registration_invites
      WHERE revoked_at IS NULL
      ORDER BY created_at DESC
      LIMIT 1
    `;
    return row ? this.mapRow(row) : null;
  }

  async findAll(): Promise<RegistrationInvite[]> {
    const rows = await sql<any[]>`
      SELECT id as "Id", token_hash as "TokenHash", token as "Token", expires_at as "ExpiresAt",
             max_uses as "MaxUses", use_count as "UseCount", created_by as "CreatedBy",
             created_at as "CreatedAt", revoked_at as "RevokedAt"
      FROM registration_invites
      ORDER BY created_at DESC
    `;
    return rows.map((row) => this.mapRow(row));
  }

  async findById(id: string): Promise<RegistrationInvite | null> {
    const [row] = await sql<any[]>`
      SELECT id as "Id", token_hash as "TokenHash", token as "Token", expires_at as "ExpiresAt",
             max_uses as "MaxUses", use_count as "UseCount", created_by as "CreatedBy",
             created_at as "CreatedAt", revoked_at as "RevokedAt"
      FROM registration_invites
      WHERE id = ${id}
    `;
    return row ? this.mapRow(row) : null;
  }

  async findByTokenHash(tokenHash: string): Promise<RegistrationInvite | null> {
    const [row] = await sql<any[]>`
      SELECT id as "Id", token_hash as "TokenHash", token as "Token", expires_at as "ExpiresAt",
             max_uses as "MaxUses", use_count as "UseCount", created_by as "CreatedBy",
             created_at as "CreatedAt", revoked_at as "RevokedAt"
      FROM registration_invites
      WHERE token_hash = ${tokenHash}
    `;
    return row ? this.mapRow(row) : null;
  }

  async create(input: CreateRegistrationInviteInput): Promise<RegistrationInvite> {
    const [row] = await sql<any[]>`
      INSERT INTO registration_invites (token_hash, token, expires_at, max_uses, created_by)
      VALUES (${input.tokenHash}, ${input.token}, ${input.expiresAt}, ${input.maxUses}, ${input.createdBy})
      RETURNING id as "Id", token_hash as "TokenHash", token as "Token", expires_at as "ExpiresAt",
                max_uses as "MaxUses", use_count as "UseCount", created_by as "CreatedBy",
                created_at as "CreatedAt", revoked_at as "RevokedAt"
    `;
    if (!row) throw new Error('Failed to create registration invite');
    return this.mapRow(row);
  }

  async deleteById(id: string): Promise<boolean> {
    const existing = await this.findById(id);
    if (!existing) return false;
    await sql`
      DELETE FROM registration_invites
      WHERE id = ${id}
    `;
    return true;
  }

  async incrementUseCount(id: string): Promise<void> {
    await sql`
      UPDATE registration_invites
      SET use_count = use_count + 1
      WHERE id = ${id}
    `;
  }

  private mapRow(row: any): RegistrationInvite {
    return {
      Id: row.Id,
      TokenHash: row.TokenHash,
      Token: row.Token ?? null,
      ExpiresAt: new Date(row.ExpiresAt),
      MaxUses: row.MaxUses ?? null,
      UseCount: row.UseCount ?? 0,
      CreatedBy: row.CreatedBy ?? null,
      CreatedAt: new Date(row.CreatedAt),
      RevokedAt: row.RevokedAt ? new Date(row.RevokedAt) : null,
    };
  }
}
