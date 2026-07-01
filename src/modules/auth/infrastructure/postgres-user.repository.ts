import type { UserRepository } from '../domain/ports/user.repository';
import type { User } from '../domain/user.entity';
import { sql } from '@/common/database/connection';

export class PostgresUserRepository implements UserRepository {
  async findByEmail(email: string): Promise<User | null> {
    const [row] = await sql<any[]>`
      SELECT id as "Id", username as "Username", email as "Email", first_name as "FirstName", last_name as "LastName", auth_hash as "AuthHash", created_at as "CreatedAt", bio as "Bio", theme as "Theme", avatar as "Avatar", email_verified as "EmailVerified", two_factor_enabled as "TwoFactorEnabled", is_admin as "IsAdmin"
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
      EmailVerified: row.EmailVerified,
      TwoFactorEnabled: row.TwoFactorEnabled,
      IsAdmin: row.IsAdmin,
    };
  }

  async findByUsername(username: string): Promise<User | null> {
    const [row] = await sql<any[]>`
      SELECT id as "Id", username as "Username", email as "Email", first_name as "FirstName", last_name as "LastName", auth_hash as "AuthHash", created_at as "CreatedAt", bio as "Bio", theme as "Theme", avatar as "Avatar", email_verified as "EmailVerified", two_factor_enabled as "TwoFactorEnabled", is_admin as "IsAdmin"
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
      EmailVerified: row.EmailVerified,
      TwoFactorEnabled: row.TwoFactorEnabled,
      IsAdmin: row.IsAdmin,
    };
  }

  async findById(id: string): Promise<User | null> {
    const [row] = await sql<any[]>`
      SELECT id as "Id", username as "Username", email as "Email", first_name as "FirstName", last_name as "LastName", auth_hash as "AuthHash", created_at as "CreatedAt", bio as "Bio", theme as "Theme", avatar as "Avatar", email_verified as "EmailVerified", two_factor_enabled as "TwoFactorEnabled", is_admin as "IsAdmin"
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
      EmailVerified: row.EmailVerified,
      TwoFactorEnabled: row.TwoFactorEnabled,
      IsAdmin: row.IsAdmin,
    };
  }

  async create(username: string, email: string, firstName: string, lastName: string, authHash: string, isAdmin: boolean = false): Promise<User> {
    const [row] = await sql<any[]>`
      INSERT INTO users (username, email, first_name, last_name, auth_hash, is_admin)
      VALUES (${username}, ${email}, ${firstName}, ${lastName}, ${authHash}, ${isAdmin})
      RETURNING id as "Id", username as "Username", email as "Email", first_name as "FirstName", last_name as "LastName", auth_hash as "AuthHash", created_at as "CreatedAt", bio as "Bio", theme as "Theme", avatar as "Avatar", email_verified as "EmailVerified", two_factor_enabled as "TwoFactorEnabled", is_admin as "IsAdmin"
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
      EmailVerified: row.EmailVerified,
      TwoFactorEnabled: row.TwoFactorEnabled,
      IsAdmin: row.IsAdmin,
    };
  }

  async update(id: string, updates: { 
    username?: string; 
    firstName?: string; 
    lastName?: string; 
    bio?: string; 
    theme?: string; 
    avatar?: string | null; 
    emailVerified?: boolean;
    emailVerificationToken?: string | null;
    emailVerificationExpires?: Date | null;
    twoFactorEnabled?: boolean;
    twoFactorSecret?: string | null;
    twoFactorRecoveryCodes?: string | null;
    isAdmin?: boolean;
  }): Promise<User> {
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

    const [curr] = await sql<any[]>`
      SELECT email_verified, email_verification_token, email_verification_expires, two_factor_enabled, two_factor_secret, two_factor_recovery_codes, is_admin
      FROM users WHERE id = ${id}
    `;
    const emailVerified = updates.emailVerified !== undefined ? updates.emailVerified : curr.email_verified;
    const emailVerificationToken = updates.emailVerificationToken !== undefined ? updates.emailVerificationToken : curr.email_verification_token;
    const emailVerificationExpires = updates.emailVerificationExpires !== undefined ? updates.emailVerificationExpires : curr.email_verification_expires;
    const twoFactorEnabled = updates.twoFactorEnabled !== undefined ? updates.twoFactorEnabled : curr.two_factor_enabled;
    const twoFactorSecret = updates.twoFactorSecret !== undefined ? updates.twoFactorSecret : curr.two_factor_secret;
    const twoFactorRecoveryCodes = updates.twoFactorRecoveryCodes !== undefined ? updates.twoFactorRecoveryCodes : curr.two_factor_recovery_codes;
    const isAdmin = updates.isAdmin !== undefined ? updates.isAdmin : curr.is_admin;

    const [row] = await sql<any[]>`
      UPDATE users
      SET username = ${username}, first_name = ${firstName}, last_name = ${lastName}, bio = ${bio}, theme = ${theme}, avatar = ${avatar},
          email_verified = ${emailVerified}, email_verification_token = ${emailVerificationToken}, email_verification_expires = ${emailVerificationExpires},
          two_factor_enabled = ${twoFactorEnabled}, two_factor_secret = ${twoFactorSecret}, two_factor_recovery_codes = ${twoFactorRecoveryCodes}, is_admin = ${isAdmin}
      WHERE id = ${id}
      RETURNING id as "Id", username as "Username", email as "Email", first_name as "FirstName", last_name as "LastName", auth_hash as "AuthHash", created_at as "CreatedAt", bio as "Bio", theme as "Theme", avatar as "Avatar", email_verified as "EmailVerified", two_factor_enabled as "TwoFactorEnabled", is_admin as "IsAdmin"
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
      EmailVerified: row.EmailVerified,
      TwoFactorEnabled: row.TwoFactorEnabled,
      IsAdmin: row.IsAdmin,
    };
  }

  async count(): Promise<number> {
    const [row] = await sql<any[]>`SELECT COUNT(*)::integer as count FROM users`;
    return row ? row.count : 0;
  }
}
