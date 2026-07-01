import type { PasskeyRepository } from '../domain/ports/passkey.repository';
import type { UserPasskey } from '../domain/passkey.entity';
import { sql } from '@/common/database/connection';

export class PostgresPasskeyRepository implements PasskeyRepository {
  async findById(id: string): Promise<UserPasskey | null> {
    const [row] = await sql<any[]>`
      SELECT id as "Id", user_id as "UserId", credential_id as "CredentialId", public_key as "PublicKey", counter as "Counter", backed_up as "BackedUp", transports as "Transports"
      FROM user_passkeys
      WHERE id = ${id}
    `;
    if (!row) return null;
    return {
      Id: row.Id,
      UserId: row.UserId,
      CredentialId: row.CredentialId,
      PublicKey: row.PublicKey,
      Counter: Number(row.Counter),
      BackedUp: row.BackedUp,
      Transports: JSON.parse(row.Transports || '[]')
    };
  }

  async findByUserId(userId: string): Promise<UserPasskey[]> {
    const rows = await sql<any[]>`
      SELECT id as "Id", user_id as "UserId", credential_id as "CredentialId", public_key as "PublicKey", counter as "Counter", backed_up as "BackedUp", transports as "Transports"
      FROM user_passkeys
      WHERE user_id = ${userId}
    `;
    return rows.map(row => ({
      Id: row.Id,
      UserId: row.UserId,
      CredentialId: row.CredentialId,
      PublicKey: row.PublicKey,
      Counter: Number(row.Counter),
      BackedUp: row.BackedUp,
      Transports: JSON.parse(row.Transports || '[]')
    }));
  }

  async findByCredentialId(credentialId: string): Promise<UserPasskey | null> {
    const [row] = await sql<any[]>`
      SELECT id as "Id", user_id as "UserId", credential_id as "CredentialId", public_key as "PublicKey", counter as "Counter", backed_up as "BackedUp", transports as "Transports"
      FROM user_passkeys
      WHERE credential_id = ${credentialId}
    `;
    if (!row) return null;
    return {
      Id: row.Id,
      UserId: row.UserId,
      CredentialId: row.CredentialId,
      PublicKey: row.PublicKey,
      Counter: Number(row.Counter),
      BackedUp: row.BackedUp,
      Transports: JSON.parse(row.Transports || '[]')
    };
  }

  async create(userId: string, credentialId: string, publicKey: string, counter: number, backedUp: boolean, transports: string[]): Promise<UserPasskey> {
    const transportsStr = JSON.stringify(transports);
    const [row] = await sql<any[]>`
      INSERT INTO user_passkeys (user_id, credential_id, public_key, counter, backed_up, transports)
      VALUES (${userId}, ${credentialId}, ${publicKey}, ${counter}, ${backedUp}, ${transportsStr})
      RETURNING id as "Id", user_id as "UserId", credential_id as "CredentialId", public_key as "PublicKey", counter as "Counter", backed_up as "BackedUp", transports as "Transports"
    `;
    if (!row) {
      throw new Error('Failed to create passkey');
    }
    return {
      Id: row.Id,
      UserId: row.UserId,
      CredentialId: row.CredentialId,
      PublicKey: row.PublicKey,
      Counter: Number(row.Counter),
      BackedUp: row.BackedUp,
      Transports: JSON.parse(row.Transports || '[]')
    };
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
