import { sql } from '@/common/database';
import type { CreateRegistrationInviteInput } from '../../domain/interfaces/create-registration-invite-input.interface';
import type { RegistrationInvite } from '../../domain/interfaces/registration-invite.interface';
import type { RegistrationInviteRepository } from '../../domain/ports/registration-invite.repository';
import { INVITE_SELECT } from '../constants/invite-select.constant';
import type { InviteRow } from '../interfaces/invite-row.interface';
import { mapInviteRow } from '../utils/map-invite-row.util';

export class PostgresRegistrationInviteRepository implements RegistrationInviteRepository {
  async findActive(): Promise<RegistrationInvite | null> {
    const [row] = await sql<InviteRow[]>`
      SELECT ${sql.unsafe(INVITE_SELECT)}
      FROM registration_invites
      WHERE revoked_at IS NULL
      ORDER BY created_at DESC
      LIMIT 1
    `;
    return row ? mapInviteRow(row) : null;
  }

  async findAll(): Promise<RegistrationInvite[]> {
    const rows = await sql<InviteRow[]>`
      SELECT ${sql.unsafe(INVITE_SELECT)}
      FROM registration_invites
      ORDER BY created_at DESC
    `;
    return rows.map(mapInviteRow);
  }

  async findById(id: string): Promise<RegistrationInvite | null> {
    const [row] = await sql<InviteRow[]>`
      SELECT ${sql.unsafe(INVITE_SELECT)}
      FROM registration_invites
      WHERE id = ${id}
    `;
    return row ? mapInviteRow(row) : null;
  }

  async findByTokenHash(tokenHash: string): Promise<RegistrationInvite | null> {
    const [row] = await sql<InviteRow[]>`
      SELECT ${sql.unsafe(INVITE_SELECT)}
      FROM registration_invites
      WHERE token_hash = ${tokenHash}
    `;
    return row ? mapInviteRow(row) : null;
  }

  async create(input: CreateRegistrationInviteInput): Promise<RegistrationInvite> {
    const [row] = await sql<InviteRow[]>`
      INSERT INTO registration_invites (token_hash, token, expires_at, max_uses, created_by)
      VALUES (
        ${input.tokenHash},
        ${input.token},
        ${input.expiresAt},
        ${input.maxUses},
        ${input.createdBy}
      )
      RETURNING ${sql.unsafe(INVITE_SELECT)}
    `;
    if (!row) {
      throw new Error('Failed to create registration invite');
    }
    return mapInviteRow(row);
  }

  async deleteById(id: string): Promise<boolean> {
    const [row] = await sql<{ Id: string }[]>`
      DELETE FROM registration_invites
      WHERE id = ${id}
      RETURNING id as "Id"
    `;
    return !!row;
  }

  async incrementUseCount(id: string): Promise<void> {
    await sql`
      UPDATE registration_invites
      SET use_count = use_count + 1
      WHERE id = ${id}
    `;
  }
}
