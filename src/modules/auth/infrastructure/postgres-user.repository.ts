import type { UserRepository } from '../domain/ports/user.repository';
import type { User } from '../domain/user.entity';
import { sql } from '@/common/database/connection';

export class PostgresUserRepository implements UserRepository {
  async findByEmail(email: string): Promise<User | null> {
    const [row] = await sql<any[]>`
      SELECT id as "Id", username as "Username", email as "Email", first_name as "FirstName", last_name as "LastName", auth_hash as "AuthHash", created_at as "CreatedAt", bio as "Bio", theme as "Theme", avatar as "Avatar"
      FROM users
      WHERE email = ${email}
    `;
    if (!row) return null;
    return {
      Id: row.Id,
      Username: row.Username,
      Email: row.Email,
      FirstName: row.FirstName,
      LastName: row.LastName,
      AuthHash: row.AuthHash,
      CreatedAt: new Date(row.CreatedAt),
      Bio: row.Bio,
      Theme: row.Theme,
      Avatar: row.Avatar,
    };
  }

  async findByUsername(username: string): Promise<User | null> {
    const [row] = await sql<any[]>`
      SELECT id as "Id", username as "Username", email as "Email", first_name as "FirstName", last_name as "LastName", auth_hash as "AuthHash", created_at as "CreatedAt", bio as "Bio", theme as "Theme", avatar as "Avatar"
      FROM users
      WHERE username = ${username}
    `;
    if (!row) return null;
    return {
      Id: row.Id,
      Username: row.Username,
      Email: row.Email,
      FirstName: row.FirstName,
      LastName: row.LastName,
      AuthHash: row.AuthHash,
      CreatedAt: new Date(row.CreatedAt),
      Bio: row.Bio,
      Theme: row.Theme,
      Avatar: row.Avatar,
    };
  }

  async findById(id: string): Promise<User | null> {
    const [row] = await sql<any[]>`
      SELECT id as "Id", username as "Username", email as "Email", first_name as "FirstName", last_name as "LastName", auth_hash as "AuthHash", created_at as "CreatedAt", bio as "Bio", theme as "Theme", avatar as "Avatar"
      FROM users
      WHERE id = ${id}
    `;
    if (!row) return null;
    return {
      Id: row.Id,
      Username: row.Username,
      Email: row.Email,
      FirstName: row.FirstName,
      LastName: row.LastName,
      AuthHash: row.AuthHash,
      CreatedAt: new Date(row.CreatedAt),
      Bio: row.Bio,
      Theme: row.Theme,
      Avatar: row.Avatar,
    };
  }

  async create(username: string, email: string, firstName: string, lastName: string, authHash: string): Promise<User> {
    const [row] = await sql<any[]>`
      INSERT INTO users (username, email, first_name, last_name, auth_hash)
      VALUES (${username}, ${email}, ${firstName}, ${lastName}, ${authHash})
      RETURNING id as "Id", username as "Username", email as "Email", first_name as "FirstName", last_name as "LastName", auth_hash as "AuthHash", created_at as "CreatedAt", bio as "Bio", theme as "Theme", avatar as "Avatar"
    `;
    if (!row) {
      throw new Error('Failed to create user');
    }
    return {
      Id: row.Id,
      Username: row.Username,
      Email: row.Email,
      FirstName: row.FirstName,
      LastName: row.LastName,
      AuthHash: row.AuthHash,
      CreatedAt: new Date(row.CreatedAt),
      Bio: row.Bio,
      Theme: row.Theme,
      Avatar: row.Avatar,
    };
  }

  async update(id: string, updates: { username?: string; firstName?: string; lastName?: string; bio?: string; theme?: string; avatar?: string | null }): Promise<User> {
    const user = await this.findById(id);
    if (!user) {
      throw new Error('User not found');
    }
    const username = updates.username !== undefined ? updates.username : user.Username;
    const firstName = updates.firstName !== undefined ? updates.firstName : user.FirstName;
    const lastName = updates.lastName !== undefined ? updates.lastName : user.LastName;
    const bio = updates.bio !== undefined ? updates.bio : (user.Bio || '');
    const theme = updates.theme !== undefined ? updates.theme : (user.Theme || 'default');
    const avatar = updates.avatar !== undefined ? updates.avatar : (user.Avatar || null);

    const [row] = await sql<any[]>`
      UPDATE users
      SET username = ${username}, first_name = ${firstName}, last_name = ${lastName}, bio = ${bio}, theme = ${theme}, avatar = ${avatar}
      WHERE id = ${id}
      RETURNING id as "Id", username as "Username", email as "Email", first_name as "FirstName", last_name as "LastName", auth_hash as "AuthHash", created_at as "CreatedAt", bio as "Bio", theme as "Theme", avatar as "Avatar"
    `;
    if (!row) {
      throw new Error('Failed to update user');
    }
    return {
      Id: row.Id,
      Username: row.Username,
      Email: row.Email,
      FirstName: row.FirstName,
      LastName: row.LastName,
      AuthHash: row.AuthHash,
      CreatedAt: new Date(row.CreatedAt),
      Bio: row.Bio,
      Theme: row.Theme,
      Avatar: row.Avatar,
    };
  }
}
