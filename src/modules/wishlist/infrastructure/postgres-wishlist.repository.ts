import type { WishlistRepository } from '../domain/ports/wishlist.repository';
import type { Wishlist, Priority } from '../domain/wishlist.entity';
import { sql } from '@/common/database/connection';

export class PostgresWishlistRepository implements WishlistRepository {
  async findById(id: string): Promise<Wishlist | null> {
    const [row] = await sql<any[]>`
      SELECT id as "Id", user_id as "UserId", title as "Title", expires_at as "ExpiresAt", 
             allow_group_funds as "AllowGroupFunds", is_active as "IsActive", 
             created_at as "CreatedAt"
      FROM lists
      WHERE id = ${id}
    `;
    if (!row) return null;
    return {
      Id: row.Id,
      UserId: row.UserId,
      Title: row.Title,
      ExpiresAt: row.ExpiresAt ? new Date(row.ExpiresAt) : null,
      AllowGroupFunds: row.AllowGroupFunds,
      IsActive: row.IsActive,
      CreatedAt: new Date(row.CreatedAt),
    };
  }

  async findByUserId(userId: string): Promise<Wishlist[]> {
    const rows = await sql<any[]>`
      SELECT id as "Id", user_id as "UserId", title as "Title", expires_at as "ExpiresAt", 
             allow_group_funds as "AllowGroupFunds", is_active as "IsActive", 
             created_at as "CreatedAt"
      FROM lists
      WHERE user_id = ${userId}
      ORDER BY created_at DESC
    `;
    return rows.map(row => ({
      Id: row.Id,
      UserId: row.UserId,
      Title: row.Title,
      ExpiresAt: row.ExpiresAt ? new Date(row.ExpiresAt) : null,
      AllowGroupFunds: row.AllowGroupFunds,
      IsActive: row.IsActive,
      CreatedAt: new Date(row.CreatedAt),
    }));
  }

  async create(userId: string, title: string, expiresAt: Date | null, allowGroupFunds: boolean): Promise<Wishlist> {
    const [row] = await sql<any[]>`
      INSERT INTO lists (user_id, title, expires_at, allow_group_funds)
      VALUES (${userId}, ${title}, ${expiresAt}, ${allowGroupFunds})
      RETURNING id as "Id", user_id as "UserId", title as "Title", expires_at as "ExpiresAt", 
                allow_group_funds as "AllowGroupFunds", is_active as "IsActive", 
                created_at as "CreatedAt"
    `;
    if (!row) throw new Error('Failed to create wishlist');
    return {
      Id: row.Id,
      UserId: row.UserId,
      Title: row.Title,
      ExpiresAt: row.ExpiresAt ? new Date(row.ExpiresAt) : null,
      AllowGroupFunds: row.AllowGroupFunds,
      IsActive: row.IsActive,
      CreatedAt: new Date(row.CreatedAt),
    };
  }

  async updateActive(id: string, isActive: boolean): Promise<void> {
    await sql`
      UPDATE lists
      SET is_active = ${isActive}
      WHERE id = ${id}
    `;
  }

  async findExpiredActive(): Promise<Wishlist[]> {
    const rows = await sql<any[]>`
      SELECT id as "Id", user_id as "UserId", title as "Title", expires_at as "ExpiresAt", 
             allow_group_funds as "AllowGroupFunds", is_active as "IsActive", 
             created_at as "CreatedAt"
      FROM lists
      WHERE is_active = true AND expires_at < CURRENT_TIMESTAMP
    `;
    return rows.map(row => ({
      Id: row.Id,
      UserId: row.UserId,
      Title: row.Title,
      ExpiresAt: row.ExpiresAt ? new Date(row.ExpiresAt) : null,
      AllowGroupFunds: row.AllowGroupFunds,
      IsActive: row.IsActive,
      CreatedAt: new Date(row.CreatedAt),
    }));
  }

  async createPriority(userId: string, label: string, weight: number): Promise<Priority> {
    const [row] = await sql<any[]>`
      INSERT INTO priorities (user_id, label, weight)
      VALUES (${userId}, ${label}, ${weight})
      RETURNING id as "Id", user_id as "UserId", label as "Label", weight as "Weight"
    `;
    if (!row) throw new Error('Failed to create priority');
    return {
      Id: row.Id,
      UserId: row.UserId,
      Label: row.Label,
      Weight: row.Weight,
    };
  }

  async findPrioritiesByUserId(userId: string): Promise<Priority[]> {
    const rows = await sql<any[]>`
      SELECT id as "Id", user_id as "UserId", label as "Label", weight as "Weight"
      FROM priorities
      WHERE user_id = ${userId}
      ORDER BY weight DESC
    `;
    return rows.map(row => ({
      Id: row.Id,
      UserId: row.UserId,
      Label: row.Label,
      Weight: row.Weight,
    }));
  }

  async findPriorityById(id: string): Promise<Priority | null> {
    const [row] = await sql<any[]>`
      SELECT id as "Id", user_id as "UserId", label as "Label", weight as "Weight"
      FROM priorities
      WHERE id = ${id}
    `;
    if (!row) return null;
    return {
      Id: row.Id,
      UserId: row.UserId,
      Label: row.Label,
      Weight: row.Weight,
    };
  }
}
