import type { ItemRepository } from '../domain/ports/item.repository';
import type { Item, ItemLink, Claim } from '../domain/item.entity';
import { sql } from '@/common/database/connection';

export class PostgresItemRepository implements ItemRepository {
  async findById(id: string): Promise<Item | null> {
    const [row] = await sql<any[]>`
      SELECT i.id as "Id", i.list_id as "ListId", i.priority_id as "PriorityId", i.suggested_by_user_id as "SuggestedByUserId", 
             u.username as "SuggestedByUsername", i.name as "Name", 
             i.description as "Description", i.is_hidden_idea as "IsHiddenIdea", i.is_suggestion as "IsSuggestion", 
             i.category as "Category", i.created_at as "CreatedAt"
      FROM items i
      LEFT JOIN users u ON i.suggested_by_user_id = u.id
      WHERE i.id = ${id}
    `;
    if (!row) return null;
    return {
      Id: row.Id,
      ListId: row.ListId,
      PriorityId: row.PriorityId,
      SuggestedByUserId: row.SuggestedByUserId,
      SuggestedByUsername: row.SuggestedByUsername,
      Name: row.Name,
      Description: row.Description,
      IsHiddenIdea: row.IsHiddenIdea,
      IsSuggestion: row.IsSuggestion,
      Category: row.Category,
      CreatedAt: new Date(row.CreatedAt),
    };
  }

  async findByListId(listId: string): Promise<Item[]> {
    const rows = await sql<any[]>`
      SELECT i.id as "Id", i.list_id as "ListId", i.priority_id as "PriorityId", i.suggested_by_user_id as "SuggestedByUserId", 
             u.username as "SuggestedByUsername", i.name as "Name", 
             i.description as "Description", i.is_hidden_idea as "IsHiddenIdea", i.is_suggestion as "IsSuggestion", 
             i.category as "Category", i.created_at as "CreatedAt"
      FROM items i
      LEFT JOIN users u ON i.suggested_by_user_id = u.id
      WHERE i.list_id = ${listId}
      ORDER BY i.created_at DESC
    `;
    return rows.map(row => ({
      Id: row.Id,
      ListId: row.ListId,
      PriorityId: row.PriorityId,
      SuggestedByUserId: row.SuggestedByUserId,
      SuggestedByUsername: row.SuggestedByUsername,
      Name: row.Name,
      Description: row.Description,
      IsHiddenIdea: row.IsHiddenIdea,
      IsSuggestion: row.IsSuggestion,
      Category: row.Category,
      CreatedAt: new Date(row.CreatedAt),
    }));
  }

  async create(
    listId: string,
    priorityId: string | null,
    suggestedByUserId: string | null,
    name: string,
    description: string | null,
    isHiddenIdea: boolean,
    category: string = 'uncategorized',
    isSuggestion: boolean = false
  ): Promise<Item> {
    const [row] = await sql<any[]>`
      INSERT INTO items (list_id, priority_id, suggested_by_user_id, name, description, is_hidden_idea, category, is_suggestion)
      VALUES (${listId}, ${priorityId}, ${suggestedByUserId}, ${name}, ${description}, ${isHiddenIdea}, ${category}, ${isSuggestion})
      RETURNING id as "Id", list_id as "ListId", priority_id as "PriorityId", suggested_by_user_id as "SuggestedByUserId", name as "Name", 
                description as "Description", is_hidden_idea as "IsHiddenIdea", is_suggestion as "IsSuggestion", category as "Category", created_at as "CreatedAt"
    `;
    if (!row) throw new Error('Failed to create item');
    return {
      Id: row.Id,
      ListId: row.ListId,
      PriorityId: row.PriorityId,
      SuggestedByUserId: row.SuggestedByUserId,
      Name: row.Name,
      Description: row.Description,
      IsHiddenIdea: row.IsHiddenIdea,
      IsSuggestion: row.IsSuggestion,
      Category: row.Category,
      CreatedAt: new Date(row.CreatedAt),
    };
  }

  async createLink(
    itemId: string,
    url: string,
    retailerName: string | null,
    extractedPrice: number | null,
    extractedImageUrl: string | null
  ): Promise<ItemLink> {
    const [row] = await sql<any[]>`
      INSERT INTO item_links (item_id, url, retailer_name, extracted_price, extracted_image_url)
      VALUES (${itemId}, ${url}, ${retailerName}, ${extractedPrice}, ${extractedImageUrl})
      RETURNING id as "Id", item_id as "ItemId", url as "Url", retailer_name as "RetailerName", 
                extracted_price as "ExtractedPrice", extracted_image_url as "ExtractedImageUrl"
    `;
    if (!row) throw new Error('Failed to create item link');
    return {
      Id: row.Id,
      ItemId: row.ItemId,
      Url: row.Url,
      RetailerName: row.RetailerName,
      ExtractedPrice: row.ExtractedPrice ? Number(row.ExtractedPrice) : null,
      ExtractedImageUrl: row.ExtractedImageUrl,
    };
  }

  async updateLinkMetadata(
    linkId: string,
    extractedPrice: number | null,
    extractedImageUrl: string | null
  ): Promise<void> {
    await sql`
      UPDATE item_links
      SET extracted_price = ${extractedPrice},
          extracted_image_url = ${extractedImageUrl}
      WHERE id = ${linkId}
    `;
  }

  async findLinksByItemId(itemId: string): Promise<ItemLink[]> {
    const rows = await sql<any[]>`
      SELECT id as "Id", item_id as "ItemId", url as "Url", retailer_name as "RetailerName", 
             extracted_price as "ExtractedPrice", extracted_image_url as "ExtractedImageUrl"
      FROM item_links
      WHERE item_id = ${itemId}
    `;
    return rows.map(row => ({
      Id: row.Id,
      ItemId: row.ItemId,
      Url: row.Url,
      RetailerName: row.RetailerName,
      ExtractedPrice: row.ExtractedPrice ? Number(row.ExtractedPrice) : null,
      ExtractedImageUrl: row.ExtractedImageUrl,
    }));
  }

  async createClaim(
    itemId: string,
    userId: string | null,
    amount: number | null,
    claimedByName: string | null,
    anonymous: boolean = false
  ): Promise<Claim> {
    const [row] = await sql<any[]>`
      INSERT INTO claims (item_id, user_id, amount, claimed_by_name, anonymous)
      VALUES (${itemId}, ${userId}, ${amount}, ${claimedByName}, ${anonymous})
      RETURNING id as "Id", item_id as "ItemId", user_id as "UserId", amount as "Amount", 
                claimed_by_name as "ClaimedByName", anonymous as "Anonymous", claimed_at as "ClaimedAt"
    `;
    if (!row) throw new Error('Failed to create claim');
    return {
      Id: row.Id,
      ItemId: row.ItemId,
      UserId: row.UserId,
      Amount: row.Amount ? Number(row.Amount) : null,
      ClaimedByName: row.ClaimedByName,
      Anonymous: row.Anonymous,
      ClaimedAt: new Date(row.ClaimedAt),
    };
  }

  async findClaimsByItemId(itemId: string): Promise<Claim[]> {
    const rows = await sql<any[]>`
      SELECT id as "Id", item_id as "ItemId", user_id as "UserId", amount as "Amount", 
             claimed_by_name as "ClaimedByName", anonymous as "Anonymous", claimed_at as "ClaimedAt"
      FROM claims
      WHERE item_id = ${itemId}
    `;
    return rows.map(row => ({
      Id: row.Id,
      ItemId: row.ItemId,
      UserId: row.UserId,
      Amount: row.Amount ? Number(row.Amount) : null,
      ClaimedByName: row.ClaimedByName,
      Anonymous: row.Anonymous,
      ClaimedAt: new Date(row.ClaimedAt),
    }));
  }

  async findClaimsByListId(listId: string): Promise<Claim[]> {
    const rows = await sql<any[]>`
      SELECT c.id as "Id", c.item_id as "ItemId", c.user_id as "UserId", c.amount as "Amount", 
             c.claimed_by_name as "ClaimedByName", c.anonymous as "Anonymous", c.claimed_at as "ClaimedAt"
      FROM claims c
      JOIN items i ON c.item_id = i.id
      WHERE i.list_id = ${listId}
    `;
    return rows.map(row => ({
      Id: row.Id,
      ItemId: row.ItemId,
      UserId: row.UserId,
      Amount: row.Amount ? Number(row.Amount) : null,
      ClaimedByName: row.ClaimedByName,
      Anonymous: row.Anonymous,
      ClaimedAt: new Date(row.ClaimedAt),
    }));
  }

  async update(
    id: string,
    name: string,
    description: string | null,
    priorityId: string | null,
    category: string
  ): Promise<Item> {
    const [row] = await sql<any[]>`
      UPDATE items
      SET name = ${name},
          description = ${description},
          priority_id = ${priorityId},
          category = ${category}
      WHERE id = ${id}
      RETURNING id as "Id", list_id as "ListId", priority_id as "PriorityId", suggested_by_user_id as "SuggestedByUserId", name as "Name", 
                description as "Description", is_hidden_idea as "IsHiddenIdea", is_suggestion as "IsSuggestion", category as "Category", created_at as "CreatedAt"
    `;
    if (!row) throw new Error('Item not found or failed to update');
    return {
      Id: row.Id,
      ListId: row.ListId,
      PriorityId: row.PriorityId,
      SuggestedByUserId: row.SuggestedByUserId,
      Name: row.Name,
      Description: row.Description,
      IsHiddenIdea: row.IsHiddenIdea,
      IsSuggestion: row.IsSuggestion,
      Category: row.Category,
      CreatedAt: new Date(row.CreatedAt),
    };
  }

  async delete(id: string): Promise<void> {
    await sql.begin(async (sql) => {
      await sql`DELETE FROM claims WHERE item_id = ${id}`;
      await sql`DELETE FROM item_links WHERE item_id = ${id}`;
      await sql`DELETE FROM items WHERE id = ${id}`;
    });
  }

  async deleteClaim(itemId: string, userId: string): Promise<void> {
    await sql`DELETE FROM claims WHERE item_id = ${itemId} AND user_id = ${userId}`;
  }
}
