import type { ItemRepository, ItemMetadataWrite } from '../domain/ports/item.repository';
import type { Item, ItemLink, Claim } from '../domain/item.entity';
import { sql } from '@/common/database/connection';

const ITEM_SELECT = `
  i.id as "Id", i.list_id as "ListId", i.priority_id as "PriorityId",
  i.suggested_by_user_id as "SuggestedByUserId", u.username as "SuggestedByUsername",
  i.name as "Name", i.description as "Description",
  i.is_hidden_idea as "IsHiddenIdea", i.is_suggestion as "IsSuggestion",
  i.category as "Category", i.priority as "Priority", i.created_at as "CreatedAt",
  i.is_favorite as "IsFavorite", i.is_pinned as "IsPinned",
  i.desired_quantity as "DesiredQuantity", i.multi_count as "MultiCount",
  i.other_users_can_see as "OtherUsersCanSee",
  i.custom_fields as "CustomFields", i.variations as "Variations"
`;

function mapItemRow(row: any): Item {
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
    Priority: row.Priority != null ? Number(row.Priority) : null,
    CreatedAt: row.CreatedAt ? new Date(row.CreatedAt) : undefined,
    IsFavorite: row.IsFavorite === true,
    IsPinned: row.IsPinned === true,
    DesiredQuantity: row.DesiredQuantity != null ? Number(row.DesiredQuantity) : null,
    MultiCount: row.MultiCount === true,
    OtherUsersCanSee:
      row.OtherUsersCanSee === null || row.OtherUsersCanSee === undefined
        ? null
        : row.OtherUsersCanSee === true,
    CustomFields: row.CustomFields ?? null,
    Variations: Array.isArray(row.Variations) ? row.Variations : null,
  };
}

function metadataDefaults(metadata?: ItemMetadataWrite | null) {
  return {
    isFavorite: metadata?.IsFavorite === true,
    isPinned: metadata?.IsPinned === true,
    desiredQuantity:
      metadata?.DesiredQuantity !== undefined ? metadata.DesiredQuantity : null,
    multiCount: metadata?.MultiCount === true,
    otherUsersCanSee:
      metadata?.OtherUsersCanSee !== undefined ? metadata.OtherUsersCanSee : null,
    customFields: JSON.stringify(metadata?.CustomFields ?? {}),
    variations: JSON.stringify(metadata?.Variations ?? []),
  };
}

export class PostgresItemRepository implements ItemRepository {
  async findById(id: string): Promise<Item | null> {
    const [row] = await sql`
      SELECT ${sql.unsafe(ITEM_SELECT)}
      FROM items i
      LEFT JOIN users u ON i.suggested_by_user_id = u.id
      WHERE i.id = ${id}
    `;
    if (!row) return null;
    const item = mapItemRow(row);
    item.LinkedItemIds = await this.findLinkedItemIds(id);
    return item;
  }

  async findByListId(listId: string): Promise<Item[]> {
    const rows = await sql`
      SELECT ${sql.unsafe(ITEM_SELECT)}
      FROM items i
      LEFT JOIN users u ON i.suggested_by_user_id = u.id
      WHERE i.list_id = ${listId}
      ORDER BY i.created_at DESC
    `;
    const linkedMap = await this.findLinkedItemIdsByListId(listId);
    return rows.map((row: any) => {
      const item = mapItemRow(row);
      item.LinkedItemIds = linkedMap.get(item.Id) ?? [];
      return item;
    });
  }

  async create(
    listId: string,
    priorityId: string | null,
    suggestedByUserId: string | null,
    name: string,
    description: string | null,
    isHiddenIdea: boolean,
    category: string = 'uncategorized',
    isSuggestion: boolean = false,
    priority: number | null = null,
    metadata: ItemMetadataWrite | null = null
  ): Promise<Item> {
    const meta = metadataDefaults(metadata);
    const [row] = await sql`
      INSERT INTO items (
        list_id, priority_id, suggested_by_user_id, name, description,
        is_hidden_idea, category, is_suggestion, priority,
        is_favorite, is_pinned, desired_quantity, multi_count,
        other_users_can_see, custom_fields, variations
      )
      VALUES (
        ${listId}, ${priorityId}, ${suggestedByUserId}, ${name}, ${description},
        ${isHiddenIdea}, ${category}, ${isSuggestion}, ${priority},
        ${meta.isFavorite}, ${meta.isPinned}, ${meta.desiredQuantity}, ${meta.multiCount},
        ${meta.otherUsersCanSee}, ${meta.customFields}::jsonb, ${meta.variations}::jsonb
      )
      RETURNING id as "Id", list_id as "ListId", priority_id as "PriorityId",
                suggested_by_user_id as "SuggestedByUserId", name as "Name",
                description as "Description", is_hidden_idea as "IsHiddenIdea",
                is_suggestion as "IsSuggestion", category as "Category",
                priority as "Priority", created_at as "CreatedAt",
                is_favorite as "IsFavorite", is_pinned as "IsPinned",
                desired_quantity as "DesiredQuantity", multi_count as "MultiCount",
                other_users_can_see as "OtherUsersCanSee",
                custom_fields as "CustomFields", variations as "Variations"
    `;
    if (!row) throw new Error('Failed to create item');
    return mapItemRow(row);
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

  async updateLink(
    linkId: string,
    url: string,
    retailerName: string | null,
    extractedPrice: number | null,
    extractedImageUrl: string | null
  ): Promise<ItemLink> {
    const [row] = await sql<any[]>`
      UPDATE item_links
      SET url = ${url},
          retailer_name = ${retailerName},
          extracted_price = ${extractedPrice},
          extracted_image_url = ${extractedImageUrl}
      WHERE id = ${linkId}
      RETURNING id as "Id", item_id as "ItemId", url as "Url", retailer_name as "RetailerName",
                extracted_price as "ExtractedPrice", extracted_image_url as "ExtractedImageUrl"
    `;
    if (!row) throw new Error('Item link not found or failed to update');
    return {
      Id: row.Id,
      ItemId: row.ItemId,
      Url: row.Url,
      RetailerName: row.RetailerName,
      ExtractedPrice: row.ExtractedPrice ? Number(row.ExtractedPrice) : null,
      ExtractedImageUrl: row.ExtractedImageUrl,
    };
  }

  async deleteLinksByItemId(itemId: string): Promise<void> {
    await sql`DELETE FROM item_links WHERE item_id = ${itemId}`;
  }

  async findLinksByItemId(itemId: string): Promise<ItemLink[]> {
    const rows = await sql<any[]>`
      SELECT id as "Id", item_id as "ItemId", url as "Url", retailer_name as "RetailerName",
             extracted_price as "ExtractedPrice", extracted_image_url as "ExtractedImageUrl"
      FROM item_links
      WHERE item_id = ${itemId}
    `;
    return rows.map((row) => ({
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
    anonymous: boolean = false,
    quantity: number = 1,
    selection: string | null = null
  ): Promise<Claim> {
    const [row] = await sql<any[]>`
      INSERT INTO claims (item_id, user_id, amount, claimed_by_name, anonymous, quantity, selection)
      VALUES (${itemId}, ${userId}, ${amount}, ${claimedByName}, ${anonymous}, ${quantity}, ${selection})
      RETURNING id as "Id", item_id as "ItemId", user_id as "UserId", amount as "Amount",
                claimed_by_name as "ClaimedByName", anonymous as "Anonymous", claimed_at as "ClaimedAt",
                quantity as "Quantity", selection as "Selection"
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
      Quantity: row.Quantity ? Number(row.Quantity) : 1,
      Selection: row.Selection,
    };
  }

  async createClaimsAtomic(
    claims: Array<{
      itemId: string;
      userId: string;
      amount: number | null;
      claimedByName: string | null;
      anonymous: boolean;
      quantity: number;
      selection: string | null;
    }>
  ): Promise<Claim[]> {
    if (claims.length === 0) {
      return [];
    }

    return await sql.begin(async (tx) => {
      const created: Claim[] = [];
      for (const claim of claims) {
        const [row] = await tx<any[]>`
          INSERT INTO claims (item_id, user_id, amount, claimed_by_name, anonymous, quantity, selection)
          VALUES (
            ${claim.itemId},
            ${claim.userId},
            ${claim.amount},
            ${claim.claimedByName},
            ${claim.anonymous},
            ${claim.quantity},
            ${claim.selection}
          )
          RETURNING id as "Id", item_id as "ItemId", user_id as "UserId", amount as "Amount",
                    claimed_by_name as "ClaimedByName", anonymous as "Anonymous", claimed_at as "ClaimedAt",
                    quantity as "Quantity", selection as "Selection"
        `;
        if (!row) {
          throw new Error('Failed to create claim');
        }
        created.push({
          Id: row.Id,
          ItemId: row.ItemId,
          UserId: row.UserId,
          Amount: row.Amount ? Number(row.Amount) : null,
          ClaimedByName: row.ClaimedByName,
          Anonymous: row.Anonymous,
          ClaimedAt: new Date(row.ClaimedAt),
          Quantity: row.Quantity ? Number(row.Quantity) : 1,
          Selection: row.Selection,
        });
      }
      return created;
    });
  }

  async findClaimsByItemId(itemId: string): Promise<Claim[]> {
    const rows = await sql<any[]>`
      SELECT id as "Id", item_id as "ItemId", user_id as "UserId", amount as "Amount",
             claimed_by_name as "ClaimedByName", anonymous as "Anonymous", claimed_at as "ClaimedAt",
             quantity as "Quantity", selection as "Selection"
      FROM claims
      WHERE item_id = ${itemId}
    `;
    return rows.map((row) => ({
      Id: row.Id,
      ItemId: row.ItemId,
      UserId: row.UserId,
      Amount: row.Amount ? Number(row.Amount) : null,
      ClaimedByName: row.ClaimedByName,
      Anonymous: row.Anonymous,
      ClaimedAt: new Date(row.ClaimedAt),
      Quantity: row.Quantity ? Number(row.Quantity) : 1,
      Selection: row.Selection,
    }));
  }

  async findClaimsByListId(listId: string): Promise<Claim[]> {
    const rows = await sql<any[]>`
      SELECT c.id as "Id", c.item_id as "ItemId", c.user_id as "UserId", c.amount as "Amount",
             c.claimed_by_name as "ClaimedByName", c.anonymous as "Anonymous", c.claimed_at as "ClaimedAt",
             c.quantity as "Quantity", c.selection as "Selection"
      FROM claims c
      JOIN items i ON c.item_id = i.id
      WHERE i.list_id = ${listId}
    `;
    return rows.map((row) => ({
      Id: row.Id,
      ItemId: row.ItemId,
      UserId: row.UserId,
      Amount: row.Amount ? Number(row.Amount) : null,
      ClaimedByName: row.ClaimedByName,
      Anonymous: row.Anonymous,
      ClaimedAt: new Date(row.ClaimedAt),
      Quantity: row.Quantity ? Number(row.Quantity) : 1,
      Selection: row.Selection,
    }));
  }

  async update(
    id: string,
    name: string,
    description: string | null,
    priorityId: string | null,
    category: string,
    priority: number | null = null,
    metadata: ItemMetadataWrite | null = null
  ): Promise<Item> {
    if (metadata) {
      const meta = metadataDefaults(metadata);
      const [row] = await sql`
        UPDATE items
        SET name = ${name},
            description = ${description},
            priority_id = ${priorityId},
            category = ${category},
            priority = ${priority},
            is_favorite = ${meta.isFavorite},
            is_pinned = ${meta.isPinned},
            desired_quantity = ${meta.desiredQuantity},
            multi_count = ${meta.multiCount},
            other_users_can_see = ${meta.otherUsersCanSee},
            custom_fields = ${meta.customFields}::jsonb,
            variations = ${meta.variations}::jsonb
        WHERE id = ${id}
        RETURNING id as "Id", list_id as "ListId", priority_id as "PriorityId",
                  suggested_by_user_id as "SuggestedByUserId", name as "Name",
                  description as "Description", is_hidden_idea as "IsHiddenIdea",
                  is_suggestion as "IsSuggestion", category as "Category",
                  priority as "Priority", created_at as "CreatedAt",
                  is_favorite as "IsFavorite", is_pinned as "IsPinned",
                  desired_quantity as "DesiredQuantity", multi_count as "MultiCount",
                  other_users_can_see as "OtherUsersCanSee",
                  custom_fields as "CustomFields", variations as "Variations"
      `;
      if (!row) throw new Error('Item not found or failed to update');
      const item = mapItemRow(row);
      item.LinkedItemIds = await this.findLinkedItemIds(id);
      return item;
    }

    const [row] = await sql`
      UPDATE items
      SET name = ${name},
          description = ${description},
          priority_id = ${priorityId},
          category = ${category},
          priority = ${priority}
      WHERE id = ${id}
      RETURNING id as "Id", list_id as "ListId", priority_id as "PriorityId",
                suggested_by_user_id as "SuggestedByUserId", name as "Name",
                description as "Description", is_hidden_idea as "IsHiddenIdea",
                is_suggestion as "IsSuggestion", category as "Category",
                priority as "Priority", created_at as "CreatedAt",
                is_favorite as "IsFavorite", is_pinned as "IsPinned",
                desired_quantity as "DesiredQuantity", multi_count as "MultiCount",
                other_users_can_see as "OtherUsersCanSee",
                custom_fields as "CustomFields", variations as "Variations"
    `;
    if (!row) throw new Error('Item not found or failed to update');
    const item = mapItemRow(row);
    item.LinkedItemIds = await this.findLinkedItemIds(id);
    return item;
  }

  async delete(id: string): Promise<void> {
    await sql.begin(async (tx) => {
      await tx`DELETE FROM claims WHERE item_id = ${id}`;
      await tx`DELETE FROM item_links WHERE item_id = ${id}`;
      await tx`DELETE FROM item_item_links WHERE item_id = ${id} OR linked_item_id = ${id}`;
      await tx`DELETE FROM items WHERE id = ${id}`;
    });
  }

  async deleteClaim(itemId: string, userId: string): Promise<void> {
    await sql`DELETE FROM claims WHERE item_id = ${itemId} AND user_id = ${userId}`;
  }

  async findLinkedItemIds(itemId: string): Promise<string[]> {
    const rows = await sql<{ LinkedItemId: string }[]>`
      SELECT linked_item_id as "LinkedItemId"
      FROM item_item_links
      WHERE item_id = ${itemId}
    `;
    return rows.map((row) => row.LinkedItemId);
  }

  async findLinkedItemIdsByListId(listId: string): Promise<Map<string, string[]>> {
    const rows = await sql<{ ItemId: string; LinkedItemId: string }[]>`
      SELECT l.item_id as "ItemId", l.linked_item_id as "LinkedItemId"
      FROM item_item_links l
      JOIN items i ON i.id = l.item_id
      WHERE i.list_id = ${listId}
    `;
    const map = new Map<string, string[]>();
    for (const row of rows) {
      const existing = map.get(row.ItemId) ?? [];
      existing.push(row.LinkedItemId);
      map.set(row.ItemId, existing);
    }
    return map;
  }

  async replaceLinkedItemIds(itemId: string, linkedItemIds: string[]): Promise<void> {
    const unique = [...new Set(linkedItemIds.filter((id) => id && id !== itemId))];
    await sql.begin(async (tx) => {
      await tx`DELETE FROM item_item_links WHERE item_id = ${itemId}`;
      for (const linkedId of unique) {
        await tx`
          INSERT INTO item_item_links (item_id, linked_item_id)
          VALUES (${itemId}, ${linkedId})
          ON CONFLICT DO NOTHING
        `;
      }
    });
  }
}
