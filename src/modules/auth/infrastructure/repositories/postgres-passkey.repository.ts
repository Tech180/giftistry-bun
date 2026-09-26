import { sql } from '@/common/database';
import type { UserPasskey } from '../../domain/interfaces/user-passkey.interface';
import type { PasskeyRepository } from '../../domain/ports/passkey.repository';
import { PASSKEY_SELECT } from '../constants/passkey-select.constant';
import type { UserPasskeyRow } from '../interfaces/user-passkey-row.interface';
import { mapUserPasskeyRow } from '../utils/map-user-passkey-row.util';

export class PostgresPasskeyRepository implements PasskeyRepository {
  async findById(id: string): Promise<UserPasskey | null> {
    const [row] = await sql<UserPasskeyRow[]>`
      SELECT ${sql.unsafe(PASSKEY_SELECT)}
      FROM user_passkeys
      WHERE id = ${id}
    `;
    return row ? mapUserPasskeyRow(row) : null;
  }

  async findByUserId(userId: string): Promise<UserPasskey[]> {
    const rows = await sql<UserPasskeyRow[]>`
      SELECT ${sql.unsafe(PASSKEY_SELECT)}
      FROM user_passkeys
      WHERE user_id = ${userId}
    `;
    return rows.map(mapUserPasskeyRow);
  }

  async findByCredentialId(credentialId: string): Promise<UserPasskey | null> {
    const [row] = await sql<UserPasskeyRow[]>`
      SELECT ${sql.unsafe(PASSKEY_SELECT)}
      FROM user_passkeys
      WHERE credential_id = ${credentialId}
    `;
    return row ? mapUserPasskeyRow(row) : null;
  }

  async create(
    userId: string,
    credentialId: string,
    publicKey: string,
    counter: number,
    backedUp: boolean,
    transports: string[]
  ): Promise<UserPasskey> {
    const transportsStr = JSON.stringify(transports);
    const [row] = await sql<UserPasskeyRow[]>`
      INSERT INTO user_passkeys (user_id, credential_id, public_key, counter, backed_up, transports)
      VALUES (${userId}, ${credentialId}, ${publicKey}, ${counter}, ${backedUp}, ${transportsStr})
      RETURNING ${sql.unsafe(PASSKEY_SELECT)}
    `;
    if (!row) {
      throw new Error('Failed to create passkey');
    }

    return mapUserPasskeyRow(row);
  }

  async updateCounter(credentialId: string, counter: number): Promise<void> {
    await sql`
      UPDATE user_passkeys
      SET counter = ${counter}
      WHERE credential_id = ${credentialId}
    `;
  }

  async delete(id: string): Promise<void> {
    await sql`
      DELETE FROM user_passkeys
      WHERE id = ${id}
    `;
  }
}
