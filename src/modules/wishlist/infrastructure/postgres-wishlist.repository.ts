import type { WishlistRepository } from '../domain/ports/wishlist.repository';
import type { Wishlist, Priority } from '../domain/wishlist.entity';
import { sql } from '@/common/database/connection';

export class PostgresWishlistRepository implements WishlistRepository {
  async findById(id: string): Promise<Wishlist | null> {
    const [row] = await sql<any[]>`
      SELECT l.id as "Id", l.user_id as "UserId", l.title as "Title", l.expires_at as "ExpiresAt", 
             l.allow_group_funds as "AllowGroupFunds", l.is_active as "IsActive", 
             l.category as "Category", l.reveal_suggestions as "RevealSuggestions", l.created_at as "CreatedAt",
             u.username as "OwnerUsername", u.first_name as "OwnerFirstName"
      FROM lists l
      LEFT JOIN users u ON l.user_id = u.id
      WHERE l.id = ${id}
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
      Category: row.Category,
      RevealSuggestions: row.RevealSuggestions,
      OwnerUsername: row.OwnerUsername,
      OwnerFirstName: row.OwnerFirstName,
    };
  }

  async findByUserId(userId: string): Promise<Wishlist[]> {
    const rows = await sql<any[]>`
      SELECT l.id as "Id", l.user_id as "UserId", l.title as "Title", l.expires_at as "ExpiresAt", 
             l.allow_group_funds as "AllowGroupFunds", l.is_active as "IsActive", 
             l.created_at as "CreatedAt", l.category as "Category",
             l.reveal_suggestions as "RevealSuggestions",
             u.username as "OwnerUsername", u.first_name as "OwnerFirstName",
             COALESCE(ls.role, 'owner') as "Role"
      FROM lists l
      LEFT JOIN list_shares ls ON l.id = ls.list_id AND ls.user_id = ${userId}
      LEFT JOIN users u ON l.user_id = u.id
      WHERE l.user_id = ${userId}
         OR l.id IN (SELECT list_id FROM list_shares WHERE user_id = ${userId})
      ORDER BY l.created_at DESC
    `;
    return rows.map(row => ({
      Id: row.Id,
      UserId: row.UserId,
      Title: row.Title,
      ExpiresAt: row.ExpiresAt ? new Date(row.ExpiresAt) : null,
      AllowGroupFunds: row.AllowGroupFunds,
      IsActive: row.IsActive,
      CreatedAt: new Date(row.CreatedAt),
      Category: row.Category,
      RevealSuggestions: row.RevealSuggestions,
      OwnerUsername: row.OwnerUsername,
      OwnerFirstName: row.OwnerFirstName,
      Role: row.Role,
    }));
  }

  async create(userId: string, title: string, expiresAt: Date | null, allowGroupFunds: boolean, category: string = 'generic', revealSuggestions: boolean = true): Promise<Wishlist> {
    const [row] = await sql<any[]>`
      INSERT INTO lists (user_id, title, expires_at, allow_group_funds, category, reveal_suggestions)
      VALUES (${userId}, ${title}, ${expiresAt}, ${allowGroupFunds}, ${category}, ${revealSuggestions})
      RETURNING id as "Id", user_id as "UserId", title as "Title", expires_at as "ExpiresAt", 
                allow_group_funds as "AllowGroupFunds", is_active as "IsActive", 
                category as "Category", reveal_suggestions as "RevealSuggestions", created_at as "CreatedAt"
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
      Category: row.Category,
      RevealSuggestions: row.RevealSuggestions,
    };
  }

  async updateActive(id: string, isActive: boolean): Promise<void> {
    await sql`
      UPDATE lists
      SET is_active = ${isActive}
      WHERE id = ${id}
    `;
  }

  async update(id: string, title: string, expiresAt: Date | null, allowGroupFunds: boolean, category?: string, revealSuggestions?: boolean): Promise<Wishlist> {
    const [row] = await sql<any[]>`
      UPDATE lists
      SET title = ${title}, expires_at = ${expiresAt}, allow_group_funds = ${allowGroupFunds},
          category = COALESCE(${category || null}, category),
          reveal_suggestions = COALESCE(${revealSuggestions ?? null}, reveal_suggestions)
      WHERE id = ${id}
      RETURNING id as "Id", user_id as "UserId", title as "Title", expires_at as "ExpiresAt", 
                allow_group_funds as "AllowGroupFunds", is_active as "IsActive", 
                category as "Category", reveal_suggestions as "RevealSuggestions", created_at as "CreatedAt"
    `;
    if (!row) throw new Error('Failed to update wishlist');
    return {
      Id: row.Id,
      UserId: row.UserId,
      Title: row.Title,
      ExpiresAt: row.ExpiresAt ? new Date(row.ExpiresAt) : null,
      AllowGroupFunds: row.AllowGroupFunds,
      IsActive: row.IsActive,
      CreatedAt: new Date(row.CreatedAt),
      Category: row.Category,
      RevealSuggestions: row.RevealSuggestions,
    };
  }

  async delete(id: string): Promise<void> {
    await sql.begin(async (sql) => {
      await sql`DELETE FROM comments WHERE list_id = ${id}`;
      await sql`DELETE FROM list_shares WHERE list_id = ${id}`;
      await sql`
        DELETE FROM claims 
        WHERE item_id IN (SELECT id FROM items WHERE list_id = ${id})
      `;
      await sql`
        DELETE FROM item_links 
        WHERE item_id IN (SELECT id FROM items WHERE list_id = ${id})
      `;
      await sql`DELETE FROM items WHERE list_id = ${id}`;
      await sql`DELETE FROM lists WHERE id = ${id}`;
    });
  }

  async findExpiredActive(): Promise<Wishlist[]> {
    const rows = await sql<any[]>`
      SELECT id as "Id", user_id as "UserId", title as "Title", expires_at as "ExpiresAt", 
             allow_group_funds as "AllowGroupFunds", is_active as "IsActive", 
             category as "Category", reveal_suggestions as "RevealSuggestions", created_at as "CreatedAt"
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
      Category: row.Category,
      RevealSuggestions: row.RevealSuggestions,
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

  async findPrioritiesByWishlistForUser(wishlistId: string, userId: string, isOwner: boolean, hasExpired: boolean, revealSuggestions: boolean): Promise<Priority[]> {
    const ownedPriorities = await this.findPrioritiesByUserId(userId);
    
    let rows: any[] = [];
    if (isOwner) {
      const shouldReveal = hasExpired && revealSuggestions;
      if (shouldReveal) {
        rows = await sql<any[]>`
          SELECT DISTINCT p.id as "Id", p.user_id as "UserId", p.label as "Label", p.weight as "Weight"
          FROM priorities p
          JOIN items i ON i.priority_id = p.id
          WHERE i.list_id = ${wishlistId}
        `;
      } else {
        rows = await sql<any[]>`
          SELECT DISTINCT p.id as "Id", p.user_id as "UserId", p.label as "Label", p.weight as "Weight"
          FROM priorities p
          JOIN items i ON i.priority_id = p.id
          WHERE i.list_id = ${wishlistId}
            AND i.is_hidden_idea = false
            AND i.is_suggestion = false
            AND (i.suggested_by_user_id IS NULL OR i.suggested_by_user_id = ${userId})
        `;
      }
    } else {
      const ownerQuery = sql<any[]>`
        SELECT id as "Id", user_id as "UserId", label as "Label", weight as "Weight"
        FROM priorities
        WHERE user_id = (SELECT user_id FROM lists WHERE id = ${wishlistId})
      `;
      
      const itemQuery = sql<any[]>`
        SELECT DISTINCT p.id as "Id", p.user_id as "UserId", p.label as "Label", p.weight as "Weight"
        FROM priorities p
        JOIN items i ON i.priority_id = p.id
        WHERE i.list_id = ${wishlistId}
      `;
      
      const [owners, items] = await Promise.all([ownerQuery, itemQuery]);
      rows = [...owners, ...items];
    }
    
    const allPriorities = [...ownedPriorities, ...rows];
    const unique = Array.from(new Map(allPriorities.map(p => [p.Id, p])).values());
    return unique.map(row => ({
      Id: row.Id,
      UserId: row.UserId,
      Label: row.Label,
      Weight: Number(row.Weight),
    }));
  }

  async deletePriority(id: string, userId: string): Promise<void> {
    await sql`
      UPDATE items SET priority_id = NULL WHERE priority_id = ${id}
    `;
    await sql`
      DELETE FROM priorities WHERE id = ${id} AND user_id = ${userId}
    `;
  }
}
