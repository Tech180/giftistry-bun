import type { WishlistRepository } from '../domain/ports/wishlist.repository';
import type { Wishlist, Priority } from '../domain/wishlist.entity';
import type { GrantedVia, ListShareWithUser, ShareRole } from '../domain/list-share.entity';
import { sql } from '@/common/database/connection';

interface WishlistOwnerRow {
  Id: string;
  UserId: string;
  Title: string;
  ExpiresAt: Date | string | null;
  AllowGroupFunds: boolean;
  IsActive: boolean;
  Category: string | null;
  RevealSuggestions: boolean;
  AiEnabled: boolean;
  WebSearchEnabled: boolean;
  ManualJobBackground: boolean;
  AutoRollover: boolean;
  CreatedAt: Date | string;
  OwnerUsername: string | null;
  OwnerFirstName: string | null;
  OwnerLastName: string | null;
  OwnerAvatar: string | null;
}

interface WishlistWithRoleRow {
  Id: string;
  UserId: string;
  Title: string;
  ExpiresAt: Date | string | null;
  AllowGroupFunds: boolean;
  IsActive: boolean;
  CreatedAt: Date | string;
  Category: string | null;
  RevealSuggestions: boolean;
  AiEnabled: boolean;
  WebSearchEnabled: boolean;
  ManualJobBackground: boolean;
  AutoRollover: boolean;
  OwnerUsername: string | null;
  OwnerFirstName: string | null;
  OwnerAvatar: string | null;
  Role: 'owner' | 'collaborator' | 'viewer';
}

interface WishlistBaseRow {
  Id: string;
  UserId: string;
  Title: string;
  ExpiresAt: Date | string | null;
  AllowGroupFunds: boolean;
  IsActive: boolean;
  Category: string | null;
  RevealSuggestions: boolean;
  AiEnabled: boolean;
  WebSearchEnabled?: boolean;
  ManualJobBackground?: boolean;
  AutoRollover: boolean;
  CreatedAt: Date | string;
}

interface ListShareWithUserRow {
  Id: string;
  ListId: string;
  UserId: string;
  Role: ShareRole;
  GrantedVia: GrantedVia | null;
  CreatedAt: Date | string | null;
  Username: string;
  FirstName: string;
  LastName: string;
  Email: string;
  Avatar: string | null;
}

interface PriorityRow {
  Id: string;
  UserId: string;
  Label: string;
  Weight: number | string;
}

interface ListCountsRow {
  active: number;
  archived: number;
}

export class PostgresWishlistRepository implements WishlistRepository {
  async findById(id: string): Promise<Wishlist | null> {
    const [row] = await sql<WishlistOwnerRow[]>`
      SELECT l.id as "Id", l.user_id as "UserId", l.title as "Title", l.expires_at as "ExpiresAt", 
             l.allow_group_funds as "AllowGroupFunds", l.is_active as "IsActive", 
             l.category as "Category", l.reveal_suggestions as "RevealSuggestions", l.ai_enabled as "AiEnabled", l.web_search_enabled as "WebSearchEnabled",
             l.manual_job_background as "ManualJobBackground",
             l.auto_rollover as "AutoRollover",
             l.created_at as "CreatedAt",
             u.username as "OwnerUsername", u.first_name as "OwnerFirstName", u.last_name as "OwnerLastName", u.avatar as "OwnerAvatar"
      FROM lists l
      LEFT JOIN users u ON l.user_id = u.id
      WHERE l.id = ${id}
    `;
    if (!row) {
      return null;
    }

    return {
      Id: row.Id,
      UserId: row.UserId,
      Title: row.Title,
      ExpiresAt: row.ExpiresAt ? new Date(row.ExpiresAt) : null,
      AllowGroupFunds: row.AllowGroupFunds,
      IsActive: row.IsActive,
      CreatedAt: new Date(row.CreatedAt),
      Category: row.Category ?? undefined,
      RevealSuggestions: row.RevealSuggestions,
      AiEnabled: row.AiEnabled,
      WebSearchEnabled: row.WebSearchEnabled,
      ManualJobBackground: row.ManualJobBackground !== false,
      AutoRollover: row.AutoRollover === true,
      OwnerUsername: row.OwnerUsername ?? undefined,
      OwnerFirstName: row.OwnerFirstName ?? undefined,
      OwnerLastName: row.OwnerLastName ?? undefined,
      OwnerAvatar: row.OwnerAvatar ?? null,
    };
  }

  async findByUserId(userId: string): Promise<Wishlist[]> {
    const rows = await sql<WishlistWithRoleRow[]>`
      SELECT l.id as "Id", l.user_id as "UserId", l.title as "Title", l.expires_at as "ExpiresAt", 
             l.allow_group_funds as "AllowGroupFunds", l.is_active as "IsActive", 
             l.created_at as "CreatedAt", l.category as "Category",
             l.reveal_suggestions as "RevealSuggestions", l.ai_enabled as "AiEnabled", l.web_search_enabled as "WebSearchEnabled",
             l.manual_job_background as "ManualJobBackground",
             l.auto_rollover as "AutoRollover",
             u.username as "OwnerUsername", u.first_name as "OwnerFirstName", u.avatar as "OwnerAvatar",
             CASE
               WHEN l.user_id = ${userId} THEN 'owner'
               WHEN ls.role IS NOT NULL THEN ls.role
               ELSE 'viewer'
             END as "Role"
      FROM lists l
      LEFT JOIN list_shares ls ON l.id = ls.list_id AND ls.user_id = ${userId}
      LEFT JOIN users u ON l.user_id = u.id
      WHERE l.user_id = ${userId}
         OR (
           l.id IN (SELECT list_id FROM list_shares WHERE user_id = ${userId})
           AND u.is_disabled = false
         )
      ORDER BY l.created_at DESC
    `;

    if (rows.length === 0) {
      return [];
    }

    const listIds = rows.map(r => r.Id);
    const shares = await sql<ListShareWithUserRow[]>`
      SELECT ls.id as "Id", ls.list_id as "ListId", ls.user_id as "UserId", ls.role as "Role",
             ls.granted_via as "GrantedVia", ls.created_at as "CreatedAt",
             u.username as "Username", u.first_name as "FirstName", u.last_name as "LastName",
             u.email as "Email", u.avatar as "Avatar"
      FROM list_shares ls
      JOIN users u ON ls.user_id = u.id
      WHERE ls.list_id = ANY(${listIds})
      ORDER BY ls.created_at ASC
    `;

    const sharesByListId = new Map<string, ListShareWithUser[]>();
    shares.forEach(share => {
      const listShares = sharesByListId.get(share.ListId) || [];
      listShares.push({
        Id: share.Id,
        ListId: share.ListId,
        UserId: share.UserId,
        Role: share.Role,
        GrantedVia: share.GrantedVia ?? undefined,
        CreatedAt: share.CreatedAt ? new Date(share.CreatedAt) : undefined,
        Username: share.Username,
        FirstName: share.FirstName,
        LastName: share.LastName,
        Email: share.Email,
        Avatar: share.Avatar ?? null,
      });
      sharesByListId.set(share.ListId, listShares);
    });

    return rows.map(row => ({
      Id: row.Id,
      UserId: row.UserId,
      Title: row.Title,
      ExpiresAt: row.ExpiresAt ? new Date(row.ExpiresAt) : null,
      AllowGroupFunds: row.AllowGroupFunds,
      IsActive: row.IsActive,
      CreatedAt: new Date(row.CreatedAt),
      Category: row.Category ?? undefined,
      RevealSuggestions: row.RevealSuggestions,
      AiEnabled: row.AiEnabled,
      WebSearchEnabled: row.WebSearchEnabled,
      ManualJobBackground: row.ManualJobBackground !== false,
      AutoRollover: row.AutoRollover === true,
      OwnerUsername: row.OwnerUsername ?? undefined,
      OwnerFirstName: row.OwnerFirstName ?? undefined,
      OwnerAvatar: row.OwnerAvatar ?? null,
      Role: row.Role,
      Shares: sharesByListId.get(row.Id) || [],
    }));
  }

  async create(
    userId: string,
    title: string,
    expiresAt: Date | null,
    allowGroupFunds: boolean,
    category: string = 'generic',
    revealSuggestions: boolean = true,
    aiEnabled: boolean = false,
    webSearchEnabled: boolean = false,
    manualJobBackground: boolean = true,
    autoRollover: boolean = false
  ): Promise<Wishlist> {
    const [row] = await sql<WishlistBaseRow[]>`
      INSERT INTO lists (user_id, title, expires_at, allow_group_funds, category, reveal_suggestions, ai_enabled, web_search_enabled, manual_job_background, auto_rollover)
      VALUES (${userId}, ${title}, ${expiresAt}, ${allowGroupFunds}, ${category}, ${revealSuggestions}, ${aiEnabled}, ${webSearchEnabled}, ${manualJobBackground}, ${autoRollover})
      RETURNING id as "Id", user_id as "UserId", title as "Title", expires_at as "ExpiresAt", 
                allow_group_funds as "AllowGroupFunds", is_active as "IsActive", 
                category as "Category", reveal_suggestions as "RevealSuggestions", ai_enabled as "AiEnabled",
                web_search_enabled as "WebSearchEnabled",
                manual_job_background as "ManualJobBackground",
                auto_rollover as "AutoRollover",
                created_at as "CreatedAt"
    `;
    if (!row) {
      throw new Error('Failed to create wishlist');
    }

    return {
      Id: row.Id,
      UserId: row.UserId,
      Title: row.Title,
      ExpiresAt: row.ExpiresAt ? new Date(row.ExpiresAt) : null,
      AllowGroupFunds: row.AllowGroupFunds,
      IsActive: row.IsActive,
      CreatedAt: new Date(row.CreatedAt),
      Category: row.Category ?? undefined,
      RevealSuggestions: row.RevealSuggestions,
      AiEnabled: row.AiEnabled,
      WebSearchEnabled: row.WebSearchEnabled,
      ManualJobBackground: row.ManualJobBackground !== false,
      AutoRollover: row.AutoRollover === true,
    };
  }

  async updateActive(id: string, isActive: boolean): Promise<void> {
    await sql`
      UPDATE lists
      SET is_active = ${isActive}
      WHERE id = ${id}
    `;
  }

  async updateExpiresAt(id: string, expiresAt: Date | null): Promise<void> {
    await sql`
      UPDATE lists
      SET expires_at = ${expiresAt}
      WHERE id = ${id}
    `;
  }

  async reactivateWishlist(id: string, clearExpiresAt: boolean): Promise<void> {
    await sql.begin(async (tx) => {
      if (clearExpiresAt) {
        await tx`
          UPDATE lists
          SET is_active = true, expires_at = null
          WHERE id = ${id}
        `;
      } else {
        await tx`
          UPDATE lists
          SET is_active = true
          WHERE id = ${id}
        `;
      }
    });
  }

  async update(
    id: string,
    title: string,
    expiresAt: Date | null,
    allowGroupFunds: boolean,
    category?: string,
    revealSuggestions?: boolean,
    aiEnabled?: boolean,
    webSearchEnabled?: boolean,
    manualJobBackground?: boolean,
    autoRollover?: boolean
  ): Promise<Wishlist> {
    const [row] = await sql<WishlistBaseRow[]>`
      UPDATE lists
      SET title = ${title}, expires_at = ${expiresAt}, allow_group_funds = ${allowGroupFunds},
          category = COALESCE(${category || null}, category),
          reveal_suggestions = COALESCE(${revealSuggestions ?? null}, reveal_suggestions),
          ai_enabled = COALESCE(${aiEnabled ?? null}, ai_enabled),
          web_search_enabled = COALESCE(${webSearchEnabled ?? null}, web_search_enabled),
          manual_job_background = COALESCE(${manualJobBackground ?? null}, manual_job_background),
          auto_rollover = COALESCE(${autoRollover ?? null}, auto_rollover)
      WHERE id = ${id}
      RETURNING id as "Id", user_id as "UserId", title as "Title", expires_at as "ExpiresAt", 
                allow_group_funds as "AllowGroupFunds", is_active as "IsActive", 
                category as "Category", reveal_suggestions as "RevealSuggestions", ai_enabled as "AiEnabled", web_search_enabled as "WebSearchEnabled",
                manual_job_background as "ManualJobBackground",
                auto_rollover as "AutoRollover",
                created_at as "CreatedAt"
    `;
    if (!row) {
      throw new Error('Failed to update wishlist');
    }

    return {
      Id: row.Id,
      UserId: row.UserId,
      Title: row.Title,
      ExpiresAt: row.ExpiresAt ? new Date(row.ExpiresAt) : null,
      AllowGroupFunds: row.AllowGroupFunds,
      IsActive: row.IsActive,
      CreatedAt: new Date(row.CreatedAt),
      Category: row.Category ?? undefined,
      RevealSuggestions: row.RevealSuggestions,
      AiEnabled: row.AiEnabled,
      WebSearchEnabled: row.WebSearchEnabled,
      ManualJobBackground: row.ManualJobBackground !== false,
      AutoRollover: row.AutoRollover === true,
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
    const rows = await sql<WishlistBaseRow[]>`
      SELECT id as "Id", user_id as "UserId", title as "Title", expires_at as "ExpiresAt", 
             allow_group_funds as "AllowGroupFunds", is_active as "IsActive", 
             category as "Category", reveal_suggestions as "RevealSuggestions", ai_enabled as "AiEnabled",
             auto_rollover as "AutoRollover", created_at as "CreatedAt"
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
      Category: row.Category ?? undefined,
      RevealSuggestions: row.RevealSuggestions,
      AiEnabled: row.AiEnabled,
      AutoRollover: row.AutoRollover === true,
    }));
  }

  async createPriority(userId: string, label: string, weight: number): Promise<Priority> {
    const [row] = await sql<PriorityRow[]>`
      INSERT INTO priorities (user_id, label, weight)
      VALUES (${userId}, ${label}, ${weight})
      RETURNING id as "Id", user_id as "UserId", label as "Label", weight as "Weight"
    `;
    if (!row) {
      throw new Error('Failed to create priority');
    }

    return {
      Id: row.Id,
      UserId: row.UserId,
      Label: row.Label,
      Weight: Number(row.Weight),
    };
  }

  async findPrioritiesByUserId(userId: string): Promise<Priority[]> {
    const rows = await sql<PriorityRow[]>`
      SELECT id as "Id", user_id as "UserId", label as "Label", weight as "Weight"
      FROM priorities
      WHERE user_id = ${userId}
      ORDER BY weight DESC
    `;
    return rows.map(row => ({
      Id: row.Id,
      UserId: row.UserId,
      Label: row.Label,
      Weight: Number(row.Weight),
    }));
  }

  async findPriorityById(id: string): Promise<Priority | null> {
    const [row] = await sql<PriorityRow[]>`
      SELECT id as "Id", user_id as "UserId", label as "Label", weight as "Weight"
      FROM priorities
      WHERE id = ${id}
    `;
    if (!row) {
      return null;
    }

    return {
      Id: row.Id,
      UserId: row.UserId,
      Label: row.Label,
      Weight: Number(row.Weight),
    };
  }

  async findPrioritiesByWishlistForUser(wishlistId: string, userId: string, isOwner: boolean): Promise<Priority[]> {
    const ownedPriorities = await this.findPrioritiesByUserId(userId);
    
    let rows: PriorityRow[] = [];
    if (isOwner) {
      rows = await sql<PriorityRow[]>`
        SELECT DISTINCT p.id as "Id", p.user_id as "UserId", p.label as "Label", p.weight as "Weight"
        FROM priorities p
        JOIN items i ON i.priority_id = p.id
        WHERE i.list_id = ${wishlistId}
          AND i.is_hidden_idea = false
      `;
    } else {
      const ownerQuery = sql<PriorityRow[]>`
        SELECT id as "Id", user_id as "UserId", label as "Label", weight as "Weight"
        FROM priorities
        WHERE user_id = (SELECT user_id FROM lists WHERE id = ${wishlistId})
      `;
      
      const itemQuery = sql<PriorityRow[]>`
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

  async countListsByUser(userId: string): Promise<{ active: number; archived: number }> {
    const [row] = await sql<ListCountsRow[]>`
      SELECT
        COUNT(CASE WHEN is_active = true THEN 1 END)::integer as active,
        COUNT(CASE WHEN is_active = false THEN 1 END)::integer as archived
      FROM lists
      WHERE user_id = ${userId}
    `;
    return {
      active: row?.active ?? 0,
      archived: row?.archived ?? 0,
    };
  }
}
